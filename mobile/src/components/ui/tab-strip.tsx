import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface TabStripProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Underlined text tabs for switching between sections of one screen; scrolls sideways if needed. */
export function TabStrip<T extends string>({ options, value, onChange }: TabStripProps<T>) {
  const colors = useTheme();
  return (
    <View style={[styles.root, { borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        contentContainerStyle={styles.content}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.tab, selected && { borderBottomColor: colors.primary }]}>
              <Text variant="bodyStrong" style={{ color: selected ? colors.primary : colors.textSecondary }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginHorizontal: -Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  tab: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
});
