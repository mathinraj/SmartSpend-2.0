import { getCurrency } from '@/constants/currencies';

export function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = getCurrency(currencyCode)?.symbol ?? '';
  const formatted = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}${symbol}${formatted}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** `YYYY-MM-DD` in the device's local time zone. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a `YYYY-MM-DD` key as local midnight. `new Date(key)` would parse it as UTC. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Inclusive start and exclusive end date keys for the month containing `date`. */
export function monthRange(date: Date): { from: string; to: string } {
  return {
    from: toDateKey(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 1)),
  };
}

export function formatMonth(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function formatDayLabel(key: string): string {
  const today = toDateKey(new Date());
  if (key === today) return 'Today';
  if (key === toDateKey(addDays(new Date(), -1))) return 'Yesterday';
  return parseDateKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: key.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric',
  });
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
