import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccountSection } from '@/components/analytics/account-section';
import { CardsSection } from '@/components/analytics/cards-section';
import { CategoriesSection } from '@/components/analytics/categories-section';
import { OverviewSection } from '@/components/analytics/overview-section';
import { TrendsSection } from '@/components/analytics/trends-section';
import { IconButton } from '@/components/ui/button';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { PickerButton } from '@/components/ui/picker-button';
import { Screen } from '@/components/ui/screen';
import { TabStrip } from '@/components/ui/tab-strip';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { listAccounts } from '@/db/accounts';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { accountEmoji, isCreditCard } from '@/lib/accounts';
import {
  PERIOD_PRESETS,
  periodForPreset,
  periodLabel,
  periodRange,
  presetOf,
  type AnalyticsPeriod,
  type AnalyticsScope,
} from '@/lib/analytics-period';
import { formatShortDate, parseDateKey, shiftMonth, toDateKey, toMonthKey } from '@/lib/format';
import { pickDate } from '@/lib/pickers';

type Section = 'overview' | 'categories' | 'cards' | 'accounts' | 'trends';

export default function AnalyticsScreen() {
  const settings = useSettings();
  const accounts = useDbQuery(listAccounts, ['accounts']);
  const thisMonth = toMonthKey(new Date());
  const [section, setSection] = useState<Section>('overview');
  const [period, setPeriod] = useState<AnalyticsPeriod>({ kind: 'month', month: thisMonth });
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [focusAccountId, setFocusAccountId] = useState<string | null>(null);

  // `?account=` (from an account's "View analytics") opens the Accounts tab on that account once.
  const { account: accountParam } = useLocalSearchParams<{ account?: string }>();
  const [handledParam, setHandledParam] = useState<string | undefined>();
  if (accountParam !== handledParam) {
    setHandledParam(accountParam);
    if (accountParam) {
      setSection('accounts');
      setFocusAccountId(accountParam);
    }
  }
  useEffect(() => {
    if (accountParam) router.setParams({ account: undefined });
  }, [accountParam]);

  const currency = settings?.currency ?? 'INR';
  const cards = accounts?.filter(isCreditCard) ?? [];
  const sections: { value: Section; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'categories', label: 'Categories' },
    ...(cards.length > 0 ? [{ value: 'cards' as const, label: 'Cards' }] : []),
    { value: 'accounts', label: 'Accounts' },
    { value: 'trends', label: 'Trends' },
  ];
  const current = sections.some((s) => s.value === section) ? section : 'overview';

  const accountIds = selectedAccountIds.filter((id) => accounts?.some((a) => a.id === id));
  const { from, to } = periodRange(period);
  const label = periodLabel(period);
  const preset = presetOf(period);
  const scope: AnalyticsScope = {
    from,
    to,
    label: period.kind === 'last_30' || period.kind === 'last_90' ? `the ${label.toLowerCase()}` : label,
    record: settings?.splitExpenseRecord ?? 'my_share',
    accountIds,
    currency,
  };

  const selectMonth = (month: string) => setPeriod({ kind: 'month', month });
  const openMonth = (month: string) => {
    selectMonth(month);
    setSection('overview');
  };
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

  const showPeriod = current !== 'trends';
  const showAccountFilter =
    (current === 'overview' || current === 'categories' || current === 'trends') && (accounts?.length ?? 0) > 1;

  return (
    <Screen title="Analytics">
      <TabStrip options={sections} value={current} onChange={setSection} />

      {showPeriod ? (
        <>
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
        </>
      ) : null}

      {showAccountFilter ? (
        <ChipRow>
          <Chip label="All accounts" selected={accountIds.length === 0} onPress={() => setSelectedAccountIds([])} />
          {accounts!.map((a) => (
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

      {!settings || !accounts ? null : current === 'overview' ? (
        <OverviewSection scope={scope} />
      ) : current === 'categories' ? (
        <CategoriesSection scope={scope} />
      ) : current === 'cards' ? (
        <CardsSection scope={scope} cards={cards} hideBalances={settings.hideBalances} />
      ) : current === 'accounts' ? (
        accounts.length > 0 ? (
          <AccountSection
            scope={scope}
            accounts={accounts}
            accountId={focusAccountId}
            onSelectAccount={setFocusAccountId}
            selectedMonth={period.kind === 'month' ? period.month : ''}
            onSelectMonth={selectMonth}
          />
        ) : (
          <EmptyState emoji="🏦" title="No accounts yet" message="Add an account to see its analytics." />
        )
      ) : (
        <TrendsSection
          record={scope.record}
          accountIds={accountIds}
          currency={currency}
          onSelectMonth={openMonth}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
