import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A labeled form section. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
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
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
});
