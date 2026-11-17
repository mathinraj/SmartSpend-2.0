import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PinPad } from '@/components/pin-pad';
import { Button } from '@/components/ui/button';
import { FormScreen } from '@/components/ui/form-screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { updateSettings } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { clearPin, verifyPin } from '@/lib/lock';

/** Asks for the current PIN or password before the app lock is turned off. */
export default function LockVerifyScreen() {
  const settings = useSettings();
  if (!settings) return null;
  return settings.lockType === 'password' ? <PasswordCheck /> : <PinCheck />;
}

async function turnOffLock(db: ReturnType<typeof useSQLiteContext>) {
  await clearPin();
  await updateSettings(db, { lockEnabled: false, lockBiometric: false });
  router.back();
}

function PinCheck() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const [error, setError] = useState<string | null>(null);

  async function check(pin: string) {
    if (await verifyPin(pin)) await turnOffLock(db);
    else setError('Wrong PIN. Try again.');
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <PinPad title="Enter your PIN" subtitle="Confirm it's you to turn off the app lock." error={error} onComplete={check} />
    </View>
  );
}

function PasswordCheck() {
  const db = useSQLiteContext();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function check() {
    if (!password) return;
    if (await verifyPin(password)) await turnOffLock(db);
    else {
      setPassword('');
      setError('Wrong password. Try again.');
    }
  }

  return (
    <FormScreen footer={<Button label="Turn off app lock" variant="danger" disabled={!password} onPress={check} />}>
      <TextField
        label="Current password"
        hint={error ?? "Confirm it's you to turn off the app lock."}
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError(null);
        }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={check}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: Spacing.xxl,
  },
});
