import { useLocalSearchParams } from 'expo-router';

import { TransactionForm } from '@/components/transaction-form';
import type { TransactionType } from '@/types/models';

const TYPES: TransactionType[] = ['expense', 'income', 'transfer'];

export default function NewTransactionScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const defaultType = TYPES.find((t) => t === type) ?? 'expense';
  return <TransactionForm defaultType={defaultType} />;
}
