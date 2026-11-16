import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { getCurrency } from '@/constants/currencies';
import { hasSampleData, loadSampleData, removeSampleData } from '@/db/sample-data';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const sampleLoaded = useDbQuery(hasSampleData, ['accounts']);
  const currency = settings ? getCurrency(settings.currency) : undefined;

  function confirmRemoveSample() {
    Alert.alert('Remove sample data?', 'Sample accounts and their transactions will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeSampleData(db) },
    ]);
  }

  return (
    <Screen variant="stack">
      <SectionHeader title="Preferences" />
      <Card flush>
        <ListRow
          leading={<Icon name="person" color={colors.primary} />}
          title="Name"
          subtitle={settings?.profileName ?? 'Not set'}
          onPress={() => router.push('/profile')}
        />
        <ListRow
          divider
          leading={<Icon name="currency" color={colors.primary} />}
          title="Currency"
          subtitle={currency ? `${currency.flag}  ${currency.name} (${currency.symbol})` : undefined}
          onPress={() => router.push('/currency')}
        />
      </Card>

      <SectionHeader title="Data" />
      <Card flush>
        {sampleLoaded ? (
          <ListRow
            leading={<Icon name="delete" color={colors.danger} />}
            title="Remove sample data"
            subtitle="Delete demo accounts and transactions"
            onPress={confirmRemoveSample}
          />
        ) : (
          <ListRow
            leading={<Icon name="sparkles" color={colors.primary} />}
            title="Load sample data"
            subtitle="Explore the app with demo accounts and transactions"
            onPress={() => loadSampleData(db)}
          />
        )}
      </Card>

      <SectionHeader title="About" />
      <Card flush>
        <ListRow
          leading={<Icon name="info" color={colors.textSecondary} />}
          title="SpendTrak"
          subtitle="All data stays on this device"
          trailing={<Text tone="secondary">v{Constants.expoConfig?.version ?? '—'}</Text>}
        />
      </Card>
    </Screen>
  );
}
