import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SwitchRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  leading?: ReactNode;
  disabled?: boolean;
  divider?: boolean;
}

/** A list row with a toggle; tapping anywhere on the row flips it. */
export function SwitchRow({ title, subtitle, value, onValueChange, leading, disabled, divider }: SwitchRowProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      android_ripple={{ color: colors.border }}
      style={[
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        disabled && styles.disabled,
      ]}>
      {leading}
      <View style={styles.text}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: `${colors.primary}88` }}
        thumbColor={value ? colors.primary : colors.card}
      />
    </Pressable>
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
  disabled: {
    opacity: 0.5,
  },
});
