import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Fab } from '@/components/ui/fab';
import { Avatar, ListRow } from '@/components/ui/list-row';
import { MoveButtons } from '@/components/ui/move-buttons';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { listCategories, moveCategory } from '@/db/categories';
import { useDbQuery } from '@/hooks/use-db-query';
import type { Category, CategoryKind } from '@/types/models';

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

function describeSubcategories(category: Category): string | null {
  const names = category.subcategories.map((s) => s.name);
  if (names.length === 0) return null;
  return names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
}

export default function CategoriesScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<CategoryKind>(params.kind === 'income' ? 'income' : 'expense');
  const [reordering, setReordering] = useState(false);
  const categories = useDbQuery(listCategories, ['categories', 'subcategories'], kind);

  return (
    <View style={styles.root} collapsable={false}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderTextButton
              label={reordering ? 'Done' : 'Reorder'}
              onPress={() => setReordering((value) => !value)}
            />
          ),
        }}
      />
      <Screen variant="stack" hasFab={!reordering}>
        <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={setKind} />
        {reordering ? (
          <Text variant="caption" tone="secondary">
            This order is used everywhere you pick a category.
          </Text>
        ) : null}
        <Card flush>
          {categories?.map((c, i) => (
            <ListRow
              key={c.id}
              divider={i > 0}
              leading={<Avatar emoji={c.icon} color={c.color} />}
              title={c.name}
              subtitle={kind === 'expense' ? (describeSubcategories(c) ?? 'No subcategories') : null}
              onPress={reordering ? undefined : () => router.push(`/categories/${c.id}`)}
              trailing={
                reordering ? (
                  <MoveButtons
                    label={c.name}
                    canMoveUp={i > 0}
                    canMoveDown={i < categories.length - 1}
                    onMove={(delta) => moveCategory(db, c.id, delta)}
                  />
                ) : undefined
              }
            />
          ))}
        </Card>
      </Screen>
      {reordering ? null : (
        <Fab
          accessibilityLabel={`Add ${kind} category`}
          onPress={() => router.push({ pathname: '/categories/new', params: { kind } })}
        />
      )}
    </View>
  );
}

function HeaderTextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={styles.headerButton}>
      <Text variant="bodyStrong" tone="primary">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
});
