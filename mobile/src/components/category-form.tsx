import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormScreen } from '@/components/ui/form-screen';
import { Icon } from '@/components/ui/icon';
import { Avatar } from '@/components/ui/list-row';
import { MoveButtons } from '@/components/ui/move-buttons';
import { Text } from '@/components/ui/text';
import { Field, Input, TextField } from '@/components/ui/text-field';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/categories';
import { Radius, Spacing } from '@/constants/theme';
import {
  createCategory,
  deleteCategory,
  getCategoryUsage,
  listCategories,
  updateCategory,
  type CategoryInput,
} from '@/db/categories';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { generateId } from '@/lib/id';
import type { Category, CategoryKind } from '@/types/models';

interface DraftSubcategory {
  /** Stable React key; new rows have no `id` until saved. */
  key: string;
  id?: string;
  name: string;
}

const normalize = (name: string) => name.trim().toLowerCase();

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export interface CategoryFormProps {
  kind: CategoryKind;
  /** The category being edited; omit to create a new one. */
  initial?: Category;
}

export function CategoryForm({ kind, initial }: CategoryFormProps) {
  const db = useSQLiteContext();
  const colors = useTheme();
  const siblings = useDbQuery(listCategories, ['categories'], kind);

  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '📦');
  const [color, setColor] = useState(initial?.color ?? '#6C5CE7');
  const [subs, setSubs] = useState<DraftSubcategory[]>(
    () => initial?.subcategories.map((s) => ({ key: s.id, id: s.id, name: s.name })) ?? []
  );
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!siblings) return null;

  const icons = CATEGORY_ICONS.includes(icon) ? CATEGORY_ICONS : [icon, ...CATEGORY_ICONS];
  const keptSubs = subs.filter((s) => s.name.trim());
  const nameTaken = siblings.some((c) => c.id !== initial?.id && normalize(c.name) === normalize(name));
  const subNamesClash = new Set(keptSubs.map((s) => normalize(s.name))).size < keptSubs.length;
  const problem = !name.trim()
    ? 'Enter a name'
    : nameTaken
      ? `You already have “${name.trim()}”`
      : subNamesClash
        ? 'Subcategory names must be different'
        : null;

  function updateSub(key: string, patch: Partial<DraftSubcategory>) {
    setSubs((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function moveSub(index: number, delta: -1 | 1) {
    setSubs((list) => {
      const next = [...list];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }

  function addSub() {
    const key = generateId();
    setSubs((list) => [...list, { key, name: '' }]);
    setFocusKey(key);
  }

  async function save() {
    if (problem || saving) return;
    setSaving(true);
    const input: CategoryInput = {
      name: name.trim(),
      icon,
      color,
      subcategories: kind === 'expense' ? keptSubs.map((s) => ({ id: s.id, name: s.name.trim() })) : [],
    };
    try {
      if (initial) await updateCategory(db, initial.id, input);
      else await createCategory(db, kind, input);
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not save', error instanceof Error ? error.message : String(error));
    }
  }

  async function confirmDelete() {
    if (!initial) return;
    if (siblings!.length <= 1) {
      Alert.alert(`Can't delete ${initial.name}`, `Keep at least one ${kind} category.`);
      return;
    }
    const usage = await getCategoryUsage(db, initial.id);
    const used = [
      usage.transactions > 0 ? plural(usage.transactions, 'transaction') : null,
      usage.plannedPayments > 0 ? plural(usage.plannedPayments, 'planned payment') : null,
    ].filter(Boolean);
    const message =
      used.length > 0
        ? `${used.join(' and ')} use it. They are kept and will show as uncategorized.`
        : 'Nothing uses this category yet.';
    Alert.alert(`Delete ${initial.name}?`, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteCategory(db, initial.id);
        },
      },
    ]);
  }

  return (
    <FormScreen
      footer={
        <Button
          label={problem ?? (initial ? 'Save changes' : 'Add category')}
          icon={problem ? undefined : 'check'}
          disabled={!!problem || saving}
          onPress={save}
        />
      }>
      <Card style={styles.preview}>
        <Avatar emoji={icon} color={color} />
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name.trim() || 'Category name'}
          </Text>
          <Text variant="caption" tone="secondary">
            {kind === 'expense' ? 'Expense category' : 'Income category'}
          </Text>
        </View>
      </Card>

      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder={kind === 'expense' ? 'e.g. Pets' : 'e.g. Dividends'}
        autoFocus={!initial}
        maxLength={30}
      />

      <Field label="Icon">
        <View style={styles.grid}>
          {icons.map((emoji) => {
            const selected = emoji === icon;
            return (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`Icon ${emoji}`}
                accessibilityState={{ selected }}
                onPress={() => setIcon(emoji)}
                style={[
                  styles.iconCell,
                  {
                    backgroundColor: selected ? `${colors.primary}1F` : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}>
                <Text style={styles.iconEmoji}>{emoji}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Color">
        <View style={styles.grid}>
          {CATEGORY_COLORS.map((c) => {
            const selected = c === color;
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Color ${c}`}
                accessibilityState={{ selected }}
                onPress={() => setColor(c)}
                style={[styles.swatch, { backgroundColor: c }, selected && { borderColor: colors.text }]}>
                {selected ? <Icon name="check" size={18} color="#FFFFFF" /> : null}
              </Pressable>
            );
          })}
        </View>
      </Field>

      {kind === 'expense' ? (
        <Field
          label="Subcategories"
          hint={
            initial
              ? `Optional. Removing one keeps its transactions under ${initial.name}.`
              : 'Optional, e.g. Food › Groceries.'
          }>
          {subs.map((s, i) => (
            <View key={s.key} style={styles.subRow}>
              <Input
                style={styles.flex}
                value={s.name}
                onChangeText={(text) => updateSub(s.key, { name: text })}
                placeholder="Subcategory name"
                autoFocus={s.key === focusKey}
                maxLength={30}
                accessibilityLabel={`Subcategory ${i + 1}`}
              />
              <MoveButtons
                label={s.name.trim() || `subcategory ${i + 1}`}
                canMoveUp={i > 0}
                canMoveDown={i < subs.length - 1}
                onMove={(delta) => moveSub(i, delta)}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${s.name.trim() || `subcategory ${i + 1}`}`}
                onPress={() => setSubs((list) => list.filter((x) => x.key !== s.key))}
                hitSlop={6}
                style={styles.remove}>
                <Icon name="close" size={20} color={colors.danger} />
              </Pressable>
            </View>
          ))}
          <View style={styles.inlineAction}>
            <Button label="Add subcategory" icon="add" size="small" variant="secondary" onPress={addSub} />
          </View>
        </Field>
      ) : null}

      {initial ? <Button label="Delete category" icon="delete" variant="destructive" onPress={confirmDelete} /> : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  remove: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAction: {
    alignSelf: 'flex-start',
  },
});
