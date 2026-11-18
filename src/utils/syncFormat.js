/**
 * The Google Drive sync file shared with the Android app (format 3). Records carry `updatedAt`,
 * deletions are listed in `deleted`, and settings have one `settingsUpdatedAt`, so two copies can be
 * merged record by record: the newer change wins and a newer deletion removes the record.
 * Keep this in step with mobile/src/lib/sync-format.ts and sync-merge.ts.
 */
import { SAMPLE_ACCOUNT_IDS } from './sampleData';

export const EPOCH = '1970-01-01T00:00:00.000Z';
export const SYNC_FORMAT = 3;
const TOMBSTONE_DAYS = 365;

/** Tables in the order they are written; names match the file's `deleted` entries. */
export const SYNC_TABLES = ['categories', 'subcategories', 'accounts', 'transactions', 'plannedPayments', 'splitLedger'];

/** Settings that travel with the data; everything else stays in this browser. */
export const SYNCED_SETTING_KEYS = [
  'currency',
  'profileName',
  'splitPeople',
  'splitBankDeduction',
  'splitExpenseRecord',
  'theme',
  'homeView',
  'showBalanceStats',
  'showAccountsOnHome',
  'showSplitOnHome',
  'excludeCCFromBalance',
  'hideBalances',
  'defaultTxnType',
  'customAccountTypes',
  'paymentApps',
  'trackPaymentApp',
];

const sampleAccounts = new Set(SAMPLE_ACCOUNT_IDS);

/** Sample data stays in this browser. */
function isSample(table, row) {
  if (table === 'accounts') return sampleAccounts.has(row.id);
  if (table === 'transactions') return [row.accountId, row.fromAccountId, row.toAccountId].some((id) => id && sampleAccounts.has(id));
  if (table === 'plannedPayments') return !!row.accountId && sampleAccounts.has(row.accountId);
  if (table === 'splitLedger') return !!row.isSample;
  return false;
}

export function emptyTables() {
  return { categories: [], subcategories: [], accounts: [], transactions: [], plannedPayments: [], splitLedger: [] };
}

/** The app state as flat tables. `includeSample` keeps demo records (used for change tracking). */
export function stateToTables(state, { includeSample = false } = {}) {
  const tables = emptyTables();
  for (const kind of ['expense', 'income']) {
    (state.categories?.[kind] || []).forEach((c, i) => {
      const { subcategories, ...category } = c;
      tables.categories.push({ ...category, kind, sortOrder: i, updatedAt: c.updatedAt || EPOCH });
      (subcategories || []).forEach((s, j) => {
        tables.subcategories.push({ ...s, categoryId: c.id, sortOrder: j, updatedAt: s.updatedAt || EPOCH });
      });
    });
  }
  state.accounts.forEach((a, i) => tables.accounts.push({ ...a, sortOrder: i, updatedAt: a.updatedAt || EPOCH }));
  for (const table of ['transactions', 'plannedPayments', 'splitLedger']) {
    for (const row of state[table] || []) tables[table].push({ ...row, updatedAt: row.updatedAt || EPOCH });
  }
  if (!includeSample) {
    for (const table of SYNC_TABLES) tables[table] = tables[table].filter((row) => !isSample(table, row));
  }
  return tables;
}

/** The synced part of the app state, ready to merge. */
export function stateToSnapshot(state) {
  const settings = {};
  for (const key of SYNCED_SETTING_KEYS) if (state.settings[key] !== undefined) settings[key] = state.settings[key];
  return {
    settings,
    settingsUpdatedAt: state.syncMeta?.settingsUpdatedAt || EPOCH,
    tables: stateToTables(state),
    deleted: state.syncMeta?.deleted || [],
  };
}

const omit = (row, keys) => Object.fromEntries(Object.entries(row).filter(([k]) => !keys.includes(k)));

/** The file for a snapshot, in the same shape the Android app writes. */
export function snapshotToFile(snapshot, { appVersion, exportedAt }) {
  const { tables } = snapshot;
  const byOrder = (a, b) => a.sortOrder - b.sortOrder;
  const subcategories = (categoryId) =>
    tables.subcategories.filter((s) => s.categoryId === categoryId).sort(byOrder).map((s) => omit(s, ['categoryId']));
  const categories = (kind) =>
    tables.categories
      .filter((c) => c.kind === kind)
      .sort(byOrder)
      .map((c) => ({ ...omit(c, ['kind']), subcategories: subcategories(c.id) }));
  return {
    _app: 'SpendTrak',
    _version: appVersion,
    _format: SYNC_FORMAT,
    _source: 'web',
    _exportedAt: exportedAt,
    settingsUpdatedAt: snapshot.settingsUpdatedAt,
    settings: { ...snapshot.settings, splitEnabled: true, plannedEnabled: true },
    accounts: [...tables.accounts].sort(byOrder),
    transactions: tables.transactions,
    categories: { expense: categories('expense'), income: categories('income') },
    plannedPayments: tables.plannedPayments,
    splitLedger: tables.splitLedger,
    deleted: snapshot.deleted,
  };
}

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v.filter(isObject) : []);
const STAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
function stamp(v) {
  if (typeof v !== 'string' || !STAMP_RE.test(v)) return null;
  const time = Date.parse(v);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export class InvalidSyncFileError extends Error {}

/** Reads a sync or backup file of any format into a snapshot. Records without timestamps count as oldest. */
export function fileToSnapshot(data) {
  if (!isObject(data) || (data._app !== 'SpendTrak' && !Array.isArray(data.accounts) && !Array.isArray(data.transactions))) {
    throw new InvalidSyncFileError("This file isn't SpendTrak data.");
  }
  const tables = emptyTables();
  const valid = (row) => typeof row.id === 'string' && row.id !== '';
  const withStamp = (row) => ({ ...row, updatedAt: stamp(row.updatedAt) || EPOCH });

  const categories = isObject(data.categories) ? data.categories : {};
  for (const kind of ['expense', 'income']) {
    list(categories[kind]).forEach((c, i) => {
      if (!valid(c) || typeof c.name !== 'string') return;
      const { subcategories, ...category } = c;
      tables.categories.push(withStamp({ ...category, kind, sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : i }));
      list(subcategories).forEach((s, j) => {
        if (!valid(s) || typeof s.name !== 'string') return;
        tables.subcategories.push(withStamp({ ...s, categoryId: c.id, sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : j }));
      });
    });
  }
  list(data.accounts).forEach((a, i) => {
    if (valid(a) && typeof a.name === 'string') {
      tables.accounts.push(withStamp({ ...a, balance: Number(a.balance) || 0, sortOrder: typeof a.sortOrder === 'number' ? a.sortOrder : i }));
    }
  });
  for (const t of list(data.transactions)) {
    if (valid(t) && ['expense', 'income', 'transfer'].includes(t.type) && Number(t.amount) > 0) {
      tables.transactions.push(withStamp({ ...t, amount: Number(t.amount) }));
    }
  }
  for (const p of list(data.plannedPayments)) if (valid(p) && typeof p.name === 'string') tables.plannedPayments.push(withStamp(p));
  for (const e of list(data.splitLedger)) if (valid(e) && typeof e.person === 'string') tables.splitLedger.push(withStamp(e));

  const settings = {};
  if (isObject(data.settings)) {
    for (const key of SYNCED_SETTING_KEYS) if (data.settings[key] !== undefined && data.settings[key] !== null) settings[key] = data.settings[key];
  }
  const deleted = list(data.deleted)
    .map((d) => ({ table: d.table, id: d.id, deletedAt: stamp(d.deletedAt) }))
    .filter((d) => SYNC_TABLES.includes(d.table) && typeof d.id === 'string' && d.deletedAt);

  return { settings, settingsUpdatedAt: stamp(data.settingsUpdatedAt) || EPOCH, tables, deleted };
}

/** How a transaction changes account balances; reversing it applies the same deltas negated. */
export function balanceDeltas(t) {
  if (t.type === 'income') return t.accountId ? [[t.accountId, t.amount]] : [];
  if (t.type === 'expense') {
    const othersPaid = t.isSplit && t.deductMyShare ? Number(t.splitAmount) || 0 : 0;
    return t.accountId ? [[t.accountId, -(t.amount - othersPaid)]] : [];
  }
  const deltas = [];
  if (t.fromAccountId) deltas.push([t.fromAccountId, -t.amount]);
  if (t.toAccountId) deltas.push([t.toAccountId, t.amount]);
  return deltas;
}

/** Applies (1) or reverses (-1) a transaction's effect on a list of accounts. */
export function applyBalance(accounts, txn, sign) {
  const deltas = new Map(balanceDeltas(txn));
  if (deltas.size === 0) return accounts;
  return accounts.map((a) => (deltas.has(a.id) ? { ...a, balance: a.balance + sign * deltas.get(a.id) } : a));
}

function balanceEffects(transactions) {
  const effects = new Map();
  for (const t of transactions) for (const [id, delta] of balanceDeltas(t)) effects.set(id, (effects.get(id) || 0) + delta);
  return effects;
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Merges two snapshots. Per record the newer `updatedAt` wins (ties keep `local` unless `preferRemote`),
 * and a deletion at least as new as the surviving record removes it. Account balances are recomputed:
 * the winning side's balance plus how the merged transactions move it, minus how that side's own
 * transactions already did.
 */
export function mergeSnapshots(local, remote, { preferRemote = false, now = new Date() } = {}) {
  const key = (table, id) => `${table}:${id}`;
  const tombstones = new Map();
  for (const t of [...local.deleted, ...remote.deleted]) {
    const seen = tombstones.get(key(t.table, t.id));
    if (!seen || t.deletedAt > seen.deletedAt) tombstones.set(key(t.table, t.id), t);
  }

  const tables = emptyTables();
  const localRows = new Set();
  for (const table of SYNC_TABLES) {
    const mine = new Map(local.tables[table].map((r) => [r.id, r]));
    const theirs = new Map(remote.tables[table].map((r) => [r.id, r]));
    local.tables[table].forEach((r) => localRows.add(r));
    for (const id of new Set([...mine.keys(), ...theirs.keys()])) {
      const a = mine.get(id);
      const b = theirs.get(id);
      const winner = a && b ? (a.updatedAt > b.updatedAt ? a : a.updatedAt < b.updatedAt ? b : preferRemote ? b : a) : a || b;
      const tombstone = tombstones.get(key(table, id));
      if (tombstone && tombstone.deletedAt >= winner.updatedAt) continue;
      if (tombstone) tombstones.delete(key(table, id));
      tables[table].push(winner);
    }
  }

  const categoryIds = new Set(tables.categories.map((c) => c.id));
  tables.subcategories = tables.subcategories.filter((s) => {
    if (categoryIds.has(s.categoryId)) return true;
    const parent = tombstones.get(key('categories', s.categoryId));
    const deletedAt = parent && parent.deletedAt > s.updatedAt ? parent.deletedAt : s.updatedAt;
    tombstones.set(key('subcategories', s.id), { table: 'subcategories', id: s.id, deletedAt });
    return false;
  });

  const merged = balanceEffects(tables.transactions);
  const fromLocal = balanceEffects(local.tables.transactions);
  const fromRemote = balanceEffects(remote.tables.transactions);
  tables.accounts = tables.accounts.map((account) => {
    const base = localRows.has(account) ? fromLocal : fromRemote;
    const balance = round2(account.balance + (merged.get(account.id) || 0) - (base.get(account.id) || 0));
    return balance === account.balance ? account : { ...account, balance };
  });

  const remoteSettingsWin = preferRemote ? Object.keys(remote.settings).length > 0 : remote.settingsUpdatedAt > local.settingsUpdatedAt;
  const cutoff = new Date(now.getTime() - TOMBSTONE_DAYS * 86400000).toISOString();
  return {
    settings: remoteSettingsWin ? { ...local.settings, ...remote.settings } : { ...remote.settings, ...local.settings },
    settingsUpdatedAt: remoteSettingsWin ? remote.settingsUpdatedAt : local.settingsUpdatedAt,
    tables,
    deleted: [...tombstones.values()].filter((t) => t.deletedAt >= cutoff),
  };
}

/** The app state with a merged snapshot applied; sample data and browser-only settings are kept. */
export function applySnapshot(state, snapshot) {
  const local = stateToTables(state, { includeSample: true });
  const sample = (table) => local[table].filter((row) => isSample(table, row));
  const byOrder = (a, b) => a.sortOrder - b.sortOrder;
  const strip = (row, keys) => omit(row, ['sortOrder', ...keys]);
  const { tables } = snapshot;
  const categories = (kind) =>
    tables.categories
      .filter((c) => c.kind === kind)
      .sort(byOrder)
      .map((c) => ({
        ...strip(c, ['kind']),
        subcategories: tables.subcategories.filter((s) => s.categoryId === c.id).sort(byOrder).map((s) => strip(s, ['categoryId'])),
      }));
  return {
    ...state,
    settings: { ...state.settings, ...snapshot.settings },
    accounts: [...[...tables.accounts].sort(byOrder), ...sample('accounts')].map((a) => strip(a, [])),
    transactions: [...tables.transactions, ...sample('transactions')].sort((a, b) =>
      `${b.date || ''}${b.time || ''}`.localeCompare(`${a.date || ''}${a.time || ''}`)
    ),
    categories: { expense: categories('expense'), income: categories('income') },
    plannedPayments: [...tables.plannedPayments, ...sample('plannedPayments')],
    splitLedger: [...tables.splitLedger, ...sample('splitLedger')],
    syncMeta: { deleted: snapshot.deleted, settingsUpdatedAt: snapshot.settingsUpdatedAt },
  };
}

/**
 * Stamps what changed between two states: new or edited records get `updatedAt = now`, moved records
 * too (order is data), removed ones are listed as deleted, and changed synced settings update
 * `settingsUpdatedAt`. An account's balance moving doesn't count as an edit of the account.
 */
export function trackChanges(prev, next, now = new Date().toISOString()) {
  const source = { categories: 'categories', subcategories: 'categories', accounts: 'accounts', transactions: 'transactions', plannedPayments: 'plannedPayments', splitLedger: 'splitLedger' };
  const changedTables = SYNC_TABLES.filter((t) => prev[source[t]] !== next[source[t]]);
  const settingsChanged = SYNCED_SETTING_KEYS.some((k) => JSON.stringify(prev.settings[k]) !== JSON.stringify(next.settings[k]));
  if (changedTables.length === 0 && !settingsChanged) return next;

  const before = stateToTables(prev, { includeSample: true });
  const after = stateToTables(next, { includeSample: true });
  const stamped = Object.fromEntries(SYNC_TABLES.map((t) => [t, new Set()]));
  const deleted = new Map((next.syncMeta?.deleted || []).map((d) => [`${d.table}:${d.id}`, d]));
  const content = (table, row) => JSON.stringify(omit(row, table === 'accounts' ? ['updatedAt', 'balance'] : ['updatedAt']));

  for (const table of changedTables) {
    const old = new Map(before[table].map((r) => [r.id, r]));
    const ids = new Set();
    for (const row of after[table]) {
      ids.add(row.id);
      deleted.delete(`${table}:${row.id}`);
      const was = old.get(row.id);
      if (!was || content(table, was) !== content(table, row)) stamped[table].add(row.id);
    }
    for (const row of before[table]) {
      if (!ids.has(row.id)) deleted.set(`${table}:${row.id}`, { table, id: row.id, deletedAt: now });
    }
  }

  const anyStamp = SYNC_TABLES.some((t) => stamped[t].size > 0);
  const deletedList = [...deleted.values()];
  if (!anyStamp && !settingsChanged && deletedList.length === (next.syncMeta?.deleted || []).length) return next;

  const mark = (table, row) => (stamped[table].has(row.id) ? { ...row, updatedAt: now } : row);
  const categories = (list) =>
    (list || []).map((c) => {
      const subs = c.subcategories?.map((s) => mark('subcategories', s));
      const changedSubs = subs && subs.some((s, i) => s !== c.subcategories[i]);
      const cat = mark('categories', c);
      return changedSubs ? { ...cat, subcategories: subs } : cat;
    });
  const remap = (table, rows) => (stamped[table].size > 0 ? rows.map((r) => mark(table, r)) : rows);
  return {
    ...next,
    accounts: remap('accounts', next.accounts),
    transactions: remap('transactions', next.transactions),
    plannedPayments: remap('plannedPayments', next.plannedPayments),
    splitLedger: remap('splitLedger', next.splitLedger),
    categories:
      stamped.categories.size > 0 || stamped.subcategories.size > 0
        ? { expense: categories(next.categories?.expense), income: categories(next.categories?.income) }
        : next.categories,
    syncMeta: {
      deleted: deletedList,
      settingsUpdatedAt: settingsChanged ? now : next.syncMeta?.settingsUpdatedAt || EPOCH,
    },
  };
}
