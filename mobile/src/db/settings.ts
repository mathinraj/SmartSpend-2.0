import type { SQLiteDatabase } from 'expo-sqlite';

import type { CustomReminder, Settings } from '@/types/models';

export const DEFAULT_REMINDER: CustomReminder = {
  id: 'daily',
  label: 'Log expenses',
  message: "Don't forget to log today's expenses.",
  time: '21:00',
  frequency: 'daily',
  day: 0,
  intervalMinutes: 60,
  enabled: false,
};

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
  customAccountTypes: [],
  paymentApps: ['GPay', 'PhonePe', 'Paytm', 'CRED', 'Amazon Pay', 'Cash', 'Card Swipe', 'Net Banking'],
  trackPaymentApp: true,
  splitPeople: [],
  splitBankDeduction: 'full',
  splitExpenseRecord: 'my_share',
  lockEnabled: false,
  lockType: 'pin',
  lockBiometric: false,
  lockTimeout: 0,
  reminders: [DEFAULT_REMINDER],
  dndEnabled: false,
  dndStart: '23:00',
  dndEnd: '07:00',
  dueReminders: true,
  backupReminder: true,
  lastBackupAt: null,
  backupClockStart: null,
};

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const { dailyReminder, dailyReminderTime, ...stored } = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  const settings: Settings = { ...DEFAULT_SETTINGS, ...stored };
  // Before custom reminders there was a single daily reminder; carry its choice over until reminders are saved.
  if (!('reminders' in stored) && (dailyReminder !== undefined || dailyReminderTime !== undefined)) {
    settings.reminders = [{ ...DEFAULT_REMINDER, enabled: dailyReminder === true, time: dailyReminderTime ?? DEFAULT_REMINDER.time }];
  }
  return settings;
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
