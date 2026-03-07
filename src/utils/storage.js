const STORAGE_KEYS = {
  SETTINGS: 'spendtraq_settings',
  ACCOUNTS: 'spendtraq_accounts',
  TRANSACTIONS: 'spendtraq_transactions',
  CATEGORIES: 'spendtraq_categories',
  PLANNED_PAYMENTS: 'spendtraq_planned_payments',
  SPLIT_LEDGER: 'spendtraq_split_ledger',
};

const isBrowser = typeof window !== 'undefined';

export function loadFromStorage(key) {
  if (!isBrowser) return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveToStorage(key, data) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function clearStorage() {
  if (!isBrowser) return;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

export { STORAGE_KEYS };
