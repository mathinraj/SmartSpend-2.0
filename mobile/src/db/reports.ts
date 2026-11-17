import type { SQLiteDatabase } from 'expo-sqlite';

import { listAccounts } from '@/db/accounts';
import { getSettings } from '@/db/settings';
import { listTransactions } from '@/db/transactions';
import { ACCOUNT_TYPE_OPTIONS, subTypeLabel } from '@/lib/accounts';
import { monthRange } from '@/lib/format';
import type { SplitAmountMode, TransactionListItem } from '@/types/models';

export type Cell = string | number | null;

export interface ReportTable {
  name: string;
  headers: string[];
  rows: Cell[][];
  /** Columns holding money, formatted as currency in the PDF and as numbers in Excel. */
  moneyColumns: number[];
  /** Columns to print in the PDF, which has less room; defaults to all. */
  pdfColumns?: number[];
}

export interface Report {
  title: string;
  subtitle: string;
  currency: string;
  tables: ReportTable[];
}

/** The PDF lists at most this many transactions; Excel always gets all of them. */
export const PDF_TRANSACTION_LIMIT = 500;

function spent(t: TransactionListItem, record: SplitAmountMode): number {
  return record === 'my_share' && t.isSplit ? t.amount - (t.splitAmount ?? 0) : t.amount;
}

function categoryLabel(t: TransactionListItem): string | null {
  return t.type === 'transfer' ? 'Transfer' : t.categoryName;
}

/** Same sections as the web app's PDF/Excel export: monthly summary, transactions, accounts. */
export async function buildReport(db: SQLiteDatabase): Promise<Report> {
  const [settings, accounts, transactions] = await Promise.all([getSettings(db), listAccounts(db), listTransactions(db)]);
  const record = settings.splitExpenseRecord;

  const months = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    if (t.type === 'transfer') continue;
    const key = t.date.slice(0, 7);
    const m = months.get(key) ?? { income: 0, expense: 0 };
    if (t.type === 'income') m.income += t.amount;
    else m.expense += spent(t, record);
    months.set(key, m);
  }
  const { from, to } = monthRange(new Date());
  const thisMonth = transactions.filter((t) => t.date >= from && t.date < to);
  const income = thisMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = thisMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + spent(t, record), 0);

  return {
    title: 'SpendTrak report',
    subtitle: `${accounts.length} accounts · ${transactions.length} transactions`,
    currency: settings.currency,
    tables: [
      {
        name: 'This month',
        headers: ['Metric', 'Value'],
        rows: [
          ['Income', income],
          ['Spent', expense],
          ['Net', income - expense],
        ],
        moneyColumns: [1],
      },
      {
        name: 'Monthly summary',
        headers: ['Month', 'Income', 'Spent', 'Net'],
        rows: [...months.entries()]
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([month, m]) => [month, m.income, m.expense, m.income - m.expense]),
        moneyColumns: [1, 2, 3],
      },
      {
        name: 'Transactions',
        headers: ['Date', 'Type', 'Amount', 'Category', 'Subcategory', 'Account', 'From account', 'To account', 'Note', 'Payment app'],
        rows: transactions.map((t) => [
          t.date,
          t.type,
          t.amount,
          categoryLabel(t),
          t.subcategoryName,
          t.type === 'transfer' ? `${t.fromAccountName ?? 'Deleted account'} → ${t.toAccountName ?? 'Deleted account'}` : t.accountName,
          t.fromAccountName,
          t.toAccountName,
          t.note,
          t.paymentApp,
        ]),
        moneyColumns: [2],
        pdfColumns: [0, 1, 2, 3, 5, 8],
      },
      {
        name: 'Accounts',
        headers: ['Name', 'Type', 'Sub-type', 'Balance'],
        rows: accounts.map((a) => [
          a.name,
          settings.customAccountTypes.find((c) => c.id === a.customTypeId)?.label ??
            ACCOUNT_TYPE_OPTIONS.find((o) => o.type === a.type)?.label ??
            a.type,
          subTypeLabel(a),
          a.balance,
        ]),
        moneyColumns: [3],
      },
    ],
  };
}
