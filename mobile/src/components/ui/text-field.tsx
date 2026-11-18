import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface FieldAction {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
}

/** A labeled form section, with an optional icon action at the end of the label row. */
export function Field({ label, hint, action, children }: { label: string; hint?: string; action?: FieldAction; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text variant="label" tone="secondary" style={styles.label}>
          {label}
        </Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel}
            onPress={action.onPress}
            hitSlop={8}
            style={({ pressed }) => [styles.action, { backgroundColor: `${colors.primary}1A` }, pressed && styles.pressed]}>
            <Icon name={action.icon} size={18} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {children}
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
}

export function TextField({ label, hint, style, ...rest }: TextFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <Input style={style} {...rest} />
    </Field>
  );
}

/** Themed single-line input without a label. */
export function Input({ style, ...rest }: TextInputProps) {
  const colors = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      cursorColor={colors.primary}
      selectionColor={`${colors.primary}55`}
      style={[
        styles.input,
        { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    flex: 1,
  },
  // Negative margins keep the 36pt button from making the label row taller than the label text.
  action: {
    width: 36,
    height: 36,
    marginVertical: -8,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
});
