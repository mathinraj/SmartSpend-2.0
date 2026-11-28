import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { BetaBadge } from '@/components/sms/beta-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { hasSampleData, loadSampleData, removeSampleData } from '@/db/sample-data';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { showDialog } from '@/lib/dialog';
import { smsImportAvailable } from '@/lib/sms/scan';

/** Optional extras and features still being tested, kept out of the main Settings list. */
export default function ExperimentalScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const sampleLoaded = useDbQuery(hasSampleData, ['accounts']);

  function confirmRemoveSample() {
    showDialog('Remove sample data?', 'The demo accounts, transactions, planned payments, and split entries will be deleted. Your own data stays.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeSampleData(db) },
    ]);
  }

  return (
    <Screen variant="stack">
      <SectionHeader title="Sample data" />
      <Card style={styles.card}>
        <View style={styles.row}>
          <Icon name="sparkles" color={colors.primary} />
          <Text variant="bodyStrong" style={styles.flex}>
            {sampleLoaded ? 'Sample data is loaded' : 'Explore with sample data'}
          </Text>
        </View>
        <Text variant="caption" tone="secondary">
          Demo bank accounts, a credit card, transactions, planned payments, and split expenses, so you can try every screen.
          They sit alongside your own data, never sync to Google Drive, and can be removed in one tap.
        </Text>
        {sampleLoaded ? (
          <Button label="Remove sample data" icon="delete" variant="secondary" size="small" onPress={confirmRemoveSample} />
        ) : (
          <Button label="Load sample data" icon="sparkles" size="small" onPress={() => loadSampleData(db)} />
        )}
      </Card>

      {smsImportAvailable ? (
        <>
          <SectionHeader title="In testing" />
          <Card flush>
            <ListRow
              leading={<Icon name="sms" color={colors.primary} />}
              title="Bank SMS import"
              subtitle={settings?.smsImportEnabled ? 'On' : 'Add transactions from bank messages'}
              trailing={<BetaBadge />}
              onPress={() => router.push(settings?.smsImportEnabled ? '/sms' : '/sms/settings')}
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  flex: {
    flex: 1,
  },
});
