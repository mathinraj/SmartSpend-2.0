import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { PickerButton } from '@/components/ui/picker-button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SwitchRow } from '@/components/ui/switch-row';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { updateSettings } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { formatTime, fromDateTimeKeys, toDateKey, toTimeKey } from '@/lib/format';
import { confirmNotifications, nextBackupReminder } from '@/lib/notifications';
import { pickTime } from '@/lib/pickers';
import { describeReminder, inQuietHours } from '@/lib/reminders';
import type { Settings } from '@/types/models';

function backupHint(settings: Settings): string {
  const next = nextBackupReminder(settings);
  if (!next) return 'The backup reminder starts once you’ve added an account.';
  const when = next.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return `Next backup reminder: ${when} at ${formatTime(toTimeKey(next))}.`;
}

export default function RemindersScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  if (!settings) return null;

  async function toggle(key: 'dueReminders' | 'backupReminder', enabled: boolean) {
    if (enabled && !(await confirmNotifications())) return;
    await updateSettings(db, { [key]: enabled } as Partial<Settings>);
  }

  async function toggleReminder(id: string, enabled: boolean) {
    if (enabled && !(await confirmNotifications())) return;
    await updateSettings(db, { reminders: settings!.reminders.map((r) => (r.id === id ? { ...r, enabled } : r)) });
  }

  function changeQuietTime(key: 'dndStart' | 'dndEnd') {
    pickTime(fromDateTimeKeys(toDateKey(new Date()), settings![key]), (d) => updateSettings(db, { [key]: toTimeKey(d) }));
  }

  return (
    <Screen variant="stack">
      <SectionHeader title="Your reminders" />
      {settings.reminders.length > 0 ? (
        <Card flush>
          {settings.reminders.map((r, i) => {
            const quiet = r.enabled && r.frequency !== 'interval' && inQuietHours(r.time, settings);
            return (
              <ListRow
                key={r.id}
                divider={i > 0}
                leading={<Icon name="bell" color={r.enabled ? colors.primary : colors.textMuted} />}
                title={r.label || 'Reminder'}
                subtitle={`${describeReminder(r)}${quiet ? ' · in quiet hours, muted' : ''}`}
                onPress={() => router.push({ pathname: '/reminder', params: { id: r.id } })}
                trailing={
                  <Switch
                    value={r.enabled}
                    onValueChange={(v) => toggleReminder(r.id, v)}
                    trackColor={{ false: colors.border, true: `${colors.primary}88` }}
                    thumbColor={r.enabled ? colors.primary : colors.card}
                    accessibilityLabel={`${r.label || 'Reminder'} on or off`}
                  />
                }
              />
            );
          })}
        </Card>
      ) : (
        <Text tone="secondary">No reminders yet.</Text>
      )}
      <Button label="Add reminder" icon="add" variant="secondary" onPress={() => router.push('/reminder')} />

      <SectionHeader title="Alerts" />
      <Card flush>
        <SwitchRow
          leading={<Icon name="repeat" color={colors.primary} />}
          title="Payment due alerts"
          subtitle="At 9 AM on the day a planned payment is due"
          value={settings.dueReminders}
          onValueChange={(v) => toggle('dueReminders', v)}
        />
        <SwitchRow
          divider
          leading={<Icon name="upload" color={colors.primary} />}
          title="Backup reminder"
          subtitle="Weekly until you export a backup from Settings"
          value={settings.backupReminder}
          onValueChange={(v) => toggle('backupReminder', v)}
        />
      </Card>
      {settings.backupReminder ? (
        <Text variant="caption" tone="secondary">
          {backupHint(settings)}
        </Text>
      ) : null}

      <SectionHeader title="Do Not Disturb" />
      <Card flush>
        <SwitchRow
          leading={<Icon name="pause" color={colors.primary} />}
          title="Quiet hours"
          subtitle="Your reminders stay silent during this time"
          value={settings.dndEnabled}
          onValueChange={(dndEnabled) => updateSettings(db, { dndEnabled })}
        />
      </Card>
      {settings.dndEnabled ? (
        <View style={styles.row}>
          <PickerButton icon="clock" label={`From ${formatTime(settings.dndStart)}`} onPress={() => changeQuietTime('dndStart')} />
          <PickerButton icon="clock" label={`To ${formatTime(settings.dndEnd)}`} onPress={() => changeQuietTime('dndEnd')} />
        </View>
      ) : null}

      <Text variant="caption" tone="muted">
        Reminders are scheduled on this phone; nothing is sent to a server.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
