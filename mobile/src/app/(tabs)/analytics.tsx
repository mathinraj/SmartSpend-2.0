import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { getCategoryTotals, getPeriodSummary } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency, formatMonth, monthRange } from '@/lib/format';

export default function AnalyticsScreen() {
  const colors = useTheme();
  const settings = useSettings();
  const now = new Date();
  const { from, to } = monthRange(now);
  const summary = useDbQuery(getPeriodSummary, ['transactions'], from, to);
  const categories = useDbQuery(getCategoryTotals, ['transactions', 'categories'], 'expense', from, to);
  const currency = settings?.currency ?? 'INR';

  const income = summary?.income ?? 0;
  const expense = summary?.expense ?? 0;
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : null;
  const largest = categories?.[0]?.total ?? 0;

  return (
    <Screen title="Analytics" subtitle={formatMonth(now)}>
      <View style={styles.statsRow}>
        <StatCard label="Income" value={formatCurrency(income, currency)} tone="success" />
        <StatCard label="Spent" value={formatCurrency(expense, currency)} tone="danger" />
      </View>
      <StatCard
        label="Savings rate"
        value={savingsRate === null ? '—' : `${savingsRate}%`}
        tone={savingsRate !== null && savingsRate < 0 ? 'danger' : 'primary'}
      />

      <SectionHeader title="Spending by category" />
      {categories?.length === 0 ? (
        <EmptyState emoji="📊" title="Nothing spent yet" message="Category breakdowns appear once you add expenses this month." />
      ) : (
        <Card style={styles.breakdown}>
          {categories?.map((c) => (
            <View key={c.categoryId ?? 'none'} style={styles.categoryRow}>
              <View style={styles.categoryLabel}>
                <Text>{c.icon}</Text>
                <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text variant="caption" tone="secondary" numeric>
                  {expense > 0 ? `${Math.round((c.total / expense) * 100)}%` : ''}
                </Text>
                <Text variant="bodyStrong" numeric>
                  {formatCurrency(c.total, currency)}
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.cardMuted }]}>
                <View
                  style={[
                    styles.bar,
                    { backgroundColor: c.color, width: `${largest > 0 ? (c.total / largest) * 100 : 0}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'success' | 'danger' | 'primary' }) {
  return (
    <Card style={styles.flex}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <Text variant="heading" tone={tone} numeric numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  breakdown: {
    gap: Spacing.lg,
  },
  categoryRow: {
    gap: Spacing.sm,
  },
  categoryLabel: {
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
