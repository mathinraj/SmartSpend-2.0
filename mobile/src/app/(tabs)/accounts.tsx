import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PeekButton } from '@/components/peek-button';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { AccountAvatar } from '@/components/account-avatar';
import { ListRow } from '@/components/ui/list-row';
import { MoveButtons } from '@/components/ui/move-buttons';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { listAccounts, setAccountOrder } from '@/db/accounts';
import { loadSampleData } from '@/db/sample-data';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { ACCOUNT_TYPE_LABELS, isCreditCard, subTypeLabel } from '@/lib/accounts';
import { useBalancePrivacy } from '@/lib/balance-privacy';
import { formatCurrency } from '@/lib/format';
import type { Account, CustomAccountType } from '@/types/models';

const BUILT_IN_ORDER = ['bank', 'card', 'cash', 'wallet'] as const;

interface AccountGroup {
  key: string;
  title: string;
  accounts: Account[];
}

/** Built-in types first, then each custom type, then custom accounts without a (known) type. */
function groupAccounts(accounts: Account[], customTypes: CustomAccountType[]): AccountGroup[] {
  const known = new Set(customTypes.map((t) => t.id));
  return [
    ...BUILT_IN_ORDER.map((type) => ({
      key: type,
      title: ACCOUNT_TYPE_LABELS[type],
      accounts: accounts.filter((a) => a.type === type),
    })),
    ...customTypes.map((t) => ({
      key: t.id,
      title: t.label,
      accounts: accounts.filter((a) => a.type === 'custom' && a.customTypeId === t.id),
    })),
    {
      key: 'custom',
      title: ACCOUNT_TYPE_LABELS.custom,
      accounts: accounts.filter((a) => a.type === 'custom' && !(a.customTypeId && known.has(a.customTypeId))),
    },
  ].filter((g) => g.accounts.length > 0);
}

function describe(account: Account, currency: string): string | null {
  if (isCreditCard(account) && account.creditLimit) {
    return `Limit ${formatCurrency(account.creditLimit, currency)}`;
  }
  return subTypeLabel(account);
}

export default function AccountsScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const accounts = useDbQuery(listAccounts, ['accounts']);
  const privacy = useBalancePrivacy(settings?.hideBalances);
  const [reordering, setReordering] = useState(false);
  const currency = settings?.currency ?? 'INR';

  const assets = accounts?.filter((a) => a.balance >= 0).reduce((sum, a) => sum + a.balance, 0) ?? 0;
  const liabilities = accounts?.filter((a) => a.balance < 0).reduce((sum, a) => sum + a.balance, 0) ?? 0;
  const groups = groupAccounts(accounts ?? [], settings?.customAccountTypes ?? []);

  function move(group: AccountGroup, index: number, delta: -1 | 1) {
    const ids = group.accounts.map((a) => a.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    setAccountOrder(db, groups.flatMap((g) => (g.key === group.key ? ids : g.accounts.map((a) => a.id))));
  }

  return (
    <View style={styles.root} collapsable={false}>
      <Screen
        title="Accounts"
        hasFab={!reordering}
        headerRight={
          (accounts?.length ?? 0) > 1 ? (
            <IconButton
              icon={reordering ? 'check' : 'reorder'}
              accessibilityLabel={reordering ? 'Done reordering' : 'Reorder accounts'}
              onPress={() => setReordering(!reordering)}
            />
          ) : undefined
        }>
        {reordering ? (
          <Text tone="secondary">Use the arrows to change the order within each group. Tap ✓ when you’re done.</Text>
        ) : (
          <Card style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text variant="label" tone="secondary">
                Assets
              </Text>
              <Text variant="heading" tone="success" numeric numberOfLines={1} adjustsFontSizeToFit>
                {privacy.formatBalance(assets, currency)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="label" tone="secondary">
                Liabilities
              </Text>
              <Text variant="heading" tone="danger" numeric numberOfLines={1} adjustsFontSizeToFit>
                {privacy.formatBalance(Math.abs(liabilities), currency)}
              </Text>
            </View>
            {privacy.canPeek ? (
              <PeekButton hidden={privacy.hidden} onPress={privacy.togglePeek} color={colors.textSecondary} />
            ) : null}
          </Card>
        )}

        {accounts?.length === 0 ? (
          <EmptyState
            emoji="🏦"
            title="No accounts yet"
            message="Add the bank accounts, cards, cash, and wallets you want to track."
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
        ) : null}

        {groups.map((group) => (
          <View key={group.key} style={styles.group}>
            <SectionHeader title={group.title} />
            <Card flush>
              {group.accounts.map((account, i) => (
                <ListRow
                  key={account.id}
                  divider={i > 0}
                  onPress={reordering ? undefined : () => router.push(`/account/${account.id}`)}
                  leading={<AccountAvatar account={account} currency={currency} />}
                  title={account.name}
                  subtitle={describe(account, currency)}
                  trailing={
                    reordering ? (
                      <MoveButtons
                        label={account.name}
                        canMoveUp={i > 0}
                        canMoveDown={i < group.accounts.length - 1}
                        onMove={(delta) => move(group, i, delta)}
                      />
                    ) : (
                      <View style={styles.trailing}>
                        <Text variant="bodyStrong" tone={account.balance < 0 ? 'danger' : 'default'} numeric>
                          {privacy.formatBalance(account.balance, currency)}
                        </Text>
                        {isCreditCard(account) && account.balance < 0 ? (
                          <Pressable
                            accessibilityRole="button"
                            hitSlop={8}
                            onPress={() => router.push({ pathname: '/account/pay-bill', params: { id: account.id } })}>
                            <Text variant="caption" tone="primary" style={styles.link}>
                              Pay bill
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    )
                  }
                />
              ))}
            </Card>
          </View>
        ))}
      </Screen>
      {reordering ? null : <Fab accessibilityLabel="Add account" onPress={() => router.push('/account/new')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  summaryItem: {
    flex: 1,
    gap: Spacing.xs,
  },
  group: {
    gap: Spacing.lg,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 2,
  },
  link: {
    fontWeight: '700',
  },
});
