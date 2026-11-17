import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

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
import { showDialog } from '@/lib/dialog';
import { authenticateWithBiometrics, biometricsAvailable } from '@/lib/lock';

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

  const isPassword = settings.lockType === 'password';

  function setUp(type: 'pin' | 'password') {
    router.push({ pathname: '/pin-setup', params: { type } });
  }

  function toggleLock(enabled: boolean) {
    if (enabled) {
      showDialog(
        'Lock SpendTrak with',
        'A PIN is quicker to enter; a password can be longer.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Password', onPress: () => setUp('password') },
          { text: '4-digit PIN', onPress: () => setUp('pin') },
        ],
        { icon: 'lock' }
      );
      return;
    }
    showDialog(
      'Turn off app lock?',
      `Anyone with your phone will be able to open SpendTrak. You'll need to enter your ${isPassword ? 'password' : 'PIN'} first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Turn off', style: 'destructive', onPress: () => router.push('/lock-verify') },
      ]
    );
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
          subtitle={
            settings.lockEnabled
              ? `Ask for your ${isPassword ? 'password' : 'PIN'} when opening SpendTrak`
              : 'Ask for a PIN or password when opening SpendTrak'
          }
          value={settings.lockEnabled}
          onValueChange={toggleLock}
        />
        {settings.lockEnabled ? (
          <>
            <SwitchRow
              divider
              leading={<Icon name="fingerprint" color={colors.primary} />}
              title="Unlock with fingerprint"
              subtitle={
                hasBiometrics
                  ? `Use your fingerprint or face instead of the ${isPassword ? 'password' : 'PIN'}`
                  : 'No fingerprint or face set up on this phone'
              }
              value={settings.lockBiometric}
              onValueChange={toggleBiometric}
              disabled={!hasBiometrics}
            />
            <ListRow
              divider
              leading={<Icon name="edit" color={colors.primary} />}
              title={isPassword ? 'Change password' : 'Change PIN'}
              onPress={() => setUp(settings.lockType)}
            />
            <ListRow
              divider
              leading={<Icon name="key" color={colors.primary} />}
              title={isPassword ? 'Use a PIN instead' : 'Use a password instead'}
              subtitle={isPassword ? '4 digits, quicker to enter' : 'Letters, numbers, and symbols'}
              onPress={() => setUp(isPassword ? 'pin' : 'password')}
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
