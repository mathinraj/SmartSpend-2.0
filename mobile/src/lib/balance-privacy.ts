import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { formatCurrency } from '@/lib/format';

const PEEK_MS = 60_000;
export const MASKED_AMOUNT = '••••••';

/** A peek is shared by every screen and ends after a minute or when the app leaves the foreground. */
let peeking = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function setPeeking(next: boolean) {
  clearTimeout(timer);
  if (next) timer = setTimeout(() => setPeeking(false), PEEK_MS);
  if (peeking === next) return;
  peeking = next;
  listeners.forEach((l) => l());
}

AppState.addEventListener('change', (state) => {
  if (state !== 'active') setPeeking(false);
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** For screens that show account balances. Pass `settings.hideBalances`. */
export function useBalancePrivacy(hideBalances: boolean | undefined) {
  const isPeeking = useSyncExternalStore(subscribe, () => peeking);
  const hidden = hideBalances === true && !isPeeking;
  return {
    /** Whether the hide setting is on, so the screen should offer a peek button. */
    canPeek: hideBalances === true,
    hidden,
    togglePeek: () => setPeeking(!peeking),
    formatBalance: (value: number, currency: string) => (hidden ? MASKED_AMOUNT : formatCurrency(value, currency)),
  };
}
