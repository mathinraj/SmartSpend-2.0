// TouchLock: the developer's browser extension that locks the whole browser (or chosen sites)
// with Touch ID, Windows Hello, or a PIN.

export const TOUCHLOCK_URL = 'https://touchlock.vercel.app';

const STORES = {
  chrome: { name: 'Chrome', icon: 'fa-chrome', url: 'https://chromewebstore.google.com/detail/jajgeiifpgdfnphjklcogipefkfdacdl' },
  edge: { name: 'Edge', icon: 'fa-edge', url: 'https://microsoftedge.microsoft.com/addons/detail/aibbojojoeamjgikgailflpbhdpcjgln' },
  firefox: { name: 'Firefox', icon: 'fa-firefox-browser', url: 'https://addons.mozilla.org/en-US/firefox/addon/touchlock-fingerprint-lock/' },
};

/** The add-on store for the current desktop browser, or null where TouchLock can't be installed (e.g. Safari, mobile). */
export function getTouchLockStore() {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return null;
  if (/Edg\//.test(ua)) return STORES.edge;
  if (/Firefox\//.test(ua)) return STORES.firefox;
  if (/Chrome\//.test(ua)) return STORES.chrome;
  return null;
}
