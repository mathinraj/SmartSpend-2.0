import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, StyleSheet, View } from 'react-native';

import { PlannedRow } from '@/components/planned-row';
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
import { listPlanned } from '@/db/planned';
import { loadSampleData } from '@/db/sample-data';
import { getPersonBalances } from '@/db/splits';
import { getPeriodSummary, listTransactions } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency, formatMonth, greeting, monthRange } from '@/lib/format';
import { daysUntil } from '@/lib/planned';

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

  const planned = useDbQuery(listPlanned, ['planned_payments', 'accounts', 'categories']);
  const balances = useDbQuery(getPersonBalances, ['split_entries'], settings?.splitPeople ?? []);

  const currency = settings?.currency ?? 'INR';
  const totalBalance = accounts?.reduce((sum, a) => sum + a.balance, 0) ?? 0;
  const activePlanned = planned?.filter((p) => p.enabled) ?? [];
  const duePlanned = activePlanned.filter((p) => daysUntil(p.nextDate) <= 3);
  const overdueCount = activePlanned.filter((p) => daysUntil(p.nextDate) < 0).length;
  const owedToYou = balances?.filter((b) => b.balance > 0).reduce((sum, b) => sum + b.balance, 0) ?? 0;
  const youOwe = balances?.filter((b) => b.balance < 0).reduce((sum, b) => sum - b.balance, 0) ?? 0;
  const splitSubtitle =
    owedToYou > 0
      ? `${formatCurrency(owedToYou, currency)} owed to you`
      : youOwe > 0
        ? `You owe ${formatCurrency(youOwe, currency)}`
        : 'All settled';
  const plannedSubtitle =
    overdueCount > 0
      ? `${overdueCount} overdue`
      : duePlanned.length > 0
        ? `${duePlanned.length} due soon`
        : `${activePlanned.length} active`;
  const isEmpty = accounts?.length === 0 && recent?.length === 0;
  const addTransaction = () => router.push(accounts?.length === 0 ? '/account/new' : '/transaction/new');

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

        <View style={styles.tiles}>
          <Tile
            emoji="🗓️"
            title="Planned"
            subtitle={plannedSubtitle}
            alert={overdueCount > 0}
            onPress={() => router.push('/planned')}
          />
          <Tile emoji="🤝" title="Split money" subtitle={splitSubtitle} onPress={() => router.push('/splits')} />
        </View>

        {duePlanned.length > 0 ? (
          <>
            <SectionHeader title="Payments due" actionLabel="See all" onAction={() => router.push('/planned')} />
            <Card flush>
              {duePlanned.slice(0, 3).map((p, i) => (
                <PlannedRow key={p.id} payment={p} currency={currency} db={db} divider={i > 0} />
              ))}
            </Card>
          </>
        ) : null}

        {isEmpty ? (
          <EmptyState
            emoji="🪙"
            title="Start tracking"
            message="Add the bank account, card, cash, or wallet you spend from. Or load sample data to explore."
            actions={
              <>
                <Button label="Add account" icon="add" onPress={() => router.push('/account/new')} />
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
      <Fab accessibilityLabel="Add transaction" onPress={addTransaction} />
    </View>
  );
}

interface TileProps {
  emoji: string;
  title: string;
  subtitle: string;
  alert?: boolean;
  onPress: () => void;
}

function Tile({ emoji, title, subtitle, alert, onPress }: TileProps) {
  const colors = useTheme();
  return (
    <Card flush style={styles.tile}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        android_ripple={{ color: colors.border }}
        style={styles.tileInner}>
        <Text style={styles.tileEmoji}>{emoji}</Text>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" tone={alert ? 'danger' : 'secondary'} numberOfLines={1}>
          {subtitle}
        </Text>
      </Pressable>
    </Card>
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
  tiles: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  tile: {
    flex: 1,
  },
  tileInner: {
    padding: Spacing.lg,
    gap: 2,
  },
  tileEmoji: {
    fontSize: 24,
    lineHeight: 30,
    marginBottom: Spacing.xs,
  },
  emptyList: {
    padding: Spacing.lg,
    textAlign: 'center',
  },
});
