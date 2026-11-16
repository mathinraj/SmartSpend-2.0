import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { FormScreen } from '@/components/ui/form-screen';
import { Field, TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { createAccount, deleteAccount, updateAccount, type AccountInput } from '@/db/accounts';
import { countTransactionsForAccount } from '@/db/transactions';
import { useSettings } from '@/hooks/use-settings';
import { ACCOUNT_SUBTYPES, ACCOUNT_TYPE_OPTIONS, accountEmoji } from '@/lib/accounts';
import { parseAmount, sanitizeAmountInput } from '@/lib/format';
import type { Account, AccountType } from '@/types/models';

function parseDay(text: string): number | null {
  const day = Number.parseInt(text, 10);
  return day >= 1 && day <= 31 ? day : null;
}

function initialBalanceText(account: Account | undefined): string {
  if (!account) return '';
  // Credit card balances are stored negative but entered as the positive amount used.
  const isCredit = account.type === 'card' && account.subType === 'credit';
  return String(isCredit ? Math.abs(account.balance) : account.balance);
}

export interface AccountFormProps {
  /** The account being edited; omit to create a new one. */
  initial?: Account;
}

export function AccountForm({ initial }: AccountFormProps) {
  const db = useSQLiteContext();
  const settings = useSettings();
  const currency = settings?.currency ?? 'INR';

  const [type, setType] = useState<AccountType>(initial?.type ?? 'bank');
  const [subType, setSubType] = useState(initial?.subType ?? null);
  const [name, setName] = useState(initial?.name ?? '');
  const [balance, setBalance] = useState(initialBalanceText(initial));
  const [creditLimit, setCreditLimit] = useState(initial?.creditLimit ? String(initial.creditLimit) : '');
  const [billingDay, setBillingDay] = useState(initial?.billingDay ? String(initial.billingDay) : '');
  const [dueDay, setDueDay] = useState(initial?.dueDay ? String(initial.dueDay) : '');
  const [saving, setSaving] = useState(false);

  const subTypes = ACCOUNT_SUBTYPES[type];
  const isCredit = type === 'card' && subType === 'credit';
  const dayProblem =
    (billingDay && !parseDay(billingDay)) || (dueDay && !parseDay(dueDay)) ? 'Days must be between 1 and 31' : null;
  const problem = !name.trim() ? 'Enter a name' : isCredit ? dayProblem : null;

  function changeType(next: AccountType) {
    setType(next);
    setSubType(null);
  }

  async function save() {
    if (problem || saving) return;
    setSaving(true);
    const amount = parseAmount(balance);
    const input: AccountInput = {
      name: name.trim(),
      type,
      subType: subTypes ? subType : null,
      balance: isCredit ? -Math.abs(amount) : amount,
      icon: initial?.icon ?? null,
      color: initial?.color ?? null,
      creditLimit: isCredit ? parseAmount(creditLimit) || null : null,
      billingDay: isCredit ? parseDay(billingDay) : null,
      dueDay: isCredit ? parseDay(dueDay) : null,
    };
    try {
      if (initial) await updateAccount(db, initial.id, input);
      else await createAccount(db, input);
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not save', error instanceof Error ? error.message : String(error));
    }
  }

  async function confirmDelete() {
    if (!initial) return;
    const count = await countTransactionsForAccount(db, initial.id);
    const message =
      count > 0
        ? `${count} transaction${count === 1 ? '' : 's'} will stay in your history, marked as from a deleted account.`
        : 'This account has no transactions.';
    Alert.alert(`Delete ${initial.name}?`, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteAccount(db, initial.id);
        },
      },
    ]);
  }

  return (
    <FormScreen
      footer={
        <Button
          label={problem ?? (initial ? 'Save changes' : 'Add account')}
          icon={problem ? undefined : 'check'}
          disabled={!!problem || saving}
          onPress={save}
        />
      }>
      <Field label="Type">
        <ChipGroup>
          {ACCOUNT_TYPE_OPTIONS.map((option) => (
            <Chip
              key={option.type}
              label={option.label}
              emoji={accountEmoji({ type: option.type, icon: null }, currency)}
              selected={option.type === type}
              onPress={() => changeType(option.type)}
            />
          ))}
        </ChipGroup>
      </Field>

      {subTypes ? (
        <Field label={type === 'card' ? 'Card type' : 'Account type'} hint="Optional">
          <ChipGroup>
            {subTypes.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                selected={s.id === subType}
                onPress={() => setSubType(s.id === subType ? null : s.id)}
              />
            ))}
          </ChipGroup>
        </Field>
      ) : null}

      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder={type === 'card' ? 'e.g. HDFC Credit Card' : type === 'bank' ? 'e.g. HDFC Savings' : 'e.g. Paytm Wallet'}
        autoFocus={!initial}
        maxLength={40}
      />

      <TextField
        label={isCredit ? 'Amount used' : initial ? 'Current balance' : 'Opening balance'}
        hint={
          isCredit
            ? 'Outstanding amount on the card. Enter 0 if nothing is due.'
            : initial
              ? 'Changing this corrects the balance without adding a transaction.'
              : undefined
        }
        value={balance}
        onChangeText={(text) => setBalance(text.startsWith('-') && !isCredit ? `-${sanitizeAmountInput(text)}` : sanitizeAmountInput(text))}
        placeholder="0"
        keyboardType="decimal-pad"
      />

      {isCredit ? (
        <>
          <TextField
            label="Credit limit"
            hint="Optional"
            value={creditLimit}
            onChangeText={(text) => setCreditLimit(sanitizeAmountInput(text))}
            placeholder="e.g. 100000"
            keyboardType="decimal-pad"
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label="Bill day"
                value={billingDay}
                onChangeText={(text) => setBillingDay(text.replace(/\D/g, '').slice(0, 2))}
                placeholder="1–31"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="Due day"
                value={dueDay}
                onChangeText={(text) => setDueDay(text.replace(/\D/g, '').slice(0, 2))}
                placeholder="1–31"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </>
      ) : null}

      {initial ? <Button label="Delete account" icon="delete" variant="destructive" onPress={confirmDelete} /> : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  flex: {
    flex: 1,
  },
});
