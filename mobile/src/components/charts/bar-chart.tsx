import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface BarDatum {
  key: string;
  value: number;
  /** Axis label under the bar. */
  label: string;
  /** Longer name shown when the bar is tapped, e.g. "Tue, 3 Nov". */
  title: string;
}

export interface BarChartProps {
  data: BarDatum[];
  color: string;
  formatValue: (value: number) => string;
  height?: number;
  /** `ends` labels only the first, middle, and last bars, for long series like days. */
  labels?: 'all' | 'ends';
}

/** One bar per datum; tapping a bar shows its value above the chart. */
export function BarChart({ data, color, formatValue, height = 120, labels = 'all' }: BarChartProps) {
  const colors = useTheme();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const selected = data.find((d) => d.key === selectedKey);
  const dense = data.length > 16;
  const labelIndexes = labels === 'all' ? null : new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);

  return (
    <View style={styles.root}>
      <Text variant="caption" tone={selected ? 'default' : 'muted'} numberOfLines={1}>
        {selected ? `${selected.title}: ${formatValue(selected.value)}` : 'Tap a bar to see the amount'}
      </Text>
      <View style={[styles.bars, { height, gap: dense ? 1 : Spacing.xs }]}>
        {data.map((d) => {
          const isSelected = d.key === selectedKey;
          return (
            <Pressable
              key={d.key}
              accessibilityRole="button"
              accessibilityLabel={`${d.title}: ${formatValue(d.value)}`}
              onPress={() => setSelectedKey(isSelected ? null : d.key)}
              style={styles.column}>
              <View
                style={[
                  styles.bar,
                  dense ? styles.denseBar : styles.wideBar,
                  {
                    height: d.value > 0 ? Math.max(3, (d.value / max) * height) : 2,
                    backgroundColor: d.value > 0 ? color : colors.cardMuted,
                    opacity: selectedKey && !isSelected ? 0.4 : 1,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      {labelIndexes ? (
        <View style={styles.endLabels}>
          {[...labelIndexes].map((i) => (
            <Text key={i} variant="caption" tone="secondary">
              {data[i]?.label}
            </Text>
          ))}
        </View>
      ) : (
        <View style={[styles.labels, { gap: dense ? 1 : Spacing.xs }]}>
          {data.map((d) => (
            <Text key={d.key} variant="caption" tone="secondary" style={styles.label} numberOfLines={1}>
              {d.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.sm,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  wideBar: {
    width: '70%',
    maxWidth: 28,
  },
  denseBar: {
    width: '100%',
  },
  labels: {
    flexDirection: 'row',
  },
  label: {
    flex: 1,
    textAlign: 'center',
  },
  endLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
