import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import {
  addSmsTransaction,
  dismissSms,
  dismissSmsFromSender,
  keepSmsSeparate,
  linkSmsToTransaction,
  mergeSmsDuplicate,
  undoSmsAdd,
} from '@/db/sms';
import { updateSettings } from '@/db/settings';
import { useTheme } from '@/hooks/use-theme';
import { accountEmoji } from '@/lib/accounts';
import { showDialog } from '@/lib/dialog';
import { formatCurrency, formatShortDate, formatTime } from '@/lib/format';
import { buildChoice } from '@/lib/sms/ingest';
import type { SmsReviewItem } from '@/lib/sms/review';
import type { Account, Category, Settings } from '@/types/models';

export interface SmsReviewCardProps {
  item: SmsReviewItem;
  accounts: Account[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  settings: Settings;
}

const MODE_LABEL: Record<string, string> = { upi: 'UPI', card: 'Card', atm: 'ATM', neft: 'NEFT', imps: 'IMPS', rtgs: 'RTGS', netbanking: 'Net banking', wallet: 'Wallet' };

export function SmsReviewCard({ item, accounts, expenseCategories, incomeCategories, settings }: SmsReviewCardProps) {
  const db = useSQLiteContext();
  const colors = useTheme();
  const { message, suggestion, duplicate } = item;
  const txn = message.parsed;
  const [accountId, setAccountId] = useState<string | null>(null);
  const [otherAccountId, setOtherAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showText, setShowText] = useState(false);
  const [busy, setBusy] = useState(false);
  const currency = settings.currency;

  async function run(task: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } catch (error) {
      showDialog('Something went wrong', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  function report() {
    router.push({ pathname: '/sms/report', params: { id: message.id } });
  }

  function more() {
    const code = message.senderCode;
    showDialog('This message', undefined, [
      { text: 'Ignore it', onPress: () => void run(() => dismissSms(db, message.id)) },
      ...(code
        ? [
            {
              text: `Always ignore ${code}`,
              onPress: () =>
                void run(async () => {
                  await updateSettings(db, { smsIgnoredSenders: [...new Set([...settings.smsIgnoredSenders, code])] });
                  await dismissSmsFromSender(db, code);
                }),
            },
          ]
        : []),
      { text: 'Report a problem', onPress: report },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  // Couldn't read: show the text and let the user enter it by hand.
  if (!txn) {
    return (
      <Card style={styles.card}>
        <Header icon="warning" iconColor={colors.warning} title="Couldn't read this message" subtitle={`${message.senderCode ?? message.sender} · ${formatShortDate(dateKey(message.receivedAt))}`} />
        {message.body ? (
          <Text variant="caption" tone="secondary" style={[styles.smsText, { backgroundColor: colors.cardMuted }]}>
            {message.body}
          </Text>
        ) : null}
        <Text variant="caption" tone="secondary">
          {message.reason === 'foreign-currency'
            ? 'It is in a foreign currency. Enter it yourself in your currency if you want to keep it.'
            : 'It looks like a bank transaction, but SpendTrak could not tell the amount or direction.'}
        </Text>
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button label="Enter manually" size="small" onPress={() => run(async () => {
              await dismissSms(db, message.id);
              router.push('/transaction/new');
            })} />
          </View>
          <Button label="Report" variant="secondary" size="small" onPress={report} />
          <Button label="Ignore" variant="secondary" size="small" onPress={() => run(() => dismissSms(db, message.id))} />
        </View>
      </Card>
    );
  }

  const kind = txn.kind;
  const isTransfer = kind === 'card-payment' || kind === 'atm';
  const resolvedAccount = accountId ?? suggestion.accountId;
  const resolvedOther = otherAccountId ?? suggestion.otherAccountId;
  const resolvedCategory = categoryId ?? suggestion.categoryId;
  const resolvedSub = categoryId ? subcategoryId : suggestion.subcategoryId;
  const categories = kind === 'income' ? incomeCategories : expenseCategories;
  const category = categories.find((c) => c.id === resolvedCategory);
  const account = accounts.find((a) => a.id === resolvedAccount);
  const other = accounts.find((a) => a.id === resolvedOther);

  const amount = txn.amountMinor / 100;
  const sign = kind === 'income' ? '+' : kind === 'expense' ? '−' : '';
  const amountTone = kind === 'income' ? 'success' : 'default';
  const title = txn.merchant ?? (kind === 'card-payment' ? 'Card bill payment' : kind === 'atm' ? 'ATM withdrawal' : kind === 'income' ? 'Money received' : 'Payment');
  const where = [txn.institution ?? message.senderCode, txn.accountHint ? `••${txn.accountHint}` : null].filter(Boolean).join(' ');
  const when = `${formatShortDate(txn.date)}${txn.time ? `, ${formatTime(txn.time)}` : ''}`;
  const subtitle = [where, when, MODE_LABEL[txn.mode]].filter(Boolean).join(' · ');
  const icon: IconName = kind === 'income' ? 'income' : isTransfer ? 'transfer' : 'expense';

  const choice = buildChoice(message, { accountId: resolvedAccount, otherAccountId: resolvedOther, categoryId: resolvedCategory, subcategoryId: resolvedSub });
  const missing = !resolvedAccount
    ? kind === 'card-payment' ? 'Choose the card' : 'Choose an account'
    : isTransfer && !resolvedOther
      ? kind === 'card-payment' ? 'Choose where it was paid from' : 'Choose a cash account'
      : !isTransfer && !resolvedCategory
        ? 'Choose a category'
        : null;
  // Only ask for what's missing; known parts show as a one-line summary with "Change".
  const pickAccount = editing || !resolvedAccount;
  const pickOther = isTransfer && (editing || !resolvedOther);
  const pickCategory = !isTransfer && (editing || !resolvedCategory);
  const showPickers = pickAccount || pickOther || pickCategory;

  const accountLabel = kind === 'card-payment' ? 'Card' : kind === 'atm' ? 'From' : 'Account';
  const accountChoices = kind === 'card-payment' ? accounts.filter((a) => a.type === 'card') : accounts;
  const otherChoices = kind === 'atm' ? accounts.filter((a) => a.type === 'cash') : accounts.filter((a) => a.id !== resolvedAccount);

  const summary =
    kind === 'card-payment'
      ? `${other?.name} → ${account?.name}`
      : kind === 'atm'
        ? `${account?.name} → ${other?.name}`
        : [account?.name, category ? `${category.icon} ${category.name}` : null].filter(Boolean).join(' · ');

  return (
    <Card style={styles.card}>
      <Header icon={icon} iconColor={kind === 'income' ? colors.success : isTransfer ? colors.info : colors.primary} title={title} subtitle={subtitle} amount={`${sign}${formatCurrency(amount, currency)}`} amountTone={amountTone} />

      {message.status === 'auto_added' ? (
        <Banner icon="check" color={colors.success} text="Added automatically" />
      ) : duplicate ? (
        <Banner
          icon="warning"
          color={colors.warning}
          text={
            duplicate.kind === 'txn'
              ? `You may have added this already: ${formatCurrency(duplicate.amount, currency)} · ${duplicate.label} · ${formatShortDate(duplicate.date)}`
              : `Looks like the same payment as ${formatCurrency(duplicate.amount, currency)} · ${duplicate.label} · ${formatShortDate(duplicate.date)}`
          }
        />
      ) : null}

      {message.status === 'pending' && !duplicate ? (
        <>
          {showPickers ? (
            <View style={styles.pickers}>
              {pickAccount ? (
                <>
                  <Text variant="label" tone="secondary">
                    {txn.accountHint && !resolvedAccount ? `Which account is ${where}?` : accountLabel}
                  </Text>
                  <ChipGroup>
                    {accountChoices.map((a) => (
                      <Chip key={a.id} label={a.name} emoji={accountEmoji(a, currency)} selected={a.id === resolvedAccount} onPress={() => setAccountId(a.id)} />
                    ))}
                    {accountChoices.length === 0 ? <Chip label="Add account" emoji="➕" onPress={() => router.push('/account/new')} /> : null}
                  </ChipGroup>
                </>
              ) : null}
              {pickOther ? (
                <>
                  <Text variant="label" tone="secondary">
                    {kind === 'card-payment' ? 'Paid from' : 'To'}
                  </Text>
                  <ChipGroup>
                    {otherChoices.map((a) => (
                      <Chip key={a.id} label={a.name} emoji={accountEmoji(a, currency)} selected={a.id === resolvedOther} onPress={() => setOtherAccountId(a.id)} />
                    ))}
                    {otherChoices.length === 0 ? <Chip label="Add cash account" emoji="➕" onPress={() => router.push('/account/new')} /> : null}
                  </ChipGroup>
                </>
              ) : null}
              {pickCategory ? (
                <>
                  <Text variant="label" tone="secondary">
                    Category
                  </Text>
                  <ChipGroup>
                    {categories.map((c) => (
                      <Chip
                        key={c.id}
                        label={c.name}
                        emoji={c.icon}
                        selected={c.id === resolvedCategory}
                        onPress={() => {
                          setCategoryId(c.id);
                          setSubcategoryId(null);
                        }}
                      />
                    ))}
                  </ChipGroup>
                </>
              ) : null}
            </View>
          ) : null}
          {!editing && (isTransfer ? resolvedAccount && resolvedOther : resolvedAccount || resolvedCategory) ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`${summary}. Change`} onPress={() => setEditing(true)} style={styles.summary}>
              <Text variant="caption" tone="secondary" style={styles.flex} numberOfLines={1}>
                {summary}
              </Text>
              <Text variant="caption" tone="primary">
                Change
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      {message.body ? (
        <Pressable accessibilityRole="button" onPress={() => setShowText(!showText)}>
          <Text variant="caption" tone="muted">
            {showText ? 'Hide message' : 'Show message'}
          </Text>
        </Pressable>
      ) : null}
      {showText && message.body ? (
        <Text variant="caption" tone="secondary" style={[styles.smsText, { backgroundColor: colors.cardMuted }]} selectable>
          {message.body}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {message.status === 'auto_added' ? (
          <View style={styles.flex}>
            <Button label="Undo" variant="secondary" size="small" icon="history" onPress={() => run(() => undoSmsAdd(db, message.id))} />
          </View>
        ) : duplicate?.kind === 'sms' ? (
          <>
            <View style={styles.flex}>
              <Button label="Merge" size="small" onPress={() => run(() => mergeSmsDuplicate(db, message.id, duplicate.id))} />
            </View>
            <Button label="Keep both" variant="secondary" size="small" onPress={() => run(() => keepSmsSeparate(db, message.id))} />
          </>
        ) : duplicate?.kind === 'txn' ? (
          <>
            <View style={styles.flex}>
              <Button label="It's the same" size="small" onPress={() => run(() => linkSmsToTransaction(db, message.id, duplicate.id))} />
            </View>
            <Button label="Not the same" variant="secondary" size="small" onPress={() => run(() => keepSmsSeparate(db, message.id))} />
          </>
        ) : (
          <>
            <View style={styles.flex}>
              <Button
                label={missing ?? 'Add'}
                icon={missing ? undefined : 'check'}
                size="small"
                disabled={!choice || busy}
                onPress={() => run(async () => {
                  if (choice) await addSmsTransaction(db, message.id, choice);
                })}
              />
            </View>
            <Button label="Edit" variant="secondary" size="small" onPress={() => router.push({ pathname: '/transaction/new', params: { sms: message.id } })} />
          </>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="More options" hitSlop={8} onPress={more} style={[styles.more, { backgroundColor: colors.cardMuted }]}>
          <Icon name="more" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Card>
  );
}

function dateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Header({ icon, iconColor, title, subtitle, amount, amountTone }: { icon: IconName; iconColor: string; title: string; subtitle: string; amount?: string; amountTone?: 'success' | 'default' }) {
  return (
    <View style={styles.header}>
      <View style={[styles.iconTile, { backgroundColor: `${iconColor}1F` }]}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {amount ? (
        <Text variant="heading" numeric tone={amountTone}>
          {amount}
        </Text>
      ) : null}
    </View>
  );
}

function Banner({ icon, color, text }: { icon: IconName; color: string; text: string }) {
  return (
    <View style={[styles.banner, { backgroundColor: `${color}26` }]}>
      <Icon name={icon} size={18} color={color} />
      <Text variant="caption" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  pickers: {
    gap: Spacing.sm,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 32,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  smsText: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  more: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
