'use client';

import { Suspense } from 'react';
import AddTransaction from '../../views/AddTransaction';

export default function AddPage() {
  return (
    <Suspense>
      <AddTransaction />
    </Suspense>
  );
}
