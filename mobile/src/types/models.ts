export type AccountType = 'bank' | 'card' | 'cash' | 'wallet' | 'custom';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** bank: savings | current | salary | fd | rd; card: credit | debit */
  subType: string | null;
  balance: number;
  icon: string | null;
  color: string | null;
  creditLimit: number | null;
  billingDay: number | null;
  dueDay: number | null;
  sortOrder: number;
  createdAt: string;
}

export type TransactionType = 'expense' | 'income' | 'transfer';

/** Where a transaction came from. `sms` rows carry the message fingerprint in `sourceRef` for de-duplication. */
export type TransactionSource = 'manual' | 'sms' | 'import';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  /** Set for income and expense. */
  accountId: string | null;
  /** Set for transfers. */
  fromAccountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  note: string | null;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  /** Local time, `HH:mm`. */
  time: string | null;
  isSplit: boolean;
  splitAmount: number | null;
  source: TransactionSource;
  sourceRef: string | null;
  createdAt: string;
}

export interface TransactionListItem extends Transaction {
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  subcategoryName: string | null;
  accountName: string | null;
  fromAccountName: string | null;
  toAccountName: string | null;
}

export type CategoryKind = 'expense' | 'income';

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
}

export interface Category {
  id: string;
  kind: CategoryKind;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  subcategories: Subcategory[];
}

export interface Settings {
  profileName: string | null;
  currency: string;
}
