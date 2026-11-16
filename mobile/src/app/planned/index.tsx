import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { PlannedRow } from '@/components/planned-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { listPlanned } from '@/db/planned';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { formatCurrency } from '@/lib/format';
import { daysUntil, monthlyEquivalent } from '@/lib/planned';
import type { PlannedPaymentListItem } from '@/types/models';

export default function PlannedScreen() {
  const db = useSQLiteContext();
  const settings = useSettings();
  const planned = useDbQuery(listPlanned, ['planned_payments', 'accounts', 'categories']);
  const currency = settings?.currency ?? 'INR';

  if (!planned) return null;

  const active = planned.filter((p) => p.enabled);
  const overdue = active.filter((p) => daysUntil(p.nextDate) < 0);
  const upcoming = active.filter((p) => daysUntil(p.nextDate) >= 0);
  const paused = planned.filter((p) => !p.enabled);
  const monthly = active.reduce((sum, p) => sum + monthlyEquivalent(p), 0);

  const section = (title: string, items: PlannedPaymentListItem[]) =>
    items.length > 0 ? (
      <View style={styles.section}>
        <SectionHeader title={title} />
        <Card flush>
          {items.map((p, i) => (
            <PlannedRow key={p.id} payment={p} currency={currency} db={db} divider={i > 0} />
          ))}
        </Card>
      </View>
    ) : null;

  return (
    <Screen variant="stack">
      <Card style={styles.summary}>
        <View style={styles.flex}>
          <Text variant="label" tone="secondary">
            Per month
          </Text>
          <Text variant="heading" numeric numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(monthly, currency)}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="label" tone="secondary">
            Overdue
          </Text>
          <Text variant="heading" tone={overdue.length > 0 ? 'danger' : 'default'}>
            {overdue.length}
          </Text>
        </View>
      </Card>

      {planned.length === 0 ? (
        <EmptyState
          emoji="🗓️"
          title="No planned payments"
          message="Track subscriptions, EMIs, rent, and bills. You'll see what's due and can log them in one tap."
        />
      ) : null}

      {section('Overdue', overdue)}
      {section('Upcoming', upcoming)}
      {section('Paused', paused)}

      <Button label="Add planned payment" icon="add" onPress={() => router.push('/planned/new')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: Spacing.xs,
  },
  summary: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.lg,
  },
});
