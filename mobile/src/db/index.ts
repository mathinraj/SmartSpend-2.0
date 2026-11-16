export const DATABASE_NAME = 'spendtrak.db';

/** Tables that screens can subscribe to with `useDbQuery`. */
export type Table = 'settings' | 'accounts' | 'categories' | 'subcategories' | 'transactions';

export { migrateDbIfNeeded } from './migrations';
