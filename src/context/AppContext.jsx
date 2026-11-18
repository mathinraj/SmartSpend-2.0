'use client';

import { createContext, useContext, useReducer, useEffect } from 'react';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';
import { DEFAULT_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories';
import { generateId } from '../utils/helpers';
import { generateSampleData, SAMPLE_ACCOUNT_IDS } from '../utils/sampleData';
import { EPOCH, applyBalance, applySnapshot, trackChanges } from '../utils/syncFormat';

const AppContext = createContext(null);

const initialSettings = {
  currency: null,
  onboardStep: 0, // 0=welcome, 1=name, 2=currency, 3=done
};

const initialSyncMeta = { deleted: [], settingsUpdatedAt: EPOCH };

function loadInitialState() {
  const settings = loadFromStorage(STORAGE_KEYS.SETTINGS) || initialSettings;
  const accounts = loadFromStorage(STORAGE_KEYS.ACCOUNTS) || [];
  const transactions = loadFromStorage(STORAGE_KEYS.TRANSACTIONS) || [];
  const categories = loadFromStorage(STORAGE_KEYS.CATEGORIES) || {
    expense: DEFAULT_CATEGORIES,
    income: INCOME_CATEGORIES,
  };
  const plannedPayments = loadFromStorage(STORAGE_KEYS.PLANNED_PAYMENTS) || [];
  const splitLedger = loadFromStorage(STORAGE_KEYS.SPLIT_LEDGER) || [];
  const syncMeta = loadFromStorage(STORAGE_KEYS.SYNC_META) || initialSyncMeta;

  return { settings, accounts, transactions, categories, plannedPayments, splitLedger, syncMeta };
}

function appReducer(state, action) {
  switch (action.type) {
    case 'NEXT_ONBOARD_STEP':
      return {
        ...state,
        settings: { ...state.settings, onboardStep: state.settings.onboardStep + 1 },
      };

    case 'SET_PROFILE_NAME':
      return {
        ...state,
        settings: { ...state.settings, profileName: action.payload, onboardStep: state.settings.onboardStep + 1 },
      };

    case 'SET_CURRENCY':
      return {
        ...state,
        settings: { ...state.settings, currency: action.payload, onboardStep: 3 },
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    case 'ADD_ACCOUNT':
      return {
        ...state,
        accounts: [...state.accounts, { ...action.payload, id: generateId() }],
      };

    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload } : a
        ),
      };

    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.payload),
      };

    case 'ADD_TRANSACTION': {
      // Remember whether only my share left the account, so edits and deletes reverse exactly that.
      const deductMyShare = state.settings.splitBankDeduction === 'my_share' && !!action.payload.isSplit && action.payload.splitAmount > 0;
      const txn = { ...action.payload, deductMyShare, id: generateId(), createdAt: new Date().toISOString() };
      return {
        ...state,
        transactions: [txn, ...state.transactions],
        accounts: applyBalance(state.accounts, txn, 1),
      };
    }

    case 'UPDATE_TRANSACTION': {
      const old = state.transactions.find((t) => t.id === action.payload.id);
      if (!old) return state;
      const upd = { ...old, ...action.payload, deductMyShare: !!old.deductMyShare };
      return {
        ...state,
        transactions: state.transactions.map((t) => (t.id === upd.id ? upd : t)),
        accounts: applyBalance(applyBalance(state.accounts, old, -1), upd, 1),
      };
    }

    case 'DELETE_TRANSACTION': {
      const txn = state.transactions.find((t) => t.id === action.payload);
      if (!txn) return state;
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload),
        accounts: applyBalance(state.accounts, txn, -1),
      };
    }

    // Expense category CRUD
    case 'ADD_CATEGORY':
      return {
        ...state,
        categories: {
          ...state.categories,
          expense: [...state.categories.expense, { ...action.payload, id: generateId() }],
        },
      };

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: {
          ...state.categories,
          expense: state.categories.expense.map((c) =>
            c.id === action.payload.id ? { ...c, ...action.payload } : c
          ),
        },
      };

    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: {
          ...state.categories,
          expense: state.categories.expense.filter((c) => c.id !== action.payload),
        },
      };

    case 'ADD_SUBCATEGORY': {
      const { categoryId, subcategory } = action.payload;
      return {
        ...state,
        categories: {
          ...state.categories,
          expense: state.categories.expense.map((c) =>
            c.id === categoryId
              ? { ...c, subcategories: [...c.subcategories, { ...subcategory, id: generateId() }] }
              : c
          ),
        },
      };
    }

    case 'UPDATE_SUBCATEGORY': {
      const { categoryId, subcategory } = action.payload;
      return {
        ...state,
        categories: {
          ...state.categories,
          expense: state.categories.expense.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  subcategories: c.subcategories.map((s) =>
                    s.id === subcategory.id ? { ...s, ...subcategory } : s
                  ),
                }
              : c
          ),
        },
      };
    }

    case 'DELETE_SUBCATEGORY': {
      const { categoryId, subcategoryId } = action.payload;
      return {
        ...state,
        categories: {
          ...state.categories,
          expense: state.categories.expense.map((c) =>
            c.id === categoryId
              ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subcategoryId) }
              : c
          ),
        },
      };
    }

    case 'REORDER_SUBCATEGORIES': {
      const { categoryId, fromIndex, toIndex } = action.payload;
      return {
        ...state,
        categories: {
          ...state.categories,
          expense: state.categories.expense.map((c) => {
            if (c.id !== categoryId) return c;
            const subs = [...c.subcategories];
            const [moved] = subs.splice(fromIndex, 1);
            subs.splice(toIndex, 0, moved);
            return { ...c, subcategories: subs };
          }),
        },
      };
    }

    // Income category CRUD
    case 'ADD_INCOME_CATEGORY':
      return {
        ...state,
        categories: {
          ...state.categories,
          income: [...state.categories.income, { ...action.payload, id: generateId() }],
        },
      };

    case 'UPDATE_INCOME_CATEGORY':
      return {
        ...state,
        categories: {
          ...state.categories,
          income: state.categories.income.map((c) =>
            c.id === action.payload.id ? { ...c, ...action.payload } : c
          ),
        },
      };

    case 'DELETE_INCOME_CATEGORY':
      return {
        ...state,
        categories: {
          ...state.categories,
          income: state.categories.income.filter((c) => c.id !== action.payload),
        },
      };

    case 'REORDER_ACCOUNTS': {
      const accs = [...state.accounts];
      const [moved] = accs.splice(action.payload.fromIndex, 1);
      accs.splice(action.payload.toIndex, 0, moved);
      return { ...state, accounts: accs };
    }

    case 'REORDER_EXPENSE_CATEGORIES': {
      const cats = [...state.categories.expense];
      const [moved] = cats.splice(action.payload.fromIndex, 1);
      cats.splice(action.payload.toIndex, 0, moved);
      return { ...state, categories: { ...state.categories, expense: cats } };
    }

    case 'REORDER_INCOME_CATEGORIES': {
      const cats = [...state.categories.income];
      const [moved] = cats.splice(action.payload.fromIndex, 1);
      cats.splice(action.payload.toIndex, 0, moved);
      return { ...state, categories: { ...state.categories, income: cats } };
    }

    case 'LOAD_SAMPLE_DATA': {
      const sample = generateSampleData();
      const existingSampleIds = new Set(state.accounts.map((a) => a.id));
      const newAccounts = sample.accounts.filter((a) => !existingSampleIds.has(a.id));
      const samplePeople = ['Rajesh', 'Priya', 'Amit'];
      const existingPeople = state.settings.splitPeople || [];
      const mergedPeople = [...new Set([...existingPeople, ...samplePeople])];
      return {
        ...state,
        settings: { ...state.settings, splitEnabled: true, plannedEnabled: true, splitPeople: mergedPeople },
        accounts: [...state.accounts, ...newAccounts],
        transactions: [...sample.transactions, ...state.transactions],
        plannedPayments: [...(sample.plannedPayments || []), ...state.plannedPayments],
        splitLedger: [...(sample.splitLedger || []), ...state.splitLedger],
      };
    }

    case 'REMOVE_SAMPLE_DATA': {
      const sampleIdSet = new Set(SAMPLE_ACCOUNT_IDS);
      return {
        ...state,
        accounts: state.accounts.filter((a) => !sampleIdSet.has(a.id)),
        transactions: state.transactions.filter((t) => {
          if (t.accountId && sampleIdSet.has(t.accountId)) return false;
          if (t.fromAccountId && sampleIdSet.has(t.fromAccountId)) return false;
          if (t.toAccountId && sampleIdSet.has(t.toAccountId)) return false;
          return true;
        }),
        plannedPayments: state.plannedPayments.filter((p) => {
          return !p.accountId || !sampleIdSet.has(p.accountId);
        }),
        splitLedger: state.splitLedger.filter((e) => !e.isSample),
      };
    }

    case 'ADD_PLANNED_PAYMENT':
      return {
        ...state,
        plannedPayments: [...state.plannedPayments, { ...action.payload, id: generateId(), createdAt: new Date().toISOString() }],
      };

    case 'UPDATE_PLANNED_PAYMENT':
      return {
        ...state,
        plannedPayments: state.plannedPayments.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload } : p
        ),
      };

    case 'DELETE_PLANNED_PAYMENT':
      return {
        ...state,
        plannedPayments: state.plannedPayments.filter((p) => p.id !== action.payload),
      };

    case 'TOGGLE_PLANNED_PAYMENT':
      return {
        ...state,
        plannedPayments: state.plannedPayments.map((p) =>
          p.id === action.payload ? { ...p, enabled: !p.enabled } : p
        ),
      };

    case 'ADD_SPLIT_ENTRIES': {
      const entries = action.payload.map((e) => ({
        ...e,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }));
      return { ...state, splitLedger: [...entries, ...state.splitLedger] };
    }

    case 'ADD_SPLIT_OWE': {
      const { accountId, ...rest } = action.payload;
      const entry = {
        ...rest,
        id: generateId(),
        type: 'split_owed',
        createdAt: new Date().toISOString(),
      };
      let newOweState = { ...state, splitLedger: [entry, ...state.splitLedger] };
      if (accountId) {
        const txn = {
          id: generateId(),
          type: 'income',
          amount: rest.amount,
          accountId,
          categoryId: 'income_split_settlement',
          note: `Split payment from ${rest.person}`,
          date: rest.date || new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
        };
        newOweState = {
          ...newOweState,
          transactions: [txn, ...newOweState.transactions],
          accounts: newOweState.accounts.map((a) =>
            a.id === accountId ? { ...a, balance: a.balance + rest.amount } : a
          ),
        };
      }
      return newOweState;
    }

    case 'RECORD_SETTLEMENT': {
      const { person, amount, direction, note, accountId } = action.payload;
      const entry = {
        id: generateId(),
        type: 'settlement',
        person,
        amount,
        direction,
        note: note || 'Settlement',
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      };

      let newState = { ...state, splitLedger: [entry, ...state.splitLedger] };

      if (accountId) {
        if (direction === 'received') {
          const txn = {
            id: generateId(),
            type: 'income',
            amount,
            accountId,
            categoryId: 'income_split_settlement',
            note: `Split settlement from ${person}`,
            date: new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString(),
          };
          newState = {
            ...newState,
            transactions: [txn, ...newState.transactions],
            accounts: newState.accounts.map((a) =>
              a.id === accountId ? { ...a, balance: a.balance + amount } : a
            ),
          };
        } else {
          const txn = {
            id: generateId(),
            type: 'expense',
            amount,
            accountId,
            categoryId: 'other',
            subcategoryId: 'other_misc',
            note: `Split settlement to ${person}`,
            date: new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString(),
          };
          newState = {
            ...newState,
            transactions: [txn, ...newState.transactions],
            accounts: newState.accounts.map((a) =>
              a.id === accountId ? { ...a, balance: a.balance - amount } : a
            ),
          };
        }
      }
      return newState;
    }

    case 'UPDATE_SPLIT_ENTRY':
      return {
        ...state,
        splitLedger: state.splitLedger.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      };

    case 'DELETE_SPLIT_ENTRY':
      return {
        ...state,
        splitLedger: state.splitLedger.filter((e) => e.id !== action.payload),
      };

    case 'MARK_PLANNED_PAID': {
      const payment = state.plannedPayments.find((p) => p.id === action.payload);
      if (!payment) return state;
      const lastPaid = new Date().toISOString();
      return {
        ...state,
        plannedPayments: state.plannedPayments.map((p) =>
          p.id === action.payload ? { ...p, lastPaidDate: lastPaid } : p
        ),
      };
    }

    case 'IMPORT_DATA': {
      const d = action.payload;
      return {
        settings: d.settings ? { ...state.settings, ...d.settings, onboardStep: state.settings.onboardStep } : state.settings,
        accounts: d.accounts || state.accounts,
        transactions: d.transactions || state.transactions,
        categories: d.categories || state.categories,
        plannedPayments: d.plannedPayments || state.plannedPayments,
        splitLedger: d.splitLedger || state.splitLedger,
        syncMeta: state.syncMeta,
      };
    }

    case 'MERGE_IMPORT_DATA': {
      const imp = action.payload;
      const existingAccIds = new Set(state.accounts.map((a) => a.id));
      const existingTxnIds = new Set(state.transactions.map((t) => t.id));
      const existingPpIds = new Set(state.plannedPayments.map((p) => p.id));
      const existingSplitIds = new Set(state.splitLedger.map((e) => e.id));

      const newAccounts = (imp.accounts || []).filter((a) => !existingAccIds.has(a.id));
      const impAccMap = {};
      (imp.accounts || []).forEach((a) => { impAccMap[a.id] = a; });
      let mergedAccounts = state.accounts.map((a) => {
        const remote = impAccMap[a.id];
        if (!remote) return a;
        return { ...a, name: remote.name, type: remote.type, subType: remote.subType || a.subType, billingDate: remote.billingDate ?? a.billingDate, dueDate: remote.dueDate ?? a.dueDate, creditLimit: remote.creditLimit ?? a.creditLimit };
      });
      mergedAccounts = [...mergedAccounts, ...newAccounts];

      const newTxns = (imp.transactions || []).filter((t) => !existingTxnIds.has(t.id));

      // Backed-up balances of newly imported accounts already include their transactions.
      const localAccIds = new Set(state.accounts.map((a) => a.id));
      newTxns.forEach((txn) => {
        const local = (id) => (id && localAccIds.has(id) ? id : null);
        mergedAccounts = applyBalance(
          mergedAccounts,
          { ...txn, accountId: local(txn.accountId), fromAccountId: local(txn.fromAccountId), toAccountId: local(txn.toAccountId) },
          1
        );
      });

      const newPp = (imp.plannedPayments || []).filter((p) => !existingPpIds.has(p.id));
      const newSplits = (imp.splitLedger || []).filter((e) => !existingSplitIds.has(e.id));

      let mergedCategories = state.categories;
      if (imp.categories) {
        const localExpIds = new Set((state.categories.expense || []).map((c) => c.id));
        const localIncIds = new Set((state.categories.income || []).map((c) => c.id));
        const newExpCats = (imp.categories.expense || []).filter((c) => !localExpIds.has(c.id));
        const newIncCats = (imp.categories.income || []).filter((c) => !localIncIds.has(c.id));

        const mergedExpense = [...state.categories.expense];
        (imp.categories.expense || []).forEach((remoteCat) => {
          const localIdx = mergedExpense.findIndex((c) => c.id === remoteCat.id);
          if (localIdx >= 0 && remoteCat.subcategories) {
            const localSubIds = new Set((mergedExpense[localIdx].subcategories || []).map((s) => s.id));
            const newSubs = remoteCat.subcategories.filter((s) => !localSubIds.has(s.id));
            if (newSubs.length > 0) {
              mergedExpense[localIdx] = { ...mergedExpense[localIdx], subcategories: [...(mergedExpense[localIdx].subcategories || []), ...newSubs] };
            }
          }
        });

        mergedCategories = {
          expense: [...mergedExpense, ...newExpCats],
          income: [...(state.categories.income || []), ...newIncCats],
        };
      }

      return {
        ...state,
        accounts: mergedAccounts,
        transactions: [...newTxns, ...state.transactions],
        plannedPayments: [...state.plannedPayments, ...newPp],
        splitLedger: [...newSplits, ...state.splitLedger],
        categories: mergedCategories,
      };
    }

    case 'SYNC_APPLY':
      return applySnapshot(state, action.payload);

    case 'RESET_DATA':
      return {
        settings: initialSettings,
        accounts: [],
        transactions: [],
        categories: { expense: DEFAULT_CATEGORIES, income: INCOME_CATEGORIES },
        plannedPayments: [],
        splitLedger: [],
        syncMeta: initialSyncMeta,
      };

    default:
      return state;
  }
}

/** Sync merges and resets carry their own timestamps; every other change is stamped for sync. */
const UNTRACKED = new Set(['SYNC_APPLY', 'RESET_DATA']);

function trackedReducer(state, action) {
  const next = appReducer(state, action);
  if (next === state || UNTRACKED.has(action.type)) return next;
  return trackChanges(state, next);
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(trackedReducer, null, loadInitialState);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SETTINGS, state.settings);
  }, [state.settings]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ACCOUNTS, state.accounts);
  }, [state.accounts]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, state.transactions);
  }, [state.transactions]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CATEGORIES, state.categories);
  }, [state.categories]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PLANNED_PAYMENTS, state.plannedPayments);
  }, [state.plannedPayments]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SPLIT_LEDGER, state.splitLedger);
  }, [state.splitLedger]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SYNC_META, state.syncMeta);
  }, [state.syncMeta]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
