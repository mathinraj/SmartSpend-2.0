import { useLocalSearchParams } from 'expo-router';

import { AccountForm } from '@/components/account-form';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { getAccount } from '@/db/accounts';
import { useDbQuery } from '@/hooks/use-db-query';

export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useDbQuery(getAccount, ['accounts'], id);

  if (account === undefined) return null;
  if (account === null) {
    return (
      <Screen variant="stack">
        <EmptyState emoji="🔍" title="Account not found" message="It may have been deleted." />
      </Screen>
    );
  }
  return <AccountForm initial={account} />;
}
