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
import { exportBackup, exportCsv, importBackupWithPrompt } from '@/lib/backup-actions';

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

      <SectionHeader title="Tools" />
      <Card flush>
        <ListRow
          leading={<Icon name="repeat" color={colors.primary} />}
          title="Planned payments"
          subtitle="Subscriptions, EMIs, and bills"
          onPress={() => router.push('/planned')}
        />
        <ListRow
          divider
          leading={<Icon name="people" color={colors.primary} />}
          title="Split money"
          subtitle="Who owes whom"
          onPress={() => router.push('/splits')}
        />
      </Card>

      <SectionHeader title="Security & reminders" />
      <Card flush>
        <ListRow
          leading={<Icon name="lock" color={colors.primary} />}
          title="App lock"
          subtitle={settings?.lockEnabled ? 'On' : 'Off'}
          onPress={() => router.push('/security')}
        />
        <ListRow
          divider
          leading={<Icon name="bell" color={colors.primary} />}
          title="Reminders"
          subtitle={
            [settings?.dailyReminder ? 'Daily' : null, settings?.dueReminders ? 'Payment due' : null]
              .filter(Boolean)
              .join(' · ') || 'Off'
          }
          onPress={() => router.push('/reminders')}
        />
      </Card>

      <SectionHeader title="Backup" />
      <Card flush>
        <ListRow
          leading={<Icon name="upload" color={colors.primary} />}
          title="Export backup"
          subtitle="JSON file that also restores in the web app"
          onPress={() => exportBackup(db)}
        />
        <ListRow
          divider
          leading={<Icon name="download" color={colors.primary} />}
          title="Import backup"
          subtitle="From this app or the SpendTrak web app"
          onPress={() => importBackupWithPrompt(db)}
        />
        <ListRow
          divider
          leading={<Icon name="table" color={colors.primary} />}
          title="Export transactions (CSV)"
          subtitle="For Excel or Google Sheets"
          onPress={() => exportCsv(db)}
        />
      </Card>

      <SectionHeader title="Sample data" />
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
