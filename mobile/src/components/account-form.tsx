import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { FormScreen } from '@/components/ui/form-screen';
import { Text } from '@/components/ui/text';
import { Field, Input, TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { createAccount, deleteAccount, listAccounts, updateAccount, type AccountInput } from '@/db/accounts';
import { updateSettings } from '@/db/settings';
import { countTransactionsForAccount } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { ACCOUNT_SUBTYPES, ACCOUNT_TYPE_OPTIONS, CUSTOM_TYPE_ICONS, accountEmoji, isCreditCard } from '@/lib/accounts';
import { showDialog } from '@/lib/dialog';
import { parseAmount, sanitizeAmountInput } from '@/lib/format';
import { logosAvailable, logoUrlForDomain, searchLogos, type LogoResult } from '@/lib/logos';
import type { Account, AccountType } from '@/types/models';

function parseDay(text: string): number | null {
  const day = Number.parseInt(text, 10);
  return day >= 1 && day <= 31 ? day : null;
}

function initialBalanceText(account: Account | undefined): string {
  if (!account) return '';
  // Credit card balances are stored negative but entered as the positive amount used.
  return String(isCreditCard(account) ? Math.abs(account.balance) : account.balance);
}

const BUILT_IN_TYPES = ACCOUNT_TYPE_OPTIONS.filter((o) => o.type !== 'custom');

export interface AccountFormProps {
  /** The account being edited; omit to create a new one. */
  initial?: Account;
}

export function AccountForm({ initial }: AccountFormProps) {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const accounts = useDbQuery(listAccounts, ['accounts']);
  const currency = settings?.currency ?? 'INR';
  const customTypes = settings?.customAccountTypes ?? [];

  const [type, setType] = useState<AccountType>(initial?.type ?? 'bank');
  const [customTypeId, setCustomTypeId] = useState(initial?.customTypeId ?? null);
  const [subType, setSubType] = useState(initial?.subType ?? null);
  const [name, setName] = useState(initial?.name ?? '');
  const [balance, setBalance] = useState(initialBalanceText(initial));
  const [creditLimit, setCreditLimit] = useState(initial?.creditLimit ? String(initial.creditLimit) : '');
  const [billingDay, setBillingDay] = useState(initial?.billingDay ? String(initial.billingDay) : '');
  const [dueDay, setDueDay] = useState(initial?.dueDay ? String(initial.dueDay) : '');
  const [creatingType, setCreatingType] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState(CUSTOM_TYPE_ICONS[0]);
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? null);
  const [logoQuery, setLogoQuery] = useState('');
  const [logoResults, setLogoResults] = useState<LogoResult[] | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const subTypes = ACCOUNT_SUBTYPES[type];

  async function findLogos() {
    const query = (logoQuery || name).trim();
    if (!query) return;
    setSearching(true);
    const results = await searchLogos(query);
    setLogoFailed(results === null);
    setLogoResults(results ?? null);
    setSearching(false);
  }
  const isCredit = type === 'card' && subType === 'credit';
  const customType = type === 'custom' ? customTypes.find((t) => t.id === customTypeId) : undefined;
  const customTypeInUse = !!customType && !!accounts?.some((a) => a.id !== initial?.id && a.customTypeId === customType.id);
  const dayProblem =
    (billingDay && !parseDay(billingDay)) || (dueDay && !parseDay(dueDay)) ? 'Days must be between 1 and 31' : null;
  const problem = !name.trim() ? 'Enter a name' : isCredit ? dayProblem : null;

  function changeType(next: AccountType, nextCustomTypeId: string | null = null) {
    setType(next);
    setCustomTypeId(nextCustomTypeId);
    setSubType(null);
    setCreatingType(false);
  }

  async function addCustomType() {
    const label = newTypeLabel.trim();
    if (!label) return;
    const id = `custom_${Date.now().toString(36)}`;
    await updateSettings(db, { customAccountTypes: [...customTypes, { id, label, icon: newTypeIcon }] });
    changeType('custom', id);
    setNewTypeLabel('');
  }

  function confirmDeleteType() {
    if (!customType) return;
    showDialog(`Delete the “${customType.label}” type?`, 'This account will move to Other.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          changeType('custom');
          updateSettings(db, { customAccountTypes: customTypes.filter((t) => t.id !== customType.id) });
        },
      },
    ]);
  }

  async function save() {
    if (problem || saving) return;
    setSaving(true);
    const amount = parseAmount(balance);
    // A custom type's emoji is copied onto the account; drop it again if the account leaves that type.
    const hadTypeIcon = initial?.type === 'custom' && !!initial.customTypeId;
    const input: AccountInput = {
      name: name.trim(),
      type,
      subType: subTypes ? subType : null,
      balance: isCredit ? -Math.abs(amount) : amount,
      icon: customType ? customType.icon : hadTypeIcon ? null : (initial?.icon ?? null),
      color: initial?.color ?? null,
      creditLimit: isCredit ? parseAmount(creditLimit) || null : null,
      billingDay: isCredit ? parseDay(billingDay) : null,
      dueDay: isCredit ? parseDay(dueDay) : null,
      customTypeId: customType?.id ?? null,
      logoUrl,
    };
    try {
      if (initial) await updateAccount(db, initial.id, input);
      else await createAccount(db, input);
      router.back();
    } catch (error) {
      setSaving(false);
      showDialog('Could not save', error instanceof Error ? error.message : String(error));
    }
  }

  async function confirmDelete() {
    if (!initial) return;
    const count = await countTransactionsForAccount(db, initial.id);
    const message =
      count > 0
        ? `${count} transaction${count === 1 ? '' : 's'} will stay in your history, marked as from a deleted account.`
        : 'This account has no transactions.';
    showDialog(`Delete ${initial.name}?`, message, [
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

  function openAnalytics() {
    if (!initial) return;
    router.back();
    router.navigate({ pathname: '/analytics', params: { account: initial.id } });
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
      {initial ? (
        <View style={styles.actions}>
          {isCreditCard(initial) ? (
            <View style={styles.flex}>
              <Button
                label="Pay bill"
                icon="transfer"
                size="small"
                onPress={() => router.push({ pathname: '/account/pay-bill', params: { id: initial.id } })}
              />
            </View>
          ) : null}
          <View style={styles.flex}>
            <Button label="View analytics" icon="chart" size="small" variant="secondary" onPress={openAnalytics} />
          </View>
        </View>
      ) : null}

      <Field label="Type">
        <ChipGroup>
          {BUILT_IN_TYPES.map((option) => (
            <Chip
              key={option.type}
              label={option.label}
              emoji={accountEmoji({ type: option.type, icon: null }, currency)}
              selected={option.type === type}
              onPress={() => changeType(option.type)}
            />
          ))}
          {customTypes.map((t) => (
            <Chip
              key={t.id}
              label={t.label}
              emoji={t.icon}
              selected={type === 'custom' && customTypeId === t.id}
              onPress={() => changeType('custom', t.id)}
            />
          ))}
          <Chip
            label="Other"
            emoji={accountEmoji({ type: 'custom', icon: null }, currency)}
            selected={type === 'custom' && !customType && !creatingType}
            onPress={() => changeType('custom')}
          />
          <Chip label="New type" emoji="➕" selected={creatingType} onPress={() => setCreatingType(!creatingType)} />
        </ChipGroup>
        {customType && !customTypeInUse ? (
          <View style={styles.inlineAction}>
            <Button label={`Delete “${customType.label}” type`} size="small" variant="destructive" onPress={confirmDeleteType} />
          </View>
        ) : null}
      </Field>

      {creatingType ? (
        <Field label="New account type" hint="e.g. Investments, Loans, Gold. It appears as its own group on the Accounts tab.">
          <ChipGroup>
            {CUSTOM_TYPE_ICONS.map((icon) => (
              <Chip key={icon} label={icon} selected={icon === newTypeIcon} onPress={() => setNewTypeIcon(icon)} />
            ))}
          </ChipGroup>
          <View style={styles.row}>
            <Input
              style={styles.flex}
              value={newTypeLabel}
              onChangeText={setNewTypeLabel}
              placeholder="Type name"
              maxLength={24}
              accessibilityLabel="New account type name"
            />
            <Button label="Add" icon="add" disabled={!newTypeLabel.trim()} onPress={addCustomType} />
          </View>
        </Field>
      ) : null}

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

      {logosAvailable ? (
        <Field label="Logo" hint="Optional. Logos load from Brandfetch over the internet.">
          {logoUrl ? (
            <View style={styles.row}>
              <Image source={{ uri: logoUrl }} style={styles.logo} accessibilityIgnoresInvertColors />
              <Button label="Remove logo" size="small" variant="destructive" onPress={() => setLogoUrl(null)} />
            </View>
          ) : null}
          <View style={styles.row}>
            <Input
              style={styles.flex}
              value={logoQuery}
              onChangeText={setLogoQuery}
              placeholder={name.trim() ? `Search "${name.trim()}"` : 'Bank or brand name'}
              returnKeyType="search"
              onSubmitEditing={findLogos}
              accessibilityLabel="Search logos"
            />
            <Button label={searching ? 'Searching…' : 'Search'} icon="search" size="small" disabled={searching} onPress={findLogos} />
          </View>
          {logoFailed ? (
            <Text variant="caption" tone="danger">
              Couldn&apos;t reach Brandfetch. Check your internet connection and try again.
            </Text>
          ) : null}
          {logoResults?.length === 0 ? (
            <Text variant="caption" tone="secondary">
              No logos found. Try the bank&apos;s short name, e.g. HDFC.
            </Text>
          ) : null}
          {logoResults && logoResults.length > 0 ? (
            <ChipGroup>
              {logoResults.map((r) => {
                const url = logoUrlForDomain(r.domain);
                return (
                  <Pressable
                    key={r.domain}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${r.name} logo`}
                    onPress={() => {
                      setLogoUrl(url);
                      setLogoResults(null);
                      setLogoQuery('');
                    }}
                    style={[styles.logoOption, { borderColor: url === logoUrl ? colors.primary : colors.border, backgroundColor: colors.card }]}>
                    <Image source={{ uri: url }} style={styles.logoSmall} accessibilityIgnoresInvertColors />
                    <Text variant="caption" numberOfLines={1} style={styles.logoName}>
                      {r.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ChipGroup>
          ) : null}
        </Field>
      ) : null}

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
    alignItems: 'center',
    gap: Spacing.md,
  },
  flex: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inlineAction: {
    alignSelf: 'flex-start',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  logoOption: {
    width: 96,
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: 12,
  },
  logoSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  logoName: {
    maxWidth: 80,
  },
});
