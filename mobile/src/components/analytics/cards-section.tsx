import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PeekButton } from '@/components/peek-button';
import { TransactionRow } from '@/components/transaction-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { getAccountTotals } from '@/db/analytics';
import { getCardPayments } from '@/db/transactions';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { accountEmoji } from '@/lib/accounts';
import type { AnalyticsScope } from '@/lib/analytics-period';
import { useBalancePrivacy } from '@/lib/balance-privacy';
import { formatCurrency } from '@/lib/format';
import type { Account } from '@/types/models';

export interface CardsSectionProps {
  scope: AnalyticsScope;
  /** Credit cards only. */
  cards: Account[];
  hideBalances: boolean;
}

export function CardsSection({ scope, cards, hideBalances }: CardsSectionProps) {
  const { from, to, record, currency } = scope;
  const colors = useTheme();
  const privacy = useBalancePrivacy(hideBalances);
  const totals = useDbQuery(getAccountTotals, ['transactions'], from, to, record);
  const payments = useDbQuery(
    getCardPayments,
    ['transactions', 'accounts', 'categories', 'subcategories'],
    cards.map((c) => c.id)
  );

  if (!totals || !payments) return null;

  return (
    <>
      <View style={styles.header}>
        <SectionHeader title="Credit cards" />
        {privacy.canPeek ? (
          <PeekButton hidden={privacy.hidden} onPress={privacy.togglePeek} color={colors.textSecondary} />
        ) : null}
      </View>
      {cards.map((card) => {
        const owed = Math.max(0, -card.balance);
        const limit = card.creditLimit ?? 0;
        const utilization = limit > 0 ? Math.round((owed / limit) * 100) : null;
        const utilColor =
          utilization === null ? colors.textMuted : utilization < 30 ? colors.success : utilization < 70 ? colors.warning : colors.danger;
        const spent = totals.find((t) => t.accountId === card.id)?.expense ?? 0;
        return (
          <Card key={card.id} style={styles.card}>
            <View style={styles.row}>
              <Text>{accountEmoji(card, currency)}</Text>
              <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                {card.name}
              </Text>
              {utilization !== null ? (
                <Text variant="bodyStrong" numeric style={{ color: utilColor }}>
                  {utilization}% used
                </Text>
              ) : null}
            </View>
            {utilization !== null ? (
              <View style={[styles.track, { backgroundColor: colors.cardMuted }]}>
                <View style={[styles.bar, { backgroundColor: utilColor, width: `${Math.min(utilization, 100)}%` }]} />
              </View>
            ) : null}
            <View style={styles.row}>
              <Detail label="Owed" value={privacy.formatBalance(owed, currency)} />
              <Detail label="Limit" value={limit > 0 ? formatCurrency(limit, currency) : 'Not set'} />
              <Detail label="Available" value={limit > 0 ? privacy.formatBalance(Math.max(0, limit - owed), currency) : '—'} />
            </View>
            <Text variant="caption" tone="secondary">
              Spent on this card for {scope.label}: {formatCurrency(spent, currency)}
            </Text>
            {owed > 0 ? (
              <View style={styles.action}>
                <Button
                  label="Pay bill"
                  icon="transfer"
                  size="small"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/account/pay-bill', params: { id: card.id } })}
                />
              </View>
            ) : null}
          </Card>
        );
      })}

      <SectionHeader title="Recent bill payments" />
      {payments.length > 0 ? (
        <Card flush>
          {payments.map((p, i) => (
            <TransactionRow key={p.id} transaction={p} currency={currency} divider={i > 0} />
          ))}
        </Card>
      ) : (
        <Text tone="secondary">No bill payments yet. Use “Pay bill” on a card to record one.</Text>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.flex}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <Text variant="bodyStrong" numeric numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    gap: Spacing.md,
  },
  action: {
    alignSelf: 'flex-start',
  },
  row: {
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
