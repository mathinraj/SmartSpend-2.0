import type { SQLiteDatabase } from 'expo-sqlite';

import { seedDefaultCategories } from '@/db/migrations';

/**
 * Deletes every record and setting and restores the default categories, leaving the app as on first
 * launch (onboarding shows again because `settings.onboarded` is gone).
 */
export async function resetAllData(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    // `WHERE 1` keeps SQLite from truncating the table in one step, which would skip the change events
    // that `useDbQuery` listens to.
    await db.execAsync(`
      DELETE FROM split_entries WHERE 1;
      DELETE FROM planned_payments WHERE 1;
      DELETE FROM transactions WHERE 1;
      DELETE FROM accounts WHERE 1;
      DELETE FROM subcategories WHERE 1;
      DELETE FROM categories WHERE 1;
      DELETE FROM settings WHERE 1;
    `);
    await seedDefaultCategories(db);
  });
}
