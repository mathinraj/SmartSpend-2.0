import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { AppState, BackHandler, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinPad } from '@/components/pin-pad';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLaunchFinished } from '@/lib/launch';
import { authenticateWithBiometrics, biometricsAvailable, isLockSuppressed, verifyPin } from '@/lib/lock';
import type { Settings } from '@/types/models';

export interface LockGateProps {
  settings: Settings;
  children: ReactNode;
}

/**
 * Covers the app with the PIN screen at launch and after it has been in the background for
 * `lockTimeout` seconds. The app stays mounted underneath so navigation state survives.
 */
export function LockGate({ settings, children }: LockGateProps) {
  const [locked, setLocked] = useState(settings.lockEnabled);
  const backgroundedAt = useRef<number | null>(null);

  const onAppStateChange = useEffectEvent((state: string) => {
    if (state === 'background') {
      backgroundedAt.current = isLockSuppressed() ? null : Date.now();
      return;
    }
    if (state !== 'active') return;
    const since = backgroundedAt.current;
    backgroundedAt.current = null;
    if (settings.lockEnabled && since !== null && Date.now() - since >= settings.lockTimeout * 1000) {
      setLocked(true);
    }
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <>
      {children}
      {locked && settings.lockEnabled ? (
        <LockScreen biometric={settings.lockBiometric} password={settings.lockType === 'password'} onUnlock={() => setLocked(false)} />
      ) : null}
    </>
  );
}

function LockScreen({ biometric, password, onUnlock }: { biometric: boolean; password: boolean; onUnlock: () => void }) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);
  const [typed, setTyped] = useState('');
  // The fingerprint prompt would otherwise pop up over the launch animation.
  const launchFinished = useLaunchFinished();

  async function promptBiometrics() {
    if (await authenticateWithBiometrics(password ? 'Use password' : 'Use PIN')) onUnlock();
  }

  const autoPrompt = useEffectEvent(() => {
    promptBiometrics();
  });

  useEffect(() => {
    if (!biometric || !launchFinished) return;
    let active = true;
    biometricsAvailable().then((available) => {
      if (!active || !available) return;
      setCanUseBiometrics(true);
      autoPrompt();
    });
    return () => {
      active = false;
    };
  }, [biometric, launchFinished]);

  // While locked, the back button must not reach the screens underneath.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  async function check(secret: string) {
    if (await verifyPin(secret)) {
      onUnlock();
      return;
    }
    setTyped('');
    setError(password ? 'Wrong password. Try again.' : 'Wrong PIN. Try again.');
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor: colors.background, paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom },
      ]}>
      {password ? (
        <View style={styles.passwordBox}>
          <Text variant="title" style={styles.center}>
            SpendTrak is locked
          </Text>
          <Input
            value={typed}
            onChangeText={(text) => {
              setTyped(text);
              setError(null);
            }}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="go"
            onSubmitEditing={() => check(typed)}
            accessibilityLabel="Password"
          />
          {error ? (
            <Text tone="danger" style={styles.center}>
              {error}
            </Text>
          ) : null}
          <Button label="Unlock" icon="lock" disabled={!typed} onPress={() => check(typed)} />
          {canUseBiometrics ? (
            <Button label="Use fingerprint" icon="fingerprint" variant="secondary" onPress={promptBiometrics} />
          ) : null}
        </View>
      ) : (
        <PinPad
          title="SpendTrak is locked"
          subtitle="Enter your PIN"
          error={error}
          onComplete={check}
          onBiometric={canUseBiometrics ? promptBiometrics : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 100,
    elevation: 100,
    justifyContent: 'center',
  },
  passwordBox: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  center: {
    textAlign: 'center',
  },
});
