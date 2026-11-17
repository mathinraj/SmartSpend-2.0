import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PeekButton } from '@/components/peek-button';
import { PlannedRow } from '@/components/planned-row';
import { ProfileAvatar } from '@/components/profile-avatar';
import { TransactionRow } from '@/components/transaction-row';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Icon, type IconName } from '@/components/ui/icon';
import { AccountAvatar } from '@/components/account-avatar';
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
import { isCreditCard, totalBalance } from '@/lib/accounts';
import { useBalancePrivacy } from '@/lib/balance-privacy';
import { formatCurrency, formatMonth, greeting, monthRange } from '@/lib/format';
import { daysUntil } from '@/lib/planned';
import type { Account } from '@/types/models';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const accounts = useDbQuery(listAccounts, ['accounts']);
  const { from, to } = monthRange(new Date());
  const month = useDbQuery(getPeriodSummary, ['transactions'], from, to, settings?.splitExpenseRecord ?? 'my_share');
  const recent = useDbQuery(
    listTransactions,
    ['transactions', 'accounts', 'categories', 'subcategories'],
    { limit: 5 }
  );

  const planned = useDbQuery(listPlanned, ['planned_payments', 'accounts', 'categories']);
  const balances = useDbQuery(getPersonBalances, ['split_entries'], settings?.splitPeople ?? []);

  const privacy = useBalancePrivacy(settings?.hideBalances);

  const currency = settings?.currency ?? 'INR';
  const excludeCards = (settings?.excludeCCFromBalance ?? false) && (accounts?.some(isCreditCard) ?? false);
  const total = accounts ? totalBalance(accounts, excludeCards) : 0;
  const leadWithBalance = (settings?.homeView ?? 'balance') === 'balance';
  const showStats = settings?.showBalanceStats ?? true;
  const balanceVisible = leadWithBalance || showStats;
  const showAccounts = (settings?.showAccountsOnHome ?? true) && (accounts?.length ?? 0) > 0;
  const showSplit = settings?.showSplitOnHome ?? true;
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
        headerLeft={
          <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => router.push('/profile')}>
            <ProfileAvatar size={48} />
          </Pressable>
        }
        headerRight={
          <IconButton icon="settings" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
        }>
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <View style={styles.cardHeader}>
            <Text tone="onPrimary" style={[styles.dim, styles.flex]}>
              {leadWithBalance ? 'Total balance' : 'Spent this month'}
            </Text>
            {privacy.canPeek && balanceVisible ? (
              <PeekButton hidden={privacy.hidden} onPress={privacy.togglePeek} color={colors.onPrimary} />
            ) : null}
          </View>
          <Text variant="display" tone="onPrimary" numeric adjustsFontSizeToFit numberOfLines={1}>
            {leadWithBalance ? privacy.formatBalance(total, currency) : formatCurrency(month?.expense ?? 0, currency)}
          </Text>
          <Text variant="caption" tone="onPrimary" style={styles.dim}>
            {formatMonth(new Date())}
            {excludeCards && balanceVisible ? ' · Balance excludes credit cards' : ''}
          </Text>
          {showStats ? (
            <View style={styles.statsRow}>
              <Stat label="Income" icon="income" value={formatCurrency(month?.income ?? 0, currency)} />
              {leadWithBalance ? (
                <Stat label="Expenses" icon="expense" value={formatCurrency(month?.expense ?? 0, currency)} />
              ) : (
                <Stat label="Balance" icon="wallet" value={privacy.formatBalance(total, currency)} />
              )}
            </View>
          ) : null}
        </View>

        {showAccounts ? (
          <>
            <SectionHeader title="Accounts" actionLabel="See all" onAction={() => router.navigate('/accounts')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.strip}
              contentContainerStyle={styles.stripContent}>
              {accounts!.map((a) => (
                <AccountCard key={a.id} account={a} currency={currency} balance={privacy.formatBalance(a.balance, currency)} />
              ))}
            </ScrollView>
          </>
        ) : null}

        <View style={styles.tiles}>
          <Tile
            emoji="🗓️"
            title="Planned"
            subtitle={plannedSubtitle}
            alert={overdueCount > 0}
            onPress={() => router.push('/planned')}
          />
          {showSplit ? (
            <Tile emoji="🤝" title="Split money" subtitle={splitSubtitle} onPress={() => router.push('/splits')} />
          ) : null}
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

function AccountCard({ account, currency, balance }: { account: Account; currency: string; balance: string }) {
  const colors = useTheme();
  return (
    <Card flush style={styles.accountCard}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/account/${account.id}`)}
        android_ripple={{ color: colors.border }}
        style={styles.accountInner}>
        <AccountAvatar account={account} currency={currency} />
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {account.name}
        </Text>
        <Text
          variant="bodyStrong"
          tone={account.balance < 0 ? 'danger' : 'default'}
          numeric
          numberOfLines={1}
          adjustsFontSizeToFit>
          {balance}
        </Text>
      </Pressable>
    </Card>
  );
}

function Stat({ label, icon, value }: { label: string; icon: IconName; value: string }) {
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
  flex: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  strip: {
    marginHorizontal: -Spacing.lg,
  },
  stripContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  accountCard: {
    width: 136,
  },
  accountInner: {
    padding: Spacing.md,
    gap: Spacing.xs,
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
