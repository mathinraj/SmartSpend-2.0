import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProfileAvatar } from '@/components/profile-avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { getSyncState } from '@/db/sync';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { showDialog } from '@/lib/dialog';
import { connectDrive, deleteDriveData, disconnectDrive, setSyncMode, syncNow, useSyncStatus } from '@/lib/drive-sync';
import { describeSync } from '@/lib/sync-status';

export default function DriveScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const state = useDbQuery(getSyncState, ['sync_state']);
  const status = useSyncStatus();
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    try {
      await connectDrive(db);
    } catch (error) {
      showDialog("Couldn't connect to Google", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  if (!state.account) {
    return (
      <Screen variant="stack">
        <Card style={styles.intro}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}1F` }]}>
            <Icon name="cloud" size={32} color={colors.primary} />
          </View>
          <Text variant="heading" style={styles.center}>
            Back up and sync with Google Drive
          </Text>
          <Text tone="secondary" style={styles.center}>
            Your data is saved in a private folder in your Google Drive. Sign in with the same account on the web app
            (spendtrak.vercel.app) or a new phone to use the same data there.
          </Text>
          <View style={styles.stretch}>
            <Button label={busy ? 'Connecting…' : 'Connect Google Drive'} icon="cloud" onPress={connect} disabled={busy} />
          </View>
        </Card>
        <Text variant="caption" tone="muted">
          SpendTrak can only see the files it creates in your Drive, nothing else. The folder is hidden and doesn&apos;t use
          up space you&apos;d notice.
        </Text>
      </Screen>
    );
  }

  const manual = state.mode === 'manual';
  const syncing = status.phase === 'syncing';
  const summary = describeSync(state, status);
  const tint = status.phase === 'signin' || status.phase === 'error' ? colors.danger : colors.primary;

  function confirmDisconnect() {
    showDialog('Disconnect Google Drive?', 'Syncing stops. Your data stays on this phone and in Google Drive.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => disconnectDrive(db) },
    ]);
  }

  function confirmDelete() {
    showDialog(
      'Delete data from Google Drive?',
      "SpendTrak's copies in your Drive, including the daily ones, are deleted and syncing stops. The web app loses access to this data. Your data on this phone stays.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteDriveData(db).catch((error) =>
              showDialog("Couldn't delete", error instanceof Error ? error.message : String(error))
            ),
        },
      ]
    );
  }

  return (
    <Screen variant="stack">
      <Card flush>
        <ListRow
          leading={<ProfileAvatar size={40} photoUri={state.account.photo} />}
          title={state.account.name ?? state.account.email}
          subtitle={state.account.email}
        />
        <ListRow
          divider
          leading={<Icon name={summary.icon} color={tint} />}
          title={summary.title}
          subtitle={summary.detail}
          onPress={status.phase === 'signin' ? connect : undefined}
        />
      </Card>
      <Button
        label={syncing ? (manual ? 'Backing up…' : 'Syncing…') : manual ? 'Back up now' : 'Sync now'}
        icon="sync"
        onPress={() => syncNow(db, { manual: true })}
        disabled={syncing}
      />

      <SectionHeader title="How to sync" />
      <Card flush>
        <ListRow
          leading={<Icon name="sync" color={colors.primary} />}
          title="Sync automatically"
          subtitle="Saves every change within seconds; recommended"
          showChevron={false}
          trailing={manual ? null : <Icon name="check" color={colors.primary} />}
          onPress={() => setSyncMode(db, 'auto')}
        />
        <ListRow
          divider
          leading={<Icon name="upload" color={colors.primary} />}
          title="Manual backup"
          subtitle="Only when you tap Back up now"
          showChevron={false}
          trailing={manual ? <Icon name="check" color={colors.primary} /> : null}
          onPress={() => setSyncMode(db, 'manual')}
        />
      </Card>
      <Text variant="caption" tone="muted">
        {manual
          ? 'Back up now also brings in changes made on the web app or your other devices.'
          : 'Changes from the web app and your other devices come in when you open SpendTrak.'}
      </Text>

      <SectionHeader title="More" />
      <Card flush>
        <ListRow
          leading={<Icon name="history" color={colors.primary} />}
          title="Restore an earlier version"
          subtitle="Daily copies from the last 7 days"
          onPress={() => router.push('/drive-restore')}
        />
        <ListRow
          divider
          leading={<Icon name="logout" color={colors.primary} />}
          title="Disconnect"
          subtitle="Stop syncing; your data stays"
          onPress={confirmDisconnect}
        />
        <ListRow
          divider
          leading={<Icon name="delete" color={colors.danger} />}
          title="Delete data from Google Drive"
          subtitle="Removes SpendTrak's copies and disconnects"
          onPress={confirmDelete}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  stretch: {
    alignSelf: 'stretch',
    marginTop: Spacing.sm,
  },
});
