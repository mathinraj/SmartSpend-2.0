import { Suspense } from 'react';
import AddTransaction from '../../../views/AddTransaction';

export const metadata = {
  title: 'Add Transaction',
  description: 'Quickly log your expenses, income, or transfers. Categorize spending, split bills, and track payment apps — all in one place.',
};

export default function AddPage() {
  return (
    <Suspense>
      <AddTransaction />
    </Suspense>
  );
}
