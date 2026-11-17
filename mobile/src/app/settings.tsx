import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { ProfileAvatar } from '@/components/profile-avatar';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { getCurrency } from '@/constants/currencies';
import { resetAllData } from '@/db/reset';
import { hasSampleData, loadSampleData, removeSampleData } from '@/db/sample-data';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { exportWithPrompt, importBackupWithPrompt } from '@/lib/backup-actions';
import { showDialog } from '@/lib/dialog';
import { addDays, formatShortDate, toDateKey } from '@/lib/format';
import { EMPTY_HISTORY_FILTERS, setHistoryFilters } from '@/lib/history-filters';
import { clearPin } from '@/lib/lock';
import { deleteProfilePhoto } from '@/lib/profile-photo';

const THEME_LABELS = { system: 'System', light: 'Light', dark: 'Dark' } as const;

function lastBackupText(date: string | null): string {
  if (!date) return 'never backed up';
  const today = new Date();
  if (date === toDateKey(today)) return 'last backup today';
  if (date === toDateKey(addDays(today, -1))) return 'last backup yesterday';
  return `last backup ${formatShortDate(date)}`;
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const sampleLoaded = useDbQuery(hasSampleData, ['accounts']);
  const currency = settings ? getCurrency(settings.currency) : undefined;

  function confirmRemoveSample() {
    showDialog('Remove sample data?', 'The demo accounts, transactions, planned payments, and split entries will be deleted. Your own data stays.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeSampleData(db) },
    ]);
  }

  function confirmReset() {
    showDialog(
      'Reset everything?',
      'This deletes all accounts, transactions, categories, planned payments, splits, settings, and the app lock PIN on this phone. It can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export backup', onPress: () => exportWithPrompt(db, 'backup') },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () =>
            showDialog('Delete everything now?', 'You’ll go back to the first-run setup.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete everything', style: 'destructive', onPress: resetEverything },
            ]),
        },
      ]
    );
  }

  async function resetEverything() {
    try {
      await clearPin();
      setHistoryFilters(EMPTY_HISTORY_FILTERS);
      deleteProfilePhoto(settings?.profilePhotoUri ?? null);
      await resetAllData(db);
    } catch (error) {
      showDialog('Reset failed', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Screen variant="stack">
      <SectionHeader title="Preferences" />
      <Card flush>
        <ListRow
          leading={<ProfileAvatar size={28} photoUri={settings?.profilePhotoUri} />}
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
        <ListRow
          divider
          leading={<Icon name="palette" color={colors.primary} />}
          title="Customize"
          subtitle={settings ? `${THEME_LABELS[settings.theme]} theme · Home, balances, defaults` : undefined}
          onPress={() => router.push('/customize')}
        />
        <ListRow
          divider
          leading={<Icon name="category" color={colors.primary} />}
          title="Categories"
          subtitle="Add, edit, and reorder"
          onPress={() => router.push('/categories')}
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
          subtitle={settings?.lockEnabled ? `On · ${settings.lockType === 'password' ? 'Password' : 'PIN'}` : 'Off'}
          onPress={() => router.push('/security')}
        />
        <ListRow
          divider
          leading={<Icon name="bell" color={colors.primary} />}
          title="Reminders"
          subtitle={
            [
              settings?.reminders.some((r) => r.enabled)
                ? `${settings.reminders.filter((r) => r.enabled).length} custom`
                : null,
              settings?.dueReminders ? 'Payment due' : null,
              settings?.backupReminder ? 'Backup' : null,
            ]
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
          title="Export"
          subtitle={`Data backup, Excel, PDF, or CSV · ${lastBackupText(settings?.lastBackupAt ?? null)}`}
          onPress={() => router.push('/export')}
        />
        <ListRow
          divider
          leading={<Icon name="download" color={colors.primary} />}
          title="Import"
          subtitle="Restore from a data backup (.json) file"
          onPress={() => importBackupWithPrompt(db)}
        />
      </Card>

      <SectionHeader title="Data" />
      <Card flush>
        {sampleLoaded ? (
          <ListRow
            leading={<Icon name="delete" color={colors.danger} />}
            title="Remove sample data"
            subtitle="Delete the demo accounts, transactions, planned payments, and splits"
            onPress={confirmRemoveSample}
          />
        ) : (
          <ListRow
            leading={<Icon name="sparkles" color={colors.primary} />}
            title="Load sample data"
            subtitle="Explore with demo accounts, planned payments, and split expenses"
            onPress={() => loadSampleData(db)}
          />
        )}
        <ListRow
          divider
          leading={<Icon name="delete" color={colors.danger} />}
          title="Reset everything"
          subtitle="Delete all data on this phone and start over"
          onPress={confirmReset}
        />
      </Card>

      <SectionHeader title="About" />
      <Card flush>
        <ListRow
          leading={<Icon name="info" color={colors.textSecondary} />}
          title="SpendTrak"
          subtitle="All data stays on this device"
          trailing={<Text tone="secondary">v{Constants.expoConfig?.version ?? '—'}</Text>}
        />
        <ListRow
          divider
          leading={<Icon name="feedback" color={colors.primary} />}
          title="Send feedback"
          subtitle="Report a bug or suggest a feature"
          onPress={() => router.push('/feedback')}
        />
      </Card>
    </Screen>
  );
}
