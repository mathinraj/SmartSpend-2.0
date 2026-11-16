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
  if (t.type === 'transfer') {
    return (
      <ListRow
        divider={divider}
        leading={<Avatar emoji="🔁" color="#74B9FF" />}
        title={t.note || 'Transfer'}
        subtitle={`${t.fromAccountName ?? 'Unknown'} → ${t.toAccountName ?? 'Unknown'}`}
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

  return (
    <ListRow
      divider={divider}
      leading={<Avatar emoji={t.categoryIcon ?? '📦'} color={t.categoryColor ?? '#B2BEC3'} />}
      title={t.note || category || (isIncome ? 'Income' : 'Expense')}
      subtitle={[t.note ? category : null, t.accountName].filter(Boolean).join(' · ')}
      trailing={
        <Text variant="bodyStrong" tone={isIncome ? 'success' : 'default'} numeric>
          {isIncome ? '+' : '−'}
          {formatCurrency(t.amount, currency)}
        </Text>
      }
    />
  );
}
