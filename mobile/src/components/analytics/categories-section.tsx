import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryBreakdown } from '@/components/charts/category-breakdown';
import { MonthPicker } from '@/components/month-picker';
import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { getCategoryTotals, type CategoryTotal } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import type { AnalyticsScope } from '@/lib/analytics-period';
import { formatCurrency, formatMonth, monthRange, parseDateKey, shiftMonth, toMonthKey } from '@/lib/format';

type Kind = 'expense' | 'income';

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
];

export function CategoriesSection({ scope }: { scope: AnalyticsScope }) {
  const { from, to, record, accountIds, currency } = scope;
  const [kind, setKind] = useState<Kind>('expense');
  const categories = useDbQuery(getCategoryTotals, ['transactions', 'categories'], kind, from, to, record, accountIds);

  return (
    <>
      <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={setKind} />
      {categories?.length === 0 ? (
        <EmptyState
          emoji="📊"
          title={kind === 'expense' ? 'No expenses' : 'No income'}
          message={`Nothing recorded for ${scope.label}.`}
        />
      ) : categories ? (
        <CategoryBreakdown
          categories={categories}
          currency={currency}
          centerLabel={kind === 'expense' ? 'Spent' : 'Earned'}
        />
      ) : null}

      <SectionHeader title="Compare months" />
      <MonthComparison scope={scope} />
    </>
  );
}

interface ComparisonRow {
  key: string;
  icon: string;
  name: string;
  a: number;
  b: number;
}

function compare(a: CategoryTotal[], b: CategoryTotal[]): ComparisonRow[] {
  const rows = new Map<string, ComparisonRow>();
  for (const c of a) rows.set(c.categoryId ?? 'none', { key: c.categoryId ?? 'none', icon: c.icon, name: c.name, a: c.total, b: 0 });
  for (const c of b) {
    const key = c.categoryId ?? 'none';
    const row = rows.get(key);
    if (row) row.b = c.total;
    else rows.set(key, { key, icon: c.icon, name: c.name, a: 0, b: c.total });
  }
  return [...rows.values()].sort((x, y) => y.a - x.a || y.b - x.b);
}

/** Expense categories in one month against another, with the change between them. */
function MonthComparison({ scope }: { scope: AnalyticsScope }) {
  const { record, accountIds, currency } = scope;
  const colors = useTheme();
  const now = new Date();
  const [monthA, setMonthA] = useState(toMonthKey(now));
  const [monthB, setMonthB] = useState(toMonthKey(shiftMonth(now, -1)));
  const rangeA = monthRange(parseDateKey(`${monthA}-01`));
  const rangeB = monthRange(parseDateKey(`${monthB}-01`));
  const totalsA = useDbQuery(getCategoryTotals, ['transactions', 'categories'], 'expense', rangeA.from, rangeA.to, record, accountIds);
  const totalsB = useDbQuery(getCategoryTotals, ['transactions', 'categories'], 'expense', rangeB.from, rangeB.to, record, accountIds);

  if (!totalsA || !totalsB) return null;

  const rows = compare(totalsA, totalsB);
  const shortA = parseDateKey(`${monthA}-01`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  const shortB = parseDateKey(`${monthB}-01`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  const sumA = rows.reduce((s, r) => s + r.a, 0);
  const sumB = rows.reduce((s, r) => s + r.b, 0);

  return (
    <Card style={styles.compare}>
      <MonthStepper label="Month" pickerTitle="Choose a month" month={monthA} onChange={setMonthA} />
      <MonthStepper label="Against" pickerTitle="Compare against" month={monthB} onChange={setMonthB} />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      {rows.length === 0 ? (
        <Text tone="secondary" style={styles.center}>
          No expenses in either month.
        </Text>
      ) : (
        <>
          <ComparisonLine icon="🧾" name="All expenses" a={sumA} b={sumB} shortA={shortA} shortB={shortB} currency={currency} bold />
          {rows.map((r) => (
            <ComparisonLine
              key={r.key}
              icon={r.icon}
              name={r.name}
              a={r.a}
              b={r.b}
              shortA={shortA}
              shortB={shortB}
              currency={currency}
            />
          ))}
        </>
      )}
    </Card>
  );
}

function MonthStepper({
  label,
  pickerTitle,
  month,
  onChange,
}: {
  label: string;
  pickerTitle: string;
  month: string;
  onChange: (month: string) => void;
}) {
  const colors = useTheme();
  const [picking, setPicking] = useState(false);
  const date = parseDateKey(`${month}-01`);
  const isCurrent = month >= toMonthKey(new Date());
  return (
    <View style={styles.stepper}>
      <Text variant="caption" tone="secondary" style={styles.stepperLabel}>
        {label}
      </Text>
      <IconButton
        icon="chevronLeft"
        accessibilityLabel={`${label}: previous month`}
        onPress={() => onChange(toMonthKey(shiftMonth(date, -1)))}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatMonth(date)}. Choose a month`}
        onPress={() => setPicking(true)}
        style={({ pressed }) => [styles.monthButton, { backgroundColor: colors.cardMuted }, pressed && styles.pressed]}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {formatMonth(date)}
        </Text>
        <Icon name="dropdown" size={20} color={colors.textSecondary} />
      </Pressable>
      {picking ? <MonthPicker title={pickerTitle} month={month} onSelect={onChange} onClose={() => setPicking(false)} /> : null}
      {isCurrent ? (
        <View style={styles.iconPlaceholder} />
      ) : (
        <IconButton
          icon="chevronRight"
          accessibilityLabel={`${label}: next month`}
          onPress={() => onChange(toMonthKey(shiftMonth(date, 1)))}
        />
      )}
    </View>
  );
}

function ComparisonLine({
  icon,
  name,
  a,
  b,
  shortA,
  shortB,
  currency,
  bold,
}: {
  icon: string;
  name: string;
  a: number;
  b: number;
  shortA: string;
  shortB: string;
  currency: string;
  bold?: boolean;
}) {
  const change = b > 0 ? Math.round(((a - b) / b) * 100) : null;
  const changeText = change === null ? (a > 0 ? 'New' : '—') : change === 0 ? '0%' : `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}%`;
  return (
    <View style={styles.line}>
      <View style={styles.lineTop}>
        <Text>{icon}</Text>
        <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
          {name}
        </Text>
        <Text variant="bodyStrong" tone={change === null ? 'secondary' : change > 0 ? 'danger' : change < 0 ? 'success' : 'secondary'} numeric>
          {changeText}
        </Text>
      </View>
      <Text variant="caption" tone={bold ? 'default' : 'secondary'} numeric>
        {shortA} {formatCurrency(a, currency)} · {shortB} {formatCurrency(b, currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  compare: {
    gap: Spacing.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  stepperLabel: {
    width: 52,
  },
  monthButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 44,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xs,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  pressed: {
    opacity: 0.7,
  },
  iconPlaceholder: {
    width: 44,
  },
  line: {
    gap: 2,
  },
  lineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
