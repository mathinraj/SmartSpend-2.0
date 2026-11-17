import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { deleteTransaction, getTransaction } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency, formatLongDate, formatTime } from '@/lib/format';

const TYPE_LABELS = { expense: 'Expense', income: 'Income', transfer: 'Transfer' } as const;
const SOURCE_LABELS = { manual: null, sms: 'Captured from SMS', import: 'Imported' } as const;

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const t = useDbQuery(getTransaction, ['transactions', 'accounts', 'categories', 'subcategories'], id);

  if (t === undefined) return null;
  if (t === null) {
    return (
      <Screen variant="stack">
        <EmptyState emoji="🔍" title="Transaction not found" message="It may have been deleted." />
      </Screen>
    );
  }

  const currency = settings?.currency ?? 'INR';
  const isTransfer = t.type === 'transfer';
  const emoji = isTransfer ? '🔁' : (t.categoryIcon ?? '📦');
  const tint = isTransfer ? colors.info : (t.categoryColor ?? colors.textMuted);
  const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '';
  const category = t.subcategoryName ? `${t.categoryName} › ${t.subcategoryName}` : t.categoryName;

  function confirmDelete() {
    Alert.alert('Delete transaction?', 'The account balance will be adjusted back.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteTransaction(db, id);
        },
      },
    ]);
  }

  return (
    <Screen variant="stack">
      <Card style={styles.hero}>
        <View style={[styles.emojiBadge, { backgroundColor: `${tint}26` }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <Text
          variant="display"
          tone={t.type === 'income' ? 'success' : 'default'}
          numeric
          numberOfLines={1}
          adjustsFontSizeToFit>
          {sign}
          {formatCurrency(t.amount, currency)}
        </Text>
        <Text variant="bodyStrong" tone="secondary">
          {t.note || category || TYPE_LABELS[t.type]}
        </Text>
      </Card>

      <Card flush>
        <DetailRow label="Type" value={TYPE_LABELS[t.type]} first />
        {isTransfer ? (
          <>
            <DetailRow label="From" value={t.fromAccountName ?? 'Deleted account'} />
            <DetailRow label="To" value={t.toAccountName ?? 'Deleted account'} />
          </>
        ) : (
          <>
            <DetailRow label="Category" value={category ?? 'Uncategorized'} />
            <DetailRow label="Account" value={t.accountName ?? 'Deleted account'} />
          </>
        )}
        {t.isSplit && t.splitAmount ? (
          <>
            <DetailRow label="Others owe" value={formatCurrency(t.splitAmount, currency)} />
            <DetailRow label="Your share" value={formatCurrency(t.amount - t.splitAmount, currency)} />
            <DetailRow
              label="Taken from account"
              value={formatCurrency(t.deductMyShare ? t.amount - t.splitAmount : t.amount, currency)}
            />
          </>
        ) : null}
        <DetailRow label="Date" value={formatLongDate(t.date)} />
        {t.time ? <DetailRow label="Time" value={formatTime(t.time)} /> : null}
        {t.note ? <DetailRow label="Note" value={t.note} /> : null}
        {t.paymentApp ? <DetailRow label="Paid with" value={t.paymentApp} /> : null}
        {SOURCE_LABELS[t.source] ? <DetailRow label="Source" value={SOURCE_LABELS[t.source]!} /> : null}
      </Card>

      <View style={styles.actions}>
        <Button label="Edit" icon="edit" onPress={() => router.push(`/transaction/edit/${t.id}`)} />
        <Button label="Delete" icon="delete" variant="destructive" onPress={confirmDelete} />
      </View>
    </Screen>
  );
}

function DetailRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.detailRow,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
      ]}>
      <Text tone="secondary">{label}</Text>
      <Text variant="bodyStrong" style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  emojiBadge: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    gap: Spacing.sm,
  },
});
