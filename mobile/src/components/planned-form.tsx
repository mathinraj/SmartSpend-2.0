import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { FormScreen } from '@/components/ui/form-screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Field, TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { listAccounts } from '@/db/accounts';
import { listCategories } from '@/db/categories';
import { createPlanned, deletePlanned, setPlannedEnabled, updatePlanned, type PlannedInput } from '@/db/planned';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { accountEmoji } from '@/lib/accounts';
import { formatLongDate, parseAmount, parseDateKey, sanitizeAmountInput, toDateKey } from '@/lib/format';
import { ensureNotificationPermission } from '@/lib/notifications';
import { pickDate } from '@/lib/pickers';
import { FREQUENCY_OPTIONS } from '@/lib/planned';
import type { PlannedFrequency, PlannedPayment } from '@/types/models';

export interface PlannedFormProps {
  /** The payment being edited; omit to create a new one. */
  initial?: PlannedPayment;
}

export function PlannedForm({ initial }: PlannedFormProps) {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const currency = settings?.currency ?? 'INR';
  const accounts = useDbQuery(listAccounts, ['accounts']);
  const categories = useDbQuery(listCategories, ['categories'], 'expense');

  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [frequency, setFrequency] = useState<PlannedFrequency>(initial?.frequency ?? 'monthly');
  const [nextDate, setNextDate] = useState(initial?.nextDate ?? toDateKey(new Date()));
  const [accountId, setAccountId] = useState(initial ? initial.accountId : undefined);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? null);
  const [note, setNote] = useState(initial?.note ?? '');
  const [saving, setSaving] = useState(false);

  if (!accounts || !categories) return null;

  // New payments default to the first account; `null` means the user chose "None".
  const resolvedAccountId = accountId === undefined ? (accounts[0]?.id ?? null) : accountId;
  const value = parseAmount(amount);
  const problem = !name.trim() ? 'Enter a name' : value <= 0 ? 'Enter an amount' : null;

  async function save() {
    if (problem || saving) return;
    setSaving(true);
    const input: PlannedInput = {
      name: name.trim(),
      amount: value,
      accountId: resolvedAccountId,
      categoryId,
      frequency,
      nextDate,
      note: note.trim() || null,
      enabled: initial?.enabled ?? true,
    };
    try {
      if (initial) await updatePlanned(db, initial.id, input);
      else await createPlanned(db, input);
      router.back();
      // First payment is the natural moment to ask; due alerts are on by default.
      if (!initial && settings?.dueReminders) ensureNotificationPermission();
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not save', error instanceof Error ? error.message : String(error));
    }
  }

  function confirmDelete() {
    if (!initial) return;
    Alert.alert(`Delete ${initial.name}?`, 'Transactions already logged from it are kept.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          router.back();
          deletePlanned(db, initial.id);
        },
      },
    ]);
  }

  async function togglePaused() {
    if (!initial) return;
    await setPlannedEnabled(db, initial.id, !initial.enabled);
    router.back();
  }

  return (
    <FormScreen
      footer={
        <Button
          label={problem ?? (initial ? 'Save changes' : 'Add payment')}
          icon={problem ? undefined : 'check'}
          disabled={!!problem || saving}
          onPress={save}
        />
      }>
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Netflix, Rent, Car EMI"
        autoFocus={!initial}
        maxLength={40}
      />
      <TextField
        label="Amount"
        value={amount}
        onChangeText={(text) => setAmount(sanitizeAmountInput(text))}
        placeholder="0"
        keyboardType="decimal-pad"
      />

      <Field label="Repeats">
        <ChipGroup>
          {FREQUENCY_OPTIONS.map((f) => (
            <Chip key={f.value} label={f.label} selected={f.value === frequency} onPress={() => setFrequency(f.value)} />
          ))}
        </ChipGroup>
      </Field>

      <Field label={frequency === 'once' ? 'Due date' : 'Next due date'}>
        <View style={[styles.pickerClip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => pickDate(parseDateKey(nextDate), (d) => setNextDate(toDateKey(d)))}
            android_ripple={{ color: colors.border }}
            style={styles.picker}>
            <Icon name="calendar" size={20} color={colors.primary} />
            <Text variant="bodyStrong">{formatLongDate(nextDate)}</Text>
          </Pressable>
        </View>
      </Field>

      <Field label="Pay from" hint="Marking it paid logs an expense from this account.">
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
          <Chip label="None" selected={resolvedAccountId === null} onPress={() => setAccountId(null)} />
        </ChipGroup>
      </Field>

      <Field label="Category" hint="Optional">
        <ChipGroup>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              emoji={c.icon}
              selected={c.id === categoryId}
              onPress={() => setCategoryId(c.id === categoryId ? null : c.id)}
            />
          ))}
        </ChipGroup>
      </Field>

      <TextField label="Note" hint="Optional" value={note} onChangeText={setNote} placeholder="e.g. Annual plan" maxLength={80} />

      {initial ? (
        <View style={styles.actions}>
          <Button
            label={initial.enabled ? 'Pause reminders' : 'Resume'}
            icon={initial.enabled ? 'pause' : 'play'}
            variant="secondary"
            onPress={togglePaused}
          />
          <Button label="Delete" icon="delete" variant="destructive" onPress={confirmDelete} />
        </View>
      ) : null}
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
  actions: {
    gap: Spacing.sm,
  },
});
