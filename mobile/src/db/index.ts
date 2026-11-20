export const DATABASE_NAME = 'spendtrak.db';

/** Tables that screens can subscribe to with `useDbQuery`. */
export type Table =
  | 'settings'
  | 'accounts'
  | 'categories'
  | 'subcategories'
  | 'transactions'
  | 'planned_payments'
  | 'split_entries'
  | 'sync_state'
  | 'sms_messages'
  | 'sms_account_hints'
  | 'merchant_categories';

export { migrateDbIfNeeded } from './migrations';
