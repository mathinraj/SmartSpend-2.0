import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FAB_CLEARANCE } from '@/components/ui/fab';
import { Text } from '@/components/ui/text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ScreenProps {
  /**
   * `tab`: top-level tab screen with its own large header, padded clear of the status bar and tab bar.
   * `stack`: pushed or modal screen that sits under the native stack header.
   */
  variant?: 'tab' | 'stack';
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  /** Shown before the title, e.g. the profile picture. */
  headerLeft?: ReactNode;
  /** Leave room at the bottom for a `Fab` rendered over this screen. */
  hasFab?: boolean;
  children: ReactNode;
}

export function Screen({ variant = 'tab', title, subtitle, headerRight, headerLeft, hasFab, children }: ScreenProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const isTab = variant === 'tab';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: isTab ? insets.top + Spacing.lg : Spacing.lg,
          paddingBottom: (isTab ? BottomTabInset : insets.bottom) + Spacing.xxl + (hasFab ? FAB_CLEARANCE : 0),
        },
      ]}>
      {title ? <ScreenHeader title={title} subtitle={subtitle} right={headerRight} left={headerLeft} /> : null}
      {children}
    </ScrollView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
  left,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  left?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {left}
      <View style={styles.headerText}>
        {subtitle ? <Text tone="secondary">{subtitle}</Text> : null}
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
});
