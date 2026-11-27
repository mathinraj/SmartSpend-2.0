import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { TransactionForm } from '@/components/transaction-form';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { finishSmsDraft, smsDraft } from '@/lib/sms/review';
import type { TransactionType } from '@/types/models';

const TYPES: TransactionType[] = ['expense', 'income', 'transfer'];

export default function NewTransactionScreen() {
  const { type, sms } = useLocalSearchParams<{ type?: string; sms?: string }>();
  const settings = useSettings();
  if (!settings) return null;
  if (sms) return <SmsTransactionForm smsId={sms} />;
  const defaultType = TYPES.find((t) => t === type) ?? settings.defaultTxnType;
  return <TransactionForm defaultType={defaultType} />;
}

/** "Edit" from the SMS review list: the full form, prefilled from the message. */
function SmsTransactionForm({ smsId }: { smsId: string }) {
  const db = useSQLiteContext();
  // Loaded once: the form keeps its own state, so it must not re-render with a new draft.
  const loaded = useDbQuery(smsDraft, [], smsId);
  if (loaded === undefined) return null;
  if (loaded === null) {
    return (
      <Screen variant="stack">
        <EmptyState emoji="✉️" title="Message not found" message="It may have been added or dismissed already." />
      </Screen>
    );
  }
  return <TransactionForm draft={loaded.draft} onSaved={(id) => finishSmsDraft(db, loaded.message, id)} />;
}
