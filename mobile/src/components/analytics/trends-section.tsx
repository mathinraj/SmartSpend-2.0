import { StyleSheet, View } from 'react-native';

import { StatCard, StatRow } from '@/components/analytics/stat-card';
import { ChartLegend, MonthBars } from '@/components/charts/month-bars';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { getMonthlyTotals } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency, formatMonth, parseDateKey, shiftMonth, toMonthKey } from '@/lib/format';
import type { SplitAmountMode } from '@/types/models';

export interface TrendsSectionProps {
  record: SplitAmountMode;
  accountIds: string[];
  currency: string;
  onSelectMonth: (month: string) => void;
}

/** The last 12 months, independent of the selected period. */
export function TrendsSection({ record, accountIds, currency, onSelectMonth }: TrendsSectionProps) {
  const colors = useTheme();
  const thisMonth = toMonthKey(new Date());
  const months = useDbQuery(
    getMonthlyTotals,
    ['transactions'],
    toMonthKey(shiftMonth(new Date(), -11)),
    thisMonth,
    record,
    accountIds
  );
  if (!months) return null;

  const format = (value: number) => formatCurrency(value, currency);
  const active = months.filter((m) => m.income > 0 || m.expense > 0);
  const avgIncome = active.length ? active.reduce((s, m) => s + m.income, 0) / active.length : 0;
  const avgExpense = active.length ? active.reduce((s, m) => s + m.expense, 0) / active.length : 0;

  return (
    <>
      <SectionHeader title="Last 12 months" />
      <Card style={styles.chart}>
        <MonthBars data={months} selected="" onSelect={onSelectMonth} />
        <ChartLegend
          items={[
            { label: 'Income', color: colors.success },
            { label: 'Expenses', color: colors.danger },
          ]}
        />
        <Text variant="caption" tone="muted">
          Tap a month to open it in Overview.
        </Text>
      </Card>

      <StatRow>
        <StatCard label="Avg income / month" value={format(avgIncome)} tone="success" />
        <StatCard label="Avg spent / month" value={format(avgExpense)} tone="danger" />
      </StatRow>

      <SectionHeader title="Month by month" />
      {active.length === 0 ? <Text tone="secondary">No income or spending in the last 12 months.</Text> : null}
      <Card flush>
        {[...active].reverse().map((m, i) => {
          const net = m.income - m.expense;
          return (
            <View
              key={m.month}
              style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={styles.flex}>
                <Text variant="bodyStrong">{formatMonth(parseDateKey(`${m.month}-01`))}</Text>
                <Text variant="caption" tone="secondary" numeric>
                  +{format(m.income)} · −{format(m.expense)}
                </Text>
              </View>
              <Text variant="bodyStrong" tone={net > 0 ? 'success' : net < 0 ? 'danger' : 'muted'} numeric>
                {net > 0 ? '+' : net < 0 ? '−' : ''}
                {format(Math.abs(net))}
              </Text>
            </View>
          );
        })}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  chart: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
