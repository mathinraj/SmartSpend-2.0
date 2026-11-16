import { addDatabaseChangeListener, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useEffectEvent, useState } from 'react';

import type { Table } from '@/db';

/**
 * Runs `query(db, ...args)` and re-runs it whenever a row in one of the `watch` tables changes,
 * so screens stay in sync with writes made anywhere in the app. Returns `undefined` until the
 * first result arrives. `args` must be JSON-serializable.
 *
 * @example const accounts = useDbQuery(listAccounts, ['accounts']);
 * @example const recent = useDbQuery(listTransactions, ['transactions', 'accounts'], { limit: 5 });
 */
export function useDbQuery<T, A extends unknown[]>(
  query: (db: SQLiteDatabase, ...args: A) => Promise<T>,
  watch: readonly Table[],
  ...args: A
): T | undefined {
  const db = useSQLiteContext();
  const [data, setData] = useState<T>();
  const run = useEffectEvent(() => query(db, ...args));
  const watchKey = watch.join(',');
  const argsKey = JSON.stringify(args);

  useEffect(() => {
    let active = true;
    let latest = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = () => {
      const requestId = ++latest;
      run().then(
        (result) => {
          if (active && requestId === latest) setData(result);
        },
        (error) => console.error('useDbQuery failed', error)
      );
    };

    load();
    const tables = new Set(watchKey.split(','));
    const subscription = addDatabaseChangeListener((event) => {
      if (!tables.has(event.tableName)) return;
      // A single write can touch many rows; coalesce the burst into one reload.
      clearTimeout(timer);
      timer = setTimeout(load, 16);
    });

    return () => {
      active = false;
      clearTimeout(timer);
      subscription.remove();
    };
  }, [db, watchKey, argsKey]);

  return data;
}
