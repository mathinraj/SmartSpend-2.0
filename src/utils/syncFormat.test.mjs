// Run with `npm test`. Checks the web sync logic and that its files round-trip with the Android app's.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseSyncFile, snapshotToFile as androidFile, syncClients as androidClients } from '../../mobile/src/lib/sync-format.ts';
import { mergeSnapshots as androidMerge } from '../../mobile/src/lib/sync-merge.ts';
import {
  EPOCH,
  applySnapshot,
  fileToSnapshot,
  mergeSnapshots,
  snapshotToFile,
  stateToSnapshot,
  syncClients,
  trackChanges,
} from './syncFormat.js';

describe('apps that use the sync file', () => {
  test('both apps keep the list, so the web knows about the phone even after it writes last', () => {
    const snapshot = stateToSnapshot(webState());
    // Android 2.0.0 files only say who wrote them last.
    const fromOldPhone = { ...androidFile(parseSyncFile(snapshotToFile(snapshot, { appVersion: 't', exportedAt: '' })), { appVersion: '2.0.0', exportedAt: '' }) };
    delete fromOldPhone._clients;
    assert.deepEqual(syncClients(fromOldPhone), ['android']);

    const fromWeb = snapshotToFile(snapshot, { appVersion: 't', exportedAt: '', clients: syncClients(fromOldPhone) });
    assert.deepEqual(fromWeb._clients, ['android', 'web']);
    assert.equal(fromWeb._source, 'web');

    const fromPhone = androidFile(parseSyncFile(fromWeb), { appVersion: 't', exportedAt: '', clients: androidClients(fromWeb) });
    assert.deepEqual(fromPhone._clients, ['android', 'web']);
    assert.deepEqual(syncClients({ _clients: ['web'] }), ['web']);
    assert.deepEqual(syncClients(null), []);
  });
});

const T1 = '2026-11-01T10:00:00.000Z';
const T2 = '2026-11-02T10:00:00.000Z';
const T3 = '2026-11-03T10:00:00.000Z';

function webState(parts = {}) {
  return {
    settings: { currency: 'INR', profileName: 'Mathi', onboardStep: 3, gdriveEmail: 'me@example.com' },
    accounts: [],
    transactions: [],
    categories: { expense: [{ id: 'food', name: 'Food', icon: '🍔', color: '#f00', subcategories: [{ id: 'cafe', name: 'Cafe' }] }], income: [] },
    plannedPayments: [],
    splitLedger: [],
    syncMeta: { deleted: [], settingsUpdatedAt: EPOCH },
    ...parts,
  };
}

const account = (balance, updatedAt = EPOCH) => ({ id: 'acc', name: 'HDFC', type: 'bank', subType: 'savings', balance, updatedAt });
const expense = (id, amount, updatedAt, extra = {}) => ({
  id, type: 'expense', amount, accountId: 'acc', categoryId: 'food', note: '', date: '2026-11-01', createdAt: updatedAt, updatedAt, ...extra,
});
const balanceOf = (state) => state.accounts.find((a) => a.id === 'acc').balance;

describe('change tracking', () => {
  test('stamps new and edited records, not balance moves; records deletions and settings changes', () => {
    const now = '2026-11-05T00:00:00.000Z';
    const prev = webState({ accounts: [account(1000)], transactions: [expense('t', 100, T1)] });

    const spent = trackChanges(prev, { ...prev, accounts: [{ ...prev.accounts[0], balance: 900 }] }, now);
    assert.equal(spent.accounts[0].updatedAt, EPOCH);

    const edited = trackChanges(prev, { ...prev, transactions: [{ ...prev.transactions[0], amount: 120 }] }, now);
    assert.equal(edited.transactions[0].updatedAt, now);
    assert.equal(edited.accounts, prev.accounts, 'untouched collections keep their identity');

    const removed = trackChanges(prev, { ...prev, transactions: [] }, now);
    assert.deepEqual(removed.syncMeta.deleted, [{ table: 'transactions', id: 't', deletedAt: now }]);

    const renamed = trackChanges(prev, { ...prev, settings: { ...prev.settings, profileName: 'M' } }, now);
    assert.equal(renamed.syncMeta.settingsUpdatedAt, now);

    const lastSync = trackChanges(prev, { ...prev, settings: { ...prev.settings, gdriveLastSync: now } }, now);
    assert.equal(lastSync.syncMeta.settingsUpdatedAt, EPOCH, 'browser-only settings are not synced');

    const subRenamed = trackChanges(prev, {
      ...prev,
      categories: { ...prev.categories, expense: [{ ...prev.categories.expense[0], subcategories: [{ id: 'cafe', name: 'Coffee' }] }] },
    }, now);
    assert.equal(subRenamed.categories.expense[0].subcategories[0].updatedAt, now);
    assert.equal(subRenamed.categories.expense[0].updatedAt, undefined, 'the parent category itself did not change');
  });
});

describe('web and Android sync through one file', () => {
  test('changes from both apps merge to the same data and balances', () => {
    // Started at 1100. The web spent 100, the phone spent 50 and renamed the account later.
    const web = webState({ accounts: [account(1000, T1)], transactions: [expense('web', 100, T1)] });
    const phone = {
      settings: { currency: 'INR', profileName: 'Mathi' },
      settingsUpdatedAt: EPOCH,
      tables: {
        categories: [{ id: 'food', kind: 'expense', name: 'Food', icon: '🍔', color: '#f00', sort_order: 0, updated_at: EPOCH }],
        subcategories: [{ id: 'cafe', category_id: 'food', name: 'Cafe', sort_order: 0, updated_at: EPOCH }],
        accounts: [{
          id: 'acc', name: 'HDFC Savings', type: 'bank', sub_type: 'savings', balance: 1050, icon: null, color: null, credit_limit: null,
          billing_day: null, due_day: null, custom_type_id: null, logo_url: null, sort_order: 0, created_at: EPOCH, updated_at: T2,
        }],
        transactions: [{
          id: 'phone', type: 'expense', amount: 50, account_id: 'acc', from_account_id: null, to_account_id: null, category_id: 'food',
          subcategory_id: null, note: null, date: '2026-11-02', time: null, is_split: 0, split_amount: null, deduct_my_share: 0,
          source: 'manual', source_ref: null, payment_app: null, created_at: T2, updated_at: T2,
        }],
        planned_payments: [],
        split_entries: [],
      },
      deleted: [],
    };

    // Phone uploads; the web merges it in.
    const phoneFile = JSON.parse(JSON.stringify(androidFile(phone, { appVersion: '1.8.0', exportedAt: T3 })));
    const webMerged = mergeSnapshots(stateToSnapshot(web), fileToSnapshot(phoneFile));
    const webAfter = applySnapshot(web, webMerged);
    assert.equal(balanceOf(webAfter), 950);
    assert.equal(webAfter.accounts[0].name, 'HDFC Savings');
    assert.deepEqual(webAfter.transactions.map((t) => t.id).sort(), ['phone', 'web']);

    // The web uploads; the phone merges it in and ends up with the same thing.
    const webFile = JSON.parse(JSON.stringify(snapshotToFile(webMerged, { appVersion: 'web', exportedAt: T3 })));
    const phoneAfter = androidMerge(phone, parseSyncFile(webFile));
    assert.equal(phoneAfter.tables.accounts[0].balance, 950);
    assert.deepEqual(phoneAfter.tables.transactions.map((t) => t.id).sort(), ['phone', 'web']);
    assert.equal(phoneAfter.tables.subcategories.length, 1);
  });

  test('a deletion on the phone removes the record on the web and refunds it', () => {
    const web = webState({ accounts: [account(900)], transactions: [expense('t', 100, T1)] });
    const remote = fileToSnapshot({
      _app: 'SpendTrak',
      _format: 3,
      accounts: [{ ...account(1000), updatedAt: EPOCH }],
      transactions: [],
      deleted: [{ table: 'transactions', id: 't', deletedAt: T2 }],
    });
    const after = applySnapshot(web, mergeSnapshots(stateToSnapshot(web), remote));
    assert.equal(after.transactions.length, 0);
    assert.equal(balanceOf(after), 1000);
  });

  test('sample data stays in the browser through a merge', () => {
    const web = webState({
      accounts: [{ id: 'acc_hdfc', name: 'HDFC Savings', type: 'bank', balance: 500 }],
      transactions: [expense('sample', 10, T1, { accountId: 'acc_hdfc' })],
    });
    const snapshot = stateToSnapshot(web);
    assert.equal(snapshot.tables.accounts.length, 0);
    const after = applySnapshot(web, mergeSnapshots(snapshot, fileToSnapshot({ _app: 'SpendTrak', accounts: [], transactions: [] })));
    assert.equal(after.accounts.length, 1);
    assert.equal(after.transactions.length, 1);
  });
});
