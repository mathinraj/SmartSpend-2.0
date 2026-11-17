import type { SQLiteDatabase } from 'expo-sqlite';

import { accountSql, spentSql } from '@/db/transactions';
import { addDays, parseDateKey, toDateKey } from '@/lib/format';
import type { SplitAmountMode } from '@/types/models';

export interface DayTotal {
  /** `YYYY-MM-DD`. */
  date: string;
  income: number;
  expense: number;
}

/** Income and spending per day for `[from, to)`, including empty days, oldest first. */
export async function getDailyTotals(
  db: SQLiteDatabase,
  from: string,
  to: string,
  record: SplitAmountMode,
  accountIds: string[] = []
): Promise<DayTotal[]> {
  const rows = await db.getAllAsync<DayTotal>(
    `SELECT t.date AS date,
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0)        AS income,
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ${spentSql(record)} END), 0) AS expense
       FROM transactions t
      WHERE t.date >= ? AND t.date < ?${accountSql(accountIds)}
      GROUP BY t.date`,
    from,
    to,
    ...accountIds
  );
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const result: DayTotal[] = [];
  for (let d = parseDateKey(from); toDateKey(d) < to; d = addDays(d, 1)) {
    const key = toDateKey(d);
    result.push(byDate.get(key) ?? { date: key, income: 0, expense: 0 });
  }
  return result;
}

/** Spending per weekday for `[from, to)`; index 0 is Sunday. */
export async function getWeekdayTotals(
  db: SQLiteDatabase,
  from: string,
  to: string,
  record: SplitAmountMode,
  accountIds: string[] = []
): Promise<number[]> {
  const rows = await db.getAllAsync<{ weekday: string; expense: number }>(
    `SELECT strftime('%w', t.date) AS weekday, SUM(${spentSql(record)}) AS expense
       FROM transactions t
      WHERE t.type = 'expense' AND t.date >= ? AND t.date < ?${accountSql(accountIds)}
      GROUP BY weekday`,
    from,
    to,
    ...accountIds
  );
  const result = [0, 0, 0, 0, 0, 0, 0];
  for (const r of rows) result[Number(r.weekday)] = r.expense;
  return result;
}

export interface AccountTotal {
  accountId: string;
  income: number;
  expense: number;
}

/** Income and spending per account for `[from, to)`; accounts with no activity are left out. */
export async function getAccountTotals(
  db: SQLiteDatabase,
  from: string,
  to: string,
  record: SplitAmountMode
): Promise<AccountTotal[]> {
  return db.getAllAsync<AccountTotal>(
    `SELECT t.account_id AS accountId,
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0)        AS income,
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ${spentSql(record)} END), 0) AS expense
       FROM transactions t
      WHERE t.account_id IS NOT NULL AND t.date >= ? AND t.date < ?
      GROUP BY t.account_id`,
    from,
    to
  );
}

export interface DayActivity {
  /** `YYYY-MM-DD`. */
  date: string;
  /** All transactions that day, transfers included. */
  count: number;
  income: number;
  expense: number;
}

/** Per-day counts and totals for the History calendar; days without transactions are left out. */
export async function getDayActivity(db: SQLiteDatabase, from: string, to: string): Promise<DayActivity[]> {
  return db.getAllAsync<DayActivity>(
    `SELECT date,
            COUNT(*) AS count,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0)  AS income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
       FROM transactions
      WHERE date >= ? AND date < ?
      GROUP BY date`,
    from,
    to
  );
}

export interface AccountActivity {
  count: number;
  transfersIn: number;
  transfersOut: number;
}

/** Every transaction touching the account in `[from, to)`, including transfers on either side. */
export async function getAccountActivity(
  db: SQLiteDatabase,
  accountId: string,
  from: string,
  to: string
): Promise<AccountActivity> {
  const row = await db.getFirstAsync<AccountActivity>(
    `SELECT COUNT(*) AS count,
            COALESCE(SUM(CASE WHEN to_account_id = ? THEN amount END), 0)   AS transfersIn,
            COALESCE(SUM(CASE WHEN from_account_id = ? THEN amount END), 0) AS transfersOut
       FROM transactions
      WHERE ? IN (account_id, from_account_id, to_account_id) AND date >= ? AND date < ?`,
    accountId,
    accountId,
    accountId,
    from,
    to
  );
  return row ?? { count: 0, transfersIn: 0, transfersOut: 0 };
}
