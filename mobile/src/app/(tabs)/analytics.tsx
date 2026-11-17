import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DonutChart } from '@/components/charts/donut-chart';
import { ChartLegend, MonthBars } from '@/components/charts/month-bars';
import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { getCategoryTotals, getMonthlyTotals, getPeriodSummary } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency, formatMonth, monthRange, parseDateKey, shiftMonth, toMonthKey } from '@/lib/format';

type Kind = 'expense' | 'income';

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
];

export default function AnalyticsScreen() {
  const colors = useTheme();
  const settings = useSettings();
  const currency = settings?.currency ?? 'INR';
  const thisMonth = toMonthKey(new Date());
  const [month, setMonth] = useState(thisMonth);
  const [kind, setKind] = useState<Kind>('expense');

  const monthDate = parseDateKey(`${month}-01`);
  const { from, to } = monthRange(monthDate);
  const record = settings?.splitExpenseRecord ?? 'my_share';
  const summary = useDbQuery(getPeriodSummary, ['transactions'], from, to, record);
  const categories = useDbQuery(getCategoryTotals, ['transactions', 'categories'], kind, from, to, record);
  const trend = useDbQuery(
    getMonthlyTotals,
    ['transactions'],
    toMonthKey(shiftMonth(new Date(), -5)),
    thisMonth,
    record
  );

  const income = summary?.income ?? 0;
  const expense = summary?.expense ?? 0;
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : null;
  const kindTotal = kind === 'expense' ? expense : income;
  const largest = categories?.[0]?.total ?? 0;

  return (
    <Screen title="Analytics">
      <View style={styles.monthSwitcher}>
        <IconButton
          icon="chevronLeft"
          accessibilityLabel="Previous month"
          onPress={() => setMonth(toMonthKey(shiftMonth(monthDate, -1)))}
        />
        <Text variant="heading" style={styles.monthLabel}>
          {formatMonth(monthDate)}
        </Text>
        {month < thisMonth ? (
          <IconButton
            icon="chevronRight"
            accessibilityLabel="Next month"
            onPress={() => setMonth(toMonthKey(shiftMonth(monthDate, 1)))}
          />
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Income" value={formatCurrency(income, currency)} tone="success" />
        <StatCard label="Spent" value={formatCurrency(expense, currency)} tone="danger" />
        <StatCard
          label="Saved"
          value={savingsRate === null ? '—' : `${savingsRate}%`}
          tone={savingsRate !== null && savingsRate < 0 ? 'danger' : 'primary'}
        />
      </View>

      <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={setKind} />

      {categories?.length === 0 ? (
        <EmptyState
          emoji="📊"
          title={kind === 'expense' ? 'No expenses' : 'No income'}
          message={`Nothing recorded for ${formatMonth(monthDate)}.`}
        />
      ) : (
        <Card style={styles.breakdown}>
          <View style={styles.donut}>
            <DonutChart
              segments={(categories ?? []).map((c) => ({ key: c.categoryId ?? 'none', value: c.total, color: c.color }))}>
              <Text variant="caption" tone="secondary">
                {kind === 'expense' ? 'Spent' : 'Earned'}
              </Text>
              <Text variant="heading" numeric numberOfLines={1} adjustsFontSizeToFit style={styles.donutTotal}>
                {formatCurrency(kindTotal, currency)}
              </Text>
            </DonutChart>
          </View>
          {categories?.map((c) => (
            <View key={c.categoryId ?? 'none'} style={styles.categoryRow}>
              <View style={styles.categoryLabel}>
                <Text>{c.icon}</Text>
                <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text variant="caption" tone="secondary" numeric>
                  {kindTotal > 0 ? `${Math.round((c.total / kindTotal) * 100)}%` : ''}
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

      <SectionHeader title="Last 6 months" />
      <Card style={styles.trend}>
        {trend ? <MonthBars data={trend} selected={month} onSelect={setMonth} /> : null}
        <ChartLegend
          items={[
            { label: 'Income', color: colors.success },
            { label: 'Expenses', color: colors.danger },
          ]}
        />
      </Card>
    </Screen>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'success' | 'danger' | 'primary' }) {
  return (
    <Card style={styles.stat}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <Text variant="bodyStrong" tone={tone} numeric numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
  },
  iconPlaceholder: {
    width: 44,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stat: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  breakdown: {
    gap: Spacing.lg,
  },
  donut: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  donutTotal: {
    maxWidth: 130,
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
  trend: {
    gap: Spacing.md,
  },
});
