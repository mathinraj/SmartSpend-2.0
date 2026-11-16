import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PinPad } from '@/components/pin-pad';
import { Spacing } from '@/constants/theme';
import { updateSettings } from '@/db/settings';
import { useTheme } from '@/hooks/use-theme';
import { savePin } from '@/lib/lock';

export default function PinSetupScreen() {
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
    await updateSettings(db, { lockEnabled: true });
    router.back();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: Spacing.xxl,
  },
});
