import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { showDialog } from '@/lib/dialog';
import { listRestorePoints, restoreFrom, type RestorePoint } from '@/lib/drive-sync';

export default function DriveRestoreScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const [points, setPoints] = useState<RestorePoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    listRestorePoints().then(setPoints, (e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  function confirmRestore(point: RestorePoint) {
    showDialog(
      'Restore this version?',
      `${point.label}\n\nThe data on this phone is replaced by this copy, and Google Drive and your other devices are updated to match. A copy of your current data is kept on this phone first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: () => restore(point) },
      ],
      { icon: 'history' }
    );
  }

  async function restore(point: RestorePoint) {
    setRestoring(true);
    try {
      await restoreFrom(db, point);
      router.back();
      showDialog('Restored', 'Your data is back to the chosen version.', undefined, { icon: 'cloudDone' });
    } catch (e) {
      setRestoring(false);
      showDialog("Couldn't restore", e instanceof Error ? e.message : String(e));
    }
  }

  if (error) return <EmptyState emoji="☁️" title="Couldn't load the copies" message={error} />;
  if (!points || restoring) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        {restoring ? <Text tone="secondary">Restoring…</Text> : null}
      </View>
    );
  }
  if (points.length === 0) {
    return <EmptyState emoji="☁️" title="No earlier copies yet" message="SpendTrak keeps one copy a day in Google Drive for the last 7 days." />;
  }

  return (
    <Screen variant="stack">
      <Card flush>
        {points.map((point, i) => (
          <ListRow
            key={point.key}
            divider={i > 0}
            leading={<Icon name={point.source === 'drive' ? 'cloud' : 'history'} color={colors.primary} />}
            title={point.label}
            onPress={() => confirmRestore(point)}
          />
        ))}
      </Card>
      <Text variant="caption" tone="muted">
        Google Drive keeps the last 7 daily copies. This phone also keeps its data from just before the last 3 times a
        sync brought in changes.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
});
