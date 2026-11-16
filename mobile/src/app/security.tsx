import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SwitchRow } from '@/components/ui/switch-row';
import { Field } from '@/components/ui/text-field';
import { updateSettings } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { authenticateWithBiometrics, biometricsAvailable, clearPin } from '@/lib/lock';

const TIMEOUTS = [
  { seconds: 0, label: 'Immediately' },
  { seconds: 30, label: '30 seconds' },
  { seconds: 60, label: '1 minute' },
  { seconds: 300, label: '5 minutes' },
];

export default function SecurityScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    biometricsAvailable().then(setHasBiometrics);
  }, []);

  if (!settings) return null;

  function toggleLock(enabled: boolean) {
    if (enabled) {
      router.push('/pin-setup');
      return;
    }
    Alert.alert('Turn off app lock?', 'Anyone with your phone will be able to open SpendTrak.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Turn off',
        style: 'destructive',
        onPress: async () => {
          await clearPin();
          await updateSettings(db, { lockEnabled: false, lockBiometric: false });
        },
      },
    ]);
  }

  async function toggleBiometric(enabled: boolean) {
    // Confirm the user can actually pass the prompt before relying on it.
    if (enabled && !(await authenticateWithBiometrics())) return;
    await updateSettings(db, { lockBiometric: enabled });
  }

  return (
    <Screen variant="stack">
      <Card flush>
        <SwitchRow
          leading={<Icon name="lock" color={colors.primary} />}
          title="App lock"
          subtitle="Ask for a PIN when opening SpendTrak"
          value={settings.lockEnabled}
          onValueChange={toggleLock}
        />
        {settings.lockEnabled ? (
          <>
            <SwitchRow
              divider
              leading={<Icon name="fingerprint" color={colors.primary} />}
              title="Unlock with fingerprint"
              subtitle={hasBiometrics ? 'Use your fingerprint or face instead of the PIN' : 'No fingerprint or face set up on this phone'}
              value={settings.lockBiometric}
              onValueChange={toggleBiometric}
              disabled={!hasBiometrics}
            />
            <ListRow
              divider
              leading={<Icon name="edit" color={colors.primary} />}
              title="Change PIN"
              onPress={() => router.push('/pin-setup')}
            />
          </>
        ) : null}
      </Card>

      {settings.lockEnabled ? (
        <Field label="Lock after leaving the app">
          <ChipGroup>
            {TIMEOUTS.map((t) => (
              <Chip
                key={t.seconds}
                label={t.label}
                selected={settings.lockTimeout === t.seconds}
                onPress={() => updateSettings(db, { lockTimeout: t.seconds })}
              />
            ))}
          </ChipGroup>
        </Field>
      ) : null}
    </Screen>
  );
}
