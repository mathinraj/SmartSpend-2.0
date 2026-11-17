import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Avatar, ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { listAccounts } from '@/db/accounts';
import { loadSampleData } from '@/db/sample-data';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { PeekButton } from '@/components/peek-button';
import { useTheme } from '@/hooks/use-theme';
import { ACCOUNT_TYPE_LABELS, accountColor, accountEmoji, isCreditCard, subTypeLabel } from '@/lib/accounts';
import { useBalancePrivacy } from '@/lib/balance-privacy';
import { formatCurrency } from '@/lib/format';
import type { Account, AccountType } from '@/types/models';

const TYPE_ORDER: AccountType[] = ['bank', 'card', 'cash', 'wallet', 'custom'];

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
  const currency = settings?.currency ?? 'INR';

  const assets = accounts?.filter((a) => a.balance >= 0).reduce((sum, a) => sum + a.balance, 0) ?? 0;
  const liabilities = accounts?.filter((a) => a.balance < 0).reduce((sum, a) => sum + a.balance, 0) ?? 0;
  const groups = TYPE_ORDER.map((type) => ({
    type,
    accounts: accounts?.filter((a) => a.type === type) ?? [],
  })).filter((g) => g.accounts.length > 0);

  return (
    <View style={styles.root} collapsable={false}>
      <Screen title="Accounts" hasFab>
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
          <View key={group.type} style={styles.group}>
            <SectionHeader title={ACCOUNT_TYPE_LABELS[group.type]} />
            <Card flush>
              {group.accounts.map((account, i) => (
                <ListRow
                  key={account.id}
                  divider={i > 0}
                  onPress={() => router.push(`/account/${account.id}`)}
                  leading={<Avatar emoji={accountEmoji(account, currency)} color={accountColor(account)} />}
                  title={account.name}
                  subtitle={describe(account, currency)}
                  trailing={
                    <Text variant="bodyStrong" tone={account.balance < 0 ? 'danger' : 'default'} numeric>
                      {privacy.formatBalance(account.balance, currency)}
                    </Text>
                  }
                />
              ))}
            </Card>
          </View>
        ))}
      </Screen>
      <Fab accessibilityLabel="Add account" onPress={() => router.push('/account/new')} />
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
});
