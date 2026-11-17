import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ChipProps {
  label: string;
  emoji?: string;
  selected?: boolean;
  /** Shows a trailing close icon; `onPress` should remove whatever the chip represents. */
  removable?: boolean;
  onPress: () => void;
}

export function Chip({ label, emoji, selected, removable, onPress }: ChipProps) {
  const colors = useTheme();
  const foreground = selected ? colors.primary : colors.text;
  return (
    <View
      style={[
        styles.clip,
        {
          backgroundColor: selected ? `${colors.primary}1F` : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityHint={removable ? 'Removes this filter' : undefined}
        onPress={onPress}
        android_ripple={{ color: colors.border }}
        style={styles.chip}>
        {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
        <Text variant="bodyStrong" style={{ color: foreground }} numberOfLines={1}>
          {label}
        </Text>
        {removable ? <Icon name="close" size={16} color={foreground} /> : null}
      </Pressable>
    </View>
  );
}

/** Lays chips out in wrapping rows. */
export function ChipGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

/** A single line of chips that scrolls sideways, bleeding to the edges of a `Screen`. */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.rowContent}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  clip: {
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 40,
    paddingHorizontal: Spacing.md,
  },
  emoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  row: {
    marginHorizontal: -Spacing.lg,
  },
  rowContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
});
