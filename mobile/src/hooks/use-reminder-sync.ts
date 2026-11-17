import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';

import { listAccounts } from '@/db/accounts';
import { listPlanned } from '@/db/planned';
import { updateSettings } from '@/db/settings';
import { useDbQuery } from '@/hooks/use-db-query';
import { toDateKey } from '@/lib/format';
import { syncReminders } from '@/lib/notifications';
import type { Settings } from '@/types/models';

const TAP_ROUTES = { '/planned': '/planned', '/settings': '/settings' } as const;

/** Keeps scheduled notifications in line with settings and planned payments, and handles taps on them. */
export function useReminderSync(settings: Settings) {
  const db = useSQLiteContext();
  const planned = useDbQuery(listPlanned, ['planned_payments']);
  const accounts = useDbQuery(listAccounts, ['accounts']);
  const hasData = (accounts?.length ?? 0) > 0;

  // The backup reminder counts from the first time the app has data, until the first backup.
  useEffect(() => {
    if (hasData && settings.onboarded && !settings.lastBackupAt && !settings.backupClockStart) {
      updateSettings(db, { backupClockStart: toDateKey(new Date()) });
    }
  }, [db, hasData, settings.onboarded, settings.lastBackupAt, settings.backupClockStart]);

  useEffect(() => {
    if (!planned || !accounts) return;
    syncReminders(settings, planned, hasData).catch((error) => console.warn('Could not schedule reminders', error));
  }, [settings, planned, accounts, hasData]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url in TAP_ROUTES) router.push(TAP_ROUTES[url as keyof typeof TAP_ROUTES]);
    });
    return () => subscription.remove();
  }, []);
}
