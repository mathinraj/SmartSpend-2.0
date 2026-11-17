import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Text, type TextTone } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';

export function StatCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: TextTone }) {
  return (
    <Card style={styles.stat}>
      <Text variant="label" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="bodyStrong" tone={tone} numeric numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );
}

/** Equal-width stat cards in one row. */
export function StatRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stat: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});
