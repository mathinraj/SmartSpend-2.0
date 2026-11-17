import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { getDayActivity } from '@/db/analytics';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { formatMonth, monthRange, parseDateKey, shiftMonth, toDateKey, toMonthKey } from '@/lib/format';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface HistoryCalendarProps {
  /** The day History is filtered to, if any. */
  selected: string | null;
  /** Called with the tapped day, or `null` when the selected day is tapped again. */
  onSelect: (date: string | null) => void;
}

/** Month grid with transaction counts and income/expense dots per day. */
export function HistoryCalendar({ selected, onSelect }: HistoryCalendarProps) {
  const colors = useTheme();
  const [month, setMonth] = useState(toMonthKey(selected ? parseDateKey(selected) : new Date()));
  const first = parseDateKey(`${month}-01`);
  const { from, to } = monthRange(first);
  const activity = useDbQuery(getDayActivity, ['transactions'], from, to);
  const byDate = new Map((activity ?? []).map((d) => [d.date, d]));
  const today = toDateKey(new Date());
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <IconButton icon="chevronLeft" accessibilityLabel="Previous month" onPress={() => setMonth(toMonthKey(shiftMonth(first, -1)))} />
        <Text variant="bodyStrong" style={styles.title}>
          {formatMonth(first)}
        </Text>
        <IconButton icon="chevronRight" accessibilityLabel="Next month" onPress={() => setMonth(toMonthKey(shiftMonth(first, 1)))} />
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} variant="caption" tone="muted" style={styles.weekday}>
            {d}
          </Text>
        ))}
        {cells.map((date, i) => {
          if (!date) return <View key={`blank-${i}`} style={styles.cell} />;
          const day = byDate.get(date);
          const isSelected = date === selected;
          const isToday = date === today;
          const foreground = isSelected ? colors.onPrimary : day ? colors.text : colors.textMuted;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${parseDateKey(date).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}: ${day?.count ?? 0} transaction${day?.count === 1 ? '' : 's'}`}
              onPress={() => onSelect(isSelected ? null : date)}
              style={styles.cell}>
              <View
                style={[
                  styles.day,
                  isSelected && { backgroundColor: colors.primary },
                  isToday && !isSelected && { borderColor: colors.primary, borderWidth: 1.5 },
                ]}>
                <Text variant="bodyStrong" style={{ color: foreground }}>
                  {Number(date.slice(8))}
                </Text>
                {day ? (
                  <View style={styles.meta}>
                    {day.expense > 0 ? <View style={[styles.dot, { backgroundColor: isSelected ? colors.onPrimary : colors.danger }]} /> : null}
                    {day.income > 0 ? <View style={[styles.dot, { backgroundColor: isSelected ? colors.onPrimary : colors.success }]} /> : null}
                    <Text variant="caption" style={[styles.count, { color: isSelected ? colors.onPrimary : colors.textSecondary }]}>
                      {day.count}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" tone="muted">
        Tap a day to see only its transactions; tap it again to show all.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    paddingBottom: Spacing.xs,
  },
  cell: {
    width: `${100 / 7}%`,
    padding: 2,
  },
  day: {
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  count: {
    fontSize: 10,
    lineHeight: 12,
  },
});
