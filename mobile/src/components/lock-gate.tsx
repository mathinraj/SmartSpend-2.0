import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { AppState, BackHandler, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinPad } from '@/components/pin-pad';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
        <LockScreen biometric={settings.lockBiometric} onUnlock={() => setLocked(false)} />
      ) : null}
    </>
  );
}

function LockScreen({ biometric, onUnlock }: { biometric: boolean; onUnlock: () => void }) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);

  async function promptBiometrics() {
    if (await authenticateWithBiometrics()) onUnlock();
  }

  const autoPrompt = useEffectEvent(() => {
    promptBiometrics();
  });

  useEffect(() => {
    if (!biometric) return;
    let active = true;
    biometricsAvailable().then((available) => {
      if (!active || !available) return;
      setCanUseBiometrics(true);
      autoPrompt();
    });
    return () => {
      active = false;
    };
  }, [biometric]);

  // While locked, the back button must not reach the screens underneath.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  async function check(pin: string) {
    if (await verifyPin(pin)) onUnlock();
    else setError('Wrong PIN. Try again.');
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor: colors.background, paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom },
      ]}>
      <PinPad
        title="SpendTrak is locked"
        subtitle="Enter your PIN"
        error={error}
        onComplete={check}
        onBiometric={canUseBiometrics ? promptBiometrics : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 100,
    elevation: 100,
    justifyContent: 'center',
  },
});
