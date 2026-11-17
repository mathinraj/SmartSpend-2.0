import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { StatCard, StatRow } from '@/components/analytics/stat-card';
import { CategoryBreakdown } from '@/components/charts/category-breakdown';
import { ChartLegend, MonthBars } from '@/components/charts/month-bars';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { getAccountActivity } from '@/db/analytics';
import { getCategoryTotals, getMonthlyTotals, getPeriodSummary } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { accountEmoji } from '@/lib/accounts';
import type { AnalyticsScope } from '@/lib/analytics-period';
import { formatCurrency, shiftMonth, toMonthKey } from '@/lib/format';
import type { Account } from '@/types/models';

export interface AccountSectionProps {
  scope: AnalyticsScope;
  accounts: Account[];
  /** `YYYY-MM` highlighted in the 12-month chart, or `''`. */
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

/** Analytics for one account; ignores the screen's multi-account filter. */
export function AccountSection({ scope, accounts, selectedMonth, onSelectMonth }: AccountSectionProps) {
  const { from, to, record, currency } = scope;
  const colors = useTheme();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const account = accounts.find((a) => a.id === pickedId) ?? accounts[0];
  const ids = [account.id];
  const summary = useDbQuery(getPeriodSummary, ['transactions'], from, to, record, ids);
  const activity = useDbQuery(getAccountActivity, ['transactions'], account.id, from, to);
  const categories = useDbQuery(getCategoryTotals, ['transactions', 'categories'], 'expense', from, to, record, ids);
  const thisMonth = toMonthKey(new Date());
  const monthly = useDbQuery(
    getMonthlyTotals,
    ['transactions'],
    toMonthKey(shiftMonth(new Date(), -11)),
    thisMonth,
    record,
    ids
  );
  const format = (value: number) => formatCurrency(value, currency);

  return (
    <>
      <ChipRow>
        {accounts.map((a) => (
          <Chip
            key={a.id}
            label={a.name}
            emoji={accountEmoji(a, currency)}
            selected={a.id === account.id}
            onPress={() => setPickedId(a.id)}
          />
        ))}
      </ChipRow>

      {summary && activity ? (
        <View style={styles.stats}>
          <StatRow>
            <StatCard label="Income" value={format(summary.income)} tone="success" />
            <StatCard label="Spent" value={format(summary.expense)} tone="danger" />
            <StatCard label="Transactions" value={String(activity.count)} />
          </StatRow>
          <StatRow>
            <StatCard label="Transfers in" value={format(activity.transfersIn)} />
            <StatCard label="Transfers out" value={format(activity.transfersOut)} />
          </StatRow>
        </View>
      ) : null}

      {categories && categories.length > 0 ? (
        <>
          <SectionHeader title="Where it went" />
          <CategoryBreakdown categories={categories} currency={currency} centerLabel="Spent" />
        </>
      ) : (
        <Text tone="secondary">No spending from this account for {scope.label}.</Text>
      )}

      <SectionHeader title="Last 12 months" />
      <Card style={styles.trend}>
        {monthly ? (
          <MonthBars data={monthly} selected={selectedMonth} onSelect={onSelectMonth} />
        ) : null}
        <ChartLegend
          items={[
            { label: 'Income', color: colors.success },
            { label: 'Expenses', color: colors.danger },
          ]}
        />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  stats: {
    gap: Spacing.sm,
  },
  trend: {
    gap: Spacing.md,
  },
});
