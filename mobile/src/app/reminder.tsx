import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { FormScreen } from '@/components/ui/form-screen';
import { PickerButton } from '@/components/ui/picker-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Field, TextField } from '@/components/ui/text-field';
import { DEFAULT_REMINDER, updateSettings } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { showDialog } from '@/lib/dialog';
import { formatTime, fromDateTimeKeys, toDateKey, toTimeKey } from '@/lib/format';
import { generateId } from '@/lib/id';
import { confirmNotifications } from '@/lib/notifications';
import { pickTime } from '@/lib/pickers';
import { INTERVAL_OPTIONS, inQuietHours, intervalLabel, WEEKDAY_NAMES } from '@/lib/reminders';
import type { CustomReminder, ReminderFrequency, Settings } from '@/types/models';

const FREQUENCY_OPTIONS: { value: ReminderFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'interval', label: 'Repeating' },
];

/** Adds a reminder, or edits the one in `?id=`. */
export default function ReminderScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const settings = useSettings();
  if (!settings) return null;
  const existing = id ? settings.reminders.find((r) => r.id === id) : undefined;
  return <ReminderForm settings={settings} initial={existing} />;
}

function ReminderForm({ settings, initial }: { settings: Settings; initial?: CustomReminder }) {
  const db = useSQLiteContext();
  const [label, setLabel] = useState(initial?.label ?? '');
  const [message, setMessage] = useState(initial?.message ?? DEFAULT_REMINDER.message);
  const [frequency, setFrequency] = useState<ReminderFrequency>(initial?.frequency ?? 'daily');
  const [time, setTime] = useState(initial?.time ?? DEFAULT_REMINDER.time);
  const [day, setDay] = useState(initial?.day ?? new Date().getDay());
  const [intervalMinutes, setIntervalMinutes] = useState(initial?.intervalMinutes ?? 60);

  const problem = !label.trim() ? 'Give it a name' : null;
  const quiet = frequency !== 'interval' && inQuietHours(time, settings);

  async function save() {
    if (problem) return;
    if (!(await confirmNotifications())) return;
    const reminder: CustomReminder = {
      id: initial?.id ?? generateId(),
      label: label.trim(),
      message: message.trim(),
      time,
      frequency,
      day,
      intervalMinutes,
      enabled: true,
    };
    const reminders = initial
      ? settings.reminders.map((r) => (r.id === initial.id ? reminder : r))
      : [...settings.reminders, reminder];
    await updateSettings(db, { reminders });
    router.back();
  }

  function confirmDelete() {
    if (!initial) return;
    showDialog(`Delete "${initial.label || 'Reminder'}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          router.back();
          updateSettings(db, { reminders: settings.reminders.filter((r) => r.id !== initial.id) });
        },
      },
    ]);
  }

  return (
    <FormScreen footer={<Button label={problem ?? 'Save reminder'} icon={problem ? undefined : 'check'} disabled={!!problem} onPress={save} />}>
      <Stack.Screen options={{ title: initial ? 'Edit reminder' : 'Add reminder' }} />
      <TextField label="Name" value={label} onChangeText={setLabel} placeholder="e.g. Log expenses" maxLength={40} autoFocus={!initial} />
      <TextField
        label="Notification text"
        value={message}
        onChangeText={setMessage}
        placeholder="What the notification says"
        maxLength={120}
      />
      <Field label="Repeat">
        <SegmentedControl options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
      </Field>

      {frequency === 'weekly' ? (
        <Field label="Day">
          <ChipGroup>
            {WEEKDAY_NAMES.map((name, i) => (
              <Chip key={name} label={name.slice(0, 3)} selected={i === day} onPress={() => setDay(i)} />
            ))}
          </ChipGroup>
        </Field>
      ) : null}

      {frequency === 'interval' ? (
        <Field label="Every" hint="Times during quiet hours are skipped. Upcoming reminders are scheduled a day ahead each time you open the app.">
          <ChipGroup>
            {INTERVAL_OPTIONS.map((m) => (
              <Chip key={m} label={intervalLabel(m)} selected={m === intervalMinutes} onPress={() => setIntervalMinutes(m)} />
            ))}
          </ChipGroup>
        </Field>
      ) : (
        <Field label="Time" hint={quiet ? 'This time is inside your quiet hours, so the reminder stays silent.' : undefined}>
          <View style={styles.row}>
            <PickerButton
              icon="clock"
              label={formatTime(time)}
              onPress={() => pickTime(fromDateTimeKeys(toDateKey(new Date()), time), (d) => setTime(toTimeKey(d)))}
            />
          </View>
        </Field>
      )}

      {initial ? <Button label="Delete reminder" icon="delete" variant="destructive" onPress={confirmDelete} /> : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});
