import { useLocalSearchParams } from 'expo-router';

import { TransactionForm } from '@/components/transaction-form';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { getTransaction } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transaction = useDbQuery(getTransaction, ['transactions'], id);

  if (transaction === undefined) return null;
  if (transaction === null) {
    return (
      <Screen variant="stack">
        <EmptyState emoji="🔍" title="Transaction not found" message="It may have been deleted." />
      </Screen>
    );
  }
  return <TransactionForm initial={transaction} />;
}
