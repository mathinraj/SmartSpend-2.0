import * as Linking from 'expo-linking';
import type { SQLiteDatabase } from 'expo-sqlite';
import { PermissionsAndroid, Platform } from 'react-native';

import { getSettings, updateSettings } from '@/db/settings';
import { getSmsState, pruneSms, setSmsState } from '@/db/sms';
import { withLockSuppressed } from '@/lib/lock';
import { ingestMessages, reparseStored, type IngestResult } from '@/lib/sms/ingest';
import { SmsReader } from '@/lib/sms/native';
import { SMS_PARSER_VERSION } from '@/lib/sms/parser';

const DAY = 86_400_000;
const PAGE = 500;
const MAX_PAGES = 10;

/** SMS import works on this build and phone (Android with the native module). */
export const smsImportAvailable = Platform.OS === 'android' && SmsReader !== null;

export function hasSmsPermission(): boolean {
  return SmsReader?.hasPermission() ?? false;
}

export type PermissionOutcome = 'granted' | 'denied' | 'blocked';

/**
 * Asks for READ_SMS and RECEIVE_SMS (one dialog). `blocked` means Android didn't show a dialog: the user
 * refused before with "Don't ask again", or (Android 15+, apps not installed from a store) SMS access is a
 * restricted setting that must be allowed from App info first.
 */
export async function requestSmsPermission(): Promise<PermissionOutcome> {
  const { READ_SMS, RECEIVE_SMS } = PermissionsAndroid.PERMISSIONS;
  const result = await withLockSuppressed(() => PermissionsAndroid.requestMultiple([READ_SMS, RECEIVE_SMS]));
  if (result[READ_SMS] === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  return result[READ_SMS] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}

/** Tells the native receiver whether to post "new bank transaction" notifications. */
export function configureSmsAlerts(enabled: boolean, notify: boolean) {
  SmsReader?.configureAlerts(enabled, notify, Linking.createURL('sms'));
}

/** Turns SMS import on, importing the last `days` of messages on the first scan. */
export async function enableSmsImport(db: SQLiteDatabase, days: number) {
  await setSmsState(db, 'importFrom', String(Date.now() - days * DAY));
  await updateSettings(db, { smsImportEnabled: true });
  const settings = await getSettings(db);
  configureSmsAlerts(true, settings.smsNotify);
}

export async function disableSmsImport(db: SQLiteDatabase) {
  await updateSettings(db, { smsImportEnabled: false });
  configureSmsAlerts(false, false);
}

let running: Promise<IngestResult | null> | null = null;

/** Reads new bank messages into the review list. Safe to call often; concurrent calls share one scan. */
export function scanSmsInbox(db: SQLiteDatabase): Promise<IngestResult | null> {
  running ??= runScan(db).finally(() => {
    running = null;
  });
  return running;
}

async function runScan(db: SQLiteDatabase): Promise<IngestResult | null> {
  const settings = await getSettings(db);
  if (!settings.smsImportEnabled || !SmsReader || !SmsReader.hasPermission()) return null;

  if (Number((await getSmsState(db, 'parserVersion')) ?? 0) < SMS_PARSER_VERSION) {
    await reparseStored(db);
    await setSmsState(db, 'parserVersion', String(SMS_PARSER_VERSION));
  }

  const lastScan = Number((await getSmsState(db, 'lastScanAt')) ?? 0);
  const importFrom = Number((await getSmsState(db, 'importFrom')) ?? 0);
  // Re-read the last day each time: messages can land in the inbox a little out of order.
  let since = lastScan > 0 ? lastScan - DAY : importFrom || Date.now() - 7 * DAY;
  const total: IngestResult = { pending: 0, autoAdded: 0 };
  let newest = lastScan;
  for (let page = 0; page < MAX_PAGES; page++) {
    const messages = await SmsReader.readInbox(since, PAGE);
    if (messages.length === 0) break;
    const result = await ingestMessages(db, messages, { ignoredSenders: settings.smsIgnoredSenders, autoAdd: settings.smsAutoAdd });
    total.pending += result.pending;
    total.autoAdded += result.autoAdded;
    newest = Math.max(newest, messages[messages.length - 1].date);
    if (messages.length < PAGE) break;
    since = messages[messages.length - 1].date;
  }
  await setSmsState(db, 'lastScanAt', String(Math.max(newest, Date.now() - DAY)));
  await pruneSms(db);
  return total;
}
