import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, CategoryKind, Subcategory } from '@/types/models';

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

  const subsByCategory = new Map<string, Subcategory[]>();
  for (const s of subcategories) {
    const list = subsByCategory.get(s.category_id) ?? [];
    list.push({ id: s.id, categoryId: s.category_id, name: s.name, sortOrder: s.sort_order });
    subsByCategory.set(s.category_id, list);
  }

  return categories.map((c) => ({
    id: c.id,
    kind: c.kind,
    name: c.name,
    icon: c.icon,
    color: c.color,
    sortOrder: c.sort_order,
    subcategories: subsByCategory.get(c.id) ?? [],
  }));
}
