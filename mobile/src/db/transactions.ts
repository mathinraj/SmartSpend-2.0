import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import { generateId } from '@/lib/id';
import type { Transaction, TransactionListItem, TransactionType } from '@/types/models';

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

export type SearchField = 'all' | 'note' | 'category' | 'amount' | 'account';

export interface TransactionFilter {
  /** Inclusive `YYYY-MM-DD`. */
  from?: string;
  /** Exclusive `YYYY-MM-DD`. */
  to?: string;
  limit?: number;
  type?: TransactionType;
  /** Case-insensitive substring match on `searchField`. */
  search?: string;
  searchField?: SearchField;
  categoryIds?: string[];
  /** Matches the account, or either side of a transfer. */
  accountIds?: string[];
  minAmount?: number;
  maxAmount?: number;
}

const SEARCH_COLUMNS: Record<Exclude<SearchField, 'all'>, string[]> = {
  note: ['t.note'],
  category: ["CASE WHEN t.type = 'transfer' THEN 'Transfer' ELSE c.name END", 's.name'],
  amount: ['CAST(t.amount AS TEXT)'],
  account: ['a.name', 'fa.name', 'ta.name'],
};

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function placeholders(values: unknown[]): string {
  return values.map(() => '?').join(', ');
}

function buildWhere(filter: TransactionFilter): { sql: string; params: SQLiteBindValue[] } {
  const clauses: string[] = [];
  const params: SQLiteBindValue[] = [];
  if (filter.from) {
    clauses.push('t.date >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    clauses.push('t.date < ?');
    params.push(filter.to);
  }
  if (filter.type) {
    clauses.push('t.type = ?');
    params.push(filter.type);
  }
  const search = filter.search?.trim();
  if (search) {
    const field = filter.searchField ?? 'all';
    const columns = field === 'all' ? Object.values(SEARCH_COLUMNS).flat() : SEARCH_COLUMNS[field];
    clauses.push(`(${columns.map((col) => `${col} LIKE ? ESCAPE '\\'`).join(' OR ')})`);
    params.push(...columns.map(() => `%${escapeLike(search)}%`));
  }
  if (filter.categoryIds?.length) {
    clauses.push(`t.category_id IN (${placeholders(filter.categoryIds)})`);
    params.push(...filter.categoryIds);
  }
  if (filter.accountIds?.length) {
    const list = placeholders(filter.accountIds);
    clauses.push(`(t.account_id IN (${list}) OR t.from_account_id IN (${list}) OR t.to_account_id IN (${list}))`);
    params.push(...filter.accountIds, ...filter.accountIds, ...filter.accountIds);
  }
  if (filter.minAmount !== undefined) {
    clauses.push('t.amount >= ?');
    params.push(filter.minAmount);
  }
  if (filter.maxAmount !== undefined) {
    clauses.push('t.amount <= ?');
    params.push(filter.maxAmount);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
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
  filter: TransactionFilter = {}
): Promise<TransactionListItem[]> {
  const where = buildWhere(filter);
  const rows = await db.getAllAsync<TransactionListRow>(
    `${SELECT_LIST_ITEM}
      ${where.sql}
      ORDER BY t.date DESC, t.time DESC, t.created_at DESC
      LIMIT ?`,
    [...where.params, filter.limit ?? -1]
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

/** Applies (1) or reverses (-1) a transaction's balance effect. The caller owns the SQL transaction. */
export async function applyBalance(db: SQLiteDatabase, t: BalanceInput, sign: 1 | -1) {
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

/** Inserts a transaction and updates account balances. The caller owns the surrounding SQL transaction. */
export async function recordTransaction(db: SQLiteDatabase, input: NewTransaction): Promise<string> {
  const id = await insertTransaction(db, input);
  await applyBalance(db, input, 1);
  return id;
}

/** Inserts a transaction and updates the affected account balances atomically. */
export async function addTransaction(db: SQLiteDatabase, input: NewTransaction): Promise<string> {
  let id = '';
  await db.withTransactionAsync(async () => {
    id = await recordTransaction(db, input);
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

/**
 * Deletes a transaction, reverses its effect on account balances, and removes split shares created
 * from it, atomically.
 */
export async function deleteTransaction(db: SQLiteDatabase, id: string) {
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE id = ?', id);
    if (!row) return;
    await applyBalance(db, toTransaction(row), -1);
    await db.runAsync('DELETE FROM split_entries WHERE transaction_id = ?', id);
    await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
  });
}

export interface MonthTotal {
  /** `YYYY-MM`. */
  month: string;
  income: number;
  expense: number;
}

/** Income and expense per month for `[fromMonth, toMonth]`, oldest first, including empty months. */
export async function getMonthlyTotals(db: SQLiteDatabase, fromMonth: string, toMonth: string): Promise<MonthTotal[]> {
  const rows = await db.getAllAsync<MonthTotal>(
    `SELECT substr(date, 1, 7) AS month,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0)  AS income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
       FROM transactions
      WHERE substr(date, 1, 7) BETWEEN ? AND ?
      GROUP BY month`,
    fromMonth,
    toMonth
  );
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const result: MonthTotal[] = [];
  let [y, m] = fromMonth.split('-').map(Number);
  for (;;) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    result.push(byMonth.get(key) ?? { month: key, income: 0, expense: 0 });
    if (key >= toMonth) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return result;
}
