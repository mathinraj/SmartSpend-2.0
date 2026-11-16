import { addDays, parseDateKey, toDateKey } from '@/lib/format';
import type { PlannedFrequency, PlannedPayment } from '@/types/models';

export const FREQUENCY_OPTIONS: { value: PlannedFrequency; label: string }[] = [
  { value: 'once', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function frequencyLabel(frequency: PlannedFrequency): string {
  return FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label ?? frequency;
}

/** Adds whole months, clamping to the last day so Jan 31 + 1 month is Feb 28/29, not Mar 3. */
function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

/** The due date after `dateKey`, or `null` for one-time payments. */
export function nextDueDate(dateKey: string, frequency: PlannedFrequency): string | null {
  const date = parseDateKey(dateKey);
  switch (frequency) {
    case 'once':
      return null;
    case 'weekly':
      return toDateKey(addDays(date, 7));
    case 'biweekly':
      return toDateKey(addDays(date, 14));
    case 'monthly':
      return toDateKey(addMonths(date, 1));
    case 'quarterly':
      return toDateKey(addMonths(date, 3));
    case 'yearly':
      return toDateKey(addMonths(date, 12));
  }
}

/** Approximate monthly cost, matching the web app's figures. */
export function monthlyEquivalent(payment: Pick<PlannedPayment, 'amount' | 'frequency'>): number {
  switch (payment.frequency) {
    case 'weekly':
      return payment.amount * 4.33;
    case 'biweekly':
      return payment.amount * 2.17;
    case 'monthly':
      return payment.amount;
    case 'quarterly':
      return payment.amount / 3;
    case 'yearly':
      return payment.amount / 12;
    case 'once':
      return 0;
  }
}

/** Whole days from today until `dateKey`; negative when overdue. */
export function daysUntil(dateKey: string, today = new Date()): number {
  const start = parseDateKey(toDateKey(today)).getTime();
  return Math.round((parseDateKey(dateKey).getTime() - start) / 86_400_000);
}

export function dueLabel(dateKey: string): string {
  const days = daysUntil(dateKey);
  if (days < -1) return `${-days} days overdue`;
  if (days === -1) return '1 day overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}
