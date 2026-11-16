import { router } from 'expo-router';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TransactionRow } from '@/components/transaction-row';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab, FAB_CLEARANCE } from '@/components/ui/fab';
import { ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { listTransactions } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency, formatDayLabel } from '@/lib/format';
import type { TransactionListItem } from '@/types/models';

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

export default function HistoryScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const transactions = useDbQuery(listTransactions, ['transactions', 'accounts', 'categories', 'subcategories']);
  const currency = settings?.currency ?? 'INR';
  const sections = transactions ? groupByDay(transactions) : [];

  return (
    <View style={styles.root} collapsable={false}>
      <SectionList
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: BottomTabInset + Spacing.xxl + FAB_CLEARANCE,
          paddingHorizontal: Spacing.lg,
        }}
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <ScreenHeader
              title="History"
              subtitle={transactions ? `${transactions.length} transactions` : undefined}
            />
          </View>
        }
        ListEmptyComponent={
          transactions ? (
            <EmptyState
              emoji="🧾"
              title="No transactions"
              message="Everything you spend, earn, or transfer will show up here."
              actions={<Button label="Add transaction" icon="add" onPress={() => router.push('/transaction/new')} />}
            />
          ) : undefined
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
            <TransactionRow transaction={item} currency={currency} divider={index > 0} />
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
    marginBottom: Spacing.sm,
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
