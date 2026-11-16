import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { TransactionRow } from '@/components/transaction-row';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { listAccounts } from '@/db/accounts';
import { loadSampleData } from '@/db/sample-data';
import { getPeriodSummary, listTransactions } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency, formatMonth, greeting, monthRange } from '@/lib/format';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const accounts = useDbQuery(listAccounts, ['accounts']);
  const { from, to } = monthRange(new Date());
  const month = useDbQuery(getPeriodSummary, ['transactions'], from, to);
  const recent = useDbQuery(
    listTransactions,
    ['transactions', 'accounts', 'categories', 'subcategories'],
    { limit: 5 }
  );

  const currency = settings?.currency ?? 'INR';
  const totalBalance = accounts?.reduce((sum, a) => sum + a.balance, 0) ?? 0;
  const isEmpty = accounts?.length === 0 && recent?.length === 0;

  return (
    <View style={styles.root} collapsable={false}>
      <Screen
        title={settings?.profileName ?? 'Welcome'}
        subtitle={greeting()}
        hasFab
        headerRight={
          <IconButton icon="settings" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
        }>
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <Text tone="onPrimary" style={styles.dim}>
            Total balance
          </Text>
          <Text variant="display" tone="onPrimary" numeric adjustsFontSizeToFit numberOfLines={1}>
            {formatCurrency(totalBalance, currency)}
          </Text>
          <Text variant="caption" tone="onPrimary" style={styles.dim}>
            {formatMonth(new Date())}
          </Text>
          <View style={styles.statsRow}>
            <Stat label="Income" icon="income" value={formatCurrency(month?.income ?? 0, currency)} />
            <Stat label="Expenses" icon="expense" value={formatCurrency(month?.expense ?? 0, currency)} />
          </View>
        </View>

        {isEmpty ? (
          <EmptyState
            emoji="🪙"
            title="Start tracking"
            message="Add your first transaction, or load sample data to explore the app."
            actions={
              <>
                <Button label="Add transaction" icon="add" onPress={() => router.push('/add-transaction')} />
                <Button
                  label="Load sample data"
                  icon="sparkles"
                  variant="secondary"
                  onPress={() => loadSampleData(db)}
                />
              </>
            }
          />
        ) : (
          <>
            <SectionHeader title="Recent transactions" actionLabel="See all" onAction={() => router.navigate('/history')} />
            <Card flush>
              {recent?.length ? (
                recent.map((t, i) => <TransactionRow key={t.id} transaction={t} currency={currency} divider={i > 0} />)
              ) : (
                <Text tone="secondary" style={styles.emptyList}>
                  No transactions yet.
                </Text>
              )}
            </Card>
          </>
        )}
      </Screen>
      <Fab accessibilityLabel="Add transaction" onPress={() => router.push('/add-transaction')} />
    </View>
  );
}

function Stat({ label, icon, value }: { label: string; icon: 'income' | 'expense'; value: string }) {
  const colors = useTheme();
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>
        <Icon name={icon} size={16} color={colors.onPrimary} />
      </View>
      <View style={styles.statText}>
        <Text variant="caption" tone="onPrimary" style={styles.dim}>
          {label}
        </Text>
        <Text variant="bodyStrong" tone="onPrimary" numeric numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  balanceCard: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.xl,
    gap: Spacing.xs,
    boxShadow: '0 8px 24px rgba(108, 92, 231, 0.3)',
  },
  dim: {
    opacity: 0.85,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statText: {
    flex: 1,
  },
  emptyList: {
    padding: Spacing.lg,
    textAlign: 'center',
  },
});
