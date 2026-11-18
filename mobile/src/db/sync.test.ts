/// <reference types="node" />
/**
 * Runs the real migrations, triggers, and merge against Node's built-in SQLite, simulating two devices
 * that sync through one shared file.
 */
import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { describe, test } from 'node:test';

import type { SQLiteDatabase } from 'expo-sqlite';

import { createAccount } from '@/db/accounts';
import { importBackup } from '@/db/backup';
import { deleteCategory, updateCategory } from '@/db/categories';
import { migrateDbIfNeeded } from '@/db/migrations';
import { loadSampleData } from '@/db/sample-data';
import { getSettings, updateSettings } from '@/db/settings';
import { mergeIntoDb, readSnapshot } from '@/db/sync';
import { addTransaction, deleteTransaction, updateTransaction, type NewTransaction } from '@/db/transactions';
import { parseSyncFile, snapshotToFile } from '@/lib/sync-format';

/** The parts of expo-sqlite's async API the app uses, on top of node:sqlite. */
function openTestDb(): SQLiteDatabase {
  const raw = new DatabaseSync(':memory:');
  const bind = (params: unknown[]): SQLInputValue[] => {
    const values = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return values.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : (v as SQLInputValue)));
  };
  const transaction = async (task: () => Promise<void>) => {
    raw.exec('BEGIN');
    try {
      await task();
      raw.exec('COMMIT');
    } catch (error) {
      raw.exec('ROLLBACK');
      throw error;
    }
  };
  const db = {
    execAsync: async (sql: string) => raw.exec(sql),
    runAsync: async (sql: string, ...params: unknown[]) => {
      const result = raw.prepare(sql).run(...bind(params));
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    getAllAsync: async (sql: string, ...params: unknown[]) => raw.prepare(sql).all(...bind(params)),
    getFirstAsync: async (sql: string, ...params: unknown[]) => raw.prepare(sql).get(...bind(params)) ?? null,
    withTransactionAsync: transaction,
    withExclusiveTransactionAsync: (task: (txn: unknown) => Promise<void>) => transaction(() => task(db)),
  };
  return db as unknown as SQLiteDatabase;
}

async function device(): Promise<SQLiteDatabase> {
  const db = openTestDb();
  await migrateDbIfNeeded(db);
  return db;
}

/** What one device uploads, as the other device would read it back. */
async function upload(db: SQLiteDatabase) {
  const file = snapshotToFile(await readSnapshot(db), { appVersion: 'test', exportedAt: new Date().toISOString() });
  return parseSyncFile(JSON.parse(JSON.stringify(file)));
}

async function syncPair(a: SQLiteDatabase, b: SQLiteDatabase) {
  await mergeIntoDb(b, await upload(a), false);
  await mergeIntoDb(a, await upload(b), false);
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

function expense(amount: number, extra: Partial<NewTransaction> = {}): NewTransaction {
  return {
    type: 'expense', amount, accountId: 'acc', fromAccountId: null, toAccountId: null, categoryId: 'food', subcategoryId: null,
    note: null, date: '2026-11-17', time: null, isSplit: false, splitAmount: null, deductMyShare: false, source: 'manual',
    sourceRef: null, paymentApp: null, ...extra,
  };
}

async function balance(db: SQLiteDatabase) {
  return (await db.getFirstAsync<{ balance: number }>("SELECT balance FROM accounts WHERE id = 'acc'"))?.balance;
}

async function transactionIds(db: SQLiteDatabase) {
  return (await db.getAllAsync<{ id: string }>('SELECT id FROM transactions ORDER BY id')).map((r) => r.id);
}

describe('change tracking', () => {
  test('stamps edits, ignores balance moves, and records deletions', async () => {
    const db = await device();
    const untouched = await db.getFirstAsync<{ updated_at: string | null }>("SELECT updated_at FROM categories WHERE id = 'food'");
    assert.equal(untouched?.updated_at, null);

    await createAccount(db, { id: 'acc', name: 'HDFC', type: 'bank', subType: null, balance: 1000, icon: null, color: null, creditLimit: null, billingDay: null, dueDay: null, customTypeId: null, logoUrl: null });
    const accountStamp = (await db.getFirstAsync<{ updated_at: string }>("SELECT updated_at FROM accounts WHERE id = 'acc'"))?.updated_at;
    assert.ok(accountStamp);
    await tick();
    const id = await addTransaction(db, expense(100));
    assert.equal(await balance(db), 900);
    const afterSpend = (await db.getFirstAsync<{ updated_at: string }>("SELECT updated_at FROM accounts WHERE id = 'acc'"))?.updated_at;
    assert.equal(afterSpend, accountStamp, 'a balance change from a transaction is not an account edit');

    await tick();
    await updateTransaction(db, id, expense(150));
    const edited = await db.getFirstAsync<{ updated_at: string; created_at: string }>('SELECT updated_at, created_at FROM transactions WHERE id = ?', id);
    assert.ok(edited!.updated_at > edited!.created_at);

    await deleteTransaction(db, id);
    const tombstone = await db.getFirstAsync<{ tbl: string }>('SELECT tbl FROM deleted_records WHERE id = ?', id);
    assert.equal(tombstone?.tbl, 'transactions');
    assert.equal(await balance(db), 1000);
  });

  test('deleting a category records its subcategories too', async () => {
    const db = await device();
    await deleteCategory(db, 'food');
    const rows = await db.getAllAsync<{ tbl: string }>('SELECT tbl FROM deleted_records');
    assert.ok(rows.some((r) => r.tbl === 'categories'));
    assert.ok(rows.some((r) => r.tbl === 'subcategories'));
  });
});

describe('two devices syncing through one file', () => {
  test('edits, additions, and deletions from both sides converge with correct balances', async () => {
    const phone = await device();
    const web = await device();
    await createAccount(phone, { id: 'acc', name: 'HDFC', type: 'bank', subType: null, balance: 1000, icon: null, color: null, creditLimit: null, billingDay: null, dueDay: null, customTypeId: null, logoUrl: null });
    const lunch = await addTransaction(phone, expense(100, { id: 'lunch' }));

    // First sync of an empty device takes everything.
    await mergeIntoDb(web, await upload(phone), true);
    assert.equal(await balance(web), 900);

    // Offline on both: the web edits lunch and adds a taxi; the phone adds rent and deletes nothing.
    await tick();
    await updateTransaction(web, lunch, expense(120, { id: 'lunch' }));
    await addTransaction(web, expense(50, { id: 'taxi' }));
    await addTransaction(phone, expense(300, { id: 'rent' }));

    await syncPair(phone, web);
    assert.deepEqual(await transactionIds(phone), ['lunch', 'rent', 'taxi']);
    assert.deepEqual(await transactionIds(web), ['lunch', 'rent', 'taxi']);
    assert.equal(await balance(phone), 530);
    assert.equal(await balance(web), 530);

    // The phone deletes the taxi; the web picks that up and gets the money back.
    await tick();
    await deleteTransaction(phone, 'taxi');
    await syncPair(phone, web);
    assert.deepEqual(await transactionIds(web), ['lunch', 'rent']);
    assert.equal(await balance(web), 580);
    assert.equal(await balance(phone), 580);
  });

  test('settings and category edits travel; sample data stays on its phone', async () => {
    const phone = await device();
    const web = await device();
    await updateSettings(phone, { profileName: 'Mathi', currency: 'USD' });
    const food = (await phone.getAllAsync<{ id: string; name: string }>("SELECT id, name FROM subcategories WHERE category_id = 'food'")).map(
      (s) => ({ id: s.id, name: s.name })
    );
    await updateCategory(phone, 'food', { name: 'Meals', icon: '🍛', color: '#ff0000', subcategories: food.slice(1) });
    await loadSampleData(phone);

    await mergeIntoDb(web, await upload(phone), true);
    const settings = await getSettings(web);
    assert.equal(settings.profileName, 'Mathi');
    assert.equal(settings.currency, 'USD');
    assert.ok(!settings.splitPeople.includes('Asha'));
    const meals = await web.getFirstAsync<{ name: string }>("SELECT name FROM categories WHERE id = 'food'");
    assert.equal(meals?.name, 'Meals');
    const subs = await web.getAllAsync("SELECT id FROM subcategories WHERE category_id = 'food'");
    assert.equal(subs.length, food.length - 1);
    const samples = await web.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM transactions WHERE id LIKE 'sample%'");
    assert.equal(samples?.n, 0);

    // Merging back doesn't touch the phone's sample data.
    await mergeIntoDb(phone, await upload(web), false);
    const kept = await phone.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM transactions WHERE id LIKE 'sample%'");
    assert.ok((kept?.n ?? 0) > 0);
    assert.ok((await getSettings(phone)).splitPeople.includes('Asha'));
  });

  test('restoring an older copy wins over newer changes on the other device', async () => {
    const phone = await device();
    const web = await device();
    await createAccount(phone, { id: 'acc', name: 'HDFC', type: 'bank', subType: null, balance: 1000, icon: null, color: null, creditLimit: null, billingDay: null, dueDay: null, customTypeId: null, logoUrl: null });
    await addTransaction(phone, expense(100, { id: 'keep' }));
    const older = snapshotToFile(await readSnapshot(phone), { appVersion: 'test', exportedAt: '' });
    await mergeIntoDb(web, await upload(phone), true);

    await tick();
    await addTransaction(web, expense(40, { id: 'mistake' }));
    await mergeIntoDb(phone, await upload(web), false);
    assert.deepEqual(await transactionIds(phone), ['keep', 'mistake']);

    await tick();
    await importBackup(phone, JSON.parse(JSON.stringify(older)), 'replace');
    await mergeIntoDb(web, await upload(phone), false);
    assert.deepEqual(await transactionIds(web), ['keep']);
    assert.equal(await balance(web), 900);
  });
});
