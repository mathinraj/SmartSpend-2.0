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
  /** `custom` accounts: the user-defined type from `Settings.customAccountTypes`, if any. */
  customTypeId: string | null;
  /** Bank logo image URL from the web app (Brandfetch); kept so backups round-trip. */
  logoUrl: string | null;
  createdAt: string;
}

/** A user-defined account group, e.g. "Investments". Accounts of this type copy its emoji into `icon`. */
export interface CustomAccountType {
  id: string;
  label: string;
  icon: string;
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
  /** Total of the other people's shares, for split expenses. */
  splitAmount: number | null;
  /**
   * Split expenses only: when true, only your share (`amount - splitAmount`) left the account. Stored per
   * transaction so editing or deleting it later reverses exactly what was applied.
   */
  deductMyShare: boolean;
  source: TransactionSource;
  sourceRef: string | null;
  /** How it was paid, e.g. "GPay" (web app field). */
  paymentApp: string | null;
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

export type PlannedFrequency = 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface PlannedPayment {
  id: string;
  name: string;
  amount: number;
  accountId: string | null;
  categoryId: string | null;
  frequency: PlannedFrequency;
  /** `YYYY-MM-DD` of the next due date. */
  nextDate: string;
  note: string | null;
  enabled: boolean;
  lastPaidDate: string | null;
  createdAt: string;
}

export interface PlannedPaymentListItem extends PlannedPayment {
  categoryIcon: string | null;
  categoryColor: string | null;
  accountName: string | null;
}

/**
 * - `split_paid`: you paid, they owe you their share.
 * - `split_owed`: they paid, you owe them your share.
 * - `settlement`: money changed hands; `direction` says which way.
 */
export type SplitEntryType = 'split_paid' | 'split_owed' | 'settlement';

export interface SplitEntry {
  id: string;
  type: SplitEntryType;
  person: string;
  amount: number;
  /** Settlements only: `received` = they paid you, `paid` = you paid them. */
  direction: 'received' | 'paid' | null;
  note: string | null;
  date: string;
  /** The expense this share came from, when created from the transaction form. */
  transactionId: string | null;
  createdAt: string;
}

/** Positive = they owe you, negative = you owe them. */
export interface PersonBalance {
  person: string;
  balance: number;
}

/** How much of a split expense counts: the whole bill or only your part of it. */
export type SplitAmountMode = 'full' | 'my_share';

export type ThemePreference = 'system' | 'light' | 'dark';

export type LockType = 'pin' | 'password';

export type ReminderFrequency = 'daily' | 'weekly' | 'interval';

export interface CustomReminder {
  id: string;
  label: string;
  message: string;
  /** `HH:mm`, for daily and weekly reminders. */
  time: string;
  frequency: ReminderFrequency;
  /** Weekly reminders: 0 = Sunday … 6 = Saturday. */
  day: number;
  /** Interval reminders: minutes between notifications. */
  intervalMinutes: number;
  enabled: boolean;
}

/** What the big card on Home leads with. */
export type HomeView = 'balance' | 'expenses';

export interface Settings {
  profileName: string | null;
  /** `file://` URI of the resized profile photo in the app's documents folder; never included in backups. */
  profilePhotoUri: string | null;
  currency: string;
  /** False until the first-run name and currency setup is finished. */
  onboarded: boolean;
  theme: ThemePreference;
  homeView: HomeView;
  /** Home card: the income/expense (or income/balance) pair under the headline amount. */
  showBalanceStats: boolean;
  showAccountsOnHome: boolean;
  showSplitOnHome: boolean;
  /** Leave credit card dues out of the total balance. */
  excludeCCFromBalance: boolean;
  /** Mask account balances until the user peeks. */
  hideBalances: boolean;
  defaultTxnType: TransactionType;
  customAccountTypes: CustomAccountType[];
  /** Payment app choices (web app setting). */
  paymentApps: string[];
  trackPaymentApp: boolean;
  /** People available for splitting; the ledger may also mention people removed from this list. */
  splitPeople: string[];
  /** What leaves your account when you pay a split expense. Applies to new expenses only. */
  splitBankDeduction: SplitAmountMode;
  /** What analytics and the Home card count as your spending for split expenses. */
  splitExpenseRecord: SplitAmountMode;
  lockEnabled: boolean;
  /** What the lock screen asks for. Both are stored only as a salted hash in the keystore. */
  lockType: LockType;
  lockBiometric: boolean;
  /** Seconds in the background before the app locks again. */
  lockTimeout: number;
  /** User-defined reminders (web app format). */
  reminders: CustomReminder[];
  /** Quiet hours: custom reminders aren't scheduled between `dndStart` and `dndEnd` (`HH:mm`, may wrap midnight). */
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  dueReminders: boolean;
  /** Weekly notification to export a backup, until one is made. */
  backupReminder: boolean;
  /** `YYYY-MM-DD` of the last JSON backup exported on this phone. */
  lastBackupAt: string | null;
  /** `YYYY-MM-DD` the backup reminder started counting from, used until the first backup. */
  backupClockStart: string | null;
  /** Android folder (content URI) that "Save to Files" exports go to; chosen once, device-only. */
  backupFolderUri: string | null;
}
