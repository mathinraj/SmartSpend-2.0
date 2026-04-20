import { Suspense } from 'react';
import Analytics from '../../../views/Analytics';

export const metadata = {
  title: 'Analytics',
  description: 'Visualize your spending habits with charts and breakdowns. Analyze expenses by category, track trends, and understand where your money goes.',
};

export default function AnalyticsPage() {
  return (
    <Suspense>
      <Analytics />
    </Suspense>
  );
}
