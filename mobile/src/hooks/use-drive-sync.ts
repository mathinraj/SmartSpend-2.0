import { addDatabaseChangeListener, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { flushSync, scheduleSync, syncNow, syncOnResume } from '@/lib/drive-sync';
import { SYNC_TABLES } from '@/lib/sync-format';

const WATCHED = new Set<string>([...SYNC_TABLES, 'settings']);

/** Keeps Google Drive in sync while the app runs. Mount once, inside the SQLite provider. */
export function useDriveSync() {
  const db = useSQLiteContext();

  useEffect(() => {
    void syncNow(db);
    const changes = addDatabaseChangeListener((event) => {
      if (WATCHED.has(event.tableName)) scheduleSync(db);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncOnResume(db);
      else if (state === 'background') flushSync(db);
    });
    return () => {
      changes.remove();
      appState.remove();
    };
  }, [db]);
}
