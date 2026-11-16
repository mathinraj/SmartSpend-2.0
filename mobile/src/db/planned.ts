import type { SQLiteDatabase } from 'expo-sqlite';

import { recordTransaction } from '@/db/transactions';
import { toDateKey, toTimeKey } from '@/lib/format';
import { generateId } from '@/lib/id';
import { nextDueDate } from '@/lib/planned';
import type { PlannedPayment, PlannedPaymentListItem } from '@/types/models';

interface PlannedRow {
  id: string;
  name: string;
  amount: number;
  account_id: string | null;
  category_id: string | null;
  frequency: PlannedPayment['frequency'];
  next_date: string;
  note: string | null;
  enabled: number;
  last_paid_date: string | null;
  created_at: string;
}

interface PlannedListRow extends PlannedRow {
  category_icon: string | null;
  category_color: string | null;
  account_name: string | null;
}

function toPlanned(r: PlannedRow): PlannedPayment {
  return {
    id: r.id,
    name: r.name,
    amount: r.amount,
    accountId: r.account_id,
    categoryId: r.category_id,
    frequency: r.frequency,
    nextDate: r.next_date,
    note: r.note,
    enabled: r.enabled === 1,
    lastPaidDate: r.last_paid_date,
    createdAt: r.created_at,
  };
}

function toListItem(r: PlannedListRow): PlannedPaymentListItem {
  return { ...toPlanned(r), categoryIcon: r.category_icon, categoryColor: r.category_color, accountName: r.account_name };
}

/** Enabled payments first, soonest due first. */
export async function listPlanned(db: SQLiteDatabase): Promise<PlannedPaymentListItem[]> {
  const rows = await db.getAllAsync<PlannedListRow>(
    `SELECT p.*, c.icon AS category_icon, c.color AS category_color, a.name AS account_name
       FROM planned_payments p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN accounts a ON a.id = p.account_id
      ORDER BY p.enabled DESC, p.next_date, p.name`
  );
  return rows.map(toListItem);
}

/** Enabled payments due on or before `untilDateKey`, soonest first. */
export async function listDuePlanned(db: SQLiteDatabase, untilDateKey: string): Promise<PlannedPaymentListItem[]> {
  return (await listPlanned(db)).filter((p) => p.enabled && p.nextDate <= untilDateKey);
}

export async function getPlanned(db: SQLiteDatabase, id: string): Promise<PlannedPayment | null> {
  const row = await db.getFirstAsync<PlannedRow>('SELECT * FROM planned_payments WHERE id = ?', id);
  return row ? toPlanned(row) : null;
}

export type PlannedInput = Omit<PlannedPayment, 'id' | 'createdAt' | 'lastPaidDate'>;

export async function createPlanned(db: SQLiteDatabase, input: PlannedInput & { id?: string }): Promise<string> {
  const id = input.id ?? generateId();
  await db.runAsync(
    `INSERT INTO planned_payments
       (id, name, amount, account_id, category_id, frequency, next_date, note, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.amount,
    input.accountId,
    input.categoryId,
    input.frequency,
    input.nextDate,
    input.note,
    input.enabled ? 1 : 0,
    new Date().toISOString()
  );
  return id;
}

export async function updatePlanned(db: SQLiteDatabase, id: string, input: PlannedInput) {
  await db.runAsync(
    `UPDATE planned_payments
        SET name = ?, amount = ?, account_id = ?, category_id = ?, frequency = ?, next_date = ?,
            note = ?, enabled = ?
      WHERE id = ?`,
    input.name,
    input.amount,
    input.accountId,
    input.categoryId,
    input.frequency,
    input.nextDate,
    input.note,
    input.enabled ? 1 : 0,
    id
  );
}

export async function setPlannedEnabled(db: SQLiteDatabase, id: string, enabled: boolean) {
  await db.runAsync('UPDATE planned_payments SET enabled = ? WHERE id = ?', enabled ? 1 : 0, id);
}

export async function deletePlanned(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM planned_payments WHERE id = ?', id);
}

/**
 * Logs the payment as an expense today (when it has an account), then moves it to its next due date.
 * One-time payments are paused instead. All in one SQL transaction.
 */
export async function markPlannedPaid(db: SQLiteDatabase, id: string) {
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<PlannedRow>('SELECT * FROM planned_payments WHERE id = ?', id);
    if (!row) return;
    const payment = toPlanned(row);
    const now = new Date();
    const today = toDateKey(now);

    if (payment.accountId) {
      const account = await db.getFirstAsync('SELECT id FROM accounts WHERE id = ?', payment.accountId);
      if (account) {
        await recordTransaction(db, {
          type: 'expense',
          amount: payment.amount,
          accountId: payment.accountId,
          fromAccountId: null,
          toAccountId: null,
          categoryId: payment.categoryId,
          subcategoryId: null,
          note: payment.note ? `${payment.name} — ${payment.note}` : payment.name,
          date: today,
          time: toTimeKey(now),
          isSplit: false,
          splitAmount: null,
          source: 'manual',
          sourceRef: null,
        });
      }
    }

    const next = nextDueDate(payment.nextDate, payment.frequency);
    await db.runAsync(
      'UPDATE planned_payments SET last_paid_date = ?, next_date = ?, enabled = ? WHERE id = ?',
      today,
      next ?? payment.nextDate,
      next ? 1 : 0,
      id
    );
  });
}
