import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label';
export type TextTone = 'default' | 'secondary' | 'muted' | 'primary' | 'success' | 'danger' | 'onPrimary';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Fixed-width digits so amounts line up in lists. */
  numeric?: boolean;
}

function toneColor(colors: ThemeColors, tone: TextTone): string {
  switch (tone) {
    case 'secondary':
      return colors.textSecondary;
    case 'muted':
      return colors.textMuted;
    case 'primary':
      return colors.primary;
    case 'success':
      return colors.success;
    case 'danger':
      return colors.danger;
    case 'onPrimary':
      return colors.onPrimary;
    default:
      return colors.text;
  }
}

export function Text({ variant = 'body', tone = 'default', numeric, style, ...rest }: TextProps) {
  const colors = useTheme();
  return (
    <RNText
      style={[
        styles[variant],
        { color: toneColor(colors, tone) },
        numeric && styles.numeric,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  numeric: { fontVariant: ['tabular-nums'] },
});
