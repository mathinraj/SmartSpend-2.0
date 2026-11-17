import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { formatCurrency } from '@/lib/format';
import type { TransactionListItem } from '@/types/models';

export interface TransactionRowProps {
  transaction: TransactionListItem;
  currency: string;
  divider?: boolean;
  /** Caption under the amount, e.g. the account's running balance. */
  balance?: string;
}

export function TransactionRow({ transaction: t, currency, divider, balance }: TransactionRowProps) {
  const open = () => router.push(`/transaction/${t.id}`);

  if (t.type === 'transfer') {
    return (
      <ListRow
        divider={divider}
        onPress={open}
        leading={<Avatar emoji="🔁" color="#74B9FF" />}
        title={t.note || 'Transfer'}
        subtitle={`${t.fromAccountName ?? 'Deleted account'} → ${t.toAccountName ?? 'Deleted account'}`}
        trailing={
          <Trailing balance={balance}>
            <Text variant="bodyStrong" tone="secondary" numeric>
              {formatCurrency(t.amount, currency)}
            </Text>
          </Trailing>
        }
      />
    );
  }

  const isIncome = t.type === 'income';
  const category = t.subcategoryName ?? t.categoryName;
  const account = t.accountName ?? (t.accountId ? 'Deleted account' : null);

  return (
    <ListRow
      divider={divider}
      onPress={open}
      leading={<Avatar emoji={t.categoryIcon ?? '📦'} color={t.categoryColor ?? '#B2BEC3'} />}
      title={t.note || category || (isIncome ? 'Income' : 'Expense')}
      subtitle={[t.note ? category : null, account].filter(Boolean).join(' · ')}
      trailing={
        <Trailing balance={balance}>
          <Text variant="bodyStrong" tone={isIncome ? 'success' : 'default'} numeric>
            {isIncome ? '+' : '−'}
            {formatCurrency(t.amount, currency)}
          </Text>
        </Trailing>
      }
    />
  );
}

function Trailing({ balance, children }: { balance?: string; children: ReactNode }) {
  if (!balance) return children;
  return (
    <View style={styles.trailing}>
      {children}
      <Text variant="caption" tone="secondary" numeric numberOfLines={1}>
        {balance}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  trailing: {
    alignItems: 'flex-end',
    gap: 2,
    maxWidth: '50%',
  },
});
