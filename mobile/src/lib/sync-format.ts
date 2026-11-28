/**
 * The JSON file shared by data backups and Google Drive sync, in the web app's format (web field names
 * such as `billingDate` and `splitLedger`). Format 3 adds `updatedAt` on every record, `sortOrder`,
 * `settingsUpdatedAt`, and `deleted` (records removed since), which sync needs to merge record by record.
 * Older files without these fields still parse; their records count as oldest.
 */
import { CURRENCIES } from '@/constants/currencies';
import type {
  AccountType,
  CustomAccountType,
  HomeView,
  PlannedFrequency,
  Settings,
  SplitAmountMode,
  SplitEntryType,
  ThemePreference,
  TransactionSource,
  TransactionType,
} from '@/types/models';

/** `updated_at` for records that predate change tracking or are built-in defaults: older than any edit. */
export const EPOCH = '1970-01-01T00:00:00.000Z';

export const SYNC_FORMAT = 3;

export const SYNC_TABLES = ['categories', 'subcategories', 'accounts', 'transactions', 'planned_payments', 'split_entries'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

/** Database columns that sync carries, per table. */
export const SYNC_COLUMNS: Record<SyncTable, readonly string[]> = {
  categories: ['id', 'kind', 'name', 'icon', 'color', 'sort_order', 'updated_at'],
  subcategories: ['id', 'category_id', 'name', 'sort_order', 'updated_at'],
  accounts: [
    'id', 'name', 'type', 'sub_type', 'balance', 'icon', 'color', 'credit_limit', 'billing_day', 'due_day',
    'custom_type_id', 'logo_url', 'sort_order', 'created_at', 'updated_at',
  ],
  transactions: [
    'id', 'type', 'amount', 'account_id', 'from_account_id', 'to_account_id', 'category_id', 'subcategory_id', 'note',
    'date', 'time', 'is_split', 'split_amount', 'deduct_my_share', 'source', 'source_ref', 'payment_app', 'created_at',
    'updated_at',
  ],
  planned_payments: [
    'id', 'name', 'amount', 'account_id', 'category_id', 'frequency', 'next_date', 'note', 'enabled', 'last_paid_date',
    'created_at', 'updated_at',
  ],
  split_entries: ['id', 'type', 'person', 'amount', 'direction', 'note', 'date', 'transaction_id', 'created_at', 'updated_at'],
};

/** Names used for each table in the file's `deleted` list (the web app's collection names). */
const FILE_TABLE_NAMES: Record<SyncTable, string> = {
  categories: 'categories',
  subcategories: 'subcategories',
  accounts: 'accounts',
  transactions: 'transactions',
  planned_payments: 'plannedPayments',
  split_entries: 'splitLedger',
};

/** Settings that travel with the data. Everything else (lock, reminders, photo, folders) stays on the device. */
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
] as const satisfies readonly (keyof Settings)[];
export type SyncedSettings = Partial<Pick<Settings, (typeof SYNCED_SETTING_KEYS)[number]>>;

export type SyncValue = string | number | null;
/** A database row by column name. */
export type SyncRow = { id: string; updated_at: string; [column: string]: SyncValue };

export interface Tombstone {
  table: SyncTable;
  id: string;
  deletedAt: string;
}

export interface Snapshot {
  settings: SyncedSettings;
  settingsUpdatedAt: string;
  tables: Record<SyncTable, SyncRow[]>;
  deleted: Tombstone[];
}

export function emptyTables(): Record<SyncTable, SyncRow[]> {
  return { categories: [], subcategories: [], accounts: [], transactions: [], planned_payments: [], split_entries: [] };
}

// ---- Writing ---------------------------------------------------------------------------------------

const bySortOrder = (a: SyncRow, b: SyncRow) => Number(a.sort_order) - Number(b.sort_order);

/**
 * Which apps ('web', 'android') have ever synced through a file. `_source` only names the last writer,
 * so `_clients` carries the full list forward; files from older versions only have `_source`.
 */
export function syncClients(file: unknown): string[] {
  if (!isObject(file)) return [];
  const clients = Array.isArray(file._clients) ? file._clients.filter((c): c is string => typeof c === 'string') : [];
  if (typeof file._source === 'string') clients.push(file._source);
  return [...new Set(clients)];
}

/** The file for a snapshot. `exportedAt` is left out of change detection by callers. */
export function snapshotToFile(s: Snapshot, meta: { appVersion: string; exportedAt: string; clients?: string[] }) {
  const { tables } = s;
  const subcategories = (categoryId: string) =>
    tables.subcategories
      .filter((x) => x.category_id === categoryId)
      .sort(bySortOrder)
      .map((x) => ({ id: x.id, name: x.name, sortOrder: x.sort_order, updatedAt: x.updated_at }));
  const categories = (kind: string) =>
    tables.categories
      .filter((c) => c.kind === kind)
      .sort(bySortOrder)
      .map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        sortOrder: c.sort_order,
        updatedAt: c.updated_at,
        subcategories: subcategories(c.id),
      }));

  return {
    _app: 'SpendTrak',
    _version: meta.appVersion,
    _format: SYNC_FORMAT,
    _source: 'android',
    _clients: [...new Set([...(meta.clients ?? []), 'android'])].sort(),
    _exportedAt: meta.exportedAt,
    settingsUpdatedAt: s.settingsUpdatedAt,
    settings: { ...s.settings, splitEnabled: true, plannedEnabled: true },
    accounts: tables.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      subType: a.sub_type,
      balance: a.balance,
      icon: a.icon,
      color: a.color,
      billingDate: a.billing_day,
      dueDate: a.due_day,
      creditLimit: a.credit_limit,
      customTypeId: a.custom_type_id,
      logoUrl: a.logo_url,
      sortOrder: a.sort_order,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    })),
    transactions: tables.transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      accountId: t.account_id,
      fromAccountId: t.from_account_id,
      toAccountId: t.to_account_id,
      categoryId: t.category_id,
      subcategoryId: t.subcategory_id,
      note: t.note ?? '',
      date: t.date,
      time: t.time,
      isSplit: t.is_split === 1,
      splitAmount: t.split_amount ?? 0,
      deductMyShare: t.deduct_my_share === 1,
      source: t.source,
      sourceRef: t.source_ref,
      paymentApp: t.payment_app,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })),
    categories: { expense: categories('expense'), income: categories('income') },
    plannedPayments: tables.planned_payments.map((p) => ({
      id: p.id,
      name: p.name,
      amount: p.amount,
      accountId: p.account_id,
      categoryId: p.category_id,
      frequency: p.frequency,
      nextDate: p.next_date,
      note: p.note ?? '',
      enabled: p.enabled === 1,
      lastPaidDate: p.last_paid_date,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    splitLedger: tables.split_entries.map((e) => ({
      id: e.id,
      type: e.type,
      person: e.person,
      amount: e.amount,
      direction: e.direction,
      note: e.note ?? '',
      date: e.date,
      transactionId: e.transaction_id,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    })),
    deleted: s.deleted.map((d) => ({ table: FILE_TABLE_NAMES[d.table], id: d.id, deletedAt: d.deletedAt })),
  };
}

// ---- Reading ---------------------------------------------------------------------------------------

export type Raw = Record<string, unknown>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const STAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
export const ACCOUNT_TYPES: AccountType[] = ['bank', 'card', 'cash', 'wallet', 'custom'];
export const TXN_TYPES: TransactionType[] = ['expense', 'income', 'transfer'];
export const SOURCES: TransactionSource[] = ['manual', 'sms', 'import'];
export const FREQUENCIES: PlannedFrequency[] = ['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];
export const SPLIT_TYPES: SplitEntryType[] = ['split_paid', 'split_owed', 'settlement'];
export const SPLIT_MODES: SplitAmountMode[] = ['full', 'my_share'];
export const THEMES: ThemePreference[] = ['system', 'light', 'dark'];
export const HOME_VIEWS: HomeView[] = ['balance', 'expenses'];

export const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
export const list = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter(isObject) : []);
export const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
export const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
export const day = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n >= 1 && n <= 31 ? Math.round(n) : null;
};
export const dateKey = (v: unknown): string | null => {
  const s = text(v);
  if (!s) return null;
  if (DATE_RE.test(s)) return s;
  return DATE_RE.test(s.slice(0, 10)) ? s.slice(0, 10) : null;
};
export const oneOf = <T extends string>(v: unknown, options: T[]): T | null => (options.includes(v as T) ? (v as T) : null);
export const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const strings = (v: unknown): string[] | null =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim() !== '') : null;
/** An ISO timestamp normalized to `toISOString()` form, so timestamps compare as strings. */
const stamp = (v: unknown): string | null => {
  if (typeof v !== 'string' || !STAMP_RE.test(v)) return null;
  const time = Date.parse(v);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

export class InvalidBackupError extends Error {}

export function isSpendTrakFile(data: unknown): data is Raw {
  return isObject(data) && (data._app === 'SpendTrak' || Array.isArray(data.accounts) || Array.isArray(data.transactions));
}

/** The synced settings found in a file, keeping only valid values. */
export function parseSyncedSettings(raw: unknown): SyncedSettings {
  const s = isObject(raw) ? raw : {};
  const out: SyncedSettings = {};
  if (CURRENCIES.some((c) => c.code === s.currency)) out.currency = s.currency as string;
  if (text(s.profileName)) out.profileName = text(s.profileName);
  const people = strings(s.splitPeople);
  if (people) out.splitPeople = [...new Set(people.map((p) => p.trim()))];
  const deduction = oneOf(s.splitBankDeduction, SPLIT_MODES);
  if (deduction) out.splitBankDeduction = deduction;
  const record = oneOf(s.splitExpenseRecord, SPLIT_MODES);
  if (record) out.splitExpenseRecord = record;
  const theme = oneOf(s.theme, THEMES);
  if (theme) out.theme = theme;
  const homeView = oneOf(s.homeView, HOME_VIEWS);
  if (homeView) out.homeView = homeView;
  for (const key of ['showBalanceStats', 'showAccountsOnHome', 'showSplitOnHome', 'excludeCCFromBalance', 'hideBalances', 'trackPaymentApp'] as const) {
    const value = bool(s[key]);
    if (value !== null) out[key] = value;
  }
  const txnType = oneOf(s.defaultTxnType, TXN_TYPES);
  if (txnType) out.defaultTxnType = txnType;
  if (Array.isArray(s.customAccountTypes)) {
    const types: CustomAccountType[] = [];
    for (const t of list(s.customAccountTypes)) {
      const id = text(t.id);
      const label = text(t.label);
      if (id && label && !types.some((x) => x.id === id)) types.push({ id, label, icon: text(t.icon) ?? '🪙' });
    }
    out.customAccountTypes = types;
  }
  const apps = strings(s.paymentApps);
  if (apps) out.paymentApps = apps;
  return out;
}

/** Keeps the newest row per ID, in first-seen order. */
function dedupe(rows: SyncRow[]): SyncRow[] {
  const byId = new Map<string, SyncRow>();
  for (const row of rows) {
    const seen = byId.get(row.id);
    if (!seen || row.updated_at > seen.updated_at) byId.set(row.id, row);
  }
  return [...byId.values()];
}

/** Reads a backup or sync file of any format into rows. Throws `InvalidBackupError` if it isn't one. */
export function parseSyncFile(data: unknown): Snapshot {
  if (!isSpendTrakFile(data)) throw new InvalidBackupError("This file isn't a SpendTrak backup.");
  const settings = parseSyncedSettings(data.settings);
  const customTypes = settings.customAccountTypes ?? [];
  const tables = emptyTables();
  const updated = (r: Raw) => stamp(r.updatedAt) ?? EPOCH;
  const created = (r: Raw) => stamp(r.createdAt) ?? EPOCH;

  const categories = isObject(data.categories) ? data.categories : {};
  for (const kind of ['expense', 'income'] as const) {
    for (const [i, c] of list(categories[kind]).entries()) {
      const id = text(c.id);
      const name = text(c.name);
      if (!id || !name) continue;
      tables.categories.push({
        id,
        kind,
        name,
        icon: text(c.icon) ?? '📦',
        color: text(c.color) ?? '#B2BEC3',
        sort_order: num(c.sortOrder) ?? i,
        updated_at: updated(c),
      });
      for (const [j, s] of list(c.subcategories).entries()) {
        const subId = text(s.id);
        const subName = text(s.name);
        if (!subId || !subName) continue;
        tables.subcategories.push({ id: subId, category_id: id, name: subName, sort_order: num(s.sortOrder) ?? j, updated_at: updated(s) });
      }
    }
  }

  for (const [i, a] of list(data.accounts).entries()) {
    const id = text(a.id);
    const name = text(a.name);
    if (!id || !name) continue;
    const type = oneOf(a.type, ACCOUNT_TYPES) ?? 'custom';
    const isCredit = type === 'card' && a.subType === 'credit';
    const customType = type === 'custom' ? customTypes.find((t) => t.id === a.customTypeId) : undefined;
    tables.accounts.push({
      id,
      name,
      type,
      sub_type: text(a.subType),
      balance: num(a.balance) ?? 0,
      icon: text(a.icon) ?? customType?.icon ?? null,
      color: text(a.color),
      credit_limit: isCredit ? num(a.creditLimit) : null,
      billing_day: isCredit ? day(a.billingDate ?? a.billingDay) : null,
      due_day: isCredit ? day(a.dueDate ?? a.dueDay) : null,
      custom_type_id: customType?.id ?? null,
      logo_url: text(a.logoUrl),
      sort_order: num(a.sortOrder) ?? i,
      created_at: created(a),
      updated_at: updated(a),
    });
  }

  for (const t of list(data.transactions)) {
    const id = text(t.id);
    const type = oneOf(t.type, TXN_TYPES);
    const amount = num(t.amount);
    const date = dateKey(t.date);
    if (!id || !type || !amount || amount <= 0 || !date) continue;
    const isSplit = type === 'expense' && t.isSplit === true;
    tables.transactions.push({
      id,
      type,
      amount,
      account_id: type === 'transfer' ? null : text(t.accountId),
      from_account_id: type === 'transfer' ? text(t.fromAccountId) : null,
      to_account_id: type === 'transfer' ? text(t.toAccountId) : null,
      category_id: type === 'transfer' ? null : text(t.categoryId),
      subcategory_id: type === 'expense' ? text(t.subcategoryId) : null,
      note: text(t.note),
      date,
      time: typeof t.time === 'string' && TIME_RE.test(t.time) ? t.time : null,
      is_split: isSplit ? 1 : 0,
      split_amount: isSplit ? num(t.splitAmount) || null : null,
      deduct_my_share: isSplit && t.deductMyShare === true ? 1 : 0,
      source: oneOf(t.source, SOURCES) ?? 'import',
      source_ref: text(t.sourceRef),
      payment_app: text(t.paymentApp),
      created_at: created(t),
      updated_at: updated(t),
    });
  }

  for (const p of list(data.plannedPayments)) {
    const id = text(p.id);
    const name = text(p.name);
    const amount = num(p.amount);
    const nextDate = dateKey(p.nextDate);
    if (!id || !name || !amount || amount <= 0 || !nextDate) continue;
    tables.planned_payments.push({
      id,
      name,
      amount,
      account_id: text(p.accountId),
      category_id: text(p.categoryId),
      frequency: oneOf(p.frequency, FREQUENCIES) ?? 'monthly',
      next_date: nextDate,
      note: text(p.note),
      enabled: p.enabled === false ? 0 : 1,
      last_paid_date: dateKey(p.lastPaidDate),
      created_at: created(p),
      updated_at: updated(p),
    });
  }

  for (const e of list(data.splitLedger)) {
    const id = text(e.id);
    const type = oneOf(e.type, SPLIT_TYPES);
    const person = text(e.person);
    const amount = num(e.amount);
    if (!id || !type || !person || !amount || amount <= 0) continue;
    tables.split_entries.push({
      id,
      type,
      person,
      amount,
      direction: type === 'settlement' ? (oneOf(e.direction, ['received', 'paid']) ?? 'received') : null,
      note: text(e.note),
      date: dateKey(e.date) ?? dateKey(e.createdAt) ?? created(e).slice(0, 10),
      transaction_id: text(e.transactionId),
      created_at: created(e),
      updated_at: updated(e),
    });
  }

  const tableByFileName = new Map(Object.entries(FILE_TABLE_NAMES).map(([table, name]) => [name, table as SyncTable]));
  const deleted = new Map<string, Tombstone>();
  for (const d of list(data.deleted)) {
    const table = typeof d.table === 'string' ? tableByFileName.get(d.table) : undefined;
    const id = text(d.id);
    const deletedAt = stamp(d.deletedAt);
    if (!table || !id || !deletedAt) continue;
    const key = `${table}:${id}`;
    const seen = deleted.get(key);
    if (!seen || deletedAt > seen.deletedAt) deleted.set(key, { table, id, deletedAt });
  }

  for (const table of SYNC_TABLES) tables[table] = dedupe(tables[table]);
  return {
    settings,
    settingsUpdatedAt: stamp(data.settingsUpdatedAt) ?? EPOCH,
    tables,
    deleted: [...deleted.values()],
  };
}
