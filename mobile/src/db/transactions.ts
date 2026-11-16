import type { SQLiteDatabase } from 'expo-sqlite';

import { generateId } from '@/lib/id';
import type { Transaction, TransactionListItem } from '@/types/models';

interface TransactionRow {
  id: string;
  type: Transaction['type'];
  amount: number;
  account_id: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  note: string | null;
  date: string;
  time: string | null;
  is_split: number;
  split_amount: number | null;
  source: Transaction['source'];
  source_ref: string | null;
  created_at: string;
}

interface TransactionListRow extends TransactionRow {
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  subcategory_name: string | null;
  account_name: string | null;
  from_account_name: string | null;
  to_account_name: string | null;
}

function toTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    type: r.type,
    amount: r.amount,
    accountId: r.account_id,
    fromAccountId: r.from_account_id,
    toAccountId: r.to_account_id,
    categoryId: r.category_id,
    subcategoryId: r.subcategory_id,
    note: r.note,
    date: r.date,
    time: r.time,
    isSplit: r.is_split === 1,
    splitAmount: r.split_amount,
    source: r.source,
    sourceRef: r.source_ref,
    createdAt: r.created_at,
  };
}

function toListItem(r: TransactionListRow): TransactionListItem {
  return {
    ...toTransaction(r),
    categoryName: r.category_name,
    categoryIcon: r.category_icon,
    categoryColor: r.category_color,
    subcategoryName: r.subcategory_name,
    accountName: r.account_name,
    fromAccountName: r.from_account_name,
    toAccountName: r.to_account_name,
  };
}

export interface TransactionFilter {
  /** Inclusive `YYYY-MM-DD`. */
  from?: string;
  /** Exclusive `YYYY-MM-DD`. */
  to?: string;
  limit?: number;
}

const SELECT_LIST_ITEM = `
  SELECT t.*,
         c.name  AS category_name,
         c.icon  AS category_icon,
         c.color AS category_color,
         s.name  AS subcategory_name,
         a.name  AS account_name,
         fa.name AS from_account_name,
         ta.name AS to_account_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN subcategories s ON s.id = t.subcategory_id
    LEFT JOIN accounts a ON a.id = t.account_id
    LEFT JOIN accounts fa ON fa.id = t.from_account_id
    LEFT JOIN accounts ta ON ta.id = t.to_account_id`;

export async function listTransactions(
  db: SQLiteDatabase,
  { from, to, limit }: TransactionFilter = {}
): Promise<TransactionListItem[]> {
  const rows = await db.getAllAsync<TransactionListRow>(
    `${SELECT_LIST_ITEM}
      WHERE ($from IS NULL OR t.date >= $from)
        AND ($to IS NULL OR t.date < $to)
      ORDER BY t.date DESC, t.time DESC, t.created_at DESC
      LIMIT $limit`,
    { $from: from ?? null, $to: to ?? null, $limit: limit ?? -1 }
  );
  return rows.map(toListItem);
}

export async function getTransaction(db: SQLiteDatabase, id: string): Promise<TransactionListItem | null> {
  const row = await db.getFirstAsync<TransactionListRow>(`${SELECT_LIST_ITEM} WHERE t.id = ?`, id);
  return row ? toListItem(row) : null;
}

export async function countTransactionsForAccount(db: SQLiteDatabase, accountId: string): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM transactions WHERE ? IN (account_id, from_account_id, to_account_id)',
    accountId
  );
  return row?.n ?? 0;
}

export interface PeriodSummary {
  income: number;
  expense: number;
}

export async function getPeriodSummary(db: SQLiteDatabase, from: string, to: string): Promise<PeriodSummary> {
  const row = await db.getFirstAsync<PeriodSummary>(
    `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0)  AS income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
       FROM transactions
      WHERE date >= ? AND date < ?`,
    from,
    to
  );
  return row ?? { income: 0, expense: 0 };
}

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  total: number;
}

export async function getCategoryTotals(
  db: SQLiteDatabase,
  type: 'expense' | 'income',
  from: string,
  to: string
): Promise<CategoryTotal[]> {
  return db.getAllAsync<CategoryTotal>(
    `SELECT t.category_id              AS categoryId,
            COALESCE(c.name, 'Uncategorized') AS name,
            COALESCE(c.icon, '📦')      AS icon,
            COALESCE(c.color, '#B2BEC3') AS color,
            SUM(t.amount)               AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.type = ? AND t.date >= ? AND t.date < ?
      GROUP BY t.category_id
      ORDER BY total DESC`,
    type,
    from,
    to
  );
}

type BalanceInput = Pick<Transaction, 'type' | 'amount' | 'accountId' | 'fromAccountId' | 'toAccountId'>;

/** How a transaction changes account balances. Reversing it applies the same deltas negated. */
function balanceDeltas(t: BalanceInput): [accountId: string, delta: number][] {
  switch (t.type) {
    case 'income':
      return t.accountId ? [[t.accountId, t.amount]] : [];
    case 'expense':
      return t.accountId ? [[t.accountId, -t.amount]] : [];
    case 'transfer': {
      const deltas: [string, number][] = [];
      if (t.fromAccountId) deltas.push([t.fromAccountId, -t.amount]);
      if (t.toAccountId) deltas.push([t.toAccountId, t.amount]);
      return deltas;
    }
  }
}

async function applyBalance(db: SQLiteDatabase, t: BalanceInput, sign: 1 | -1) {
  for (const [accountId, delta] of balanceDeltas(t)) {
    await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', sign * delta, accountId);
  }
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'> & { id?: string };

/**
 * Inserts the row only, leaving account balances untouched. Use for seeded or imported rows whose
 * effect is already reflected in balances; the caller owns the surrounding SQL transaction.
 */
export async function insertTransaction(db: SQLiteDatabase, input: NewTransaction): Promise<string> {
  const id = input.id ?? generateId();
  await db.runAsync(
    `INSERT INTO transactions
       (id, type, amount, account_id, from_account_id, to_account_id, category_id, subcategory_id,
        note, date, time, is_split, split_amount, source, source_ref, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.type,
    input.amount,
    input.accountId,
    input.fromAccountId,
    input.toAccountId,
    input.categoryId,
    input.subcategoryId,
    input.note,
    input.date,
    input.time,
    input.isSplit ? 1 : 0,
    input.splitAmount,
    input.source,
    input.sourceRef,
    new Date().toISOString()
  );
  return id;
}

/** Inserts a transaction and updates the affected account balances atomically. */
export async function addTransaction(db: SQLiteDatabase, input: NewTransaction): Promise<string> {
  let id = '';
  await db.withTransactionAsync(async () => {
    id = await insertTransaction(db, input);
    await applyBalance(db, input, 1);
  });
  return id;
}

/** Rewrites a transaction, reversing its old balance effect and applying the new one atomically. */
export async function updateTransaction(db: SQLiteDatabase, id: string, input: NewTransaction) {
  await db.withTransactionAsync(async () => {
    const old = await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE id = ?', id);
    if (!old) throw new Error(`Transaction ${id} not found`);
    await applyBalance(db, toTransaction(old), -1);
    await db.runAsync(
      `UPDATE transactions
          SET type = ?, amount = ?, account_id = ?, from_account_id = ?, to_account_id = ?,
              category_id = ?, subcategory_id = ?, note = ?, date = ?, time = ?,
              is_split = ?, split_amount = ?
        WHERE id = ?`,
      input.type,
      input.amount,
      input.accountId,
      input.fromAccountId,
      input.toAccountId,
      input.categoryId,
      input.subcategoryId,
      input.note,
      input.date,
      input.time,
      input.isSplit ? 1 : 0,
      input.splitAmount,
      id
    );
    await applyBalance(db, input, 1);
  });
}

/** Deletes a transaction and reverses its effect on account balances atomically. */
export async function deleteTransaction(db: SQLiteDatabase, id: string) {
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE id = ?', id);
    if (!row) return;
    await applyBalance(db, toTransaction(row), -1);
    await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
  });
}
