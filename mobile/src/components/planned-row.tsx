import { router } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Avatar, ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { markPlannedPaid } from '@/db/planned';
import { formatCurrency } from '@/lib/format';
import { daysUntil, dueLabel, frequencyLabel } from '@/lib/planned';
import type { PlannedPaymentListItem } from '@/types/models';

export function confirmMarkPaid(db: SQLiteDatabase, payment: PlannedPaymentListItem, currency: string) {
  const amount = formatCurrency(payment.amount, currency);
  const message = payment.accountName
    ? `${amount} will be logged as an expense from ${payment.accountName}.`
    : `No account is linked, so no expense will be logged.`;
  Alert.alert(`Mark ${payment.name} as paid?`, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Mark paid', onPress: () => markPlannedPaid(db, payment.id) },
  ]);
}

export interface PlannedRowProps {
  payment: PlannedPaymentListItem;
  currency: string;
  db: SQLiteDatabase;
  divider?: boolean;
}

export function PlannedRow({ payment: p, currency, db, divider }: PlannedRowProps) {
  const days = daysUntil(p.nextDate);
  const tone = !p.enabled ? 'muted' : days < 0 ? 'danger' : days === 0 ? 'primary' : 'secondary';
  const status = p.enabled ? dueLabel(p.nextDate) : 'Paused';

  return (
    <ListRow
      divider={divider}
      onPress={() => router.push(`/planned/${p.id}`)}
      leading={<Avatar emoji={p.categoryIcon ?? '🗓️'} color={p.categoryColor ?? '#A29BFE'} />}
      title={p.name}
      subtitle={`${frequencyLabel(p.frequency)}${p.accountName ? ` · ${p.accountName}` : ''}`}
      trailing={
        <View style={styles.trailing}>
          <Text variant="bodyStrong" numeric>
            {formatCurrency(p.amount, currency)}
          </Text>
          <Text variant="caption" tone={tone}>
            {status}
          </Text>
          {p.enabled && days <= 3 ? (
            <Button label="Pay" size="small" variant="secondary" onPress={() => confirmMarkPaid(db, p, currency)} />
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  trailing: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
});
