import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /** `destructive` is the low-emphasis delete style; `danger` is the filled one. */
  variant?: 'primary' | 'secondary' | 'danger' | 'destructive';
  icon?: IconName;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', icon, disabled }: ButtonProps) {
  const colors = useTheme();
  const background = {
    primary: colors.primary,
    secondary: colors.cardMuted,
    danger: colors.danger,
    destructive: colors.cardMuted,
  }[variant];
  const foreground = {
    primary: colors.onPrimary,
    secondary: colors.primary,
    danger: colors.onPrimary,
    destructive: colors.danger,
  }[variant];

  return (
    <View style={[styles.clip, disabled && styles.disabled]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.25)' }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: background },
          pressed && process.env.EXPO_OS === 'ios' && styles.pressed,
        ]}>
        {icon ? <Icon name={icon} size={20} color={foreground} /> : null}
        <Text variant="bodyStrong" style={{ color: foreground }}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
}

export function IconButton({ icon, onPress, accessibilityLabel }: IconButtonProps) {
  const colors = useTheme();
  return (
    <View style={[styles.iconClip, { backgroundColor: colors.card, boxShadow: colors.shadow }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        android_ripple={{ color: colors.border }}
        style={styles.iconButton}>
        <Icon name={icon} size={22} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.xl,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  iconClip: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
