import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, type CategorySeed } from '@/constants/categories';

/**
 * Append-only list. Migration N moves the database from `user_version` N to N + 1.
 * Never edit a migration that has shipped; add a new one instead.
 */
const MIGRATIONS: ((db: SQLiteDatabase) => Promise<void>)[] = [
  async (db) => {
    await db.execAsync(`
      CREATE TABLE settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE accounts (
        id           TEXT PRIMARY KEY NOT NULL,
        name         TEXT NOT NULL,
        type         TEXT NOT NULL,
        sub_type     TEXT,
        balance      REAL NOT NULL DEFAULT 0,
        icon         TEXT,
        color        TEXT,
        credit_limit REAL,
        billing_day  INTEGER,
        due_day      INTEGER,
        sort_order   INTEGER NOT NULL DEFAULT 0,
        created_at   TEXT NOT NULL
      );

      CREATE TABLE categories (
        id         TEXT PRIMARY KEY NOT NULL,
        kind       TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
        name       TEXT NOT NULL,
        icon       TEXT NOT NULL,
        color      TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE subcategories (
        id          TEXT PRIMARY KEY NOT NULL,
        category_id TEXT NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        sort_order  INTEGER NOT NULL DEFAULT 0
      );

      -- No foreign keys to accounts/categories: history must survive deleting them,
      -- and imported backups may reference rows that no longer exist.
      CREATE TABLE transactions (
        id              TEXT PRIMARY KEY NOT NULL,
        type            TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
        amount          REAL NOT NULL CHECK (amount > 0),
        account_id      TEXT,
        from_account_id TEXT,
        to_account_id   TEXT,
        category_id     TEXT,
        subcategory_id  TEXT,
        note            TEXT,
        date            TEXT NOT NULL,
        time            TEXT,
        is_split        INTEGER NOT NULL DEFAULT 0,
        split_amount    REAL,
        source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'sms', 'import')),
        source_ref      TEXT,
        created_at      TEXT NOT NULL
      );

      CREATE INDEX idx_transactions_date ON transactions (date DESC, time DESC);
      CREATE INDEX idx_transactions_account ON transactions (account_id);
      CREATE UNIQUE INDEX idx_transactions_source_ref
        ON transactions (source, source_ref) WHERE source_ref IS NOT NULL;
    `);

    await seedCategories(db, 'expense', DEFAULT_EXPENSE_CATEGORIES);
    await seedCategories(db, 'income', DEFAULT_INCOME_CATEGORIES);
  },

  async (db) => {
    await db.execAsync(`
      CREATE TABLE planned_payments (
        id             TEXT PRIMARY KEY NOT NULL,
        name           TEXT NOT NULL,
        amount         REAL NOT NULL CHECK (amount > 0),
        account_id     TEXT,
        category_id    TEXT,
        frequency      TEXT NOT NULL
                         CHECK (frequency IN ('once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
        next_date      TEXT NOT NULL,
        note           TEXT,
        enabled        INTEGER NOT NULL DEFAULT 1,
        last_paid_date TEXT,
        created_at     TEXT NOT NULL
      );

      CREATE INDEX idx_planned_next ON planned_payments (enabled, next_date);

      CREATE TABLE split_entries (
        id             TEXT PRIMARY KEY NOT NULL,
        type           TEXT NOT NULL CHECK (type IN ('split_paid', 'split_owed', 'settlement')),
        person         TEXT NOT NULL,
        amount         REAL NOT NULL CHECK (amount > 0),
        direction      TEXT CHECK (direction IN ('received', 'paid')),
        note           TEXT,
        date           TEXT NOT NULL,
        transaction_id TEXT,
        created_at     TEXT NOT NULL
      );

      CREATE INDEX idx_split_person ON split_entries (person, date DESC);
      CREATE INDEX idx_split_transaction ON split_entries (transaction_id);
    `);
  },
];

async function seedCategories(db: SQLiteDatabase, kind: 'expense' | 'income', seeds: CategorySeed[]) {
  for (const [i, cat] of seeds.entries()) {
    await db.runAsync(
      'INSERT INTO categories (id, kind, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      cat.id,
      kind,
      cat.name,
      cat.icon,
      cat.color,
      i
    );
    for (const [j, sub] of (cat.subcategories ?? []).entries()) {
      await db.runAsync(
        'INSERT INTO subcategories (id, category_id, name, sort_order) VALUES (?, ?, ?, ?)',
        sub.id,
        cat.id,
        sub.name,
        j
      );
    }
  }
}

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version++) {
    const migrate = MIGRATIONS[version];
    await db.withTransactionAsync(async () => {
      await migrate(db);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
