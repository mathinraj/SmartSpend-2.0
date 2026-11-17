import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DonutChart } from '@/components/charts/donut-chart';
import { ChartLegend, MonthBars } from '@/components/charts/month-bars';
import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PickerButton } from '@/components/ui/picker-button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { listAccounts } from '@/db/accounts';
import { getCategoryTotals, getMonthlyTotals, getPeriodSummary } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { accountEmoji } from '@/lib/accounts';
import {
  PERIOD_PRESETS,
  periodForPreset,
  periodLabel,
  periodRange,
  presetOf,
  type AnalyticsPeriod,
} from '@/lib/analytics-period';
import { formatCurrency, formatShortDate, parseDateKey, shiftMonth, toDateKey, toMonthKey } from '@/lib/format';
import { pickDate } from '@/lib/pickers';

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
  const [period, setPeriod] = useState<AnalyticsPeriod>({ kind: 'month', month: thisMonth });
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [kind, setKind] = useState<Kind>('expense');

  const accounts = useDbQuery(listAccounts, ['accounts']);
  const accountIds = selectedAccountIds.filter((id) => accounts?.some((a) => a.id === id));
  const { from, to } = periodRange(period);
  const label = periodLabel(period);
  const preset = presetOf(period);
  const record = settings?.splitExpenseRecord ?? 'my_share';
  const summary = useDbQuery(getPeriodSummary, ['transactions'], from, to, record, accountIds);
  const categories = useDbQuery(getCategoryTotals, ['transactions', 'categories'], kind, from, to, record, accountIds);
  const trend = useDbQuery(
    getMonthlyTotals,
    ['transactions'],
    toMonthKey(shiftMonth(new Date(), -5)),
    thisMonth,
    record,
    accountIds
  );

  const selectMonth = (month: string) => setPeriod({ kind: 'month', month });
  const toggleAccount = (id: string) =>
    setSelectedAccountIds(accountIds.includes(id) ? accountIds.filter((x) => x !== id) : [...accountIds, id]);

  function pickCustom(edge: 'from' | 'to') {
    if (period.kind !== 'custom') return;
    pickDate(parseDateKey(period[edge]), (d) => {
      const key = toDateKey(d);
      if (edge === 'from') setPeriod({ kind: 'custom', from: key, to: key > period.to ? key : period.to });
      else setPeriod({ kind: 'custom', from: key < period.from ? key : period.from, to: key });
    });
  }

  const income = summary?.income ?? 0;
  const expense = summary?.expense ?? 0;
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : null;
  const kindTotal = kind === 'expense' ? expense : income;
  const largest = categories?.[0]?.total ?? 0;

  return (
    <Screen title="Analytics">
      <ChipRow>
        {PERIOD_PRESETS.map((p) => (
          <Chip
            key={p.id}
            label={p.label}
            selected={preset === p.id}
            onPress={() => setPeriod(periodForPreset(p.id, period))}
          />
        ))}
      </ChipRow>

      {period.kind === 'month' ? (
        <View style={styles.monthSwitcher}>
          <IconButton
            icon="chevronLeft"
            accessibilityLabel="Previous month"
            onPress={() => selectMonth(toMonthKey(shiftMonth(parseDateKey(`${period.month}-01`), -1)))}
          />
          <Text variant="heading" style={styles.monthLabel}>
            {label}
          </Text>
          {period.month < thisMonth ? (
            <IconButton
              icon="chevronRight"
              accessibilityLabel="Next month"
              onPress={() => selectMonth(toMonthKey(shiftMonth(parseDateKey(`${period.month}-01`), 1)))}
            />
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>
      ) : period.kind === 'custom' ? (
        <View style={styles.customRow}>
          <PickerButton icon="calendar" label={formatShortDate(period.from)} onPress={() => pickCustom('from')} />
          <PickerButton icon="calendar" label={formatShortDate(period.to)} onPress={() => pickCustom('to')} />
        </View>
      ) : (
        <Text variant="heading" style={styles.periodLabel}>
          {label}
        </Text>
      )}

      {accounts && accounts.length > 1 ? (
        <ChipRow>
          <Chip label="All accounts" selected={accountIds.length === 0} onPress={() => setSelectedAccountIds([])} />
          {accounts.map((a) => (
            <Chip
              key={a.id}
              label={a.name}
              emoji={accountEmoji(a, currency)}
              selected={accountIds.includes(a.id)}
              onPress={() => toggleAccount(a.id)}
            />
          ))}
        </ChipRow>
      ) : null}

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
          message={`Nothing recorded${accountIds.length > 0 ? ' in the selected accounts' : ''} for ${
            period.kind === 'last_30' || period.kind === 'last_90' ? `the ${label.toLowerCase()}` : label
          }.`}
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
        {trend ? (
          <MonthBars data={trend} selected={period.kind === 'month' ? period.month : ''} onSelect={selectMonth} />
        ) : null}
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

/** A single line of chips that scrolls sideways, bleeding to the screen edges. */
function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipRow}
      contentContainerStyle={styles.chipRowContent}>
      {children}
    </ScrollView>
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
  periodLabel: {
    textAlign: 'center',
  },
  customRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chipRow: {
    marginHorizontal: -Spacing.lg,
  },
  chipRowContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
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
