import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { FormScreen } from '@/components/ui/form-screen';
import { PickerButton } from '@/components/ui/picker-button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { Field, Input, TextField } from '@/components/ui/text-field';
import { getCurrency } from '@/constants/currencies';
import { Spacing } from '@/constants/theme';
import { listAccounts } from '@/db/accounts';
import { listCategories } from '@/db/categories';
import { addSplitExpense, equalShare, type SplitShare } from '@/db/splits';
import { addTransaction, updateTransaction, type NewTransaction } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { accountEmoji } from '@/lib/accounts';
import {
  formatCurrency,
  formatDayLabel,
  formatTime,
  fromDateTimeKeys,
  parseAmount,
  sanitizeAmountInput,
  toDateKey,
  toTimeKey,
} from '@/lib/format';
import { pickDate, pickTime } from '@/lib/pickers';
import type { TransactionListItem, TransactionType } from '@/types/models';

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

const SPLIT_MODE_OPTIONS: { value: 'equal' | 'custom'; label: string }[] = [
  { value: 'equal', label: 'Split equally' },
  { value: 'custom', label: 'Custom amounts' },
];

export interface TransactionFormProps {
  /** The transaction being edited; omit to create a new one. */
  initial?: TransactionListItem;
  defaultType?: TransactionType;
}

export function TransactionForm({ initial, defaultType = 'expense' }: TransactionFormProps) {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const accounts = useDbQuery(listAccounts, ['accounts']);
  const expenseCategories = useDbQuery(listCategories, ['categories', 'subcategories'], 'expense');
  const incomeCategories = useDbQuery(listCategories, ['categories', 'subcategories'], 'income');

  const [type, setType] = useState<TransactionType>(initial?.type ?? defaultType);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [accountId, setAccountId] = useState(initial?.accountId ?? null);
  const [fromAccountId, setFromAccountId] = useState(initial?.fromAccountId ?? null);
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId ?? null);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? null);
  const [subcategoryId, setSubcategoryId] = useState(initial?.subcategoryId ?? null);
  const [date, setDate] = useState(initial?.date ?? toDateKey(new Date()));
  const [time, setTime] = useState(initial ? initial.time : toTimeKey(new Date()));
  const [note, setNote] = useState(initial?.note ?? '');
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!accounts || !expenseCategories || !incomeCategories) return null;

  if (accounts.length === 0) {
    return (
      <Screen variant="stack">
        <EmptyState
          emoji="🏦"
          title="Add an account first"
          message="Transactions are recorded against a bank account, card, cash, or wallet."
          actions={<Button label="Add account" icon="add" onPress={() => router.replace('/account/new')} />}
        />
      </Screen>
    );
  }

  // Fall back to sensible defaults until the user picks something explicitly.
  const resolvedAccountId = accountId ?? accounts[0].id;
  const resolvedFromId = fromAccountId ?? accounts[0].id;
  const resolvedToId = toAccountId ?? accounts.find((a) => a.id !== resolvedFromId)?.id ?? null;

  const categories = type === 'income' ? incomeCategories : expenseCategories;
  const category = categories.find((c) => c.id === categoryId);
  const value = parseAmount(amount);
  const currency = settings?.currency ?? 'INR';
  const currencySymbol = getCurrency(currency)?.symbol ?? '';
  const people = settings?.splitPeople ?? [];
  // Splits are created with the expense; editing one later doesn't rewrite the shares.
  const canSplit = type === 'expense' && !initial;
  const splitPeople = canSplit ? splitWith.filter((p) => people.includes(p)) : [];
  const shares: SplitShare[] = splitPeople.map((person) => ({
    person,
    amount: splitMode === 'equal' ? equalShare(value, splitPeople.length) : parseAmount(customShares[person] ?? ''),
  }));
  const othersTotal = Math.round(shares.reduce((sum, s) => sum + s.amount, 0) * 100) / 100;
  const deductMyShare = settings?.splitBankDeduction === 'my_share';

  function toggleSplitPerson(person: string) {
    setSplitWith((current) => (current.includes(person) ? current.filter((p) => p !== person) : [...current, person]));
  }

  function splitProblem(): string | null {
    if (shares.length === 0 || splitMode === 'equal') return null;
    const missing = shares.find((s) => s.amount <= 0);
    if (missing) return `Enter ${missing.person}'s share`;
    if (othersTotal > value) return 'Shares are more than the amount';
    return null;
  }

  function validationProblem(): string | null {
    if (value <= 0) return 'Enter an amount';
    if (initial?.isSplit && value < (initial.splitAmount ?? 0)) {
      return `Amount can't be less than others' shares`;
    }
    if (type === 'transfer') {
      if (!accounts?.some((a) => a.id === resolvedFromId) || !accounts?.some((a) => a.id === resolvedToId)) {
        return 'Choose both accounts';
      }
      if (resolvedFromId === resolvedToId) return 'Choose two different accounts';
      return null;
    }
    if (!accounts?.some((a) => a.id === resolvedAccountId)) return 'Choose an account';
    if (!category) return 'Choose a category';
    return splitProblem();
  }
  const problem = validationProblem();

  function changeType(next: TransactionType) {
    if (next === type) return;
    setType(next);
    setCategoryId(null);
    setSubcategoryId(null);
  }

  function selectCategory(id: string) {
    setCategoryId(id);
    setSubcategoryId(null);
  }

  async function save() {
    if (problem || saving) return;
    setSaving(true);
    const isTransfer = type === 'transfer';
    const input: NewTransaction = {
      type,
      amount: value,
      accountId: isTransfer ? null : resolvedAccountId,
      fromAccountId: isTransfer ? resolvedFromId : null,
      toAccountId: isTransfer ? resolvedToId : null,
      categoryId: isTransfer ? null : categoryId,
      subcategoryId: type === 'expense' ? subcategoryId : null,
      note: note.trim() || null,
      date,
      time,
      isSplit: initial?.isSplit ?? false,
      splitAmount: initial?.splitAmount ?? null,
      deductMyShare: initial?.deductMyShare ?? false,
      source: initial?.source ?? 'manual',
      sourceRef: initial?.sourceRef ?? null,
    };
    try {
      if (initial) await updateTransaction(db, initial.id, input);
      else if (shares.length > 0) await addSplitExpense(db, { ...input, deductMyShare }, shares);
      else await addTransaction(db, input);
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not save', error instanceof Error ? error.message : String(error));
    }
  }

  const amountColor = type === 'income' ? colors.success : type === 'transfer' ? colors.info : colors.text;

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
      <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={changeType} />

      <Card style={styles.amountCard}>
        <Text variant="label" tone="secondary">
          Amount
        </Text>
        <View style={styles.amountRow}>
          <Text style={[styles.amountText, { color: amountColor }]}>{currencySymbol}</Text>
          <TextInput
            value={amount}
            onChangeText={(text) => setAmount(sanitizeAmountInput(text))}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            cursorColor={colors.primary}
            keyboardType="decimal-pad"
            autoFocus={!initial}
            style={[styles.amountText, styles.amountInput, { color: amountColor }]}
            accessibilityLabel="Amount"
          />
        </View>
      </Card>

      {type === 'transfer' ? (
        <>
          <Field label="From">
            <ChipGroup>
              {accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  emoji={accountEmoji(a, currency)}
                  selected={a.id === resolvedFromId}
                  onPress={() => setFromAccountId(a.id)}
                />
              ))}
            </ChipGroup>
          </Field>
          <Field label="To">
            <ChipGroup>
              {accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  emoji={accountEmoji(a, currency)}
                  selected={a.id === resolvedToId}
                  onPress={() => setToAccountId(a.id)}
                />
              ))}
            </ChipGroup>
          </Field>
        </>
      ) : (
        <>
          <Field label="Account">
            <ChipGroup>
              {accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  emoji={accountEmoji(a, currency)}
                  selected={a.id === resolvedAccountId}
                  onPress={() => setAccountId(a.id)}
                />
              ))}
            </ChipGroup>
          </Field>
          <Field label="Category">
            <ChipGroup>
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  emoji={c.icon}
                  selected={c.id === categoryId}
                  onPress={() => selectCategory(c.id)}
                />
              ))}
              <Chip
                label="Manage"
                emoji="✏️"
                onPress={() => router.push({ pathname: '/categories', params: { kind: type === 'income' ? 'income' : 'expense' } })}
              />
            </ChipGroup>
          </Field>
          {type === 'expense' && category && category.subcategories.length > 0 ? (
            <Field label="Subcategory" hint="Optional">
              <ChipGroup>
                {category.subcategories.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.name}
                    selected={s.id === subcategoryId}
                    onPress={() => setSubcategoryId(s.id === subcategoryId ? null : s.id)}
                  />
                ))}
              </ChipGroup>
            </Field>
          ) : null}
          {canSplit ? (
            <Field
              label="Split with"
              hint={
                splitPeople.length > 0 && value > 0
                  ? `Others owe you ${formatCurrency(othersTotal, currency)} · your share ${formatCurrency(
                      Math.max(value - othersTotal, 0),
                      currency
                    )}. ${deductMyShare ? 'Only your share' : 'The full amount'} leaves your account.`
                  : 'Optional. Track who owes you their share.'
              }>
              <ChipGroup>
                {people.map((p) => (
                  <Chip key={p} label={p} emoji="👤" selected={splitPeople.includes(p)} onPress={() => toggleSplitPerson(p)} />
                ))}
                <Chip label="Add person" emoji="➕" onPress={() => router.push('/splits/add-person')} />
              </ChipGroup>
              {splitPeople.length > 0 ? (
                <SegmentedControl options={SPLIT_MODE_OPTIONS} value={splitMode} onChange={setSplitMode} />
              ) : null}
              {splitPeople.length > 0 && splitMode === 'custom'
                ? splitPeople.map((person) => (
                    <View key={person} style={styles.shareRow}>
                      <Text variant="bodyStrong" style={styles.shareName} numberOfLines={1}>
                        {person}
                      </Text>
                      <Input
                        style={styles.shareInput}
                        value={customShares[person] ?? ''}
                        onChangeText={(text) =>
                          setCustomShares((current) => ({ ...current, [person]: sanitizeAmountInput(text) }))
                        }
                        placeholder={`${currencySymbol}0`}
                        keyboardType="decimal-pad"
                        accessibilityLabel={`${person}'s share`}
                      />
                    </View>
                  ))
                : null}
            </Field>
          ) : null}
        </>
      )}

      <Field label="Date & time">
        <View style={styles.dateRow}>
          <PickerButton
            icon="calendar"
            label={formatDayLabel(date)}
            onPress={() => pickDate(fromDateTimeKeys(date, time), (d) => setDate(toDateKey(d)))}
          />
          <PickerButton
            icon="clock"
            label={time ? formatTime(time) : 'Add time'}
            onPress={() => pickTime(fromDateTimeKeys(date, time), (d) => setTime(toTimeKey(d)))}
          />
        </View>
      </Field>

      <TextField
        label="Note"
        hint="Optional"
        value={note}
        onChangeText={setNote}
        placeholder="What was this for?"
        returnKeyType="done"
        maxLength={120}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  amountCard: {
    gap: Spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  amountText: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  amountInput: {
    flex: 1,
    padding: 0,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  shareName: {
    flex: 1,
  },
  shareInput: {
    width: 140,
  },
});
