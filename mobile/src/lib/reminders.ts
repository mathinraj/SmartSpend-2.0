import { formatTime } from '@/lib/format';
import type { CustomReminder, Settings } from '@/types/models';

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const INTERVAL_OPTIONS = [15, 30, 60, 120, 180, 240];
/** Interval reminders are scheduled ahead for this long; the next app launch schedules more. */
export const INTERVAL_WINDOW_HOURS = 24;
/** Android caps pending alarms per app, so each interval reminder gets at most this many at a time. */
export const MAX_INTERVAL_ALERTS = 24;

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Whether `HH:mm` falls in the Do Not Disturb window, which may wrap past midnight. */
export function inQuietHours(time: string, settings: Pick<Settings, 'dndEnabled' | 'dndStart' | 'dndEnd'>): boolean {
  if (!settings.dndEnabled) return false;
  const t = minutesOf(time);
  const start = minutesOf(settings.dndStart);
  const end = minutesOf(settings.dndEnd);
  return start <= end ? t >= start && t < end : t >= start || t < end;
}

export function intervalLabel(minutes: number): string {
  return minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}` : `${minutes} min`;
}

export function describeReminder(r: CustomReminder): string {
  switch (r.frequency) {
    case 'daily':
      return `Daily at ${formatTime(r.time)}`;
    case 'weekly':
      return `${WEEKDAY_NAMES[r.day] ?? 'Sunday'}s at ${formatTime(r.time)}`;
    case 'interval':
      return `Every ${intervalLabel(r.intervalMinutes)}`;
  }
}

/** Next fire times for an interval reminder, skipping quiet hours. */
export function intervalTimes(r: CustomReminder, settings: Settings, now = new Date()): Date[] {
  const step = Math.max(15, r.intervalMinutes) * 60_000;
  const end = now.getTime() + INTERVAL_WINDOW_HOURS * 3_600_000;
  const times: Date[] = [];
  for (let t = now.getTime() + step; t <= end && times.length < MAX_INTERVAL_ALERTS; t += step) {
    const at = new Date(t);
    const key = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
    if (!inQuietHours(key, settings)) times.push(at);
  }
  return times;
}
