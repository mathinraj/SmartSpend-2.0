import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ListRowProps {
  title: string;
  subtitle?: string | null;
  /** Leading visual, e.g. an `Avatar`. */
  leading?: ReactNode;
  /** Trailing content; defaults to a chevron when `onPress` is set. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Draw a hairline above the row; set for every row except the first in a group. */
  divider?: boolean;
}

export function ListRow({ title, subtitle, leading, trailing, onPress, divider }: ListRowProps) {
  const colors = useTheme();
  const content = (
    <View style={[styles.row, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      {leading}
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? <Icon name="chevronRight" size={20} color={colors.textMuted} /> : null)}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} android_ripple={{ color: colors.border }}>
      {content}
    </Pressable>
  );
}

export function Avatar({ emoji, color }: { emoji: string; color: string }) {
  return (
    <View style={[styles.avatar, { backgroundColor: `${color}26` }]}>
      <Text style={styles.avatarEmoji}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 60,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
    lineHeight: 26,
  },
});
