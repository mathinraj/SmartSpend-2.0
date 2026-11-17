import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Alert } from 'react-native';

import { buildBackup, buildTransactionsCsv, importBackup, InvalidBackupError, type ImportSummary } from '@/db/backup';
import { buildReport } from '@/db/reports';
import { toDateKey } from '@/lib/format';
import { withLockSuppressed } from '@/lib/lock';
import { buildXlsx, renderReportHtml } from '@/lib/report-files';

async function shareText(fileName: string, contents: string, mimeType: string, dialogTitle: string) {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(contents);
  await withLockSuppressed(() => Sharing.shareAsync(file.uri, { mimeType, dialogTitle }));
}

async function shareFile(file: File, mimeType: string, dialogTitle: string) {
  await withLockSuppressed(() => Sharing.shareAsync(file.uri, { mimeType, dialogTitle }));
}

function reportError(title: string, error: unknown) {
  Alert.alert(title, error instanceof Error ? error.message : String(error));
}

export async function exportBackup(db: SQLiteDatabase) {
  try {
    const backup = await buildBackup(db, Constants.expoConfig?.version ?? 'unknown');
    await shareText(
      `spendtrak-backup-${toDateKey(new Date())}.json`,
      JSON.stringify(backup, null, 2),
      'application/json',
      'Save or send your backup'
    );
  } catch (error) {
    reportError('Export failed', error);
  }
}

export async function exportCsv(db: SQLiteDatabase) {
  try {
    await shareText(
      `spendtrak-transactions-${toDateKey(new Date())}.csv`,
      await buildTransactionsCsv(db),
      'text/csv',
      'Export transactions'
    );
  } catch (error) {
    reportError('Export failed', error);
  }
}

export async function exportPdf(db: SQLiteDatabase) {
  try {
    // Expo Go prints into a folder this app can't read back, so take the bytes instead of moving the file.
    const { base64 } = await Print.printToFileAsync({ html: renderReportHtml(await buildReport(db)), base64: true });
    if (!base64) throw new Error('The PDF could not be created.');
    const file = new File(Paths.cache, `spendtrak-report-${toDateKey(new Date())}.pdf`);
    file.create({ overwrite: true });
    await file.write(base64, { encoding: 'base64' });
    await shareFile(file, 'application/pdf', 'Export PDF report');
  } catch (error) {
    reportError('Export failed', error);
  }
}

export async function exportExcel(db: SQLiteDatabase) {
  try {
    const file = new File(Paths.cache, `spendtrak-report-${toDateKey(new Date())}.xlsx`);
    file.create({ overwrite: true });
    await file.write(buildXlsx(await buildReport(db)));
    await shareFile(file, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Export Excel workbook');
  } catch (error) {
    reportError('Export failed', error);
  }
}

function describe(summary: ImportSummary): string {
  return [
    `${summary.accounts} accounts`,
    `${summary.transactions} transactions`,
    `${summary.plannedPayments} planned payments`,
    `${summary.splitEntries} split entries`,
  ].join('\n');
}

async function runImport(db: SQLiteDatabase, mode: 'replace' | 'merge') {
  try {
    const picked = await withLockSuppressed(() => File.pickFileAsync({ mimeTypes: '*/*' }));
    if (picked.canceled) return;
    let data: unknown;
    try {
      data = JSON.parse(await picked.result.text());
    } catch {
      throw new InvalidBackupError('Choose a SpendTrak backup file (.json).');
    }
    const summary = await importBackup(db, data, mode);
    Alert.alert(mode === 'replace' ? 'Backup restored' : 'Backup merged', `Added:\n${describe(summary)}`);
  } catch (error) {
    reportError('Import failed', error);
  }
}

/** Asks how to import, then lets the user pick a JSON backup from this app or the web app. */
export function importBackupWithPrompt(db: SQLiteDatabase) {
  Alert.alert(
    'Import backup',
    'Merge adds only new records. Replace deletes your current accounts, transactions, planned payments, and splits first.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace all', style: 'destructive', onPress: () => runImport(db, 'replace') },
      { text: 'Merge', onPress: () => runImport(db, 'merge') },
    ]
  );
}
