import { balanceDeltas } from '@/lib/balance';
import { SYNC_TABLES, emptyTables, type Snapshot, type SyncRow, type SyncTable, type Tombstone } from '@/lib/sync-format';
import type { TransactionType } from '@/types/models';

/** Deletion records older than this are dropped; a device offline for longer may bring deleted rows back. */
const TOMBSTONE_DAYS = 365;

export interface MergeOptions {
  /**
   * Remote wins ties and its settings win outright. Set for the first sync of a device without its own
   * data, so a fresh install takes the Drive copy's settings and category edits instead of its defaults.
   */
  preferRemote?: boolean;
  /** For tests; defaults to the current time. */
  now?: Date;
}

const key = (table: SyncTable, id: string) => `${table}:${id}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Balance change per account caused by a list of transaction rows. */
function balanceEffects(transactions: SyncRow[]): Map<string, number> {
  const effects = new Map<string, number>();
  for (const t of transactions) {
    const deltas = balanceDeltas({
      type: t.type as TransactionType,
      amount: Number(t.amount),
      accountId: t.account_id as string | null,
      fromAccountId: t.from_account_id as string | null,
      toAccountId: t.to_account_id as string | null,
      isSplit: t.is_split === 1,
      splitAmount: t.split_amount as number | null,
      deductMyShare: t.deduct_my_share === 1,
    });
    for (const [accountId, delta] of deltas) effects.set(accountId, (effects.get(accountId) ?? 0) + delta);
  }
  return effects;
}

/**
 * Merges two copies of the data record by record. For each record the newer `updated_at` wins, and a
 * deletion newer than the surviving record removes it. Settings merge as one unit (newer wins).
 *
 * Account balances are stored, not derived, so they're recomputed: start from the balance on the side
 * whose account record won, then add how the merged transactions move it minus how that side's own
 * transactions already moved it. Edits, deletions, and new transactions from either side all add up.
 */
export function mergeSnapshots(local: Snapshot, remote: Snapshot, options: MergeOptions = {}): Snapshot {
  const { preferRemote = false, now = new Date() } = options;

  const tombstones = new Map<string, Tombstone>();
  for (const t of [...local.deleted, ...remote.deleted]) {
    const seen = tombstones.get(key(t.table, t.id));
    if (!seen || t.deletedAt > seen.deletedAt) tombstones.set(key(t.table, t.id), t);
  }

  const tables = emptyTables();
  const localRows = new Set<SyncRow>();
  for (const table of SYNC_TABLES) {
    const mine = new Map(local.tables[table].map((r) => [r.id, r]));
    const theirs = new Map(remote.tables[table].map((r) => [r.id, r]));
    for (const row of local.tables[table]) localRows.add(row);
    for (const id of new Set([...mine.keys(), ...theirs.keys()])) {
      const a = mine.get(id);
      const b = theirs.get(id);
      const winner =
        a && b ? (a.updated_at > b.updated_at ? a : a.updated_at < b.updated_at ? b : preferRemote ? b : a) : (a ?? b)!;
      const tombstone = tombstones.get(key(table, id));
      if (tombstone && tombstone.deletedAt >= winner.updated_at) continue;
      if (tombstone) tombstones.delete(key(table, id));
      tables[table].push(winner);
    }
  }

  // A subcategory can't outlive its category (the database enforces it), so it goes with it.
  const categoryIds = new Set(tables.categories.map((c) => c.id));
  tables.subcategories = tables.subcategories.filter((s) => {
    if (categoryIds.has(s.category_id as string)) return true;
    const parent = tombstones.get(key('categories', s.category_id as string));
    const deletedAt = parent && parent.deletedAt > s.updated_at ? parent.deletedAt : s.updated_at;
    tombstones.set(key('subcategories', s.id), { table: 'subcategories', id: s.id, deletedAt });
    return false;
  });

  const merged = balanceEffects(tables.transactions);
  const fromLocal = balanceEffects(local.tables.transactions);
  const fromRemote = balanceEffects(remote.tables.transactions);
  tables.accounts = tables.accounts.map((account) => {
    const base = localRows.has(account) ? fromLocal : fromRemote;
    const balance = round2(Number(account.balance) + (merged.get(account.id) ?? 0) - (base.get(account.id) ?? 0));
    return balance === account.balance ? account : { ...account, balance };
  });

  const remoteSettingsWin = preferRemote
    ? Object.keys(remote.settings).length > 0
    : remote.settingsUpdatedAt > local.settingsUpdatedAt;
  const cutoff = new Date(now.getTime() - TOMBSTONE_DAYS * 86_400_000).toISOString();

  return {
    settings: remoteSettingsWin ? { ...local.settings, ...remote.settings } : { ...remote.settings, ...local.settings },
    settingsUpdatedAt: remoteSettingsWin ? remote.settingsUpdatedAt : local.settingsUpdatedAt,
    tables,
    deleted: [...tombstones.values()].filter((t) => t.deletedAt >= cutoff),
  };
}
