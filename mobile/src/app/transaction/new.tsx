import { useLocalSearchParams } from 'expo-router';

import { TransactionForm } from '@/components/transaction-form';
import { useSettings } from '@/hooks/use-settings';
import type { TransactionType } from '@/types/models';

const TYPES: TransactionType[] = ['expense', 'income', 'transfer'];

export default function NewTransactionScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const settings = useSettings();
  if (!settings) return null;
  const defaultType = TYPES.find((t) => t === type) ?? settings.defaultTxnType;
  return <TransactionForm defaultType={defaultType} />;
}
