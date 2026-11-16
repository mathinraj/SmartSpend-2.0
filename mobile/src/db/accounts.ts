import type { SQLiteDatabase } from 'expo-sqlite';

import { generateId } from '@/lib/id';
import type { Account } from '@/types/models';

interface AccountRow {
  id: string;
  name: string;
  type: Account['type'];
  sub_type: string | null;
  balance: number;
  icon: string | null;
  color: string | null;
  credit_limit: number | null;
  billing_day: number | null;
  due_day: number | null;
  sort_order: number;
  created_at: string;
}

function toAccount(r: AccountRow): Account {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    subType: r.sub_type,
    balance: r.balance,
    icon: r.icon,
    color: r.color,
    creditLimit: r.credit_limit,
    billingDay: r.billing_day,
    dueDay: r.due_day,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  };
}

export async function listAccounts(db: SQLiteDatabase): Promise<Account[]> {
  const rows = await db.getAllAsync<AccountRow>('SELECT * FROM accounts ORDER BY sort_order, created_at');
  return rows.map(toAccount);
}

export async function getAccount(db: SQLiteDatabase, id: string): Promise<Account | null> {
  const row = await db.getFirstAsync<AccountRow>('SELECT * FROM accounts WHERE id = ?', id);
  return row ? toAccount(row) : null;
}

export type AccountInput = Omit<Account, 'id' | 'sortOrder' | 'createdAt'>;
export type NewAccount = AccountInput & { id?: string };

export async function createAccount(db: SQLiteDatabase, input: NewAccount): Promise<string> {
  const id = input.id ?? generateId();
  await db.runAsync(
    `INSERT INTO accounts
       (id, name, type, sub_type, balance, icon, color, credit_limit, billing_day, due_day, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM accounts), ?)`,
    id,
    input.name,
    input.type,
    input.subType,
    input.balance,
    input.icon,
    input.color,
    input.creditLimit,
    input.billingDay,
    input.dueDay,
    new Date().toISOString()
  );
  return id;
}

/**
 * Overwrites account details. Setting `balance` here is a manual correction; balance changes caused by
 * transactions must go through the transaction functions instead.
 */
export async function updateAccount(db: SQLiteDatabase, id: string, input: AccountInput) {
  await db.runAsync(
    `UPDATE accounts
        SET name = ?, type = ?, sub_type = ?, balance = ?, icon = ?, color = ?,
            credit_limit = ?, billing_day = ?, due_day = ?
      WHERE id = ?`,
    input.name,
    input.type,
    input.subType,
    input.balance,
    input.icon,
    input.color,
    input.creditLimit,
    input.billingDay,
    input.dueDay,
    id
  );
}

/** Transactions that reference the account are kept so history and totals stay intact. */
export async function deleteAccount(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
}
