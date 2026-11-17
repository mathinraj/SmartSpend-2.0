import { useSyncExternalStore } from 'react';

import type { TransactionFilter } from '@/db/transactions';
import { addDays, parseDateKey, toDateKey } from '@/lib/format';

/** Advanced History filters, kept in memory so they survive navigating away and back. */
export interface HistoryFilters {
  categoryIds: string[];
  accountIds: string[];
  /** Inclusive `YYYY-MM-DD`. */
  from: string | null;
  /** Inclusive `YYYY-MM-DD`. */
  to: string | null;
  minAmount: number | null;
  maxAmount: number | null;
}

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  categoryIds: [],
  accountIds: [],
  from: null,
  to: null,
  minAmount: null,
  maxAmount: null,
};

let current = EMPTY_HISTORY_FILTERS;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHistoryFilters(): HistoryFilters {
  return useSyncExternalStore(subscribe, () => current);
}

export function setHistoryFilters(next: HistoryFilters) {
  current = next;
  listeners.forEach((listener) => listener());
}

export function activeFilterCount(f: HistoryFilters): number {
  return [
    f.categoryIds.length > 0,
    f.accountIds.length > 0,
    f.from !== null || f.to !== null,
    f.minAmount !== null || f.maxAmount !== null,
  ].filter(Boolean).length;
}

export function toTransactionFilter(f: HistoryFilters): TransactionFilter {
  return {
    categoryIds: f.categoryIds,
    accountIds: f.accountIds,
    from: f.from ?? undefined,
    to: f.to ? toDateKey(addDays(parseDateKey(f.to), 1)) : undefined,
    minAmount: f.minAmount ?? undefined,
    maxAmount: f.maxAmount ?? undefined,
  };
}
