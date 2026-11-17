import { Stack, useLocalSearchParams } from 'expo-router';

import { CategoryForm } from '@/components/category-form';

export default function NewCategoryScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = params.kind === 'income' ? 'income' : 'expense';
  return (
    <>
      <Stack.Screen options={{ title: kind === 'income' ? 'Add income category' : 'Add expense category' }} />
      <CategoryForm kind={kind} />
    </>
  );
}
