import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HistoryCalendar } from '@/components/history-calendar';
import { TransactionRow } from '@/components/transaction-row';
import { Button, IconButton } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab, FAB_CLEARANCE } from '@/components/ui/fab';
import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { listAccounts } from '@/db/accounts';
import { listCategories } from '@/db/categories';
import { getRunningBalances, listTransactions, type SearchField } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { useBalancePrivacy } from '@/lib/balance-privacy';
import { formatCurrency, formatDayLabel } from '@/lib/format';
import {
  activeFilterCount,
  EMPTY_HISTORY_FILTERS,
  setHistoryFilters,
  toTransactionFilter,
  useHistoryFilters,
  type HistoryFilters,
} from '@/lib/history-filters';
import type { TransactionListItem, TransactionType } from '@/types/models';

type TypeFilter = 'all' | TransactionType;

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

const SEARCH_FIELDS: { value: SearchField; label: string }[] = [
  { value: 'all', label: 'All fields' },
  { value: 'note', label: 'Note' },
  { value: 'category', label: 'Category' },
  { value: 'amount', label: 'Amount' },
  { value: 'account', label: 'Account' },
];

interface DaySection {
  date: string;
  net: number;
  data: TransactionListItem[];
}

function groupByDay(transactions: TransactionListItem[]): DaySection[] {
  const sections: DaySection[] = [];
  for (const t of transactions) {
    let section = sections.at(-1);
    if (section?.date !== t.date) {
      section = { date: t.date, net: 0, data: [] };
      sections.push(section);
    }
    section.data.push(t);
    if (t.type === 'income') section.net += t.amount;
    if (t.type === 'expense') section.net -= t.amount;
  }
  return sections;
}

interface ActiveChip {
  key: string;
  label: string;
  cleared: HistoryFilters;
}

function describeList(ids: string[], names: Map<string, string>, plural: string): string {
  return ids.length === 1 ? (names.get(ids[0]) ?? `1 ${plural.slice(0, -1)}`) : `${ids.length} ${plural}`;
}

function activeChips(f: HistoryFilters, names: Map<string, string>, currency: string): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (f.categoryIds.length > 0) {
    chips.push({ key: 'categories', label: describeList(f.categoryIds, names, 'categories'), cleared: { ...f, categoryIds: [] } });
  }
  if (f.accountIds.length > 0) {
    chips.push({ key: 'accounts', label: describeList(f.accountIds, names, 'accounts'), cleared: { ...f, accountIds: [] } });
  }
  if (f.from || f.to) {
    const label =
      f.from && f.from === f.to
        ? formatDayLabel(f.from)
        : f.from && f.to
        ? `${formatDayLabel(f.from)} – ${formatDayLabel(f.to)}`
        : f.from
          ? `From ${formatDayLabel(f.from)}`
          : `Until ${formatDayLabel(f.to!)}`;
    chips.push({ key: 'dates', label, cleared: { ...f, from: null, to: null } });
  }
  if (f.minAmount !== null || f.maxAmount !== null) {
    const label =
      f.minAmount !== null && f.maxAmount !== null
        ? `${formatCurrency(f.minAmount, currency)} – ${formatCurrency(f.maxAmount, currency)}`
        : f.minAmount !== null
          ? `≥ ${formatCurrency(f.minAmount, currency)}`
          : `≤ ${formatCurrency(f.maxAmount!, currency)}`;
    chips.push({ key: 'amount', label, cleared: { ...f, minAmount: null, maxAmount: null } });
  }
  return chips;
}

export default function HistoryScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const filters = useHistoryFilters();
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showRunning, setShowRunning] = useState(false);
  const privacy = useBalancePrivacy(settings?.hideBalances);
  const runningBalances = useDbQuery(getRunningBalances, ['transactions', 'accounts'], showRunning);

  const transactions = useDbQuery(listTransactions, ['transactions', 'accounts', 'categories', 'subcategories'], {
    ...toTransactionFilter(filters),
    type: type === 'all' ? undefined : type,
    search,
    searchField,
  });
  const accounts = useDbQuery(listAccounts, ['accounts']);
  const expenseCategories = useDbQuery(listCategories, ['categories', 'subcategories'], 'expense');
  const incomeCategories = useDbQuery(listCategories, ['categories', 'subcategories'], 'income');

  const currency = settings?.currency ?? 'INR';
  const sections = transactions ? groupByDay(transactions) : [];
  const filterCount = activeFilterCount(filters);
  const isFiltering = filterCount > 0 || search.trim() !== '' || type !== 'all';
  const names = new Map<string, string>([
    ...(accounts ?? []).map((a) => [a.id, a.name] as const),
    ...(expenseCategories ?? []).map((c) => [c.id, c.name] as const),
    ...(incomeCategories ?? []).map((c) => [c.id, c.name] as const),
  ]);
  const chips = activeChips(filters, names, currency);
  const count = transactions?.length;
  const selectedDay = filters.from && filters.from === filters.to ? filters.from : null;

  function selectDay(date: string | null) {
    setHistoryFilters({ ...filters, from: date, to: date });
    if (date) setShowCalendar(false);
  }

  function balanceCaption(t: TransactionListItem): string | undefined {
    const balance = showRunning ? runningBalances?.[t.id] : undefined;
    if (balance === undefined) return undefined;
    const label = t.type === 'transfer' ? (t.toAccountName ?? 'Balance') : 'Bal';
    return `${label}: ${privacy.formatBalance(balance, currency)}`;
  }

  function resetAll() {
    setSearch('');
    setSearchField('all');
    setType('all');
    setHistoryFilters(EMPTY_HISTORY_FILTERS);
  }

  return (
    <View style={styles.root} collapsable={false}>
      <SectionList
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: BottomTabInset + Spacing.xxl + FAB_CLEARANCE,
          paddingHorizontal: Spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <ScreenHeader
              title="History"
              titleBadge={
                count === undefined ? undefined : (
                  <View style={[styles.countPill, { backgroundColor: `${colors.primary}1F` }]}>
                    <Text variant="bodyStrong" tone="primary" numeric>
                      {count}
                    </Text>
                    <Text variant="caption" tone="primary">
                      {count === 1 ? 'transaction' : 'transactions'}
                    </Text>
                  </View>
                )
              }
              right={
                <View style={styles.headerButtons}>
                  <IconButton
                    icon="calendar"
                    accessibilityLabel={showCalendar ? 'Hide calendar' : 'Show calendar'}
                    onPress={() => setShowCalendar(!showCalendar)}
                  />
                  <View>
                    <IconButton
                      icon="filter"
                      accessibilityLabel={filterCount > 0 ? `Filters, ${filterCount} active` : 'Filters'}
                      onPress={() => router.push('/history-filters')}
                    />
                    {filterCount > 0 ? (
                      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text variant="caption" tone="onPrimary" style={styles.badgeText}>
                          {filterCount}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              }
            />

            {showCalendar ? <HistoryCalendar selected={selectedDay} onSelect={selectDay} /> : null}

            <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Icon name="search" size={20} color={colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search transactions"
                placeholderTextColor={colors.textMuted}
                cursorColor={colors.primary}
                selectionColor={`${colors.primary}55`}
                returnKeyType="search"
                style={[styles.searchInput, { color: colors.text }]}
                accessibilityLabel="Search transactions"
              />
              {search ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => setSearch('')}
                  hitSlop={8}>
                  <Icon name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            {search.trim() ? (
              <ChipGroup>
                {SEARCH_FIELDS.map((f) => (
                  <Chip
                    key={f.value}
                    label={f.label}
                    selected={searchField === f.value}
                    onPress={() => setSearchField(f.value)}
                  />
                ))}
              </ChipGroup>
            ) : null}

            <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />

            <ChipGroup>
              <Chip label="Show balances" selected={showRunning} onPress={() => setShowRunning(!showRunning)} />
              {chips.map((chip) => (
                <Chip key={chip.key} label={chip.label} selected removable onPress={() => setHistoryFilters(chip.cleared)} />
              ))}
            </ChipGroup>
          </View>
        }
        ListEmptyComponent={
          !transactions ? undefined : isFiltering ? (
            <EmptyState
              emoji="🔍"
              title="No matches"
              message="No transactions match your search and filters."
              actions={<Button label="Clear search and filters" variant="secondary" onPress={resetAll} />}
            />
          ) : (
            <EmptyState
              emoji="🧾"
              title="No transactions"
              message="Everything you spend, earn, or transfer will show up here."
              actions={<Button label="Add transaction" icon="add" onPress={() => router.push('/transaction/new')} />}
            />
          )
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text variant="label" tone="secondary">
              {formatDayLabel(section.date)}
            </Text>
            <Text variant="caption" tone={section.net >= 0 ? 'success' : 'secondary'} numeric>
              {section.net >= 0 ? '+' : '−'}
              {formatCurrency(Math.abs(section.net), currency)}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              { backgroundColor: colors.card },
              index === 0 && styles.groupTop,
              index === section.data.length - 1 && styles.groupBottom,
            ]}>
            <TransactionRow transaction={item} currency={currency} divider={index > 0} balance={balanceCaption(item)} />
          </View>
        )}
      />
      <Fab accessibilityLabel="Add transaction" onPress={() => router.push('/transaction/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listHeader: {
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    pointerEvents: 'none',
  },
  badgeText: {
    fontWeight: '700',
    lineHeight: 16,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  groupTop: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    overflow: 'hidden',
  },
  groupBottom: {
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    overflow: 'hidden',
  },
});
