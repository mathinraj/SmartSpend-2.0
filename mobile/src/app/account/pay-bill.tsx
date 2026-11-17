import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { FormScreen } from '@/components/ui/form-screen';
import { PickerButton } from '@/components/ui/picker-button';
import { Screen } from '@/components/ui/screen';
import { Field, TextField } from '@/components/ui/text-field';
import { getAccount, listAccounts } from '@/db/accounts';
import { addTransaction } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { accountEmoji, isCreditCard } from '@/lib/accounts';
import { formatCurrency, formatDayLabel, parseAmount, parseDateKey, sanitizeAmountInput, toDateKey, toTimeKey } from '@/lib/format';
import { pickDate } from '@/lib/pickers';
import type { Account } from '@/types/models';

export default function PayBillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const card = useDbQuery(getAccount, ['accounts'], id);
  const accounts = useDbQuery(listAccounts, ['accounts']);
  if (card === undefined || !accounts) return null;
  if (card === null || !isCreditCard(card)) {
    return (
      <Screen variant="stack">
        <EmptyState emoji="💳" title="Card not found" message="It may have been deleted." />
      </Screen>
    );
  }
  return <PayBillForm card={card} sources={accounts.filter((a) => a.id !== card.id && !isCreditCard(a))} />;
}

/** Records a credit card bill payment as a transfer, so it isn't counted as spending twice. */
function PayBillForm({ card, sources }: { card: Account; sources: Account[] }) {
  const db = useSQLiteContext();
  const settings = useSettings();
  const currency = settings?.currency ?? 'INR';
  const owed = Math.max(0, -card.balance);
  const [amount, setAmount] = useState(owed > 0 ? String(owed) : '');
  const [fromId, setFromId] = useState((sources.find((a) => a.type === 'bank') ?? sources[0])?.id ?? null);
  const [date, setDate] = useState(toDateKey(new Date()));
  const [note, setNote] = useState(`Bill payment — ${card.name}`);
  const [saving, setSaving] = useState(false);

  const value = parseAmount(amount);
  const problem =
    sources.length === 0 ? 'Add a bank account first' : value <= 0 ? 'Enter an amount' : !fromId ? 'Choose where it’s paid from' : null;

  async function save() {
    if (problem || saving) return;
    setSaving(true);
    await addTransaction(db, {
      type: 'transfer',
      amount: value,
      accountId: null,
      fromAccountId: fromId,
      toAccountId: card.id,
      categoryId: null,
      subcategoryId: null,
      note: note.trim() || null,
      date,
      time: toTimeKey(new Date()),
      isSplit: false,
      splitAmount: null,
      deductMyShare: false,
      source: 'manual',
      sourceRef: null,
    });
    router.back();
  }

  return (
    <FormScreen
      footer={
        <Button label={problem ?? 'Record payment'} icon={problem ? undefined : 'check'} disabled={!!problem || saving} onPress={save} />
      }>
      <TextField
        label={`Pay ${card.name}`}
        hint={
          owed > 0
            ? `${formatCurrency(owed, currency)} is due. The payment is a transfer, so it isn’t counted as spending.`
            : 'Nothing is due on this card right now.'
        }
        value={amount}
        onChangeText={(text) => setAmount(sanitizeAmountInput(text))}
        placeholder="0"
        keyboardType="decimal-pad"
        autoFocus={owed === 0}
      />
      {sources.length > 0 ? (
        <Field label="Paid from">
          <ChipGroup>
            {sources.map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                emoji={accountEmoji(a, currency)}
                selected={a.id === fromId}
                onPress={() => setFromId(a.id)}
              />
            ))}
          </ChipGroup>
        </Field>
      ) : null}
      <Field label="Date">
        <View style={styles.row}>
          <PickerButton
            icon="calendar"
            label={formatDayLabel(date)}
            onPress={() => pickDate(parseDateKey(date), (d) => setDate(toDateKey(d)))}
          />
        </View>
      </Field>
      <TextField label="Note" hint="Optional" value={note} onChangeText={setNote} maxLength={80} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});
