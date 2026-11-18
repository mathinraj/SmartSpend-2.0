/**
 * Google Drive sync for the web app, matching the Android app: one gzip-compressed JSON file
 * (`spendtrak-sync.json.gz`) in the hidden app folder. A sync checks the file's version, merges it in
 * only if it changed, and uploads only if the data differs from the last upload. Automatic mode runs a
 * few seconds after each change and when the tab comes back; manual mode only on "Back up now".
 */
import { useSyncExternalStore } from 'react';
import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';
import * as gDrive from './googleDrive';
import { InvalidSyncFileError, fileToSnapshot, mergeSnapshots, snapshotToFile, stateToSnapshot } from './syncFormat';

const SYNC_FILE = 'spendtrak-sync.json.gz';
/** Written uncompressed by earlier versions; merged in while it keeps changing. */
const LEGACY_FILE = 'spendtrak-sync.json';
const DAILY_RE = /^spendtrak-sync-(\d{4}-\d{2}-\d{2})\.json\.gz$/;
const KEEP_DAILY = 7;
const GZIP = 'application/gzip';
const CHANGE_DELAY = 5000;
const RESUME_INTERVAL = 60000;
const RETRY_DELAYS = [30000, 120000, 600000];
const STATE_KEY = 'spendtraq_drive_sync';
const PHOTO_KEY = 'spendtraq_profile_photo';
const APP_VERSION = 'web';

// ---- Status ----------------------------------------------------------------------------------------

let status = { phase: 'idle', message: null };
const listeners = new Set();

function setStatus(phase, message = null) {
  status = { phase, message };
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverStatus = { phase: 'idle', message: null };

/** `{ phase: 'idle' | 'syncing' | 'offline' | 'signin' | 'error', message }` */
export function useDriveSyncStatus() {
  return useSyncExternalStore(subscribe, () => status, () => serverStatus);
}

// ---- App binding and local progress ------------------------------------------------------------------

let app = null;

/** Gives sync access to the latest app state and dispatch. */
export function bindSync(getState, dispatch) {
  app = { getState, dispatch };
}

export const isAutoSync = (settings) => settings.gdriveAutoSync !== false;

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeProgress(patch) {
  localStorage.setItem(STATE_KEY, JSON.stringify({ ...readProgress(), ...patch }));
}

export function clearSyncProgress() {
  localStorage.removeItem(STATE_KEY);
}

export function hasSyncProgress() {
  return localStorage.getItem(STATE_KEY) !== null;
}

// ---- Scheduling ------------------------------------------------------------------------------------

let running = null;
let rerun = false;
let changeTimer;
let retryTimer;
let retryIndex = 0;
let lastRunAt = 0;
/** State changes made by sync itself don't schedule another sync until this time. */
let quietUntil = 0;

export function scheduleSync() {
  if (Date.now() < quietUntil) return;
  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => syncNow(), CHANGE_DELAY);
}

export function flushSync() {
  if (changeTimer) syncNow();
}

export function syncOnResume() {
  if (Date.now() - lastRunAt >= RESUME_INTERVAL) syncNow();
}

/** Syncs now, or joins the running sync and runs again after it. `manual` also works in manual mode. */
export function syncNow({ manual = false } = {}) {
  clearTimeout(changeTimer);
  changeTimer = undefined;
  if (running) {
    rerun = true;
    return running;
  }
  running = runSync(manual).finally(() => {
    running = null;
    if (rerun) {
      rerun = false;
      syncNow({ manual });
    }
  });
  return running;
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => syncNow(), RETRY_DELAYS[Math.min(retryIndex, RETRY_DELAYS.length - 1)]);
  retryIndex += 1;
}

export function stopSyncTimers() {
  clearTimeout(changeTimer);
  clearTimeout(retryTimer);
  changeTimer = undefined;
  retryIndex = 0;
  setStatus('idle');
}

// ---- Sync ------------------------------------------------------------------------------------------

/** 53-bit string hash (cyrb53), to tell whether the data changed since the last upload. */
function hashString(text) {
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

const today = () => new Date().toISOString().slice(0, 10);

/** A token for this sync. Only a click (manual) may open Google's popup; browsers block it otherwise. */
async function token(manual) {
  const valid = gDrive.getValidToken();
  if (valid || !manual) return valid;
  await gDrive.loadGisScript();
  return gDrive.requestAccessToken({ prompt: 'none' });
}

async function keepDailyCopy(files, bytes) {
  const name = `spendtrak-sync-${today()}.json.gz`;
  const existing = files.find((f) => f.name === name);
  if (existing) await gDrive.updateFileBytes(existing.id, bytes, GZIP);
  else await gDrive.createFileBytes(name, bytes, GZIP);
  const older = files
    .filter((f) => DAILY_RE.test(f.name) && f.name !== name)
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(KEEP_DAILY - 1);
  for (const file of older) await gDrive.deleteAppFile(file.id);
}

async function runSync(manual) {
  if (!app) return;
  const { settings } = app.getState();
  if (!settings.gdriveEmail || !gDrive.isConfigured() || (!isAutoSync(settings) && !manual)) return;
  clearTimeout(retryTimer);
  lastRunAt = Date.now();
  setStatus('syncing');
  try {
    if (!(await token(manual))) {
      setStatus('signin', 'Your Google session ended. Click Sync now to reconnect.');
      return;
    }
    const progress = readProgress();
    const files = await gDrive.listAppFiles();
    const main = files.find((f) => f.name === SYNC_FILE);
    const legacy = files.find((f) => f.name === LEGACY_FILE);

    // Read everything before changing anything, so an unreadable file leaves the data untouched.
    const incoming = [];
    if (main && main.version !== progress.remoteVersion) {
      incoming.push(JSON.parse(strFromU8(gunzipSync(await gDrive.downloadFileBytes(main.id)))));
    }
    if (legacy && (!settings.gdriveLastSync || legacy.modifiedTime > settings.gdriveLastSync)) {
      incoming.push(JSON.parse(strFromU8(await gDrive.downloadFileBytes(legacy.id))));
    }
    const remotes = incoming.map(fileToSnapshot);

    let snapshot = stateToSnapshot(app.getState());
    remotes.forEach((remote, i) => {
      const empty = snapshot.tables.accounts.length === 0 && snapshot.tables.transactions.length === 0;
      snapshot = mergeSnapshots(snapshot, remote, { preferRemote: i === 0 && !settings.gdriveLastSync && empty });
    });
    if (remotes.length > 0) {
      quietUntil = Date.now() + 1500;
      app.dispatch({ type: 'SYNC_APPLY', payload: snapshot });
      const photo = incoming.find((f) => typeof f.profilePhoto === 'string')?.profilePhoto;
      if (photo && settings.syncProfilePhoto && !localStorage.getItem(PHOTO_KEY)) {
        localStorage.setItem(PHOTO_KEY, photo);
        app.dispatch({ type: 'UPDATE_SETTINGS', payload: { hasProfilePhoto: true } });
      }
    }

    const file = snapshotToFile(snapshot, { appVersion: APP_VERSION, exportedAt: '' });
    if (settings.syncProfilePhoto && localStorage.getItem(PHOTO_KEY)) file.profilePhoto = localStorage.getItem(PHOTO_KEY);
    const hash = hashString(JSON.stringify(file));
    let { snapshotDate } = progress;
    let remoteVersion = main?.version ?? null;
    if (!main || remotes.length > 0 || hash !== progress.lastHash) {
      const bytes = gzipSync(strToU8(JSON.stringify({ ...file, _exportedAt: new Date().toISOString() })));
      const saved = main ? await gDrive.updateFileBytes(main.id, bytes, GZIP) : await gDrive.createFileBytes(SYNC_FILE, bytes, GZIP);
      remoteVersion = saved.version;
      if (snapshotDate !== today()) {
        await keepDailyCopy(files, bytes);
        snapshotDate = today();
      }
      localStorage.setItem('spendtraq_last_backup_reminder', Date.now().toString());
    }
    writeProgress({ remoteVersion, lastHash: hash, snapshotDate });
    app.dispatch({ type: 'UPDATE_SETTINGS', payload: { gdriveLastSync: new Date().toISOString() } });
    retryIndex = 0;
    setStatus('idle');
  } catch (err) {
    if (err.message === 'AUTH_EXPIRED') {
      setStatus('signin', 'Your Google session ended. Click Sync now to reconnect.');
    } else if (err instanceof InvalidSyncFileError || err instanceof SyntaxError || /gzip|invalid/i.test(err.message)) {
      setStatus('error', "The copy in Google Drive couldn't be read, so nothing was changed.");
    } else if (err instanceof TypeError) {
      setStatus('offline', "Couldn't reach Google Drive. SpendTrak will try again.");
      scheduleRetry();
    } else {
      setStatus('error', err.message);
      scheduleRetry();
    }
  }
}

// ---- Earlier versions and cleanup --------------------------------------------------------------------

/** Daily copies kept in Drive, newest first: `[{ id, date }]`. */
export async function listDailyCopies() {
  if (!(await token(true))) throw new Error('Sign in to Google first.');
  return (await gDrive.listAppFiles())
    .map((f) => ({ id: f.id, date: DAILY_RE.exec(f.name)?.[1] }))
    .filter((f) => f.date)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Replaces this browser's data with a daily copy and syncs it. The restored records are saved as new
 * changes, so they also replace the Drive copy and, from there, your other devices.
 */
export async function restoreDailyCopy(id) {
  if (!(await token(true))) throw new Error('Sign in to Google first.');
  const data = JSON.parse(strFromU8(gunzipSync(await gDrive.downloadFileBytes(id))));
  fileToSnapshot(data);
  app.dispatch({ type: 'IMPORT_DATA', payload: data });
  await new Promise((resolve) => setTimeout(resolve, 50));
  await syncNow({ manual: true });
}

/** Deletes every SpendTrak file in the Drive app folder. */
export async function deleteDriveData() {
  if (!(await token(true))) throw new Error('Sign in to Google first.');
  const files = await gDrive.listAppFiles();
  for (const file of files) {
    if (file.name === SYNC_FILE || file.name === LEGACY_FILE || DAILY_RE.test(file.name)) await gDrive.deleteAppFile(file.id);
  }
  clearSyncProgress();
}
