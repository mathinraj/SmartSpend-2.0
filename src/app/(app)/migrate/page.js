import Migrate from '../../../views/Migrate';

export const metadata = {
  title: 'Migrate your data',
  description: 'Migrate your SpendTrak data to the new site at spendtrak.vercel.app.',
  robots: { index: false, follow: false },
};

export default function MigratePage() {
  return <Migrate />;
}
