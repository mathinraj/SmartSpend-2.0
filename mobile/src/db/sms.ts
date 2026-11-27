import type { SQLiteDatabase } from 'expo-sqlite';

import { deleteTransaction, recordTransaction, type NewTransaction } from '@/db/transactions';
import { generateId } from '@/lib/id';
import type { IgnoreReason, ParsedSms, UnparsedReason } from '@/lib/sms/parser';

/**
 * SMS import storage. Device-only: these tables have no change tracking and are left out of backups and
 * Drive sync. Raw message text is kept only while it's needed (see `pruneSms`).
 */

export type SmsResult = 'parsed' | 'ignored' | 'unparsed';
/** `pending` waits in the review list; `duplicate` was merged into `duplicateOf`. */
export type SmsStatus = 'pending' | 'added' | 'auto_added' | 'dismissed' | 'duplicate' | 'ignored';

export interface SmsMessage {
  id: string;
  smsId: number | null;
  key: string;
  sender: string;
  senderCode: string | null;
  receivedAt: number;
  body: string | null;
  result: SmsResult;
  reason: IgnoreReason | UnparsedReason | 'ignored-sender' | null;
  parsed: ParsedSms | null;
  confidence: number | null;
  parserVersion: number;
  status: SmsStatus;
  /** Another `sms_messages.id`, or `txn:<transaction id>` for a manual entry that looks the same. */
  duplicateOf: string | null;
  dupScore: number | null;
  transactionId: string | null;
  updatedAt: string;
}

interface SmsRow {
  id: string;
  sms_id: number | null;
  msg_key: string;
  sender: string;
  sender_code: string | null;
  received_at: number;
  body: string | null;
  result: SmsResult;
  reason: string | null;
  parsed: string | null;
  confidence: number | null;
  parser_version: number;
  status: SmsStatus;
  duplicate_of: string | null;
  dup_score: number | null;
  transaction_id: string | null;
  updated_at: string;
}

function toMessage(r: SmsRow): SmsMessage {
  return {
    id: r.id,
    smsId: r.sms_id,
    key: r.msg_key,
    sender: r.sender,
    senderCode: r.sender_code,
    receivedAt: r.received_at,
    body: r.body,
    result: r.result,
    reason: r.reason as SmsMessage['reason'],
    parsed: r.parsed ? (JSON.parse(r.parsed) as ParsedSms) : null,
    confidence: r.confidence,
    parserVersion: r.parser_version,
    status: r.status,
    duplicateOf: r.duplicate_of,
    dupScore: r.dup_score,
    transactionId: r.transaction_id,
    updatedAt: r.updated_at,
  };
}

const now = () => new Date().toISOString();

export type NewSmsMessage = Omit<SmsMessage, 'id' | 'transactionId' | 'updatedAt'>;

/** Inserts a message unless one with the same key exists. Returns the new row's ID, or null if skipped. */
export async function insertSmsMessage(db: SQLiteDatabase, m: NewSmsMessage): Promise<string | null> {
  const id = generateId();
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO sms_messages
       (id, sms_id, msg_key, sender, sender_code, received_at, body, result, reason, parsed, confidence,
        parser_version, status, duplicate_of, dup_score, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    m.smsId,
    m.key,
    m.sender,
    m.senderCode,
    m.receivedAt,
    m.body,
    m.result,
    m.reason,
    m.parsed ? JSON.stringify(m.parsed) : null,
    m.confidence,
    m.parserVersion,
    m.status,
    m.duplicateOf,
    m.dupScore,
    now(),
    now()
  );
  return result.changes > 0 ? id : null;
}

export async function knownSmsIds(db: SQLiteDatabase, ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const rows = await db.getAllAsync<{ sms_id: number }>(
    `SELECT sms_id FROM sms_messages WHERE sms_id IN (${ids.map(() => '?').join(', ')})`,
    ...ids
  );
  return new Set(rows.map((r) => r.sms_id));
}

export async function findSmsIdByKey(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM sms_messages WHERE msg_key = ?', key);
  return row?.id ?? null;
}

export async function getSmsMessage(db: SQLiteDatabase, id: string): Promise<SmsMessage | null> {
  const row = await db.getFirstAsync<SmsRow>('SELECT * FROM sms_messages WHERE id = ?', id);
  return row ? toMessage(row) : null;
}

/** Parsed messages around `at` that a new message could duplicate. */
export async function listDedupCandidates(db: SQLiteDatabase, at: number, windowMs: number): Promise<SmsMessage[]> {
  const rows = await db.getAllAsync<SmsRow>(
    `SELECT * FROM sms_messages
      WHERE result = 'parsed' AND status IN ('pending', 'added', 'auto_added')
        AND received_at BETWEEN ? AND ?`,
    at - windowMs,
    at + windowMs
  );
  return rows.map(toMessage);
}

/** What the review list shows: waiting items, plus automatic additions from the last day (for Undo). */
export async function listSmsReview(db: SQLiteDatabase): Promise<SmsMessage[]> {
  const rows = await db.getAllAsync<SmsRow>(
    `SELECT * FROM sms_messages
      WHERE status = 'pending' OR (status = 'auto_added' AND updated_at >= ?)
      ORDER BY received_at DESC`,
    new Date(Date.now() - 86_400_000).toISOString()
  );
  return rows.map(toMessage);
}

export async function countPendingSms(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM sms_messages WHERE status = 'pending'");
  return row?.n ?? 0;
}

/** Every message SpendTrak looked at, newest first (the transparency screen). */
export async function listSmsLog(db: SQLiteDatabase, limit = 300): Promise<SmsMessage[]> {
  const rows = await db.getAllAsync<SmsRow>('SELECT * FROM sms_messages ORDER BY received_at DESC LIMIT ?', limit);
  return rows.map(toMessage);
}

/** Unparsed messages read by an older parser, to try again after an update. */
export async function listReparseCandidates(db: SQLiteDatabase, parserVersion: number): Promise<SmsMessage[]> {
  const rows = await db.getAllAsync<SmsRow>(
    "SELECT * FROM sms_messages WHERE result = 'unparsed' AND body IS NOT NULL AND status = 'pending' AND parser_version < ?",
    parserVersion
  );
  return rows.map(toMessage);
}

export async function updateSmsParse(
  db: SQLiteDatabase,
  id: string,
  patch: Pick<SmsMessage, 'result' | 'reason' | 'parsed' | 'confidence' | 'parserVersion' | 'status'>
) {
  await db.runAsync(
    'UPDATE sms_messages SET result = ?, reason = ?, parsed = ?, confidence = ?, parser_version = ?, status = ?, updated_at = ? WHERE id = ?',
    patch.result,
    patch.reason,
    patch.parsed ? JSON.stringify(patch.parsed) : null,
    patch.confidence,
    patch.parserVersion,
    patch.status,
    now(),
    id
  );
}

async function setStatus(db: SQLiteDatabase, id: string, status: SmsStatus, extra: { transactionId?: string | null; duplicateOf?: string | null } = {}) {
  const keepBody = status === 'pending';
  await db.runAsync(
    `UPDATE sms_messages
        SET status = ?, transaction_id = COALESCE(?, transaction_id), duplicate_of = ?,
            body = CASE WHEN ? THEN body ELSE NULL END, updated_at = ?
      WHERE id = ?`,
    status,
    extra.transactionId ?? null,
    extra.duplicateOf === undefined ? null : extra.duplicateOf,
    keepBody ? 1 : 0,
    now(),
    id
  );
}

export async function dismissSms(db: SQLiteDatabase, id: string) {
  await setStatus(db, id, 'dismissed');
}

/** "Merge": the item is the same payment as `duplicateOf`, so it adds nothing. */
export async function mergeSmsDuplicate(db: SQLiteDatabase, id: string, duplicateOf: string) {
  await setStatus(db, id, 'duplicate', { duplicateOf });
}

/** "Keep both": not a duplicate after all. */
export async function keepSmsSeparate(db: SQLiteDatabase, id: string) {
  await db.runAsync('UPDATE sms_messages SET duplicate_of = NULL, dup_score = NULL, updated_at = ? WHERE id = ?', now(), id);
}

/** "Already added": the item is a transaction the user entered by hand. */
export async function linkSmsToTransaction(db: SQLiteDatabase, id: string, transactionId: string) {
  await setStatus(db, id, 'added', { transactionId });
}

/** Ignores everything waiting from one sender. */
export async function dismissSmsFromSender(db: SQLiteDatabase, senderCode: string) {
  await db.runAsync(
    "UPDATE sms_messages SET status = 'dismissed', body = NULL, updated_at = ? WHERE status = 'pending' AND sender_code = ?",
    now(),
    senderCode
  );
}

export interface SmsChoice {
  transaction: NewTransaction;
  /** Learn which account these digits belong to. */
  hint?: { institution: string; digits: string; accountId: string } | null;
  /** Learn the category for this merchant. */
  merchant?: { key: string; categoryId: string; subcategoryId: string | null } | null;
}

/** Records the transaction, marks the message added and remembers the choices, atomically. */
export async function addSmsTransaction(db: SQLiteDatabase, id: string, choice: SmsChoice, auto = false): Promise<string> {
  let txnId = '';
  await db.withTransactionAsync(async () => {
    txnId = await recordTransaction(db, choice.transaction);
    await setStatus(db, id, auto ? 'auto_added' : 'added', { transactionId: txnId });
    await rememberChoice(db, choice);
  });
  return txnId;
}

/** Saves what the user picked for future messages. The caller owns the SQL transaction. */
export async function rememberChoice(db: SQLiteDatabase, choice: Pick<SmsChoice, 'hint' | 'merchant'>) {
  if (choice.hint) {
    await db.runAsync(
      'INSERT OR REPLACE INTO sms_account_hints (institution, digits, account_id) VALUES (?, ?, ?)',
      choice.hint.institution,
      choice.hint.digits,
      choice.hint.accountId
    );
  }
  if (choice.merchant && choice.merchant.key) {
    await db.runAsync(
      'INSERT OR REPLACE INTO merchant_categories (merchant_key, category_id, subcategory_id, updated_at) VALUES (?, ?, ?, ?)',
      choice.merchant.key,
      choice.merchant.categoryId,
      choice.merchant.subcategoryId,
      now()
    );
  }
}

/** Marks a message added as the given (already saved) transaction, e.g. from the edit form. */
export async function markSmsAdded(db: SQLiteDatabase, id: string, transactionId: string) {
  await setStatus(db, id, 'added', { transactionId });
}

/** Undo an automatic addition: removes the transaction and puts the message back in the list. */
export async function undoSmsAdd(db: SQLiteDatabase, id: string) {
  const message = await getSmsMessage(db, id);
  if (message?.transactionId) await deleteTransaction(db, message.transactionId);
  await db.runAsync("UPDATE sms_messages SET status = 'pending', transaction_id = NULL, updated_at = ? WHERE id = ?", now(), id);
}

export async function getAccountHint(db: SQLiteDatabase, institution: string, digits: string): Promise<string | null> {
  // Banks mask differently ("XX1132" vs "x132"), so the last three digits are enough to match.
  const rows = await db.getAllAsync<{ digits: string; account_id: string }>(
    'SELECT digits, account_id FROM sms_account_hints WHERE institution = ?',
    institution
  );
  const exact = rows.find((r) => r.digits === digits);
  if (exact) return exact.account_id;
  const tail = digits.slice(-3);
  const close = rows.filter((r) => r.digits.slice(-3) === tail);
  return close.length === 1 ? close[0].account_id : null;
}

export interface AccountHint {
  institution: string;
  digits: string;
  accountId: string;
  accountName: string | null;
}

export async function listAccountHints(db: SQLiteDatabase): Promise<AccountHint[]> {
  return db.getAllAsync<AccountHint>(
    `SELECT h.institution, h.digits, h.account_id AS accountId, a.name AS accountName
       FROM sms_account_hints h LEFT JOIN accounts a ON a.id = h.account_id
      ORDER BY h.institution, h.digits`
  );
}

export async function deleteAccountHint(db: SQLiteDatabase, institution: string, digits: string) {
  await db.runAsync('DELETE FROM sms_account_hints WHERE institution = ? AND digits = ?', institution, digits);
}

export async function getMerchantCategory(db: SQLiteDatabase, key: string): Promise<{ categoryId: string; subcategoryId: string | null } | null> {
  return db.getFirstAsync<{ categoryId: string; subcategoryId: string | null }>(
    'SELECT category_id AS categoryId, subcategory_id AS subcategoryId FROM merchant_categories WHERE merchant_key = ?',
    key
  );
}

export interface MerchantMemory {
  key: string;
  categoryId: string;
  categoryName: string | null;
  categoryIcon: string | null;
}

export async function listMerchantMemory(db: SQLiteDatabase): Promise<MerchantMemory[]> {
  return db.getAllAsync<MerchantMemory>(
    `SELECT m.merchant_key AS key, m.category_id AS categoryId, c.name AS categoryName, c.icon AS categoryIcon
       FROM merchant_categories m LEFT JOIN categories c ON c.id = m.category_id
      ORDER BY m.merchant_key`
  );
}

export async function deleteMerchantMemory(db: SQLiteDatabase, key: string) {
  await db.runAsync('DELETE FROM merchant_categories WHERE merchant_key = ?', key);
}

/** A hand-entered transaction that looks like this message (same amount and type, within a day). */
export async function findManualMatch(
  db: SQLiteDatabase,
  type: 'expense' | 'income',
  amount: number,
  date: string,
  accountId: string | null
): Promise<string | null> {
  const day = new Date(`${date}T12:00:00`);
  const shift = (days: number) => {
    const d = new Date(day.getTime() + days * 86_400_000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM transactions
      WHERE source = 'manual' AND type = ? AND ABS(amount - ?) < 0.005 AND date BETWEEN ? AND ?
        AND (? IS NULL OR account_id = ?)
        AND id NOT IN (SELECT transaction_id FROM sms_messages WHERE transaction_id IS NOT NULL)
      ORDER BY ABS(julianday(date) - julianday(?)) LIMIT 1`,
    type,
    amount,
    shift(-1),
    shift(1),
    accountId,
    accountId,
    date
  );
  return row?.id ?? null;
}

export async function getSmsState(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM sms_state WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSmsState(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync('INSERT INTO sms_state (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', key, value);
}

const DAY = 86_400_000;

/** Drops message text that's no longer needed, and old ignored entries. */
export async function pruneSms(db: SQLiteDatabase, nowMs = Date.now()) {
  await db.runAsync("UPDATE sms_messages SET body = NULL WHERE body IS NOT NULL AND status <> 'pending'");
  await db.runAsync("UPDATE sms_messages SET body = NULL WHERE body IS NOT NULL AND result = 'unparsed' AND received_at < ?", nowMs - 30 * DAY);
  await db.runAsync("DELETE FROM sms_messages WHERE status IN ('ignored', 'dismissed', 'duplicate') AND received_at < ?", nowMs - 120 * DAY);
}

/** Deletes everything SMS import stored (messages, remembered accounts and merchants, scan progress). */
export async function clearSmsData(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM sms_messages WHERE 1;
      DELETE FROM sms_account_hints WHERE 1;
      DELETE FROM merchant_categories WHERE 1;
      DELETE FROM sms_state WHERE 1;
    `);
  });
}
