import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PinPad } from '@/components/pin-pad';
import { Button } from '@/components/ui/button';
import { FormScreen } from '@/components/ui/form-screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { updateSettings } from '@/db/settings';
import { useTheme } from '@/hooks/use-theme';
import { savePin } from '@/lib/lock';

const MIN_PASSWORD_LENGTH = 4;

/** Sets the lock PIN, or a password with `?type=password`. Saving turns the app lock on. */
export default function PinSetupScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  return type === 'password' ? <PasswordSetup /> : <PinSetup />;
}

function PinSetup() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(pin: string) {
    if (!first) {
      setFirst(pin);
      setError(null);
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setError("PINs didn't match. Start again.");
      return;
    }
    await savePin(pin);
    await updateSettings(db, { lockEnabled: true, lockType: 'pin' });
    router.back();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Set PIN' }} />
      <PinPad
        key={first ? 'confirm' : 'enter'}
        title={first ? 'Confirm your PIN' : 'Choose a 4-digit PIN'}
        subtitle={first ? 'Enter it once more.' : "You'll need it to open SpendTrak."}
        error={error}
        onComplete={handle}
      />
    </View>
  );
}

function PasswordSetup() {
  const db = useSQLiteContext();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const problem =
    password.length < MIN_PASSWORD_LENGTH
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters`
      : confirm !== password
        ? 'Passwords don’t match'
        : null;

  async function save() {
    if (problem || saving) return;
    setSaving(true);
    await savePin(password);
    await updateSettings(db, { lockEnabled: true, lockType: 'password' });
    router.back();
  }

  return (
    <FormScreen
      footer={<Button label={problem ?? 'Set password'} icon={problem ? undefined : 'check'} disabled={!!problem || saving} onPress={save} />}>
      <Stack.Screen options={{ title: 'Set password' }} />
      <TextField
        label="Password"
        hint="You'll need it to open SpendTrak. It can't be recovered if you forget it."
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        maxLength={64}
      />
      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={64}
        returnKeyType="done"
        onSubmitEditing={save}
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
