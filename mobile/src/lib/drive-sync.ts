/**
 * Google Drive sync. One gzip-compressed JSON file (`spendtrak-sync.json.gz`) in the hidden app folder
 * holds everything; the web app reads and writes the same file. A sync checks the file's version,
 * downloads and merges it only if it changed, then uploads only if the merged data differs from what
 * was last uploaded. In automatic mode it runs a few seconds after each change, on launch, and when the
 * app comes back to the foreground; in manual mode only when the user asks.
 */
import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';
import { useSyncExternalStore } from 'react';

import { importBackup } from '@/db/backup';
import { getSettings, updateSettings } from '@/db/settings';
import { clearSyncState, getSyncState, mergeIntoDb, readSnapshot, updateSyncState, type SyncMode } from '@/db/sync';
import { formatShortDate, toDateKey } from '@/lib/format';
import { GoogleSignInRequiredError, getAccessToken, renewAccessToken, signInWithGoogle, signOutOfGoogle } from '@/lib/google-auth';
import {
  DriveAuthError,
  DriveNetworkError,
  createFile,
  deleteFile,
  downloadFile,
  listFiles,
  updateFile,
  type DriveFile,
} from '@/lib/google-drive';
import { InvalidBackupError, parseSyncFile, snapshotToFile, syncClients, type Snapshot } from '@/lib/sync-format';

const SYNC_FILE = 'spendtrak-sync.json.gz';
/** Written uncompressed by web app versions before sync format 3; merged in while it keeps changing. */
const LEGACY_FILE = 'spendtrak-sync.json';
const DAILY_RE = /^spendtrak-sync-(\d{4}-\d{2}-\d{2})\.json\.gz$/;
const KEEP_DAILY = 7;
const KEEP_LOCAL = 3;
const GZIP = 'application/gzip';
const CHANGE_DELAY = 5_000;
/** Coming back to the app syncs at most this often; edits schedule their own sync. */
const RESUME_INTERVAL = 60_000;
const RETRY_DELAYS = [30_000, 120_000, 600_000];
const APP_VERSION = Constants.expoConfig?.version ?? 'unknown';

// ---- Status ----------------------------------------------------------------------------------------

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'signin' | 'error';
export interface SyncStatus {
  phase: SyncPhase;
  message: string | null;
}

let status: SyncStatus = { phase: 'idle', message: null };
const listeners = new Set<() => void>();

function setStatus(phase: SyncPhase, message: string | null = null) {
  status = { phase, message };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, () => status);
}

// ---- Scheduling ------------------------------------------------------------------------------------

let running: Promise<void> | null = null;
let rerun = false;
let changeTimer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryIndex = 0;
let lastRunAt = 0;
/** Database writes made by sync itself don't schedule another sync until this time. */
let quietUntil = 0;

/** Called on every change to synced tables: syncs once things settle. */
export function scheduleSync(db: SQLiteDatabase) {
  if (Date.now() < quietUntil) return;
  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => void syncNow(db), CHANGE_DELAY);
}

/** On leaving the app: send a pending change right away instead of waiting. */
export function flushSync(db: SQLiteDatabase) {
  if (changeTimer) void syncNow(db);
}

/** On launch or returning to the app: pick up changes from other devices. */
export function syncOnResume(db: SQLiteDatabase) {
  if (Date.now() - lastRunAt >= RESUME_INTERVAL) void syncNow(db);
}

/**
 * Runs a sync now (or joins the running one, then runs again). Automatic mode only, unless `manual`,
 * which is for the Sync now / Back up now button and works in either mode.
 */
export function syncNow(db: SQLiteDatabase, { manual = false } = {}): Promise<void> {
  clearTimeout(changeTimer);
  changeTimer = undefined;
  if (running) {
    rerun = true;
    return running;
  }
  running = runSync(db, manual).finally(() => {
    running = null;
    if (rerun) {
      rerun = false;
      void syncNow(db, { manual });
    }
  });
  return running;
}

function scheduleRetry(db: SQLiteDatabase) {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => void syncNow(db), RETRY_DELAYS[Math.min(retryIndex, RETRY_DELAYS.length - 1)]);
  retryIndex += 1;
}

function stopTimers() {
  clearTimeout(changeTimer);
  clearTimeout(retryTimer);
  changeTimer = undefined;
  retryIndex = 0;
}

// ---- Sync ------------------------------------------------------------------------------------------

type Drive = <T>(call: (token: string) => Promise<T>) => Promise<T>;

/** Runs Drive calls with a token, renewing it once if Drive rejects it. */
async function openDrive(): Promise<Drive> {
  let token: string;
  try {
    token = await getAccessToken();
  } catch (error) {
    if (error instanceof GoogleSignInRequiredError) throw error;
    throw new DriveNetworkError(error instanceof Error ? error.message : String(error));
  }
  return async (call) => {
    try {
      return await call(token);
    } catch (error) {
      if (!(error instanceof DriveAuthError)) throw error;
      token = await renewAccessToken(token);
      return call(token);
    }
  };
}

/** 53-bit string hash (cyrb53), to tell whether the data changed since the last upload. */
function hashString(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function readFile(data: Uint8Array, compressed: boolean): { snapshot: Snapshot; clients: string[] } {
  const raw: unknown = JSON.parse(strFromU8(compressed ? gunzipSync(data) : data));
  return { snapshot: parseSyncFile(raw), clients: syncClients(raw) };
}

/** Copies of this phone's data from just before a sync merged something in, newest first. */
function localCopiesFolder(): Directory {
  const folder = new Directory(Paths.document, 'sync-history');
  if (!folder.exists) folder.create();
  return folder;
}

async function keepLocalCopy(db: SQLiteDatabase) {
  const folder = localCopiesFolder();
  const file = new File(folder, `before-sync-${Date.now()}.json.gz`);
  file.create();
  const json = JSON.stringify(snapshotToFile(await readSnapshot(db), { appVersion: APP_VERSION, exportedAt: new Date().toISOString() }));
  await file.write(gzipSync(strToU8(json)));
  const copies = folder.list().filter((f): f is File => f instanceof File).sort((a, b) => b.name.localeCompare(a.name));
  for (const old of copies.slice(KEEP_LOCAL)) old.delete();
}

async function keepDailyCopy(drive: Drive, files: DriveFile[], today: string, data: Uint8Array) {
  const name = `spendtrak-sync-${today}.json.gz`;
  const existing = files.find((f) => f.name === name);
  if (existing) await drive((t) => updateFile(t, existing.id, data, GZIP));
  else await drive((t) => createFile(t, name, data, GZIP));
  const older = files
    .filter((f) => DAILY_RE.test(f.name) && f.name !== name)
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(KEEP_DAILY - 1);
  for (const file of older) await drive((t) => deleteFile(t, file.id));
}

/** Merges `remote` in, keeping a local copy first and not letting the merge's own writes trigger a sync. */
async function mergeRemote(db: SQLiteDatabase, remote: Snapshot, firstSync: boolean) {
  await keepLocalCopy(db);
  quietUntil = Number.POSITIVE_INFINITY;
  try {
    await mergeIntoDb(db, remote, firstSync);
  } finally {
    quietUntil = Date.now() + 1_500;
  }
}

async function runSync(db: SQLiteDatabase, manual: boolean) {
  const state = await getSyncState(db);
  if (!state.account || (state.mode === 'manual' && !manual)) return;
  clearTimeout(retryTimer);
  lastRunAt = Date.now();
  setStatus('syncing');
  try {
    const drive = await openDrive();
    const files = await drive((t) => listFiles(t));
    const main = files.find((f) => f.name === SYNC_FILE);
    const legacy = files.find((f) => f.name === LEGACY_FILE);

    // Read everything before changing anything, so an unreadable file leaves the data untouched.
    const incoming: { snapshot: Snapshot; clients: string[] }[] = [];
    if (main && main.version !== state.remoteVersion) incoming.push(readFile(await drive((t) => downloadFile(t, main.id)), true));
    if (legacy && (!state.lastSyncAt || legacy.modifiedTime > state.lastSyncAt)) {
      incoming.push(readFile(await drive((t) => downloadFile(t, legacy.id)), false));
    }
    for (const [i, remote] of incoming.entries()) await mergeRemote(db, remote.snapshot, i === 0 && !state.lastSyncAt);
    // Carried in the file so the web app knows this person uses the Android app (it hides its "Get the app" card).
    const clients = [...new Set([...state.clients, ...incoming.flatMap((f) => f.clients), 'android'])];

    const file = snapshotToFile(await readSnapshot(db), { appVersion: APP_VERSION, exportedAt: '', clients });
    const hash = hashString(JSON.stringify(file));
    let { snapshotDate } = state;
    let fileId = main?.id ?? null;
    let remoteVersion = main?.version ?? null;
    if (!main || incoming.length > 0 || hash !== state.lastHash) {
      const data = gzipSync(strToU8(JSON.stringify({ ...file, _exportedAt: new Date().toISOString() })));
      const saved = main ? await drive((t) => updateFile(t, main.id, data, GZIP)) : await drive((t) => createFile(t, SYNC_FILE, data, GZIP));
      fileId = saved.id;
      remoteVersion = saved.version;
      const today = toDateKey(new Date());
      if (snapshotDate !== today) {
        await keepDailyCopy(drive, files, today, data);
        snapshotDate = today;
      }
      const settings = await getSettings(db);
      if (settings.lastBackupAt !== today) {
        quietUntil = Date.now() + 1_500;
        await updateSettings(db, { lastBackupAt: today });
      }
    }
    await updateSyncState(db, { fileId, remoteVersion, lastHash: hash, lastSyncAt: new Date().toISOString(), snapshotDate, clients });
    retryIndex = 0;
    setStatus('idle');
  } catch (error) {
    if (error instanceof GoogleSignInRequiredError || error instanceof DriveAuthError) {
      setStatus('signin', 'Sign in to Google again to keep syncing.');
    } else if (error instanceof InvalidBackupError || error instanceof SyntaxError) {
      setStatus('error', "The copy in Google Drive couldn't be read, so nothing was changed. It may have been written by a newer version of SpendTrak.");
    } else if (error instanceof DriveNetworkError) {
      setStatus('offline', "Couldn't reach Google Drive. SpendTrak will try again.");
      scheduleRetry(db);
    } else {
      setStatus('error', error instanceof Error ? error.message : String(error));
      scheduleRetry(db);
    }
  }
}

// ---- Account and settings actions --------------------------------------------------------------------

/**
 * Signs in and syncs. Signing in again with the same account (after the sign-in expired) keeps the
 * sync progress and mode; another account starts fresh. Returns false if the user backed out.
 */
export async function connectDrive(db: SQLiteDatabase): Promise<boolean> {
  const account = await signInWithGoogle();
  if (!account) return false;
  const previous = await getSyncState(db);
  if (previous.account?.email !== account.email) {
    await clearSyncState(db);
    await updateSyncState(db, { mode: 'auto' });
  }
  await updateSyncState(db, { account });
  void syncNow(db, { manual: true });
  return true;
}

/** Signs out and forgets sync progress. The data on this phone and in Drive stays. */
export async function disconnectDrive(db: SQLiteDatabase) {
  stopTimers();
  await signOutOfGoogle();
  await clearSyncState(db);
  setStatus('idle');
}

export async function setSyncMode(db: SQLiteDatabase, mode: SyncMode) {
  await updateSyncState(db, { mode });
  if (mode === 'auto') void syncNow(db);
  else stopTimers();
}

/** Deletes every SpendTrak file in the user's Drive app folder, then disconnects. */
export async function deleteDriveData(db: SQLiteDatabase) {
  const drive = await openDrive();
  const files = await drive((t) => listFiles(t));
  for (const file of files) {
    if (file.name === SYNC_FILE || file.name === LEGACY_FILE || DAILY_RE.test(file.name)) await drive((t) => deleteFile(t, file.id));
  }
  await disconnectDrive(db);
}

// ---- Restoring an earlier version --------------------------------------------------------------------

export interface RestorePoint {
  key: string;
  label: string;
  source: 'drive' | 'device';
}

/** Daily copies in Drive and pre-merge copies on this phone, newest first. */
export async function listRestorePoints(): Promise<RestorePoint[]> {
  const points: RestorePoint[] = [];
  const drive = await openDrive();
  const daily = (await drive((t) => listFiles(t)))
    .map((f) => ({ file: f, date: DAILY_RE.exec(f.name)?.[1] }))
    .filter((d): d is { file: DriveFile; date: string } => d.date !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const { file, date } of daily) points.push({ key: `drive:${file.id}`, label: `Google Drive · ${formatShortDate(date)}`, source: 'drive' });
  const local = localCopiesFolder()
    .list()
    .filter((f): f is File => f instanceof File)
    .sort((a, b) => b.name.localeCompare(a.name));
  for (const file of local) {
    const time = Number(/before-sync-(\d+)/.exec(file.name)?.[1]);
    if (!time) continue;
    const when = new Date(time);
    points.push({
      key: `device:${file.name}`,
      label: `This phone, before a sync · ${formatShortDate(toDateKey(when))} ${when.toTimeString().slice(0, 5)}`,
      source: 'device',
    });
  }
  return points;
}

/**
 * Replaces this phone's data with an earlier copy, then syncs it. The restored records are saved as
 * new changes, so they also replace the Drive copy and, from there, the other devices.
 */
export async function restoreFrom(db: SQLiteDatabase, point: RestorePoint) {
  const [source, id] = [point.key.slice(0, point.key.indexOf(':')), point.key.slice(point.key.indexOf(':') + 1)];
  let data: Uint8Array;
  if (source === 'drive') {
    const drive = await openDrive();
    data = await drive((t) => downloadFile(t, id));
  } else {
    data = await new File(localCopiesFolder(), id).bytes();
  }
  const backup = JSON.parse(strFromU8(gunzipSync(data)));
  await keepLocalCopy(db);
  await importBackup(db, backup, 'replace');
  await syncNow(db, { manual: true });
}
