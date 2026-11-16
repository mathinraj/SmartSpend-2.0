import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

import { formatCurrency, fromDateTimeKeys } from '@/lib/format';
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
const DUE_PREFIX = 'due-';
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
 * Replaces every reminder this app scheduled with ones matching current settings and payments.
 * Safe to call often.
 */
export async function syncReminders(settings: Settings, planned: PlannedPaymentListItem[]) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier === DAILY_ID || n.identifier.startsWith(DUE_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  if (!settings.dailyReminder && !settings.dueReminders) return;
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
