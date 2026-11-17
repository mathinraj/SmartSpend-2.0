import type { SQLiteDatabase } from 'expo-sqlite';

import { generateId } from '@/lib/id';
import type { Category, CategoryKind } from '@/types/models';

interface CategoryRow {
  id: string;
  kind: CategoryKind;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}

interface SubcategoryRow {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
}

function toCategory(c: CategoryRow, subcategories: SubcategoryRow[]): Category {
  return {
    id: c.id,
    kind: c.kind,
    name: c.name,
    icon: c.icon,
    color: c.color,
    sortOrder: c.sort_order,
    subcategories: subcategories.map((s) => ({
      id: s.id,
      categoryId: s.category_id,
      name: s.name,
      sortOrder: s.sort_order,
    })),
  };
}

export async function listCategories(db: SQLiteDatabase, kind: CategoryKind): Promise<Category[]> {
  const [categories, subcategories] = await Promise.all([
    db.getAllAsync<CategoryRow>('SELECT * FROM categories WHERE kind = ? ORDER BY sort_order', kind),
    db.getAllAsync<SubcategoryRow>(
      `SELECT s.* FROM subcategories s
         JOIN categories c ON c.id = s.category_id
        WHERE c.kind = ?
        ORDER BY s.sort_order`,
      kind
    ),
  ]);

  const subsByCategory = new Map<string, SubcategoryRow[]>();
  for (const s of subcategories) {
    const list = subsByCategory.get(s.category_id) ?? [];
    list.push(s);
    subsByCategory.set(s.category_id, list);
  }
  return categories.map((c) => toCategory(c, subsByCategory.get(c.id) ?? []));
}

export async function getCategory(db: SQLiteDatabase, id: string): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE id = ?', id);
  if (!row) return null;
  const subs = await db.getAllAsync<SubcategoryRow>(
    'SELECT * FROM subcategories WHERE category_id = ? ORDER BY sort_order',
    id
  );
  return toCategory(row, subs);
}

export interface CategoryUsage {
  transactions: number;
  plannedPayments: number;
}

export async function getCategoryUsage(db: SQLiteDatabase, id: string): Promise<CategoryUsage> {
  const row = await db.getFirstAsync<CategoryUsage>(
    `SELECT (SELECT COUNT(*) FROM transactions WHERE category_id = $id)     AS transactions,
            (SELECT COUNT(*) FROM planned_payments WHERE category_id = $id) AS plannedPayments`,
    { $id: id }
  );
  return row ?? { transactions: 0, plannedPayments: 0 };
}

export interface CategoryInput {
  name: string;
  icon: string;
  color: string;
  /** Desired subcategories in order. Entries without an `id` are created; existing ones left out are deleted. */
  subcategories: { id?: string; name: string }[];
}

async function writeSubcategories(db: SQLiteDatabase, categoryId: string, subs: CategoryInput['subcategories']) {
  const keep = subs.flatMap((s) => (s.id ? [s.id] : []));
  await db.runAsync(
    `DELETE FROM subcategories WHERE category_id = ? AND id NOT IN (${keep.map(() => '?').join(', ')})`,
    categoryId,
    ...keep
  );
  for (const [i, s] of subs.entries()) {
    if (s.id) {
      await db.runAsync('UPDATE subcategories SET name = ?, sort_order = ? WHERE id = ?', s.name, i, s.id);
    } else {
      await db.runAsync(
        'INSERT INTO subcategories (id, category_id, name, sort_order) VALUES (?, ?, ?, ?)',
        generateId(),
        categoryId,
        s.name,
        i
      );
    }
  }
}

/** Adds a category at the end of its kind's list, with its subcategories, atomically. */
export async function createCategory(db: SQLiteDatabase, kind: CategoryKind, input: CategoryInput): Promise<string> {
  const id = generateId();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO categories (id, kind, name, icon, color, sort_order)
       VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM categories WHERE kind = ?))`,
      id,
      kind,
      input.name,
      input.icon,
      input.color,
      kind
    );
    await writeSubcategories(db, id, input.subcategories);
  });
  return id;
}

export async function updateCategory(db: SQLiteDatabase, id: string, input: CategoryInput) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?',
      input.name,
      input.icon,
      input.color,
      id
    );
    await writeSubcategories(db, id, input.subcategories);
  });
}

/**
 * Deletes a category and its subcategories. Transactions and planned payments keep the old ID and
 * show as uncategorized, like in the web app.
 */
export async function deleteCategory(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM categories WHERE id = ?', id);
}

/** Moves a category one place up (-1) or down (1) within its kind, renumbering the whole list. */
export async function moveCategory(db: SQLiteDatabase, id: string, delta: -1 | 1) {
  await db.withTransactionAsync(async () => {
    const rows = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM categories WHERE kind = (SELECT kind FROM categories WHERE id = ?) ORDER BY sort_order',
      id
    );
    const ids = rows.map((r) => r.id);
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    for (const [i, rowId] of ids.entries()) {
      await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', i, rowId);
    }
  });
}
