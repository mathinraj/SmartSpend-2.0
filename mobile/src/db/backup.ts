/**
 * JSON backups in the web app's format, so a backup from either app restores into the other.
 * Web field names are kept (`billingDate`, `splitLedger`, ...) and missing values are written as null.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { CURRENCIES } from '@/constants/currencies';
import { createAccount, listAccounts } from '@/db/accounts';
import { listCategories } from '@/db/categories';
import { listPlanned } from '@/db/planned';
import { getSettings, writeSettings } from '@/db/settings';
import { listAllSplitEntries } from '@/db/splits';
import { applyBalance, insertTransaction, listTransactions, type NewTransaction } from '@/db/transactions';
import { toDateKey } from '@/lib/format';
import type {
  AccountType,
  HomeView,
  PlannedFrequency,
  SplitAmountMode,
  SplitEntryType,
  ThemePreference,
  TransactionSource,
  TransactionType,
} from '@/types/models';

export async function buildBackup(db: SQLiteDatabase, appVersion: string) {
  const [settings, accounts, transactions, expense, income, planned, splits] = await Promise.all([
    getSettings(db),
    listAccounts(db),
    listTransactions(db),
    listCategories(db, 'expense'),
    listCategories(db, 'income'),
    listPlanned(db),
    listAllSplitEntries(db),
  ]);

  return {
    _app: 'SpendTrak',
    _version: appVersion,
    _source: 'android',
    _exportedAt: new Date().toISOString(),
    settings: {
      currency: settings.currency,
      profileName: settings.profileName,
      splitPeople: settings.splitPeople,
      splitBankDeduction: settings.splitBankDeduction,
      splitExpenseRecord: settings.splitExpenseRecord,
      theme: settings.theme,
      homeView: settings.homeView,
      showBalanceStats: settings.showBalanceStats,
      showAccountsOnHome: settings.showAccountsOnHome,
      showSplitOnHome: settings.showSplitOnHome,
      excludeCCFromBalance: settings.excludeCCFromBalance,
      hideBalances: settings.hideBalances,
      defaultTxnType: settings.defaultTxnType,
      splitEnabled: true,
      plannedEnabled: true,
    },
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      subType: a.subType,
      balance: a.balance,
      icon: a.icon,
      billingDate: a.billingDay,
      dueDate: a.dueDay,
      creditLimit: a.creditLimit,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      accountId: t.accountId,
      fromAccountId: t.fromAccountId,
      toAccountId: t.toAccountId,
      categoryId: t.categoryId,
      subcategoryId: t.subcategoryId,
      note: t.note ?? '',
      date: t.date,
      time: t.time,
      isSplit: t.isSplit,
      splitAmount: t.splitAmount ?? 0,
      deductMyShare: t.deductMyShare,
      source: t.source,
      createdAt: t.createdAt,
    })),
    categories: {
      expense: expense.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })),
      })),
      income: income.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color })),
    },
    plannedPayments: planned.map((p) => ({
      id: p.id,
      name: p.name,
      amount: p.amount,
      accountId: p.accountId,
      categoryId: p.categoryId,
      frequency: p.frequency,
      nextDate: p.nextDate,
      note: p.note ?? '',
      enabled: p.enabled,
      lastPaidDate: p.lastPaidDate,
      createdAt: p.createdAt,
    })),
    splitLedger: splits.map((e) => ({
      id: e.id,
      type: e.type,
      person: e.person,
      amount: e.amount,
      direction: e.direction,
      note: e.note ?? '',
      date: e.date,
      transactionId: e.transactionId,
      createdAt: e.createdAt,
    })),
  };
}

function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Transactions as CSV for spreadsheets, oldest last. */
export async function buildTransactionsCsv(db: SQLiteDatabase): Promise<string> {
  const rows = await listTransactions(db);
  const header = ['Date', 'Time', 'Type', 'Amount', 'Category', 'Subcategory', 'Account', 'From Account', 'To Account', 'Note'];
  const lines = rows.map((t) =>
    [t.date, t.time, t.type, t.amount, t.categoryName, t.subcategoryName, t.accountName, t.fromAccountName, t.toAccountName, t.note]
      .map(csvCell)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

// ---- Import --------------------------------------------------------------------------------------

type Raw = Record<string, unknown>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const ACCOUNT_TYPES: AccountType[] = ['bank', 'card', 'cash', 'wallet', 'custom'];
const TXN_TYPES: TransactionType[] = ['expense', 'income', 'transfer'];
const SOURCES: TransactionSource[] = ['manual', 'sms', 'import'];
const FREQUENCIES: PlannedFrequency[] = ['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];
const SPLIT_TYPES: SplitEntryType[] = ['split_paid', 'split_owed', 'settlement'];
const SPLIT_MODES: SplitAmountMode[] = ['full', 'my_share'];
const THEMES: ThemePreference[] = ['system', 'light', 'dark'];
const HOME_VIEWS: HomeView[] = ['balance', 'expenses'];

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const list = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter(isObject) : []);
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const day = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n >= 1 && n <= 31 ? Math.round(n) : null;
};
const dateKey = (v: unknown): string | null => {
  const s = text(v);
  if (!s) return null;
  if (DATE_RE.test(s)) return s;
  return DATE_RE.test(s.slice(0, 10)) ? s.slice(0, 10) : null;
};
const oneOf = <T extends string>(v: unknown, options: T[]): T | null =>
  options.includes(v as T) ? (v as T) : null;
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);

export class InvalidBackupError extends Error {}

export interface ImportSummary {
  accounts: number;
  transactions: number;
  plannedPayments: number;
  splitEntries: number;
}

/**
 * Restores a backup. `replace` wipes accounts, transactions, planned payments, and splits first (and
 * categories, if the backup has them). `merge` only adds records whose IDs are new; new transactions
 * update balances of accounts that already existed, while new accounts keep their backed-up balance.
 */
export async function importBackup(db: SQLiteDatabase, data: unknown, mode: 'replace' | 'merge'): Promise<ImportSummary> {
  if (!isObject(data) || (!data._app && !Array.isArray(data.accounts) && !Array.isArray(data.transactions))) {
    throw new InvalidBackupError("This file isn't a SpendTrak backup.");
  }

  const summary: ImportSummary = { accounts: 0, transactions: 0, plannedPayments: 0, splitEntries: 0 };
  const categories = isObject(data.categories) ? data.categories : null;
  const expenseCats = list(categories?.expense);
  const incomeCats = list(categories?.income);
  const settingsData = isObject(data.settings) ? data.settings : {};

  await db.withTransactionAsync(async () => {
    const existing = async (table: string) =>
      new Set((await db.getAllAsync<{ id: string }>(`SELECT id FROM ${table}`)).map((r) => r.id));

    if (mode === 'replace') {
      await db.execAsync(
        'DELETE FROM transactions; DELETE FROM accounts; DELETE FROM planned_payments; DELETE FROM split_entries;'
      );
      if (expenseCats.length > 0 && incomeCats.length > 0) {
        await db.execAsync('DELETE FROM subcategories; DELETE FROM categories;');
      }
    }

    // Categories
    const catIds = await existing('categories');
    const subIds = await existing('subcategories');
    for (const [kind, cats] of [['expense', expenseCats], ['income', incomeCats]] as const) {
      for (const [i, c] of cats.entries()) {
        const id = text(c.id);
        const name = text(c.name);
        if (!id || !name) continue;
        if (!catIds.has(id)) {
          await db.runAsync(
            'INSERT INTO categories (id, kind, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            id,
            kind,
            name,
            text(c.icon) ?? '📦',
            text(c.color) ?? '#B2BEC3',
            i
          );
          catIds.add(id);
        }
        for (const [j, s] of list(c.subcategories).entries()) {
          const subId = text(s.id);
          const subName = text(s.name);
          if (!subId || !subName || subIds.has(subId)) continue;
          await db.runAsync(
            'INSERT INTO subcategories (id, category_id, name, sort_order) VALUES (?, ?, ?, ?)',
            subId,
            id,
            subName,
            j
          );
          subIds.add(subId);
        }
      }
    }

    // Accounts
    const localAccounts = await existing('accounts');
    const accountIds = new Set(localAccounts);
    for (const a of list(data.accounts)) {
      const id = text(a.id);
      const name = text(a.name);
      if (!id || !name || accountIds.has(id)) continue;
      const type = oneOf(a.type, ACCOUNT_TYPES) ?? 'custom';
      const isCredit = type === 'card' && a.subType === 'credit';
      await createAccount(db, {
        id,
        name,
        type,
        subType: text(a.subType),
        balance: num(a.balance) ?? 0,
        icon: text(a.icon),
        color: text(a.color),
        creditLimit: isCredit ? num(a.creditLimit) : null,
        billingDay: isCredit ? day(a.billingDate ?? a.billingDay) : null,
        dueDay: isCredit ? day(a.dueDate ?? a.dueDay) : null,
      });
      accountIds.add(id);
      summary.accounts += 1;
    }

    // Transactions
    const txnIds = await existing('transactions');
    for (const t of list(data.transactions)) {
      const id = text(t.id);
      const type = oneOf(t.type, TXN_TYPES);
      const amount = num(t.amount);
      const date = dateKey(t.date);
      if (!id || !type || !amount || amount <= 0 || !date || txnIds.has(id)) continue;
      const input: NewTransaction = {
        id,
        type,
        amount,
        accountId: type === 'transfer' ? null : text(t.accountId),
        fromAccountId: type === 'transfer' ? text(t.fromAccountId) : null,
        toAccountId: type === 'transfer' ? text(t.toAccountId) : null,
        categoryId: type === 'transfer' ? null : text(t.categoryId),
        subcategoryId: type === 'expense' ? text(t.subcategoryId) : null,
        note: text(t.note),
        date,
        time: typeof t.time === 'string' && TIME_RE.test(t.time) ? t.time : null,
        isSplit: t.isSplit === true,
        splitAmount: num(t.splitAmount) || null,
        deductMyShare: t.isSplit === true && t.deductMyShare === true,
        source: oneOf(t.source, SOURCES) ?? 'import',
        sourceRef: text(t.sourceRef),
      };
      await insertTransaction(db, input);
      txnIds.add(id);
      summary.transactions += 1;

      if (mode === 'merge') {
        // Backed-up balances of newly imported accounts already include this transaction.
        const local = (accountId: string | null) => (accountId && localAccounts.has(accountId) ? accountId : null);
        await applyBalance(
          db,
          { ...input, accountId: local(input.accountId), fromAccountId: local(input.fromAccountId), toAccountId: local(input.toAccountId) },
          1
        );
      }
    }

    // Planned payments
    const plannedIds = await existing('planned_payments');
    for (const p of list(data.plannedPayments)) {
      const id = text(p.id);
      const name = text(p.name);
      const amount = num(p.amount);
      const nextDate = dateKey(p.nextDate);
      if (!id || !name || !amount || amount <= 0 || !nextDate || plannedIds.has(id)) continue;
      await db.runAsync(
        `INSERT INTO planned_payments
           (id, name, amount, account_id, category_id, frequency, next_date, note, enabled, last_paid_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        name,
        amount,
        text(p.accountId),
        text(p.categoryId),
        oneOf(p.frequency, FREQUENCIES) ?? 'monthly',
        nextDate,
        text(p.note),
        p.enabled === false ? 0 : 1,
        dateKey(p.lastPaidDate),
        text(p.createdAt) ?? new Date().toISOString()
      );
      plannedIds.add(id);
      summary.plannedPayments += 1;
    }

    // Split ledger
    const splitIds = await existing('split_entries');
    const people = new Set<string>();
    for (const e of list(data.splitLedger)) {
      const id = text(e.id);
      const type = oneOf(e.type, SPLIT_TYPES);
      const person = text(e.person);
      const amount = num(e.amount);
      if (!id || !type || !person || !amount || amount <= 0 || splitIds.has(id)) continue;
      const direction = type === 'settlement' ? (oneOf(e.direction, ['received', 'paid']) ?? 'received') : null;
      await db.runAsync(
        `INSERT INTO split_entries (id, type, person, amount, direction, note, date, transaction_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        type,
        person,
        amount,
        direction,
        text(e.note),
        dateKey(e.date) ?? dateKey(e.createdAt) ?? toDateKey(new Date()),
        text(e.transactionId),
        text(e.createdAt) ?? new Date().toISOString()
      );
      splitIds.add(id);
      people.add(person);
      summary.splitEntries += 1;
    }

    // Settings: data and display ones; onboarding, lock, and reminders stay as they are on this phone.
    const current = await getSettings(db);
    const importedPeople = Array.isArray(settingsData.splitPeople)
      ? settingsData.splitPeople.filter((p): p is string => typeof p === 'string' && p.trim() !== '')
      : [];
    const splitPeople = [...new Set([...current.splitPeople, ...importedPeople, ...people])];
    if (mode === 'replace') {
      const currency = CURRENCIES.some((c) => c.code === settingsData.currency)
        ? (settingsData.currency as string)
        : current.currency;
      await writeSettings(db, {
        currency,
        profileName: text(settingsData.profileName) ?? current.profileName,
        splitPeople,
        splitBankDeduction: oneOf(settingsData.splitBankDeduction, SPLIT_MODES) ?? current.splitBankDeduction,
        splitExpenseRecord: oneOf(settingsData.splitExpenseRecord, SPLIT_MODES) ?? current.splitExpenseRecord,
        theme: oneOf(settingsData.theme, THEMES) ?? current.theme,
        homeView: oneOf(settingsData.homeView, HOME_VIEWS) ?? current.homeView,
        showBalanceStats: bool(settingsData.showBalanceStats) ?? current.showBalanceStats,
        showAccountsOnHome: bool(settingsData.showAccountsOnHome) ?? current.showAccountsOnHome,
        showSplitOnHome: bool(settingsData.showSplitOnHome) ?? current.showSplitOnHome,
        excludeCCFromBalance: bool(settingsData.excludeCCFromBalance) ?? current.excludeCCFromBalance,
        hideBalances: bool(settingsData.hideBalances) ?? current.hideBalances,
        defaultTxnType: oneOf(settingsData.defaultTxnType, TXN_TYPES) ?? current.defaultTxnType,
      });
    } else {
      await writeSettings(db, { splitPeople });
    }
  });

  return summary;
}
