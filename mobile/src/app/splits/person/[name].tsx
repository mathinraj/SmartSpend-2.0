import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { updateSettings } from '@/db/settings';
import { deleteSplitEntry, getPersonBalance, listSplitEntries } from '@/db/splits';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { formatCurrency, formatDayLabel } from '@/lib/format';
import { balanceSummary, entryDisplay } from '@/lib/splits';
import type { SplitEntry } from '@/types/models';

export default function PersonScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const db = useSQLiteContext();
  const settings = useSettings();
  const entries = useDbQuery(listSplitEntries, ['split_entries'], name);
  const balance = useDbQuery(getPersonBalance, ['split_entries'], name);
  const currency = settings?.currency ?? 'INR';

  if (entries === undefined || balance === undefined || !settings) return null;

  const inList = settings.splitPeople.includes(name);

  function confirmDeleteEntry(entry: SplitEntry) {
    Alert.alert(
      'Delete this entry?',
      entry.transactionId ? 'The linked transaction is not changed.' : undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSplitEntry(db, entry.id) },
      ]
    );
  }

  function confirmRemove() {
    Alert.alert(`Remove ${name}?`, 'Their history is kept, but they will no longer be offered when splitting.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          router.back();
          updateSettings(db, { splitPeople: settings!.splitPeople.filter((p) => p !== name) });
        },
      },
    ]);
  }

  return (
    <Screen variant="stack">
      <Stack.Screen options={{ title: name }} />
      <Card style={styles.hero}>
        <Text
          variant="display"
          tone={balance > 0 ? 'success' : balance < 0 ? 'danger' : 'muted'}
          numeric
          numberOfLines={1}
          adjustsFontSizeToFit>
          {formatCurrency(Math.abs(balance), currency)}
        </Text>
        <Text variant="bodyStrong" tone="secondary">
          {balanceSummary(name, balance, formatCurrency(Math.abs(balance), currency))}
        </Text>
      </Card>

      <View style={styles.actions}>
        {balance !== 0 ? (
          <Button
            label="Settle up"
            icon="check"
            onPress={() => router.push({ pathname: '/splits/settle', params: { person: name } })}
          />
        ) : null}
        <Button
          label="Add entry"
          icon="add"
          variant="secondary"
          onPress={() => router.push({ pathname: '/splits/entry', params: { person: name } })}
        />
      </View>

      {entries.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="History" />
          <Card flush>
            {entries.map((e, i) => {
              const display = entryDisplay(e);
              return (
                <ListRow
                  key={e.id}
                  divider={i > 0}
                  onPress={() => confirmDeleteEntry(e)}
                  leading={<Avatar emoji={display.emoji} color={e.type === 'settlement' ? '#74B9FF' : '#A29BFE'} />}
                  title={e.note || display.label}
                  subtitle={`${display.label} · ${formatDayLabel(e.date)}`}
                  trailing={
                    <Text variant="bodyStrong" tone={display.sign === '+' ? 'success' : 'danger'} numeric>
                      {display.sign}
                      {formatCurrency(e.amount, currency)}
                    </Text>
                  }
                />
              );
            })}
          </Card>
          <Text variant="caption" tone="muted">
            Tap an entry to delete it.
          </Text>
        </View>
      ) : null}

      {inList && balance === 0 ? (
        <Button label={`Remove ${name}`} icon="delete" variant="destructive" onPress={confirmRemove} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  actions: {
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.lg,
  },
});
