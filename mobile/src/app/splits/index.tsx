import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { Field } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { updateSettings } from '@/db/settings';
import { getPersonBalances } from '@/db/splits';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { formatCurrency } from '@/lib/format';

export default function SplitsScreen() {
  const db = useSQLiteContext();
  const settings = useSettings();
  const currency = settings?.currency ?? 'INR';
  const balances = useDbQuery(getPersonBalances, ['split_entries'], settings?.splitPeople ?? []);

  if (!balances) return null;

  const owedToYou = balances.filter((b) => b.balance > 0).reduce((sum, b) => sum + b.balance, 0);
  const youOwe = balances.filter((b) => b.balance < 0).reduce((sum, b) => sum - b.balance, 0);

  return (
    <Screen variant="stack">
      <Card style={styles.summary}>
        <View style={styles.flex}>
          <Text variant="label" tone="secondary">
            Owed to you
          </Text>
          <Text variant="heading" tone="success" numeric numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(owedToYou, currency)}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="label" tone="secondary">
            You owe
          </Text>
          <Text variant="heading" tone="danger" numeric numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(youOwe, currency)}
          </Text>
        </View>
      </Card>

      {balances.length === 0 ? (
        <EmptyState
          emoji="🤝"
          title="Split expenses with friends"
          message="Add the people you share costs with. When you add an expense, choose who to split it with, and track who owes what."
        />
      ) : (
        <View style={styles.section}>
          <SectionHeader title="People" />
          <Card flush>
            {balances.map((b, i) => (
              <ListRow
                key={b.person}
                divider={i > 0}
                onPress={() => router.push({ pathname: '/splits/person/[name]', params: { name: b.person } })}
                leading={<Avatar emoji="👤" color="#A29BFE" />}
                title={b.person}
                subtitle={b.balance > 0 ? 'Owes you' : b.balance < 0 ? 'You owe' : 'Settled up'}
                trailing={
                  <Text
                    variant="bodyStrong"
                    tone={b.balance > 0 ? 'success' : b.balance < 0 ? 'danger' : 'muted'}
                    numeric>
                    {formatCurrency(Math.abs(b.balance), currency)}
                  </Text>
                }
              />
            ))}
          </Card>
        </View>
      )}

      <Button label="Add person" icon="add" onPress={() => router.push('/splits/add-person')} />

      {settings ? (
        <View style={styles.section}>
          <SectionHeader title="Settings" />
          <Field
            label="When you pay for a group"
            hint={
              settings.splitBankDeduction === 'my_share'
                ? 'Only your share is taken from the account. Use this if friends paid you back right away. Applies to new split expenses.'
                : 'The whole bill is taken from the account. Applies to new split expenses.'
            }>
            <SegmentedControl
              options={[
                { value: 'full', label: 'Take full amount' },
                { value: 'my_share', label: 'Only my share' },
              ]}
              value={settings.splitBankDeduction}
              onChange={(value) => updateSettings(db, { splitBankDeduction: value })}
            />
          </Field>
          <Field label="Count as my spending" hint="What Home and Analytics show for split expenses.">
            <SegmentedControl
              options={[
                { value: 'my_share', label: 'Only my share' },
                { value: 'full', label: 'Full amount' },
              ]}
              value={settings.splitExpenseRecord}
              onChange={(value) => updateSettings(db, { splitExpenseRecord: value })}
            />
          </Field>
        </View>
      ) : null}
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
