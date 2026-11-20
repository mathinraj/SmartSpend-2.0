import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { configureSmsAlerts, hasSmsPermission, scanSmsInbox, smsImportAvailable } from '@/lib/sms/scan';
import type { Settings } from '@/types/models';

/** Reads new bank messages on launch and on returning to the app, while SMS import is on. Mount once. */
export function useSmsImport(settings: Settings) {
  const db = useSQLiteContext();
  const enabled = smsImportAvailable && settings.smsImportEnabled;

  useEffect(() => {
    if (!smsImportAvailable) return;
    configureSmsAlerts(enabled && hasSmsPermission(), settings.smsNotify);
  }, [enabled, settings.smsNotify]);

  useEffect(() => {
    if (!enabled) return;
    void scanSmsInbox(db);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void scanSmsInbox(db);
    });
    return () => subscription.remove();
  }, [db, enabled]);
}
