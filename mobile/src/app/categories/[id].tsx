import { useLocalSearchParams } from 'expo-router';

import { CategoryForm } from '@/components/category-form';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { getCategory } from '@/db/categories';
import { useDbQuery } from '@/hooks/use-db-query';

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const category = useDbQuery(getCategory, ['categories', 'subcategories'], id);

  if (category === undefined) return null;
  if (category === null) {
    return (
      <Screen variant="stack">
        <EmptyState emoji="🔍" title="Category not found" message="It may have been deleted." />
      </Screen>
    );
  }
  return <CategoryForm kind={category.kind} initial={category} />;
}
