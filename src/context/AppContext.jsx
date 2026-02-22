import { createContext, useContext, useReducer, useEffect } from 'react';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';
import { DEFAULT_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories';
import { generateId } from '../utils/helpers';
import { generateSampleData, SAMPLE_ACCOUNT_IDS } from '../utils/sampleData';

const AppContext = createContext(null);

const initialSettings = {
  currency: null,
  onboardStep: 0, // 0=welcome, 1=currency, 2=done
};

function loadInitialState() {
  const settings = loadFromStorage(STORAGE_KEYS.SETTINGS) || initialSettings;
  const accounts = loadFromStorage(STORAGE_KEYS.ACCOUNTS) || [];
  const transactions = loadFromStorage(STORAGE_KEYS.TRANSACTIONS) || [];
  const categories = loadFromStorage(STORAGE_KEYS.CATEGORIES) || {
    expense: DEFAULT_CATEGORIES,
    income: INCOME_CATEGORIES,
  };

  return { settings, accounts, transactions, categories };
}

function appReducer(state, action) {
  switch (action.type) {
    case 'NEXT_ONBOARD_STEP':
      return {
        ...state,
        settings: { ...state.settings, onboardStep: state.settings.onboardStep + 1 },
      };

    case 'SET_CURRENCY':
      return {
        ...state,
        settings: { ...state.settings, currency: action.payload, onboardStep: 2 },
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
      const txn = { ...action.payload, id: generateId(), createdAt: new Date().toISOString() };
      let updatedAccounts = [...state.accounts];

      if (txn.type === 'income') {
        updatedAccounts = updatedAccounts.map((a) =>
          a.id === txn.accountId ? { ...a, balance: a.balance + txn.amount } : a
        );
      } else if (txn.type === 'expense') {
        updatedAccounts = updatedAccounts.map((a) =>
          a.id === txn.accountId ? { ...a, balance: a.balance - txn.amount } : a
        );
      } else if (txn.type === 'transfer') {
        updatedAccounts = updatedAccounts.map((a) => {
          if (a.id === txn.fromAccountId) return { ...a, balance: a.balance - txn.amount };
          if (a.id === txn.toAccountId) return { ...a, balance: a.balance + txn.amount };
          return a;
        });
      }

      return {
        ...state,
        transactions: [txn, ...state.transactions],
        accounts: updatedAccounts,
      };
    }

    case 'UPDATE_TRANSACTION': {
      const old = state.transactions.find((t) => t.id === action.payload.id);
      if (!old) return state;
      const upd = action.payload;
      let accs = [...state.accounts];

      // Reverse old transaction effect
      if (old.type === 'income') {
        accs = accs.map((a) => a.id === old.accountId ? { ...a, balance: a.balance - old.amount } : a);
      } else if (old.type === 'expense') {
        accs = accs.map((a) => a.id === old.accountId ? { ...a, balance: a.balance + old.amount } : a);
      } else if (old.type === 'transfer') {
        accs = accs.map((a) => {
          if (a.id === old.fromAccountId) return { ...a, balance: a.balance + old.amount };
          if (a.id === old.toAccountId) return { ...a, balance: a.balance - old.amount };
          return a;
        });
      }

      // Apply new transaction effect
      if (upd.type === 'income') {
        accs = accs.map((a) => a.id === upd.accountId ? { ...a, balance: a.balance + upd.amount } : a);
      } else if (upd.type === 'expense') {
        accs = accs.map((a) => a.id === upd.accountId ? { ...a, balance: a.balance - upd.amount } : a);
      } else if (upd.type === 'transfer') {
        accs = accs.map((a) => {
          if (a.id === upd.fromAccountId) return { ...a, balance: a.balance - upd.amount };
          if (a.id === upd.toAccountId) return { ...a, balance: a.balance + upd.amount };
          return a;
        });
      }

      return {
        ...state,
        transactions: state.transactions.map((t) => t.id === upd.id ? { ...t, ...upd } : t),
        accounts: accs,
      };
    }

    case 'DELETE_TRANSACTION': {
      const txn = state.transactions.find((t) => t.id === action.payload);
      if (!txn) return state;

      let updatedAccounts = [...state.accounts];
      if (txn.type === 'income') {
        updatedAccounts = updatedAccounts.map((a) =>
          a.id === txn.accountId ? { ...a, balance: a.balance - txn.amount } : a
        );
      } else if (txn.type === 'expense') {
        updatedAccounts = updatedAccounts.map((a) =>
          a.id === txn.accountId ? { ...a, balance: a.balance + txn.amount } : a
        );
      } else if (txn.type === 'transfer') {
        updatedAccounts = updatedAccounts.map((a) => {
          if (a.id === txn.fromAccountId) return { ...a, balance: a.balance + txn.amount };
          if (a.id === txn.toAccountId) return { ...a, balance: a.balance - txn.amount };
          return a;
        });
      }

      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload),
        accounts: updatedAccounts,
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

    case 'LOAD_SAMPLE_DATA': {
      const sample = generateSampleData();
      const existingSampleIds = new Set(state.accounts.map((a) => a.id));
      const newAccounts = sample.accounts.filter((a) => !existingSampleIds.has(a.id));
      return {
        ...state,
        accounts: [...state.accounts, ...newAccounts],
        transactions: [...sample.transactions, ...state.transactions],
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
      };
    }

    case 'RESET_DATA':
      return {
        settings: initialSettings,
        accounts: [],
        transactions: [],
        categories: { expense: DEFAULT_CATEGORIES, income: INCOME_CATEGORIES },
      };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, loadInitialState);

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
