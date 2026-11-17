import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

import { addDays, formatCurrency, fromDateTimeKeys } from '@/lib/format';
import type { PlannedPaymentListItem, Settings } from '@/types/models';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'reminders';
const DAILY_ID = 'daily-reminder';
const BACKUP_ID = 'backup-reminder';
const DUE_PREFIX = 'due-';
const BACKUP_INTERVAL_DAYS = 7;
const BACKUP_ALERT_TIME = '10:00';
/** Android caps pending alarms per app; only the soonest payments get one. */
const MAX_DUE_ALERTS = 20;
const DUE_ALERT_TIME = '09:00';

async function ensureChannel() {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: AndroidImportance.DEFAULT,
  });
}

/** Asks for notification permission if needed. The channel must exist first on Android 13+. */
export async function ensureNotificationPermission(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * The next weekly backup reminder: every 7 days from the last backup (or from when the reminder started),
 * skipping dates already past, so it repeats weekly until a backup is made.
 */
export function nextBackupReminder(settings: Settings, now = new Date()): Date | null {
  const base = settings.lastBackupAt ?? settings.backupClockStart;
  if (!settings.backupReminder || !base) return null;
  let at = addDays(fromDateTimeKeys(base, BACKUP_ALERT_TIME), BACKUP_INTERVAL_DAYS);
  while (at.getTime() <= now.getTime()) at = addDays(at, BACKUP_INTERVAL_DAYS);
  return at;
}

/**
 * Replaces every reminder this app scheduled with ones matching current settings and payments.
 * `hasData` is false while there are no accounts, so a fresh install isn't asked to back up nothing.
 * Safe to call often.
 */
export async function syncReminders(settings: Settings, planned: PlannedPaymentListItem[], hasData: boolean) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier === DAILY_ID || n.identifier === BACKUP_ID || n.identifier.startsWith(DUE_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const backupAt = hasData ? nextBackupReminder(settings) : null;
  if (!settings.dailyReminder && !settings.dueReminders && !backupAt) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await ensureChannel();

  if (settings.dailyReminder) {
    const [hour, minute] = settings.dailyReminderTime.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: { title: 'SpendTrak', body: "Don't forget to log today's expenses." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID },
    });
  }

  if (backupAt) {
    await Notifications.scheduleNotificationAsync({
      identifier: BACKUP_ID,
      content: {
        title: 'Time to back up SpendTrak',
        body: settings.lastBackupAt
          ? "It's been a week since your last backup. Export one so your data is safe if you lose this phone."
          : 'Your data lives only on this phone. Export a backup so you can restore it if you lose the phone.',
        data: { url: '/settings' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: backupAt, channelId: CHANNEL_ID },
    });
  }

  if (settings.dueReminders) {
    const now = Date.now();
    const upcoming = planned
      .filter((p) => p.enabled)
      .map((p) => ({ payment: p, at: fromDateTimeKeys(p.nextDate, DUE_ALERT_TIME) }))
      .filter(({ at }) => at.getTime() > now)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .slice(0, MAX_DUE_ALERTS);

    for (const { payment, at } of upcoming) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${DUE_PREFIX}${payment.id}`,
        content: {
          title: `${payment.name} is due today`,
          body: `${formatCurrency(payment.amount, settings.currency)} · Tap to mark it paid.`,
          data: { url: '/planned' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
      });
    }
  }
}
