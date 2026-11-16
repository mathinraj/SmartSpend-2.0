import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormScreen } from '@/components/ui/form-screen';
import { Icon } from '@/components/ui/icon';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { Field, TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { addSplitEntry } from '@/db/splits';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLabel, parseAmount, parseDateKey, sanitizeAmountInput, toDateKey } from '@/lib/format';
import { pickDate } from '@/lib/pickers';

type EntryType = 'split_paid' | 'split_owed';

export default function SplitEntryScreen() {
  const { person } = useLocalSearchParams<{ person: string }>();
  const db = useSQLiteContext();
  const colors = useTheme();
  const [type, setType] = useState<EntryType>('split_paid');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toDateKey(new Date()));

  const value = parseAmount(amount);
  const problem = value <= 0 ? 'Enter an amount' : null;

  async function save() {
    if (problem) return;
    await addSplitEntry(db, {
      type,
      person,
      amount: value,
      direction: null,
      note: note.trim() || null,
      date,
      transactionId: null,
    });
    router.back();
  }

  return (
    <FormScreen
      footer={<Button label={problem ?? 'Save'} icon={problem ? undefined : 'check'} disabled={!!problem} onPress={save} />}>
      <SegmentedControl
        options={[
          { value: 'split_paid', label: 'I paid for them' },
          { value: 'split_owed', label: 'They paid for me' },
        ]}
        value={type}
        onChange={setType}
      />
      <TextField
        label={type === 'split_paid' ? `${person}'s share` : 'Your share'}
        hint={
          type === 'split_paid'
            ? `Adds to what ${person} owes you.`
            : `Adds to what you owe ${person}. Doesn't change your account balances.`
        }
        value={amount}
        onChangeText={(text) => setAmount(sanitizeAmountInput(text))}
        placeholder="0"
        keyboardType="decimal-pad"
        autoFocus
      />
      <Field label="Date">
        <View style={[styles.pickerClip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => pickDate(parseDateKey(date), (d) => setDate(toDateKey(d)))}
            android_ripple={{ color: colors.border }}
            style={styles.picker}>
            <Icon name="calendar" size={20} color={colors.primary} />
            <Text variant="bodyStrong">{formatDayLabel(date)}</Text>
          </Pressable>
        </View>
      </Field>
      <TextField label="Note" hint="Optional" value={note} onChangeText={setNote} placeholder="e.g. Dinner at Toit" maxLength={80} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  pickerClip: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 50,
    paddingHorizontal: Spacing.lg,
  },
});
