import { router } from 'expo-router';

import { Avatar, ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { formatCurrency } from '@/lib/format';
import type { TransactionListItem } from '@/types/models';

export interface TransactionRowProps {
  transaction: TransactionListItem;
  currency: string;
  divider?: boolean;
}

export function TransactionRow({ transaction: t, currency, divider }: TransactionRowProps) {
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
          <Text variant="bodyStrong" tone="secondary" numeric>
            {formatCurrency(t.amount, currency)}
          </Text>
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
        <Text variant="bodyStrong" tone={isIncome ? 'success' : 'default'} numeric>
          {isIncome ? '+' : '−'}
          {formatCurrency(t.amount, currency)}
        </Text>
      }
    />
  );
}
