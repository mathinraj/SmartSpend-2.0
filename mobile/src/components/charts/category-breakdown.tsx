import { StyleSheet, View } from 'react-native';

import { DonutChart } from '@/components/charts/donut-chart';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import type { CategoryTotal } from '@/db/transactions';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency } from '@/lib/format';

export interface CategoryBreakdownProps {
  categories: CategoryTotal[];
  currency: string;
  /** Caption inside the donut, above the total. */
  centerLabel: string;
}

/** Donut of category shares with a ranked list and bars below. */
export function CategoryBreakdown({ categories, currency, centerLabel }: CategoryBreakdownProps) {
  const colors = useTheme();
  const total = categories.reduce((sum, c) => sum + c.total, 0);
  const largest = categories[0]?.total ?? 0;

  return (
    <Card style={styles.card}>
      <View style={styles.donut}>
        <DonutChart segments={categories.map((c) => ({ key: c.categoryId ?? 'none', value: c.total, color: c.color }))}>
          <Text variant="caption" tone="secondary">
            {centerLabel}
          </Text>
          <Text variant="heading" numeric numberOfLines={1} adjustsFontSizeToFit style={styles.donutTotal}>
            {formatCurrency(total, currency)}
          </Text>
        </DonutChart>
      </View>
      {categories.map((c) => (
        <View key={c.categoryId ?? 'none'} style={styles.row}>
          <View style={styles.label}>
            <Text>{c.icon}</Text>
            <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
              {c.name}
            </Text>
            <Text variant="caption" tone="secondary" numeric>
              {total > 0 ? `${Math.round((c.total / total) * 100)}%` : ''}
            </Text>
            <Text variant="bodyStrong" numeric>
              {formatCurrency(c.total, currency)}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.cardMuted }]}>
            <View
              style={[styles.bar, { backgroundColor: c.color, width: `${largest > 0 ? (c.total / largest) * 100 : 0}%` }]}
            />
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.lg,
  },
  flex: {
    flex: 1,
  },
  donut: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  donutTotal: {
    maxWidth: 130,
  },
  row: {
    gap: Spacing.sm,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  track: {
    height: 8,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: Radius.pill,
  },
});
