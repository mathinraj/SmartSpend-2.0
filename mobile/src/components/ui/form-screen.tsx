import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const FOOTER_HEIGHT = 48 + Spacing.lg * 2;

export interface FormScreenProps {
  children: ReactNode;
  /** Pinned below the form and lifted above the keyboard, usually the primary `Button`. */
  footer: ReactNode;
}

/** Scrollable form for stack and modal screens that keeps the focused input and the footer visible. */
export function FormScreen({ children, footer }: FormScreenProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollView
        bottomOffset={FOOTER_HEIGHT + Spacing.lg}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: FOOTER_HEIGHT + insets.bottom + Spacing.lg }]}>
        {children}
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ opened: insets.bottom }} style={styles.sticky}>
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + Spacing.lg },
          ]}>
          {footer}
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
