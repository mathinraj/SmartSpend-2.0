import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import type { MonthTotal } from '@/db/transactions';
import { useTheme } from '@/hooks/use-theme';
import { parseDateKey } from '@/lib/format';

const CHART_HEIGHT = 140;

export interface MonthBarsProps {
  data: MonthTotal[];
  /** `YYYY-MM` of the highlighted month. */
  selected: string;
  onSelect: (month: string) => void;
}

/** Side-by-side income and expense bars per month. */
export function MonthBars({ data, selected, onSelect }: MonthBarsProps) {
  const colors = useTheme();
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));

  return (
    <View style={styles.row}>
      {data.map((d) => {
        const isSelected = d.month === selected;
        const label = parseDateKey(`${d.month}-01`).toLocaleDateString(undefined, { month: 'short' });
        return (
          <Pressable
            key={d.month}
            accessibilityRole="button"
            accessibilityLabel={`${label}: income ${d.income}, expenses ${d.expense}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(d.month)}
            style={[styles.column, isSelected && { backgroundColor: `${colors.primary}14` }]}>
            <View style={styles.bars}>
              <View
                style={[styles.bar, { height: (d.income / max) * CHART_HEIGHT, backgroundColor: colors.success }]}
              />
              <View
                style={[styles.bar, { height: (d.expense / max) * CHART_HEIGHT, backgroundColor: colors.danger }]}
              />
            </View>
            <Text variant="caption" tone={isSelected ? 'primary' : 'secondary'} style={isSelected && styles.bold}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text variant="caption" tone="secondary">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderRadius: Radius.md,
  },
  bars: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    width: 10,
    minHeight: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  bold: {
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
  },
});
