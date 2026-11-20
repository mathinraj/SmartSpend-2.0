import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, type CategorySeed } from '@/constants/categories';
import { EPOCH } from '@/lib/sync-format';

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

  async (db) => {
    await db.execAsync('ALTER TABLE transactions ADD COLUMN deduct_my_share INTEGER NOT NULL DEFAULT 0;');
  },

  async (db) => {
    await db.execAsync('ALTER TABLE accounts ADD COLUMN custom_type_id TEXT;');
  },

  async (db) => {
    await db.execAsync(`
      ALTER TABLE transactions ADD COLUMN payment_app TEXT;
      ALTER TABLE accounts ADD COLUMN logo_url TEXT;
    `);
  },

  // Change tracking for Google Drive sync: rows get `updated_at` when their content changes, and
  // deletions leave a row in `deleted_records`. Rows from before this migration keep NULL (oldest).
  async (db) => {
    const now = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
    // Columns whose change counts as an edit. An account's balance is left out: transactions move it,
    // and sync recomputes it from transactions; `updateAccount` stamps manual corrections itself.
    const tracked: Record<string, string[]> = {
      accounts: ['name', 'type', 'sub_type', 'icon', 'color', 'credit_limit', 'billing_day', 'due_day', 'custom_type_id', 'logo_url', 'sort_order'],
      categories: ['kind', 'name', 'icon', 'color', 'sort_order'],
      subcategories: ['category_id', 'name', 'sort_order'],
      transactions: [
        'type', 'amount', 'account_id', 'from_account_id', 'to_account_id', 'category_id', 'subcategory_id', 'note',
        'date', 'time', 'is_split', 'split_amount', 'deduct_my_share', 'source', 'source_ref', 'payment_app',
      ],
      planned_payments: ['name', 'amount', 'account_id', 'category_id', 'frequency', 'next_date', 'note', 'enabled', 'last_paid_date'],
      split_entries: ['type', 'person', 'amount', 'direction', 'note', 'date', 'transaction_id'],
    };
    let sql = `
      CREATE TABLE deleted_records (
        tbl        TEXT NOT NULL,
        id         TEXT NOT NULL,
        deleted_at TEXT NOT NULL,
        PRIMARY KEY (tbl, id)
      );
      CREATE TABLE sync_state (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      ALTER TABLE settings ADD COLUMN updated_at TEXT;
      CREATE TRIGGER settings_stamp_insert AFTER INSERT ON settings WHEN NEW.updated_at IS NULL
        BEGIN UPDATE settings SET updated_at = ${now} WHERE key = NEW.key; END;
      CREATE TRIGGER settings_stamp_update AFTER UPDATE ON settings
        WHEN NEW.updated_at IS OLD.updated_at AND NEW.value IS NOT OLD.value
        BEGIN UPDATE settings SET updated_at = ${now} WHERE key = NEW.key; END;
    `;
    for (const [table, columns] of Object.entries(tracked)) {
      const changed = columns.map((c) => `NEW.${c} IS NOT OLD.${c}`).join(' OR ');
      sql += `
        ALTER TABLE ${table} ADD COLUMN updated_at TEXT;
        CREATE TRIGGER ${table}_stamp_insert AFTER INSERT ON ${table} WHEN NEW.updated_at IS NULL
          BEGIN UPDATE ${table} SET updated_at = ${now} WHERE id = NEW.id; END;
        CREATE TRIGGER ${table}_stamp_update AFTER UPDATE ON ${table}
          WHEN NEW.updated_at IS OLD.updated_at AND (${changed})
          BEGIN UPDATE ${table} SET updated_at = ${now} WHERE id = NEW.id; END;
        CREATE TRIGGER ${table}_revive AFTER INSERT ON ${table}
          BEGIN DELETE FROM deleted_records WHERE tbl = '${table}' AND id = NEW.id; END;
        CREATE TRIGGER ${table}_tombstone AFTER DELETE ON ${table}
          BEGIN INSERT OR REPLACE INTO deleted_records (tbl, id, deleted_at) VALUES ('${table}', OLD.id, ${now}); END;
      `;
    }
    await db.execAsync(sql);
  },

  // SMS import (device-only: no change tracking, not in backups or Drive sync).
  async (db) => {
    await db.execAsync(`
      CREATE TABLE sms_messages (
        id             TEXT PRIMARY KEY NOT NULL,
        sms_id         INTEGER,
        msg_key        TEXT NOT NULL UNIQUE,
        sender         TEXT NOT NULL,
        sender_code    TEXT,
        received_at    INTEGER NOT NULL,
        body           TEXT,
        result         TEXT NOT NULL CHECK (result IN ('parsed', 'ignored', 'unparsed')),
        reason         TEXT,
        parsed         TEXT,
        confidence     REAL,
        parser_version INTEGER NOT NULL,
        status         TEXT NOT NULL,
        duplicate_of   TEXT,
        dup_score      REAL,
        transaction_id TEXT,
        created_at     TEXT NOT NULL,
        updated_at     TEXT NOT NULL
      );
      CREATE INDEX idx_sms_status ON sms_messages (status, received_at DESC);
      CREATE INDEX idx_sms_sms_id ON sms_messages (sms_id);
      CREATE TABLE sms_account_hints (
        institution TEXT NOT NULL,
        digits      TEXT NOT NULL,
        account_id  TEXT NOT NULL,
        PRIMARY KEY (institution, digits)
      );
      CREATE TABLE merchant_categories (
        merchant_key   TEXT PRIMARY KEY NOT NULL,
        category_id    TEXT NOT NULL,
        subcategory_id TEXT,
        updated_at     TEXT NOT NULL
      );
      CREATE TABLE sms_state (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
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

/**
 * Inserts the built-in categories into empty category tables; the caller owns the SQL transaction.
 * They're dated `EPOCH` so a Drive copy of the user's own edits always wins over the defaults.
 */
export async function seedDefaultCategories(db: SQLiteDatabase) {
  await seedCategories(db, 'expense', DEFAULT_EXPENSE_CATEGORIES);
  await seedCategories(db, 'income', DEFAULT_INCOME_CATEGORIES);
  await db.runAsync('UPDATE categories SET updated_at = ? WHERE 1', EPOCH);
  await db.runAsync('UPDATE subcategories SET updated_at = ? WHERE 1', EPOCH);
}

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  // Sync applies merges on a second connection; writes from either side wait for the other instead of failing.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
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
