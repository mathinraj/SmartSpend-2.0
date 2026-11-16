import type { SQLiteDatabase } from 'expo-sqlite';

import { recordTransaction, type NewTransaction } from '@/db/transactions';
import { toDateKey, toTimeKey } from '@/lib/format';
import { generateId } from '@/lib/id';
import type { PersonBalance, SplitEntry } from '@/types/models';

interface SplitRow {
  id: string;
  type: SplitEntry['type'];
  person: string;
  amount: number;
  direction: SplitEntry['direction'];
  note: string | null;
  date: string;
  transaction_id: string | null;
  created_at: string;
}

function toEntry(r: SplitRow): SplitEntry {
  return {
    id: r.id,
    type: r.type,
    person: r.person,
    amount: r.amount,
    direction: r.direction,
    note: r.note,
    date: r.date,
    transactionId: r.transaction_id,
    createdAt: r.created_at,
  };
}

export async function listAllSplitEntries(db: SQLiteDatabase): Promise<SplitEntry[]> {
  const rows = await db.getAllAsync<SplitRow>('SELECT * FROM split_entries ORDER BY date DESC, created_at DESC');
  return rows.map(toEntry);
}

export async function listSplitEntries(db: SQLiteDatabase, person: string): Promise<SplitEntry[]> {
  const rows = await db.getAllAsync<SplitRow>(
    'SELECT * FROM split_entries WHERE person = ? ORDER BY date DESC, created_at DESC',
    person
  );
  return rows.map(toEntry);
}

/** Same rules as the web app: shares you paid and settlements you paid raise what they owe you. */
const BALANCE_SQL = `
  SUM(CASE
        WHEN type = 'split_paid' THEN amount
        WHEN type = 'split_owed' THEN -amount
        WHEN type = 'settlement' AND direction = 'received' THEN -amount
        WHEN type = 'settlement' AND direction = 'paid' THEN amount
        ELSE 0
      END)`;

/** Balances for everyone in `people` plus anyone else who appears in the ledger, largest first. */
export async function getPersonBalances(db: SQLiteDatabase, people: string[]): Promise<PersonBalance[]> {
  const rows = await db.getAllAsync<PersonBalance>(
    `SELECT person, ${BALANCE_SQL} AS balance FROM split_entries GROUP BY person`
  );
  const balances = new Map(people.map((p) => [p, 0]));
  for (const r of rows) balances.set(r.person, Math.round(r.balance * 100) / 100);
  return [...balances.entries()]
    .map(([person, balance]) => ({ person, balance }))
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance) || a.person.localeCompare(b.person));
}

export async function getPersonBalance(db: SQLiteDatabase, person: string): Promise<number> {
  const row = await db.getFirstAsync<{ balance: number | null }>(
    `SELECT ${BALANCE_SQL} AS balance FROM split_entries WHERE person = ?`,
    person
  );
  return Math.round((row?.balance ?? 0) * 100) / 100;
}

export type NewSplitEntry = Omit<SplitEntry, 'id' | 'createdAt'> & { id?: string };

/** Inserts the row only; the caller owns the surrounding SQL transaction. */
export async function insertSplitEntry(db: SQLiteDatabase, input: NewSplitEntry): Promise<string> {
  const id = input.id ?? generateId();
  await db.runAsync(
    `INSERT INTO split_entries (id, type, person, amount, direction, note, date, transaction_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.type,
    input.person,
    input.amount,
    input.direction,
    input.note,
    input.date,
    input.transactionId,
    new Date().toISOString()
  );
  return id;
}

export async function addSplitEntry(db: SQLiteDatabase, input: NewSplitEntry) {
  await insertSplitEntry(db, input);
}

export async function deleteSplitEntry(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM split_entries WHERE id = ?', id);
}

/** Shares are rounded to cents; the payer absorbs any rounding remainder. */
export function equalShare(total: number, otherPeople: number): number {
  return Math.round((total / (otherPeople + 1)) * 100) / 100;
}

/**
 * Records an expense you paid that is shared equally with `people`, and a `split_paid` entry for each
 * of them, atomically. The full amount still leaves your account.
 */
export async function addSplitExpense(db: SQLiteDatabase, input: NewTransaction, people: string[]): Promise<string> {
  const share = equalShare(input.amount, people.length);
  let id = '';
  await db.withTransactionAsync(async () => {
    id = await recordTransaction(db, { ...input, isSplit: true, splitAmount: share * people.length });
    for (const person of people) {
      await insertSplitEntry(db, {
        type: 'split_paid',
        person,
        amount: share,
        direction: null,
        note: input.note ?? 'Shared expense',
        date: input.date,
        transactionId: id,
      });
    }
  });
  return id;
}

export interface SettlementInput {
  person: string;
  amount: number;
  direction: 'received' | 'paid';
  note: string | null;
  /** When set, also logs the money as income (received) or an expense (paid) on this account. */
  accountId: string | null;
}

export async function recordSettlement(db: SQLiteDatabase, input: SettlementInput) {
  const now = new Date();
  const date = toDateKey(now);
  await db.withTransactionAsync(async () => {
    let transactionId: string | null = null;
    if (input.accountId) {
      const received = input.direction === 'received';
      transactionId = await recordTransaction(db, {
        type: received ? 'income' : 'expense',
        amount: input.amount,
        accountId: input.accountId,
        fromAccountId: null,
        toAccountId: null,
        categoryId: received ? 'income_split_settlement' : 'other',
        subcategoryId: received ? null : 'other_misc',
        note: received ? `Split settlement from ${input.person}` : `Split settlement to ${input.person}`,
        date,
        time: toTimeKey(now),
        isSplit: false,
        splitAmount: null,
        source: 'manual',
        sourceRef: null,
      });
    }
    await insertSplitEntry(db, {
      type: 'settlement',
      person: input.person,
      amount: input.amount,
      direction: input.direction,
      note: input.note ?? 'Settlement',
      date,
      transactionId,
    });
  });
}
