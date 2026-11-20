import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ActivityIndicator, Image, Linking, StyleSheet, View } from 'react-native';

import { ProfileAvatar } from '@/components/profile-avatar';
import { BetaBadge } from '@/components/sms/beta-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { getCurrency } from '@/constants/currencies';
import { CONTRIBUTE_URL, DEVELOPER } from '@/constants/developer';
import { Radius, Spacing } from '@/constants/theme';
import { resetAllData } from '@/db/reset';
import { hasSampleData, loadSampleData, removeSampleData } from '@/db/sample-data';
import { countPendingSms } from '@/db/sms';
import { getSyncState } from '@/db/sync';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { exportWithPrompt, importBackupWithPrompt } from '@/lib/backup-actions';
import { showDialog } from '@/lib/dialog';
import { disconnectDrive, useSyncStatus } from '@/lib/drive-sync';
import { addDays, formatShortDate, toDateKey } from '@/lib/format';
import { EMPTY_HISTORY_FILTERS, setHistoryFilters } from '@/lib/history-filters';
import { clearPin } from '@/lib/lock';
import { smsImportAvailable } from '@/lib/sms/scan';
import { deleteProfilePhoto } from '@/lib/profile-photo';
import { describeSync, formatSyncTime } from '@/lib/sync-status';
import { checkForUpdatesWithDialog, downloadUpdate } from '@/lib/update-prompts';
import { APP_VERSION, useUpdateState, type UpdateState } from '@/lib/updates';

const THEME_LABELS = { system: 'System', light: 'Light', dark: 'Dark' } as const;
const APP_ICON = require('@/assets/images/app-icon-small.png');
const WEB_APP_HOST = 'spendtrak.vercel.app';
const WEB_APP_URL = `https://${WEB_APP_HOST}`;

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
  const syncState = useDbQuery(getSyncState, ['sync_state']);
  const smsPending = useDbQuery(countPendingSms, ['sms_messages']);
  const syncStatus = useSyncStatus();
  const currency = settings ? getCurrency(settings.currency) : undefined;
  const drive = syncState?.account ? describeSync(syncState, syncStatus) : null;
  const update = useUpdateState();

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

  function confirmOpenWeb() {
    showDialog(
      'SpendTrak on the web',
      `Use SpendTrak in any browser at ${WEB_APP_HOST}, on your computer or phone. To see the same data there, turn on Google Drive sync here and on the web with the same Google account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open website',
          onPress: () =>
            Linking.openURL(WEB_APP_URL).catch(() => showDialog('Couldn’t open the browser', `Visit ${WEB_APP_HOST} in your browser.`)),
        },
      ],
      { icon: 'globe' }
    );
  }

  async function resetEverything() {
    try {
      await clearPin();
      await disconnectDrive(db);
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
          leading={<ProfileAvatar size={28} photoUri={settings?.profilePhotoUri ?? syncState?.account?.photo} />}
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
        {smsImportAvailable ? (
          <ListRow
            divider
            leading={<Icon name="sms" color={colors.primary} />}
            title="Bank SMS import"
            subtitle={settings?.smsImportEnabled ? (smsPending ? `On · ${smsPending} to review` : 'On') : 'Add transactions from bank messages'}
            trailing={<BetaBadge />}
            onPress={() => router.push(settings?.smsImportEnabled ? '/sms' : '/sms/settings')}
          />
        ) : null}
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
          leading={<Icon name={drive ? drive.icon : 'cloud'} color={colors.primary} />}
          title="Google Drive"
          subtitle={drive ? `${drive.title} · ${syncState?.account?.email}` : 'Back up and sync with the web app'}
          onPress={() => router.push('/drive')}
        />
        <ListRow
          divider
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
      <Card style={styles.appCard}>
        <Image source={APP_ICON} style={styles.appIcon} accessibilityIgnoresInvertColors />
        <View style={styles.flex}>
          <Text variant="heading">SpendTrak</Text>
          <Text variant="caption" tone="secondary">
            Version {APP_VERSION} · Private, offline expense tracker
          </Text>
        </View>
      </Card>
      {update.phase === 'available' ? (
        <Card style={[styles.updateCard, { borderColor: colors.primary }]}>
          <View style={styles.updateHeader}>
            <View style={[styles.updateIcon, { backgroundColor: `${colors.primary}1F` }]}>
              <Icon name="systemUpdate" color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong">Version {update.update.version} is available</Text>
              {update.update.note ? (
                <Text variant="caption" tone="secondary" numberOfLines={3}>
                  {update.update.note}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.updateButtons}>
            <View style={styles.flex}>
              <Button
                label={update.update.apk ? `Download · ${update.update.apk.sizeMb} MB` : 'Download'}
                icon="download"
                onPress={() => downloadUpdate(update.update)}
              />
            </View>
            <Button label="What's new" variant="secondary" onPress={() => void Linking.openURL(update.update.pageUrl)} />
          </View>
        </Card>
      ) : null}
      <Card flush>
        <ListRow
          leading={<Icon name="systemUpdate" color={colors.primary} />}
          title="Check for updates"
          subtitle={updateSubtitle(update)}
          trailing={update.phase === 'checking' ? <ActivityIndicator color={colors.primary} /> : undefined}
          onPress={update.phase === 'checking' ? undefined : checkForUpdatesWithDialog}
        />
        <ListRow
          divider
          leading={<Image source={DEVELOPER.photo} style={styles.devPhoto} accessibilityIgnoresInvertColors />}
          title="Meet the developer"
          subtitle={`${DEVELOPER.name} · other apps and links`}
          onPress={() => router.push('/developer')}
        />
        <ListRow
          divider
          leading={<Icon name="coffee" color="#F59E0B" />}
          title="Contribute"
          subtitle="Help keep SpendTrak free and ad-free"
          trailing={<Icon name="openInNew" size={20} color={colors.textMuted} />}
          onPress={() => void Linking.openURL(CONTRIBUTE_URL)}
        />
        <ListRow
          divider
          leading={<Icon name="globe" color={colors.primary} />}
          title="Use on the web"
          subtitle={WEB_APP_HOST}
          trailing={<Icon name="openInNew" size={20} color={colors.textMuted} />}
          onPress={confirmOpenWeb}
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

function updateSubtitle(update: UpdateState): string {
  switch (update.phase) {
    case 'checking':
      return 'Checking…';
    case 'current':
      return `You're on the latest version · checked ${formatSyncTime(new Date(update.checkedAt).toISOString())}`;
    case 'available':
      return `Version ${update.update.version} is ready to download`;
    case 'error':
      return update.message;
    case 'idle':
      return `You have version ${APP_VERSION}`;
  }
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  appIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  updateCard: {
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  updateHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  updateIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  devPhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
