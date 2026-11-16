import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Linking } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SwitchRow } from '@/components/ui/switch-row';
import { Text } from '@/components/ui/text';
import { updateSettings } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { formatTime, fromDateTimeKeys, toDateKey, toTimeKey } from '@/lib/format';
import { ensureNotificationPermission } from '@/lib/notifications';
import { pickTime } from '@/lib/pickers';
import type { Settings } from '@/types/models';

export default function RemindersScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  if (!settings) return null;

  async function toggle(key: 'dailyReminder' | 'dueReminders', enabled: boolean) {
    if (enabled && !(await ensureNotificationPermission())) {
      Alert.alert('Notifications are off', 'Allow notifications for SpendTrak in system settings to get reminders.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    await updateSettings(db, { [key]: enabled } as Partial<Settings>);
  }

  function changeTime() {
    pickTime(fromDateTimeKeys(toDateKey(new Date()), settings!.dailyReminderTime), (d) =>
      updateSettings(db, { dailyReminderTime: toTimeKey(d) })
    );
  }

  return (
    <Screen variant="stack">
      <Card flush>
        <SwitchRow
          leading={<Icon name="bell" color={colors.primary} />}
          title="Daily reminder"
          subtitle="A nudge to log the day's expenses"
          value={settings.dailyReminder}
          onValueChange={(v) => toggle('dailyReminder', v)}
        />
        {settings.dailyReminder ? (
          <ListRow
            divider
            leading={<Icon name="clock" color={colors.primary} />}
            title="Remind me at"
            subtitle={formatTime(settings.dailyReminderTime)}
            onPress={changeTime}
          />
        ) : null}
        <SwitchRow
          divider
          leading={<Icon name="repeat" color={colors.primary} />}
          title="Payment due alerts"
          subtitle="At 9 AM on the day a planned payment is due"
          value={settings.dueReminders}
          onValueChange={(v) => toggle('dueReminders', v)}
        />
      </Card>
      <Text variant="caption" tone="muted">
        Reminders are scheduled on this phone; nothing is sent to a server.
      </Text>
    </Screen>
  );
}
