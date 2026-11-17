import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { buildBackup, buildTransactionsCsv, importBackup, InvalidBackupError, type ImportSummary } from '@/db/backup';
import { buildReport } from '@/db/reports';
import { getSettings, updateSettings } from '@/db/settings';
import { showDialog } from '@/lib/dialog';
import { toDateKey, toTimeKey } from '@/lib/format';
import { withLockSuppressed } from '@/lib/lock';
import { buildXlsx, renderReportHtml } from '@/lib/report-files';

export type ExportFormat = 'backup' | 'excel' | 'pdf' | 'csv';
export type ExportDestination = 'files' | 'share';

export const EXPORT_FORMATS: Record<ExportFormat, { label: string; noun: string; mimeType: string }> = {
  backup: { label: 'Data backup', noun: 'data backup', mimeType: 'application/json' },
  excel: { label: 'Excel workbook', noun: 'Excel workbook', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  pdf: { label: 'PDF report', noun: 'PDF report', mimeType: 'application/pdf' },
  csv: { label: 'CSV file', noun: 'CSV file', mimeType: 'text/csv' },
};

const BACKUP_FOLDER = 'spendtrak-backup';
/** Opens the folder picker in Downloads. Android doesn't allow picking Downloads itself, only a folder in it. */
const DOWNLOADS_URI = 'content://com.android.externalstorage.documents/document/primary%3ADownload';

function reportError(title: string, error: unknown) {
  showDialog(title, error instanceof Error ? error.message : String(error));
}

/** Writes the chosen export to a file in the cache and returns it. */
async function createExportFile(db: SQLiteDatabase, format: ExportFormat): Promise<File> {
  const now = new Date();
  // Date and time keep several exports from the same day apart and sorted.
  const date = `${toDateKey(now)}-${toTimeKey(now).replace(':', '')}`;
  if (format === 'backup') {
    const file = new File(Paths.cache, `spendtrak-backup-${date}.json`);
    file.create({ overwrite: true });
    await file.write(JSON.stringify(await buildBackup(db, Constants.expoConfig?.version ?? 'unknown'), null, 2));
    return file;
  }
  if (format === 'csv') {
    const file = new File(Paths.cache, `spendtrak-transactions-${date}.csv`);
    file.create({ overwrite: true });
    await file.write(await buildTransactionsCsv(db));
    return file;
  }
  if (format === 'excel') {
    const file = new File(Paths.cache, `spendtrak-report-${date}.xlsx`);
    file.create({ overwrite: true });
    await file.write(buildXlsx(await buildReport(db)));
    return file;
  }
  // Expo Go prints into a folder this app can't read back, so take the bytes instead of moving the file.
  const { base64 } = await Print.printToFileAsync({ html: renderReportHtml(await buildReport(db)), base64: true });
  if (!base64) throw new Error('The PDF could not be created.');
  const file = new File(Paths.cache, `spendtrak-report-${date}.pdf`);
  file.create({ overwrite: true });
  await file.write(base64, { encoding: 'base64' });
  return file;
}

function existingFolder(uri: string | null): Directory | null {
  if (!uri) return null;
  try {
    const dir = new Directory(uri);
    return dir.exists ? dir : null;
  } catch {
    return null;
  }
}

/**
 * The remembered backup folder, or one the user picks now (Android's folder picker, opened in Downloads).
 * A `spendtrak-backup` folder is created inside the picked folder unless that's what they picked.
 * Returns `null` if they cancel.
 */
async function backupFolder(db: SQLiteDatabase, forcePick: boolean): Promise<Directory | null> {
  const settings = await getSettings(db);
  const remembered = forcePick ? null : existingFolder(settings.backupFolderUri);
  if (remembered) return remembered;

  let picked: Directory;
  try {
    picked = await withLockSuppressed(() => Directory.pickDirectoryAsync(DOWNLOADS_URI));
  } catch {
    return null;
  }
  const folder =
    picked.name === BACKUP_FOLDER
      ? picked
      : ((picked.list().find((item) => item instanceof Directory && item.name === BACKUP_FOLDER) as Directory | undefined) ??
        picked.createDirectory(BACKUP_FOLDER));
  await updateSettings(db, { backupFolderUri: folder.uri });
  return folder;
}

async function saveToFolder(db: SQLiteDatabase, file: File, mimeType: string, forcePick = false): Promise<string | null> {
  const folder = await backupFolder(db, forcePick);
  if (!folder) return null;
  try {
    const target = folder.createFile(file.name, mimeType);
    await target.write(await file.bytes());
    return target.name;
  } catch (error) {
    // The folder may have been deleted or its access revoked; ask once more before giving up.
    if (!forcePick) return saveToFolder(db, file, mimeType, true);
    throw error;
  }
}

/** Builds the export and either saves it to Downloads/spendtrak-backup or opens the share sheet. */
export async function runExport(db: SQLiteDatabase, format: ExportFormat, destination: ExportDestination) {
  const { label, noun, mimeType } = EXPORT_FORMATS[format];
  try {
    const file = await createExportFile(db, format);
    if (destination === 'share') {
      await withLockSuppressed(() => Sharing.shareAsync(file.uri, { mimeType, dialogTitle: `Share ${noun}` }));
    } else {
      const saved = await saveToFolder(db, file, mimeType);
      if (!saved) return;
      showDialog('Saved', `${label} saved to ${BACKUP_FOLDER}/${saved}.`, undefined, { icon: 'folder' });
    }
    // Only the JSON backup can restore data, so it alone resets the backup reminder.
    if (format === 'backup') await updateSettings(db, { lastBackupAt: toDateKey(new Date()) });
  } catch (error) {
    reportError('Export failed', error);
  }
}

/** Asks where the export should go, then runs it. */
export async function exportWithPrompt(db: SQLiteDatabase, format: ExportFormat) {
  const { noun } = EXPORT_FORMATS[format];
  const hasFolder = existingFolder((await getSettings(db)).backupFolderUri) !== null;
  showDialog(
    `Export ${noun}`,
    hasFolder
      ? `Save it to your ${BACKUP_FOLDER} folder, or send it to another app.`
      : `Save it to Downloads/${BACKUP_FOLDER}, or send it to another app. The first time, choose or create a folder named "${BACKUP_FOLDER}" in Downloads and tap "Use this folder"; SpendTrak remembers it.`,
    [
      { text: 'Save to Files', onPress: () => runExport(db, format, 'files') },
      { text: 'Share to an app', onPress: () => runExport(db, format, 'share') },
      { text: 'Cancel', style: 'cancel' },
    ],
    { icon: 'upload' }
  );
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
      throw new InvalidBackupError('Choose a SpendTrak data backup file (.json).');
    }
    const summary = await importBackup(db, data, mode);
    showDialog(mode === 'replace' ? 'Backup restored' : 'Backup merged', `Added:\n${describe(summary)}`);
  } catch (error) {
    reportError('Import failed', error);
  }
}

/** Asks how to import, then lets the user pick a data backup (.json) from this app or the web app. */
export function importBackupWithPrompt(db: SQLiteDatabase) {
  showDialog(
    'Import a data backup',
    'Choose a .json file made with Export → Data backup (here or in the web app). Merge adds only new records. Replace deletes your current accounts, transactions, planned payments, and splits first.',
    [
      { text: 'Merge', onPress: () => runImport(db, 'merge') },
      { text: 'Replace all', style: 'destructive', onPress: () => runImport(db, 'replace') },
      { text: 'Cancel', style: 'cancel' },
    ],
    { icon: 'download' }
  );
}
