import type { SQLiteDatabase } from 'expo-sqlite';

import type { Settings } from '@/types/models';

const DEFAULT_SETTINGS: Settings = {
  profileName: null,
  currency: 'INR',
  onboarded: false,
  theme: 'system',
  homeView: 'balance',
  showBalanceStats: true,
  showAccountsOnHome: true,
  showSplitOnHome: true,
  excludeCCFromBalance: false,
  hideBalances: false,
  defaultTxnType: 'expense',
  splitPeople: [],
  splitBankDeduction: 'full',
  splitExpenseRecord: 'my_share',
  lockEnabled: false,
  lockBiometric: false,
  lockTimeout: 0,
  dailyReminder: false,
  dailyReminderTime: '21:00',
  dueReminders: true,
};

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  return { ...DEFAULT_SETTINGS, ...stored };
}

/** Writes settings without opening a SQL transaction, for use inside one. */
export async function writeSettings(db: SQLiteDatabase, patch: Partial<Settings>) {
  for (const [key, value] of Object.entries(patch)) {
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
      key,
      JSON.stringify(value)
    );
  }
}

export async function updateSettings(db: SQLiteDatabase, patch: Partial<Settings>) {
  await db.withTransactionAsync(() => writeSettings(db, patch));
}
