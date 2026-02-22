const STORAGE_KEYS = {
  SETTINGS: 'smartspend_settings',
  ACCOUNTS: 'smartspend_accounts',
  TRANSACTIONS: 'smartspend_transactions',
  CATEGORIES: 'smartspend_categories',
};

export function loadFromStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function clearStorage() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

export { STORAGE_KEYS };
