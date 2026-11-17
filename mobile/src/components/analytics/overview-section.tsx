import { StyleSheet, View } from 'react-native';

import { StatCard, StatRow } from '@/components/analytics/stat-card';
import { BarChart } from '@/components/charts/bar-chart';
import { TransactionRow } from '@/components/transaction-row';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { getDailyTotals, getWeekdayTotals } from '@/db/analytics';
import { getMonthlyTotals, getPeriodSummary, getTopExpenses } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import type { AnalyticsScope } from '@/lib/analytics-period';
import { addDays, formatCurrency, formatShortDate, parseDateKey, toDateKey } from '@/lib/format';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
/** Longer ranges chart spending per month instead of per day. */
const MAX_DAILY_BARS = 92;

export function OverviewSection({ scope }: { scope: AnalyticsScope }) {
  const { from, to, record, accountIds, currency } = scope;
  const colors = useTheme();
  const summary = useDbQuery(getPeriodSummary, ['transactions'], from, to, record, accountIds);
  const days = useDbQuery(getDailyTotals, ['transactions'], from, to, record, accountIds);
  const months = useDbQuery(
    getMonthlyTotals,
    ['transactions'],
    from.slice(0, 7),
    toDateKey(addDays(parseDateKey(to), -1)).slice(0, 7),
    record,
    accountIds
  );
  const weekdays = useDbQuery(getWeekdayTotals, ['transactions'], from, to, record, accountIds);
  const top = useDbQuery(
    getTopExpenses,
    ['transactions', 'accounts', 'categories', 'subcategories'],
    from,
    to,
    accountIds
  );

  if (!summary || !days || !months || !weekdays || !top) return null;

  if (summary.count === 0) {
    return <EmptyState emoji="📊" title="No transactions" message={`Nothing recorded for ${scope.label}.`} />;
  }

  const format = (value: number) => formatCurrency(value, currency);
  const today = toDateKey(new Date());
  const elapsedDays = Math.max(1, days.filter((d) => d.date <= today).length);
  const savingsRate = summary.income > 0 ? Math.round(((summary.income - summary.expense) / summary.income) * 100) : null;
  const daily = days.length <= MAX_DAILY_BARS;

  return (
    <>
      <View style={styles.stats}>
        <StatRow>
          <StatCard label="Income" value={format(summary.income)} tone="success" />
          <StatCard label="Spent" value={format(summary.expense)} tone="danger" />
          <StatCard
            label="Saved"
            value={savingsRate === null ? '—' : `${savingsRate}%`}
            tone={savingsRate !== null && savingsRate < 0 ? 'danger' : 'primary'}
          />
        </StatRow>
        <StatRow>
          <StatCard label="Avg spent / day" value={format(summary.expense / elapsedDays)} />
          <StatCard label="Transactions" value={String(summary.count)} />
        </StatRow>
      </View>

      <SectionHeader title={daily ? 'Daily spending' : 'Monthly spending'} />
      <Card>
        {daily ? (
          <BarChart
            labels="ends"
            color={colors.danger}
            formatValue={format}
            data={days.map((d) => ({
              key: d.date,
              value: d.expense,
              label: formatShortDate(d.date),
              title: parseDateKey(d.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
            }))}
          />
        ) : (
          <BarChart
            color={colors.danger}
            formatValue={format}
            data={months.map((m) => {
              const date = parseDateKey(`${m.month}-01`);
              return {
                key: m.month,
                value: m.expense,
                label: date.toLocaleDateString(undefined, { month: 'narrow' }),
                title: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
              };
            })}
          />
        )}
      </Card>

      {weekdays.some((v) => v > 0) ? (
        <>
          <SectionHeader title="Spending by weekday" />
          <Card>
            <BarChart
              color={colors.primary}
              formatValue={format}
              data={weekdays.map((value, i) => ({ key: WEEKDAYS[i], value, label: WEEKDAYS[i], title: WEEKDAY_NAMES[i] }))}
            />
          </Card>
        </>
      ) : null}

      {top.length > 0 ? (
        <>
          <SectionHeader title="Top expenses" />
          <Card flush>
            {top.map((t, i) => (
              <TransactionRow key={t.id} transaction={t} currency={currency} divider={i > 0} />
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  stats: {
    gap: Spacing.sm,
  },
});
