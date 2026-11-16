import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { listPlanned } from '@/db/planned';
import { useDbQuery } from '@/hooks/use-db-query';
import { syncReminders } from '@/lib/notifications';
import type { Settings } from '@/types/models';

/** Keeps scheduled notifications in line with settings and planned payments, and handles taps on them. */
export function useReminderSync(settings: Settings) {
  const planned = useDbQuery(listPlanned, ['planned_payments']);

  useEffect(() => {
    if (!planned) return;
    syncReminders(settings, planned).catch((error) => console.warn('Could not schedule reminders', error));
  }, [settings, planned]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (url === '/planned') router.push('/planned');
    });
    return () => subscription.remove();
  }, []);
}
