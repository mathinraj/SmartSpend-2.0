/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { EPOCH, emptyTables, parseSyncFile, snapshotToFile, type Snapshot, type SyncRow } from '@/lib/sync-format';
import { mergeSnapshots } from '@/lib/sync-merge';

const T1 = '2026-11-01T10:00:00.000Z';
const T2 = '2026-11-02T10:00:00.000Z';
const T3 = '2026-11-03T10:00:00.000Z';
const NOW = new Date('2026-11-10T00:00:00.000Z');

function account(balance: number, updatedAt = EPOCH): SyncRow {
  return {
    id: 'acc', name: 'HDFC', type: 'bank', sub_type: 'savings', balance, icon: null, color: null, credit_limit: null,
    billing_day: null, due_day: null, custom_type_id: null, logo_url: null, sort_order: 0, created_at: EPOCH, updated_at: updatedAt,
  };
}

function expense(id: string, amount: number, updatedAt: string, extra: Partial<SyncRow> = {}): SyncRow {
  return {
    id, type: 'expense', amount, account_id: 'acc', from_account_id: null, to_account_id: null, category_id: 'food',
    subcategory_id: null, note: null, date: '2026-11-01', time: null, is_split: 0, split_amount: null, deduct_my_share: 0,
    source: 'manual', source_ref: null, payment_app: null, created_at: updatedAt, updated_at: updatedAt, ...extra,
  };
}

function snapshot(parts: Partial<Snapshot['tables']> & { deleted?: Snapshot['deleted']; settings?: Snapshot['settings']; settingsUpdatedAt?: string }): Snapshot {
  const { deleted = [], settings = {}, settingsUpdatedAt = EPOCH, ...tables } = parts;
  return { settings, settingsUpdatedAt, tables: { ...emptyTables(), ...tables }, deleted };
}

const balanceOf = (s: Snapshot) => s.tables.accounts.find((a) => a.id === 'acc')?.balance;
const ids = (rows: SyncRow[]) => rows.map((r) => r.id).sort();

describe('mergeSnapshots', () => {
  test('keeps new transactions from both sides and adds up their balance effects', () => {
    // Started at 1100. This phone spent 100, the other device spent 50.
    const local = snapshot({ accounts: [account(1000)], transactions: [expense('l', 100, T1)] });
    const remote = snapshot({ accounts: [account(1050)], transactions: [expense('r', 50, T2)] });
    const merged = mergeSnapshots(local, remote, { now: NOW });
    assert.deepEqual(ids(merged.tables.transactions), ['l', 'r']);
    assert.equal(balanceOf(merged), 950);
    assert.equal(balanceOf(mergeSnapshots(remote, local, { now: NOW })), 950);
  });

  test('takes the newer edit of a transaction and moves the balance by the difference', () => {
    const local = snapshot({ accounts: [account(900)], transactions: [expense('t', 100, T1)] });
    const remote = snapshot({ accounts: [account(850)], transactions: [expense('t', 150, T2)] });
    const merged = mergeSnapshots(local, remote, { now: NOW });
    assert.equal(merged.tables.transactions[0].amount, 150);
    assert.equal(balanceOf(merged), 850);
  });

  test('a newer deletion removes the record and gives the money back', () => {
    const local = snapshot({ accounts: [account(1000)], deleted: [{ table: 'transactions', id: 't', deletedAt: T3 }] });
    const remote = snapshot({ accounts: [account(900)], transactions: [expense('t', 100, T1)] });
    const merged = mergeSnapshots(local, remote, { now: NOW });
    assert.equal(merged.tables.transactions.length, 0);
    assert.equal(balanceOf(merged), 1000);
    assert.deepEqual(merged.deleted, [{ table: 'transactions', id: 't', deletedAt: T3 }]);
  });

  test('an edit newer than the deletion keeps the record', () => {
    const local = snapshot({ accounts: [account(1000)], deleted: [{ table: 'transactions', id: 't', deletedAt: T1 }] });
    const remote = snapshot({ accounts: [account(800)], transactions: [expense('t', 200, T2)] });
    const merged = mergeSnapshots(local, remote, { now: NOW });
    assert.deepEqual(ids(merged.tables.transactions), ['t']);
    assert.equal(balanceOf(merged), 800);
    assert.equal(merged.deleted.length, 0);
  });

  test('a newer manual balance correction wins, and later spending still applies on top', () => {
    // The other device corrected the balance to 2000 (after its own 50 expense); this phone spent 100.
    const local = snapshot({ accounts: [account(1000, T1)], transactions: [expense('l', 100, T1)] });
    const remote = snapshot({ accounts: [account(2000, T3)], transactions: [expense('r', 50, T2)] });
    assert.equal(balanceOf(mergeSnapshots(local, remote, { now: NOW })), 1900);
  });

  test('split expenses only move my share when they were recorded that way', () => {
    const split = expense('s', 300, T2, { is_split: 1, split_amount: 200, deduct_my_share: 1 });
    const local = snapshot({ accounts: [account(1000)] });
    const remote = snapshot({ accounts: [account(900)], transactions: [split] });
    assert.equal(balanceOf(mergeSnapshots(local, remote, { now: NOW })), 900);
  });

  test('ties keep this phone’s copy unless the remote copy is preferred', () => {
    const local = snapshot({ categories: [{ id: 'food', kind: 'expense', name: 'Food', icon: '🍔', color: '#f00', sort_order: 0, updated_at: EPOCH }] });
    const remote = snapshot({ categories: [{ id: 'food', kind: 'expense', name: 'Meals', icon: '🍔', color: '#f00', sort_order: 0, updated_at: EPOCH }] });
    assert.equal(mergeSnapshots(local, remote, { now: NOW }).tables.categories[0].name, 'Food');
    assert.equal(mergeSnapshots(local, remote, { now: NOW, preferRemote: true }).tables.categories[0].name, 'Meals');
  });

  test('settings: the newer copy wins as a whole; a preferred remote copy always wins', () => {
    const local = snapshot({ settings: { currency: 'INR', profileName: 'Phone' }, settingsUpdatedAt: T2 });
    const remote = snapshot({ settings: { currency: 'USD', profileName: 'Web' }, settingsUpdatedAt: T1 });
    assert.equal(mergeSnapshots(local, remote, { now: NOW }).settings.profileName, 'Phone');
    assert.equal(mergeSnapshots(local, remote, { now: NOW, preferRemote: true }).settings.profileName, 'Web');
  });

  test('a subcategory goes with its deleted category', () => {
    const local = snapshot({ deleted: [{ table: 'categories', id: 'food', deletedAt: T3 }] });
    const remote = snapshot({
      categories: [{ id: 'food', kind: 'expense', name: 'Food', icon: '🍔', color: '#f00', sort_order: 0, updated_at: T1 }],
      subcategories: [{ id: 'cafe', category_id: 'food', name: 'Cafe', sort_order: 0, updated_at: T2 }],
    });
    const merged = mergeSnapshots(local, remote, { now: NOW });
    assert.equal(merged.tables.categories.length, 0);
    assert.equal(merged.tables.subcategories.length, 0);
    assert.ok(merged.deleted.some((d) => d.table === 'subcategories' && d.id === 'cafe' && d.deletedAt === T3));
  });

  test('drops deletion records older than a year', () => {
    const local = snapshot({ deleted: [{ table: 'transactions', id: 'old', deletedAt: '2025-01-01T00:00:00.000Z' }] });
    assert.equal(mergeSnapshots(local, snapshot({}), { now: NOW }).deleted.length, 0);
  });
});

describe('sync file', () => {
  test('round-trips a snapshot through the file format', () => {
    const original = snapshot({
      settings: { currency: 'INR', profileName: 'Mathi', splitPeople: ['Asha'] },
      settingsUpdatedAt: T2,
      categories: [{ id: 'food', kind: 'expense', name: 'Food', icon: '🍔', color: '#f00', sort_order: 0, updated_at: T1 }],
      subcategories: [{ id: 'cafe', category_id: 'food', name: 'Cafe', sort_order: 0, updated_at: T1 }],
      accounts: [account(950, T1)],
      transactions: [expense('t', 50, T2, { is_split: 1, split_amount: 20, deduct_my_share: 1, note: 'Lunch', time: '13:05' })],
      planned_payments: [{
        id: 'p', name: 'Rent', amount: 9000, account_id: 'acc', category_id: null, frequency: 'monthly', next_date: '2026-12-01',
        note: null, enabled: 1, last_paid_date: null, created_at: T1, updated_at: T1,
      }],
      split_entries: [{
        id: 'e', type: 'settlement', person: 'Asha', amount: 20, direction: 'received', note: null, date: '2026-11-02',
        transaction_id: null, created_at: T2, updated_at: T3,
      }],
      deleted: [{ table: 'split_entries', id: 'gone', deletedAt: T3 }],
    });
    const file = JSON.parse(JSON.stringify(snapshotToFile(original, { appVersion: '1.8.0', exportedAt: T3 })));
    const parsed = parseSyncFile(file);
    assert.equal(parsed.settingsUpdatedAt, T2);
    assert.equal(parsed.settings.profileName, 'Mathi');
    assert.deepEqual(parsed.tables, original.tables);
    assert.deepEqual(parsed.deleted, original.deleted);
  });

  test('older files without timestamps parse with every record at the oldest time', () => {
    const parsed = parseSyncFile({
      _app: 'SpendTrak',
      accounts: [{ id: 'acc', name: 'Cash', type: 'cash', balance: 10 }],
      transactions: [{ id: 't', type: 'income', amount: 10, accountId: 'acc', date: '2026-11-01' }],
    });
    assert.equal(parsed.tables.accounts[0].updated_at, EPOCH);
    assert.equal(parsed.tables.transactions[0].updated_at, EPOCH);
    assert.equal(parsed.settingsUpdatedAt, EPOCH);
  });

  test('rejects files that are not SpendTrak data', () => {
    assert.throws(() => parseSyncFile({ hello: 'world' }), /isn't a SpendTrak backup/);
  });
});
