/// <reference types="node" />
/** Test-only: the parts of expo-sqlite's async API the app uses, on top of Node's built-in SQLite. */
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from '@/db/migrations';

export function openTestDb(): SQLiteDatabase {
  const raw = new DatabaseSync(':memory:');
  const bind = (params: unknown[]): SQLInputValue[] => {
    const values = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return values.map((v) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : (v as SQLInputValue)));
  };
  const transaction = async (task: () => Promise<void>) => {
    raw.exec('BEGIN');
    try {
      await task();
      raw.exec('COMMIT');
    } catch (error) {
      raw.exec('ROLLBACK');
      throw error;
    }
  };
  const db = {
    execAsync: async (sql: string) => raw.exec(sql),
    runAsync: async (sql: string, ...params: unknown[]) => {
      const result = raw.prepare(sql).run(...bind(params));
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    getAllAsync: async (sql: string, ...params: unknown[]) => raw.prepare(sql).all(...bind(params)),
    getFirstAsync: async (sql: string, ...params: unknown[]) => raw.prepare(sql).get(...bind(params)) ?? null,
    withTransactionAsync: transaction,
    withExclusiveTransactionAsync: (task: (txn: unknown) => Promise<void>) => transaction(() => task(db)),
  };
  return db as unknown as SQLiteDatabase;
}

/** A fresh in-memory database with every migration applied. */
export async function migratedTestDb(): Promise<SQLiteDatabase> {
  const db = openTestDb();
  await migrateDbIfNeeded(db);
  return db;
}
