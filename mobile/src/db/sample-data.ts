import type { SQLiteDatabase } from 'expo-sqlite';

import { createAccount, type NewAccount } from '@/db/accounts';
import { createPlanned, type PlannedInput } from '@/db/planned';
import { getSettings, writeSettings } from '@/db/settings';
import { insertSplitEntry, type NewSplitEntry } from '@/db/splits';
import { insertTransaction, type NewTransaction } from '@/db/transactions';
import { addDays, toDateKey } from '@/lib/format';

const SAMPLE_PREFIX = 'sample_';

function account(a: Pick<NewAccount, 'id' | 'name' | 'type' | 'balance'> & Partial<NewAccount>): NewAccount {
  return { subType: null, icon: null, color: null, creditLimit: null, billingDay: null, dueDay: null, customTypeId: null, logoUrl: null, ...a };
}

const ACCOUNTS: NewAccount[] = [
  account({ id: 'sample_hdfc', name: 'HDFC Savings', type: 'bank', subType: 'savings', balance: 52780.5 }),
  account({ id: 'sample_sbi', name: 'SBI Salary', type: 'bank', subType: 'salary', balance: 134200 }),
  account({
    id: 'sample_icici_cc',
    name: 'ICICI Amazon Pay Card',
    type: 'card',
    subType: 'credit',
    balance: -22450,
    creditLimit: 150000,
    billingDay: 15,
    dueDay: 5,
  }),
  account({ id: 'sample_cash', name: 'Cash in Hand', type: 'cash', balance: 2850 }),
  account({ id: 'sample_paytm', name: 'Paytm Wallet', type: 'wallet', balance: 1420 }),
];

type SampleTxn = Pick<NewTransaction, 'type' | 'amount' | 'note'> &
  Partial<Pick<NewTransaction, 'accountId' | 'fromAccountId' | 'toAccountId' | 'categoryId' | 'subcategoryId' | 'time' | 'paymentApp'>> & {
    daysAgo: number;
  };

const TRANSACTIONS: SampleTxn[] = [
  { daysAgo: 0, type: 'expense', amount: 389, accountId: 'sample_paytm', categoryId: 'food', subcategoryId: 'food_delivery', note: 'Swiggy dinner', time: '21:15', paymentApp: 'Paytm' },
  { daysAgo: 0, type: 'expense', amount: 85, accountId: 'sample_cash', categoryId: 'transport', subcategoryId: 'transport_taxi', note: 'Auto to office', time: '09:10', paymentApp: 'Cash' },
  { daysAgo: 1, type: 'income', amount: 75000, accountId: 'sample_sbi', categoryId: 'income_salary', note: 'Salary', time: '10:00' },
  { daysAgo: 1, type: 'transfer', amount: 5000, fromAccountId: 'sample_sbi', toAccountId: 'sample_paytm', note: 'Top up wallet', time: '10:30' },
  { daysAgo: 2, type: 'expense', amount: 1199, accountId: 'sample_hdfc', categoryId: 'bills', subcategoryId: 'bills_internet', note: 'Jio fiber bill', time: '18:20', paymentApp: 'PhonePe' },
  { daysAgo: 3, type: 'expense', amount: 3499, accountId: 'sample_icici_cc', categoryId: 'shopping', subcategoryId: 'shopping_electronics', note: 'Amazon - earbuds', time: '22:10', paymentApp: 'Amazon Pay' },
  { daysAgo: 4, type: 'expense', amount: 620, accountId: 'sample_hdfc', categoryId: 'food', subcategoryId: 'food_restaurant', note: 'Lunch with team', time: '13:30', paymentApp: 'GPay' },
  { daysAgo: 6, type: 'expense', amount: 4500, accountId: 'sample_hdfc', categoryId: 'health', subcategoryId: 'health_gym', note: 'Gym membership', time: '07:00', paymentApp: 'Card Swipe' },
  { daysAgo: 7, type: 'income', amount: 12000, accountId: 'sample_hdfc', categoryId: 'income_freelance', note: 'Logo design project', time: '16:00' },
  { daysAgo: 8, type: 'expense', amount: 8500, accountId: 'sample_icici_cc', categoryId: 'bills', subcategoryId: 'bills_rent', note: 'Room rent share', time: '10:00', paymentApp: 'CRED' },
  { daysAgo: 9, type: 'expense', amount: 199, accountId: 'sample_icici_cc', categoryId: 'entertainment', subcategoryId: 'ent_subscriptions', note: 'Netflix', time: '20:00', paymentApp: 'Card Swipe' },
  { daysAgo: 10, type: 'expense', amount: 1800, accountId: 'sample_hdfc', categoryId: 'food', subcategoryId: 'food_groceries', note: 'BigBasket groceries', time: '19:30', paymentApp: 'GPay' },
  { daysAgo: 14, type: 'expense', amount: 350, accountId: 'sample_cash', categoryId: 'transport', subcategoryId: 'transport_fuel', note: 'Petrol', time: '08:15', paymentApp: 'Cash' },
  { daysAgo: 18, type: 'expense', amount: 2100, accountId: 'sample_hdfc', categoryId: 'bills', subcategoryId: 'bills_electricity', note: 'Electricity bill', time: '11:00', paymentApp: 'Net Banking' },
  { daysAgo: 22, type: 'expense', amount: 1280, accountId: 'sample_icici_cc', categoryId: 'entertainment', subcategoryId: 'ent_movies', note: 'Movie night', time: '19:00' },
  { daysAgo: 31, type: 'income', amount: 75000, accountId: 'sample_sbi', categoryId: 'income_salary', note: 'Salary', time: '10:00' },
  { daysAgo: 33, type: 'expense', amount: 6800, accountId: 'sample_icici_cc', categoryId: 'travel', subcategoryId: 'travel_flights', note: 'Flight to Goa', time: '12:00' },
  { daysAgo: 36, type: 'expense', amount: 4500, accountId: 'sample_hdfc', categoryId: 'health', subcategoryId: 'health_gym', note: 'Gym membership', time: '07:00' },
  { daysAgo: 40, type: 'expense', amount: 1950, accountId: 'sample_paytm', categoryId: 'food', subcategoryId: 'food_groceries', note: 'Zepto groceries', time: '10:15', paymentApp: 'Paytm' },
];

/** A shared dinner: you paid ₹2,400 from HDFC, Asha and Ravi each owe ₹800. */
const SPLIT_DINNER = {
  id: `${SAMPLE_PREFIX}txn_split_dinner`,
  daysAgo: 5,
  amount: 2400,
  othersShare: 1600,
};

const SAMPLE_PEOPLE = ['Asha', 'Ravi', 'Priya'];

type SampleSplit = Omit<NewSplitEntry, 'date' | 'id'> & { key: string; daysAgo: number };

const SPLITS: SampleSplit[] = [
  { key: 'asha_dinner', type: 'split_paid', person: 'Asha', amount: 800, direction: null, note: 'Dinner at Toit', daysAgo: 5, transactionId: SPLIT_DINNER.id },
  { key: 'ravi_dinner', type: 'split_paid', person: 'Ravi', amount: 800, direction: null, note: 'Dinner at Toit', daysAgo: 5, transactionId: SPLIT_DINNER.id },
  { key: 'ravi_paid_back', type: 'settlement', person: 'Ravi', amount: 800, direction: 'received', note: 'UPI', daysAgo: 3, transactionId: null },
  { key: 'priya_cab', type: 'split_owed', person: 'Priya', amount: 350, direction: null, note: 'Airport cab', daysAgo: 9, transactionId: null },
];

type SamplePlanned = Omit<PlannedInput, 'nextDate'> & { key: string; inDays: number };

const PLANNED: SamplePlanned[] = [
  { key: 'netflix', name: 'Netflix', amount: 199, accountId: 'sample_icici_cc', categoryId: 'entertainment', frequency: 'monthly', inDays: 2, note: 'Standard plan', enabled: true },
  { key: 'rent', name: 'Room rent share', amount: 8500, accountId: 'sample_icici_cc', categoryId: 'bills', frequency: 'monthly', inDays: 22, note: null, enabled: true },
  { key: 'gym', name: 'Gym membership', amount: 4500, accountId: 'sample_hdfc', categoryId: 'health', frequency: 'monthly', inDays: -1, note: null, enabled: true },
  { key: 'insurance', name: 'Health insurance', amount: 12400, accountId: 'sample_hdfc', categoryId: 'bills', frequency: 'yearly', inDays: 45, note: 'Family floater', enabled: true },
  { key: 'magazine', name: 'Magazine subscription', amount: 299, accountId: 'sample_paytm', categoryId: 'entertainment', frequency: 'monthly', inDays: 10, note: 'Paused for now', enabled: false },
];

export async function hasSampleData(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM accounts WHERE id LIKE ?',
    `${SAMPLE_PREFIX}%`
  );
  return (row?.n ?? 0) > 0;
}

/** Sample account balances are already final, so transactions are inserted without touching them. */
export async function loadSampleData(db: SQLiteDatabase) {
  if (await hasSampleData(db)) return;
  const today = new Date();
  await db.withTransactionAsync(async () => {
    for (const a of ACCOUNTS) await createAccount(db, a);
    for (const [i, t] of TRANSACTIONS.entries()) {
      await insertTransaction(db, {
        id: `${SAMPLE_PREFIX}txn_${i}`,
        type: t.type,
        amount: t.amount,
        accountId: t.accountId ?? null,
        fromAccountId: t.fromAccountId ?? null,
        toAccountId: t.toAccountId ?? null,
        categoryId: t.categoryId ?? null,
        subcategoryId: t.subcategoryId ?? null,
        note: t.note,
        date: toDateKey(addDays(today, -t.daysAgo)),
        time: t.time ?? null,
        isSplit: false,
        splitAmount: null,
        deductMyShare: false,
        source: 'manual',
        sourceRef: null,
        paymentApp: t.paymentApp ?? null,
      });
    }

    await insertTransaction(db, {
      id: SPLIT_DINNER.id,
      type: 'expense',
      amount: SPLIT_DINNER.amount,
      accountId: 'sample_hdfc',
      fromAccountId: null,
      toAccountId: null,
      categoryId: 'food',
      subcategoryId: 'food_restaurant',
      note: 'Dinner at Toit',
      date: toDateKey(addDays(today, -SPLIT_DINNER.daysAgo)),
      time: '21:30',
      isSplit: true,
      splitAmount: SPLIT_DINNER.othersShare,
      deductMyShare: false,
      source: 'manual',
      sourceRef: null,
      paymentApp: 'GPay',
    });
    for (const { key, daysAgo, ...entry } of SPLITS) {
      await insertSplitEntry(db, { ...entry, id: `${SAMPLE_PREFIX}split_${key}`, date: toDateKey(addDays(today, -daysAgo)) });
    }
    for (const { key, inDays, ...payment } of PLANNED) {
      await createPlanned(db, { ...payment, id: `${SAMPLE_PREFIX}planned_${key}`, nextDate: toDateKey(addDays(today, inDays)) });
    }
    const settings = await getSettings(db);
    await writeSettings(db, { splitPeople: [...new Set([...settings.splitPeople, ...SAMPLE_PEOPLE])] });
  });
}

export async function removeSampleData(db: SQLiteDatabase) {
  const pattern = `${SAMPLE_PREFIX}%`;
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM split_entries WHERE id LIKE ?', pattern);
    await db.runAsync('DELETE FROM planned_payments WHERE id LIKE ?', pattern);
    await db.runAsync('DELETE FROM transactions WHERE id LIKE ?', pattern);
    await db.runAsync('DELETE FROM accounts WHERE id LIKE ?', pattern);
    // Sample people go too, unless the user has since recorded their own entries with them.
    const stillUsed = new Set(
      (await db.getAllAsync<{ person: string }>('SELECT DISTINCT person FROM split_entries')).map((r) => r.person)
    );
    const settings = await getSettings(db);
    await writeSettings(db, {
      splitPeople: settings.splitPeople.filter((p) => !SAMPLE_PEOPLE.includes(p) || stillUsed.has(p)),
    });
  });
}
