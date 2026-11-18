import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import { SAMPLE_PEOPLE } from '@/db/sample-data';
import { getSettings } from '@/db/settings';
import {
  EPOCH,
  SYNCED_SETTING_KEYS,
  SYNC_COLUMNS,
  SYNC_TABLES,
  emptyTables,
  type Snapshot,
  type SyncRow,
  type SyncTable,
  type SyncedSettings,
  type Tombstone,
} from '@/lib/sync-format';
import { mergeSnapshots } from '@/lib/sync-merge';

/** Sample rows (IDs starting `sample_`) stay on this phone. `_` is a LIKE wildcard, hence the escape. */
const NOT_SAMPLE = "id NOT LIKE 'sample\\_%' ESCAPE '\\'";

const ORDER: Record<SyncTable, string> = {
  categories: 'kind, sort_order',
  subcategories: 'category_id, sort_order',
  accounts: 'sort_order, created_at',
  transactions: 'date DESC, time DESC, created_at DESC',
  planned_payments: 'next_date, created_at',
  split_entries: 'date DESC, created_at DESC',
};

/** Sample people, while sample data is loaded and they appear only in sample entries. */
async function samplePeopleInUse(db: SQLiteDatabase): Promise<string[]> {
  const loaded = await db.getFirstAsync("SELECT 1 FROM accounts WHERE id LIKE 'sample\\_%' ESCAPE '\\' LIMIT 1");
  if (!loaded) return [];
  const real = new Set(
    (await db.getAllAsync<{ person: string }>(`SELECT DISTINCT person FROM split_entries WHERE ${NOT_SAMPLE}`)).map((r) => r.person)
  );
  return SAMPLE_PEOPLE.filter((p) => !real.has(p));
}

/** Everything sync and backups carry, as rows. Sample data is left out unless `includeSample`. */
export async function readSnapshot(db: SQLiteDatabase, { includeSample = false } = {}): Promise<Snapshot> {
  const tables = emptyTables();
  for (const table of SYNC_TABLES) {
    const columns = SYNC_COLUMNS[table].map((c) => (c === 'updated_at' ? `COALESCE(updated_at, '${EPOCH}') AS updated_at` : c));
    tables[table] = await db.getAllAsync<SyncRow>(
      `SELECT ${columns.join(', ')} FROM ${table}${includeSample ? '' : ` WHERE ${NOT_SAMPLE}`} ORDER BY ${ORDER[table]}`
    );
  }
  const deleted = await db.getAllAsync<Tombstone>(
    `SELECT tbl AS "table", id, deleted_at AS deletedAt FROM deleted_records WHERE ${NOT_SAMPLE}`
  );

  const all = await getSettings(db);
  const settings = Object.fromEntries(SYNCED_SETTING_KEYS.map((k) => [k, all[k]])) as SyncedSettings;
  if (!includeSample) {
    const hidden = await samplePeopleInUse(db);
    settings.splitPeople = all.splitPeople.filter((p) => !hidden.includes(p));
  }
  const stamped = await db.getFirstAsync<{ at: string | null }>(
    `SELECT MAX(COALESCE(updated_at, '${EPOCH}')) AS at FROM settings WHERE key IN (${SYNCED_SETTING_KEYS.map(() => '?').join(', ')})`,
    ...SYNCED_SETTING_KEYS
  );

  return { settings, settingsUpdatedAt: stamped?.at ?? EPOCH, tables, deleted };
}

/**
 * Writes `merged` over the database, given the `local` snapshot it was merged from: upserts rows that
 * changed (with their merged `updated_at`, so they aren't re-stamped), deletes rows the merge removed,
 * and records the merged deletions. The caller owns the SQL transaction.
 */
async function applySnapshot(db: SQLiteDatabase, merged: Snapshot, local: Snapshot) {
  for (const table of SYNC_TABLES) {
    const columns = SYNC_COLUMNS[table];
    const before = new Map(local.tables[table].map((r) => [r.id, r]));
    // An upsert, not INSERT OR REPLACE: replacing deletes the old row first, which would cascade.
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})
      ON CONFLICT (id) DO UPDATE SET ${columns.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ')}`;
    for (const row of merged.tables[table]) {
      const old = before.get(row.id);
      if (old && columns.every((c) => old[c] === row[c])) continue;
      await db.runAsync(sql, ...columns.map((c) => row[c] as SQLiteBindValue));
    }
  }

  // Children first, so a category's subcategories are gone before it is.
  for (const table of [...SYNC_TABLES].reverse()) {
    const kept = new Set(merged.tables[table].map((r) => r.id));
    for (const row of local.tables[table]) {
      if (!kept.has(row.id)) await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, row.id);
    }
  }

  const tombstoneKey = (t: Tombstone) => `${t.table}:${t.id}`;
  const mergedTombstones = new Set(merged.deleted.map(tombstoneKey));
  for (const t of local.deleted) {
    if (!mergedTombstones.has(tombstoneKey(t))) await db.runAsync('DELETE FROM deleted_records WHERE tbl = ? AND id = ?', t.table, t.id);
  }
  for (const t of merged.deleted) {
    await db.runAsync(
      `INSERT INTO deleted_records (tbl, id, deleted_at) VALUES (?, ?, ?)
       ON CONFLICT (tbl, id) DO UPDATE SET deleted_at = excluded.deleted_at`,
      t.table,
      t.id,
      t.deletedAt
    );
  }

  const current = await getSettings(db);
  const keepPeople = await samplePeopleInUse(db);
  for (const key of SYNCED_SETTING_KEYS) {
    let value: unknown = merged.settings[key];
    if (value === undefined) continue;
    if (key === 'splitPeople' && keepPeople.length > 0) value = [...new Set([...(value as string[]), ...keepPeople])];
    if (JSON.stringify(value) === JSON.stringify(current[key])) continue;
    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      key,
      JSON.stringify(value),
      merged.settingsUpdatedAt
    );
  }
}

/**
 * Merges a remote copy into the database in one exclusive transaction, so writes made meanwhile wait
 * rather than being overwritten. `firstSync` lets a device without its own data take the remote copy's
 * side on ties (its defaults would otherwise beat the user's synced edits).
 */
export async function mergeIntoDb(db: SQLiteDatabase, remote: Snapshot, firstSync: boolean) {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync('PRAGMA busy_timeout = 5000');
    const local = await readSnapshot(txn);
    const empty = local.tables.accounts.length === 0 && local.tables.transactions.length === 0;
    const merged = mergeSnapshots(local, remote, { preferRemote: firstSync && empty });
    await applySnapshot(txn, merged, local);
  });
}

// ---- Sync state (device-only; never synced or backed up) -------------------------------------------

export type SyncMode = 'auto' | 'manual';

export interface DriveAccount {
  email: string;
  name: string | null;
  photo: string | null;
}

export interface SyncState {
  mode: SyncMode;
  /** The signed-in Google account, or null when Drive isn't connected. */
  account: DriveAccount | null;
  /** ISO time of the last successful sync or backup. */
  lastSyncAt: string | null;
  /** Drive file ID and version this phone last read or wrote. */
  fileId: string | null;
  remoteVersion: string | null;
  /** Hash of the last uploaded content, to skip uploads when nothing changed. */
  lastHash: string | null;
  /** `YYYY-MM-DD` of the last daily copy kept in Drive. */
  snapshotDate: string | null;
}

const DEFAULT_SYNC_STATE: SyncState = {
  mode: 'auto',
  account: null,
  lastSyncAt: null,
  fileId: null,
  remoteVersion: null,
  lastHash: null,
  snapshotDate: null,
};

export async function getSyncState(db: SQLiteDatabase): Promise<SyncState> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM sync_state');
  return { ...DEFAULT_SYNC_STATE, ...Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)])) };
}

export async function updateSyncState(db: SQLiteDatabase, patch: Partial<SyncState>) {
  for (const [key, value] of Object.entries(patch)) {
    await db.runAsync(
      'INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
      key,
      JSON.stringify(value)
    );
  }
}

/** Forgets the Drive connection and sync progress; the data itself stays. */
export async function clearSyncState(db: SQLiteDatabase) {
  await db.runAsync('DELETE FROM sync_state WHERE 1');
}
