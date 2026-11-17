import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { FormScreen } from '@/components/ui/form-screen';
import { PickerButton } from '@/components/ui/picker-button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SwitchRow } from '@/components/ui/switch-row';
import { Text } from '@/components/ui/text';
import { Field, TextField } from '@/components/ui/text-field';
import { listAccounts } from '@/db/accounts';
import { addSplitEntry, addSplitOwed, deleteSplitEntry, getSplitEntry, updateSplitEntry } from '@/db/splits';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { accountEmoji } from '@/lib/accounts';
import { formatDayLabel, parseAmount, parseDateKey, sanitizeAmountInput, toDateKey } from '@/lib/format';
import { pickDate } from '@/lib/pickers';
import { entryDisplay } from '@/lib/splits';
import type { Account, SplitEntry } from '@/types/models';

type NewEntryType = 'split_paid' | 'split_owed';

/** `?person=` adds an entry for that person; `?id=` edits an existing one. */
export default function SplitEntryScreen() {
  const { person, id } = useLocalSearchParams<{ person?: string; id?: string }>();
  const entry = useDbQuery(getSplitEntry, ['split_entries'], id ?? '');
  const accounts = useDbQuery(listAccounts, ['accounts']);

  if (!accounts || (id && entry === undefined)) return null;
  if (id && !entry) {
    return (
      <Screen variant="stack">
        <EmptyState emoji="🔍" title="Entry not found" message="It may have been deleted." />
      </Screen>
    );
  }
  return <SplitEntryForm person={entry?.person ?? person ?? ''} initial={entry ?? undefined} accounts={accounts} />;
}

interface SplitEntryFormProps {
  person: string;
  initial?: SplitEntry;
  accounts: Account[];
}

function SplitEntryForm({ person, initial, accounts }: SplitEntryFormProps) {
  const db = useSQLiteContext();
  const settings = useSettings();
  const currency = settings?.currency ?? 'INR';
  const [type, setType] = useState<NewEntryType>('split_paid');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial?.date ?? toDateKey(new Date()));
  const [received, setReceived] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? null);
  const [saving, setSaving] = useState(false);

  const value = parseAmount(amount);
  const problem = value <= 0 ? 'Enter an amount' : null;
  const offerAccount = !initial && type === 'split_owed' && accounts.length > 0;
  const amountLabel = initial
    ? 'Amount'
    : type === 'split_paid'
      ? `${person}'s share`
      : 'Your share';
  const amountHint = initial
    ? undefined
    : type === 'split_paid'
      ? `Adds to what ${person} owes you.`
      : `Adds to what you owe ${person}.`;

  async function save() {
    if (problem || saving) return;
    setSaving(true);
    const fields = { amount: value, note: note.trim() || null, date };
    try {
      if (initial) await updateSplitEntry(db, initial.id, fields);
      else if (type === 'split_owed') await addSplitOwed(db, { person, ...fields }, offerAccount && received ? accountId : null);
      else await addSplitEntry(db, { type, person, direction: null, transactionId: null, ...fields });
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not save', error instanceof Error ? error.message : String(error));
    }
  }

  function confirmDelete() {
    if (!initial) return;
    Alert.alert('Delete this entry?', initial.transactionId ? 'The linked transaction is not changed.' : undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteSplitEntry(db, initial.id);
        },
      },
    ]);
  }

  return (
    <FormScreen
      footer={
        <Button
          label={problem ?? (initial ? 'Save changes' : 'Save')}
          icon={problem ? undefined : 'check'}
          disabled={!!problem || saving}
          onPress={save}
        />
      }>
      <Stack.Screen options={{ title: initial ? 'Edit entry' : `Add entry · ${person}` }} />
      {initial ? (
        <Card>
          <Text variant="bodyStrong">{entryDisplay(initial).label}</Text>
          <Text variant="caption" tone="secondary">
            {initial.transactionId
              ? 'Changes here only update the split balance, not the linked transaction or account.'
              : `With ${person}`}
          </Text>
        </Card>
      ) : (
        <SegmentedControl
          options={[
            { value: 'split_paid', label: 'I paid for them' },
            { value: 'split_owed', label: 'They paid for me' },
          ]}
          value={type}
          onChange={setType}
        />
      )}
      <TextField
        label={amountLabel}
        hint={amountHint}
        value={amount}
        onChangeText={(text) => setAmount(sanitizeAmountInput(text))}
        placeholder="0"
        keyboardType="decimal-pad"
        autoFocus={!initial}
      />
      <Field label="Date">
        <View style={styles.row}>
          <PickerButton
            icon="calendar"
            label={formatDayLabel(date)}
            onPress={() => pickDate(parseDateKey(date), (d) => setDate(toDateKey(d)))}
          />
        </View>
      </Field>
      <TextField label="Note" hint="Optional" value={note} onChangeText={setNote} placeholder="e.g. Dinner at Toit" maxLength={80} />

      {offerAccount ? (
        <Card flush>
          <SwitchRow
            title="They sent me the money"
            subtitle="Logs it as income in one of your accounts. Leave off if they paid a bill for you."
            value={received}
            onValueChange={setReceived}
          />
        </Card>
      ) : null}
      {offerAccount && received ? (
        <Field label="Received in">
          <ChipGroup>
            {accounts.map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                emoji={accountEmoji(a, currency)}
                selected={a.id === accountId}
                onPress={() => setAccountId(a.id)}
              />
            ))}
          </ChipGroup>
        </Field>
      ) : null}

      {initial ? <Button label="Delete entry" icon="delete" variant="destructive" onPress={confirmDelete} /> : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});
