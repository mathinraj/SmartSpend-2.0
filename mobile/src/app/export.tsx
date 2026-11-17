import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { exportWithPrompt, type ExportFormat } from '@/lib/backup-actions';

const REPORTS: { format: ExportFormat; icon: IconName; title: string; subtitle: string }[] = [
  { format: 'excel', icon: 'table', title: 'Excel workbook', subtitle: 'Transactions, accounts, and monthly summary sheets' },
  { format: 'pdf', icon: 'receipt', title: 'PDF report', subtitle: 'A printable summary with your transactions' },
  { format: 'csv', icon: 'table', title: 'CSV file', subtitle: 'A plain transactions table for any spreadsheet app' },
];

export default function ExportScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();

  return (
    <Screen variant="stack">
      <SectionHeader title="Back up your data" />
      <Card flush>
        <ListRow
          leading={<Icon name="json" color={colors.primary} />}
          title="Data backup (.json)"
          subtitle="All your data; restores here or on the web"
          onPress={() => exportWithPrompt(db, 'backup')}
        />
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: `${colors.primary}1F` }]}>
            <Icon name="download" size={14} color={colors.primary} />
            <Text variant="caption" tone="primary" style={styles.tagText}>
              Needed to restore with Import
            </Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="Reports" />
      <Card flush>
        {REPORTS.map((r, i) => (
          <ListRow
            key={r.format}
            divider={i > 0}
            leading={<Icon name={r.icon} color={colors.primary} />}
            title={r.title}
            subtitle={r.subtitle}
            onPress={() => exportWithPrompt(db, r.format)}
          />
        ))}
      </Card>
      <Text variant="caption" tone="muted">
        Reports are for reading and sharing. They can&apos;t be imported back; use a data backup for that.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tagRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    marginTop: -Spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  tagText: {
    fontWeight: '700',
  },
});
