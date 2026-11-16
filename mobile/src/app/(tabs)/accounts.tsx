import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { listAccounts } from '@/db/accounts';
import { loadSampleData } from '@/db/sample-data';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { ACCOUNT_TYPE_LABELS, accountColor, accountEmoji, isCreditCard } from '@/lib/accounts';
import { formatCurrency } from '@/lib/format';
import type { Account, AccountType } from '@/types/models';

const TYPE_ORDER: AccountType[] = ['bank', 'card', 'cash', 'wallet', 'custom'];

function describe(account: Account, currency: string): string | null {
  if (isCreditCard(account) && account.creditLimit) {
    return `Limit ${formatCurrency(account.creditLimit, currency)}`;
  }
  if (account.subType) return account.subType.charAt(0).toUpperCase() + account.subType.slice(1);
  return null;
}

export default function AccountsScreen() {
  const db = useSQLiteContext();
  const settings = useSettings();
  const accounts = useDbQuery(listAccounts, ['accounts']);
  const currency = settings?.currency ?? 'INR';

  const assets = accounts?.filter((a) => a.balance >= 0).reduce((sum, a) => sum + a.balance, 0) ?? 0;
  const liabilities = accounts?.filter((a) => a.balance < 0).reduce((sum, a) => sum + a.balance, 0) ?? 0;
  const groups = TYPE_ORDER.map((type) => ({
    type,
    accounts: accounts?.filter((a) => a.type === type) ?? [],
  })).filter((g) => g.accounts.length > 0);

  return (
    <Screen title="Accounts">
      <Card style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text variant="label" tone="secondary">
            Assets
          </Text>
          <Text variant="heading" tone="success" numeric numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(assets, currency)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text variant="label" tone="secondary">
            Liabilities
          </Text>
          <Text variant="heading" tone="danger" numeric numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(Math.abs(liabilities), currency)}
          </Text>
        </View>
      </Card>

      {accounts?.length === 0 ? (
        <EmptyState
          emoji="🏦"
          title="No accounts yet"
          message="Bank accounts, cards, cash, and wallets you track will appear here."
          actions={
            <Button label="Load sample data" icon="sparkles" variant="secondary" onPress={() => loadSampleData(db)} />
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
                leading={<Avatar emoji={accountEmoji(account, currency)} color={accountColor(account)} />}
                title={account.name}
                subtitle={describe(account, currency)}
                trailing={
                  <Text variant="bodyStrong" tone={account.balance < 0 ? 'danger' : 'default'} numeric>
                    {formatCurrency(account.balance, currency)}
                  </Text>
                }
              />
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
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
