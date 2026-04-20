import Transactions from '../../../views/Transactions';

export const metadata = {
  title: 'Transaction History',
  description: 'View, search, and manage all your past transactions. Filter by date, category, or account to find any expense or income entry.',
};

export default function TransactionsPage() {
  return <Transactions />;
}
