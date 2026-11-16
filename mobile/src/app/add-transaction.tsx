import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';

export default function AddTransactionScreen() {
  return (
    <Screen variant="stack">
      <EmptyState
        emoji="🛠️"
        title="Coming in Phase 2"
        message="The add/edit form (amount, type, account, category, date, note) is the next screen to build. The database already supports it through addTransaction()."
        actions={<Button label="Close" variant="secondary" onPress={() => router.back()} />}
      />
    </Screen>
  );
}
