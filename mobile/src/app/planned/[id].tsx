import { useLocalSearchParams } from 'expo-router';

import { PlannedForm } from '@/components/planned-form';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { getPlanned } from '@/db/planned';
import { useDbQuery } from '@/hooks/use-db-query';

export default function EditPlannedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const payment = useDbQuery(getPlanned, ['planned_payments'], id);

  if (payment === undefined) return null;
  if (payment === null) {
    return (
      <Screen variant="stack">
        <EmptyState emoji="🔍" title="Payment not found" message="It may have been deleted." />
      </Screen>
    );
  }
  return <PlannedForm initial={payment} />;
}
