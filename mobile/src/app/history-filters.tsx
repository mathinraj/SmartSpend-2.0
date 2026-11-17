import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { FormScreen } from '@/components/ui/form-screen';
import { PickerButton } from '@/components/ui/picker-button';
import { Field, Input } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { listAccounts } from '@/db/accounts';
import { listCategories } from '@/db/categories';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { accountEmoji } from '@/lib/accounts';
import { formatDayLabel, parseAmount, parseDateKey, sanitizeAmountInput, toDateKey } from '@/lib/format';
import { activeFilterCount, setHistoryFilters, useHistoryFilters, type HistoryFilters } from '@/lib/history-filters';
import { pickDate } from '@/lib/pickers';

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function amountText(value: number | null): string {
  return value === null ? '' : String(value);
}

function amountValue(text: string): number | null {
  return text.trim() === '' ? null : parseAmount(text);
}

export default function HistoryFiltersScreen() {
  const settings = useSettings();
  const applied = useHistoryFilters();
  const accounts = useDbQuery(listAccounts, ['accounts']);
  const expenseCategories = useDbQuery(listCategories, ['categories', 'subcategories'], 'expense');
  const incomeCategories = useDbQuery(listCategories, ['categories', 'subcategories'], 'income');

  const [categoryIds, setCategoryIds] = useState(applied.categoryIds);
  const [accountIds, setAccountIds] = useState(applied.accountIds);
  const [from, setFrom] = useState(applied.from);
  const [to, setTo] = useState(applied.to);
  const [minAmount, setMinAmount] = useState(amountText(applied.minAmount));
  const [maxAmount, setMaxAmount] = useState(amountText(applied.maxAmount));

  if (!accounts || !expenseCategories || !incomeCategories) return null;

  const currency = settings?.currency ?? 'INR';
  const draft: HistoryFilters = {
    categoryIds,
    accountIds,
    from,
    to,
    minAmount: amountValue(minAmount),
    maxAmount: amountValue(maxAmount),
  };
  const problem =
    from && to && from > to
      ? 'Start date is after end date'
      : draft.minAmount !== null && draft.maxAmount !== null && draft.minAmount > draft.maxAmount
        ? 'Minimum is more than maximum'
        : null;

  function apply() {
    if (problem) return;
    setHistoryFilters(draft);
    router.back();
  }

  function clearAll() {
    setCategoryIds([]);
    setAccountIds([]);
    setFrom(null);
    setTo(null);
    setMinAmount('');
    setMaxAmount('');
  }

  return (
    <FormScreen
      footer={
        <Button
          label={problem ?? 'Show results'}
          icon={problem ? undefined : 'check'}
          disabled={!!problem}
          onPress={apply}
        />
      }>
      <Field label="Expense categories">
        <ChipGroup>
          {expenseCategories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              emoji={c.icon}
              selected={categoryIds.includes(c.id)}
              onPress={() => setCategoryIds((list) => toggle(list, c.id))}
            />
          ))}
        </ChipGroup>
      </Field>

      <Field label="Income categories">
        <ChipGroup>
          {incomeCategories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              emoji={c.icon}
              selected={categoryIds.includes(c.id)}
              onPress={() => setCategoryIds((list) => toggle(list, c.id))}
            />
          ))}
        </ChipGroup>
      </Field>

      {accounts.length > 0 ? (
        <Field label="Accounts" hint="Transfers match if either side is selected.">
          <ChipGroup>
            {accounts.map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                emoji={accountEmoji(a, currency)}
                selected={accountIds.includes(a.id)}
                onPress={() => setAccountIds((list) => toggle(list, a.id))}
              />
            ))}
          </ChipGroup>
        </Field>
      ) : null}

      <Field label="Date range">
        <View style={styles.row}>
          <PickerButton
            icon="calendar"
            label={from ? formatDayLabel(from) : 'Any start'}
            onPress={() => pickDate(from ? parseDateKey(from) : new Date(), (d) => setFrom(toDateKey(d)))}
          />
          <PickerButton
            icon="calendar"
            label={to ? formatDayLabel(to) : 'Any end'}
            onPress={() => pickDate(to ? parseDateKey(to) : new Date(), (d) => setTo(toDateKey(d)))}
          />
        </View>
        {from || to ? (
          <View style={styles.inlineAction}>
            <Button
              label="Clear dates"
              size="small"
              variant="secondary"
              onPress={() => {
                setFrom(null);
                setTo(null);
              }}
            />
          </View>
        ) : null}
      </Field>

      <Field label="Amount range">
        <View style={styles.row}>
          <Input
            style={styles.flex}
            value={minAmount}
            onChangeText={(text) => setMinAmount(sanitizeAmountInput(text))}
            placeholder="Min"
            keyboardType="decimal-pad"
            accessibilityLabel="Minimum amount"
          />
          <Input
            style={styles.flex}
            value={maxAmount}
            onChangeText={(text) => setMaxAmount(sanitizeAmountInput(text))}
            placeholder="Max"
            keyboardType="decimal-pad"
            accessibilityLabel="Maximum amount"
          />
        </View>
      </Field>

      {activeFilterCount(draft) > 0 ? (
        <Button label="Clear all filters" icon="close" variant="destructive" onPress={clearAll} />
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  flex: {
    flex: 1,
  },
  inlineAction: {
    alignSelf: 'flex-start',
  },
});
