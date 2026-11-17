import { addDays, formatMonth, formatShortDate, monthRange, parseDateKey, shiftMonth, toDateKey, toMonthKey } from '@/lib/format';
import type { SplitAmountMode } from '@/types/models';

/** What every Analytics section is showing. */
export interface AnalyticsScope {
  /** Inclusive `YYYY-MM-DD`. */
  from: string;
  /** Exclusive `YYYY-MM-DD`. */
  to: string;
  label: string;
  record: SplitAmountMode;
  /** Empty means all accounts. */
  accountIds: string[];
  currency: string;
}

/** The Analytics date range. Custom `from`/`to` are inclusive `YYYY-MM-DD` keys. */
export type AnalyticsPeriod =
  | { kind: 'month'; month: string }
  | { kind: 'this_year' }
  | { kind: 'last_30' }
  | { kind: 'last_90' }
  | { kind: 'custom'; from: string; to: string };

export type PeriodPreset = 'this_month' | 'last_month' | 'this_year' | 'last_30' | 'last_90' | 'custom';

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'this_year', label: 'This year' },
  { id: 'last_30', label: '30 days' },
  { id: 'last_90', label: '90 days' },
  { id: 'custom', label: 'Custom' },
];

/** Inclusive `from`, exclusive `to`, as the db totals functions expect. */
export function periodRange(period: AnalyticsPeriod, today = new Date()): { from: string; to: string } {
  const tomorrow = toDateKey(addDays(today, 1));
  switch (period.kind) {
    case 'month':
      return monthRange(parseDateKey(`${period.month}-01`));
    case 'this_year':
      return { from: `${today.getFullYear()}-01-01`, to: `${today.getFullYear() + 1}-01-01` };
    case 'last_30':
      return { from: toDateKey(addDays(today, -29)), to: tomorrow };
    case 'last_90':
      return { from: toDateKey(addDays(today, -89)), to: tomorrow };
    case 'custom':
      return { from: period.from, to: toDateKey(addDays(parseDateKey(period.to), 1)) };
  }
}

export function periodLabel(period: AnalyticsPeriod, today = new Date()): string {
  switch (period.kind) {
    case 'month':
      return formatMonth(parseDateKey(`${period.month}-01`));
    case 'this_year':
      return String(today.getFullYear());
    case 'last_30':
      return 'Last 30 days';
    case 'last_90':
      return 'Last 90 days';
    case 'custom':
      return period.from === period.to
        ? formatShortDate(period.from)
        : `${formatShortDate(period.from)} – ${formatShortDate(period.to)}`;
  }
}

export function presetOf(period: AnalyticsPeriod, today = new Date()): PeriodPreset | null {
  if (period.kind !== 'month') return period.kind;
  if (period.month === toMonthKey(today)) return 'this_month';
  if (period.month === toMonthKey(shiftMonth(today, -1))) return 'last_month';
  return null;
}

/** `current` seeds the custom range so switching to Custom starts from what is on screen. */
export function periodForPreset(preset: PeriodPreset, current: AnalyticsPeriod, today = new Date()): AnalyticsPeriod {
  switch (preset) {
    case 'this_month':
      return { kind: 'month', month: toMonthKey(today) };
    case 'last_month':
      return { kind: 'month', month: toMonthKey(shiftMonth(today, -1)) };
    case 'custom': {
      if (current.kind === 'custom') return current;
      const { from, to } = periodRange(current, today);
      const lastDay = toDateKey(addDays(parseDateKey(to), -1));
      const todayKey = toDateKey(today);
      return { kind: 'custom', from, to: lastDay > todayKey ? todayKey : lastDay };
    }
    default:
      return { kind: preset };
  }
}
