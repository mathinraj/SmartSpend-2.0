/**
 * Update check against the GitHub releases the APKs are published to. The latest release's tag
 * (`v1.9.0`) is the version, its notes say what's new, and its assets are the per-processor APKs, so
 * publishing a release is all it takes; there's no separate version file to keep in step.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useSyncExternalStore } from 'react';

import { isNewerVersion, pickApk, summarizeNotes, type ReleaseAsset } from '@/lib/release-info';

const LATEST_RELEASE_API = 'https://api.github.com/repos/mathinraj/SmartSpend-2.0/releases/latest';
export const RELEASES_PAGE = 'https://github.com/mathinraj/SmartSpend-2.0/releases/latest';
/** A launch rechecks at most this often; the button always checks. */
const AUTO_CHECK_INTERVAL = 6 * 60 * 60 * 1000;

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

export interface UpdateInfo {
  version: string;
  title: string;
  /** First paragraph of the release notes, as plain text. */
  note: string | null;
  pageUrl: string;
  /** The APK built for this phone's processor (or the universal one). */
  apk: { url: string; sizeMb: number } | null;
}

export type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'current'; checkedAt: number }
  | { phase: 'available'; checkedAt: number; update: UpdateInfo }
  | { phase: 'error'; message: string };

class UpdateCheckError extends Error {}

let state: UpdateState = { phase: 'idle' };
let lastCheckedAt = 0;
const listeners = new Set<() => void>();

function setState(next: UpdateState) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUpdateState(): UpdateState {
  return useSyncExternalStore(subscribe, () => state);
}

/**
 * Checks GitHub for a newer release. `force` checks even if one ran recently (the button); launches
 * call it without, so they stay quiet and cheap.
 */
export async function checkForUpdates({ force = false } = {}): Promise<UpdateState> {
  if (state.phase === 'checking') return state;
  if (!force && Date.now() - lastCheckedAt < AUTO_CHECK_INTERVAL) return state;
  const previous = state;
  setState({ phase: 'checking' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(LATEST_RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new UpdateCheckError(`GitHub couldn't be checked right now (error ${response.status}).`);
    const release = (await response.json()) as {
      tag_name?: string;
      name?: string;
      body?: string;
      html_url?: string;
      assets?: ReleaseAsset[];
    };
    const version = (release.tag_name ?? '').replace(/^v/i, '');
    if (!/^\d+(\.\d+)*$/.test(version)) throw new UpdateCheckError("The latest release doesn't have a version number.");
    lastCheckedAt = Date.now();
    if (!isNewerVersion(version, APP_VERSION)) {
      setState({ phase: 'current', checkedAt: lastCheckedAt });
      return state;
    }
    const apk = pickApk(release.assets ?? [], Device.supportedCpuArchitectures ?? []);
    setState({
      phase: 'available',
      checkedAt: lastCheckedAt,
      update: {
        version,
        title: release.name || `SpendTrak ${version}`,
        note: summarizeNotes(release.body),
        pageUrl: release.html_url ?? RELEASES_PAGE,
        apk: apk ? { url: apk.browser_download_url, sizeMb: Math.round((apk.size / 1_048_576) * 10) / 10 } : null,
      },
    });
  } catch (error) {
    // A quiet launch check that fails keeps showing what it knew before. Network failures (offline,
    // timeouts, blocked connections) get a plain message instead of the platform's technical one.
    const message = error instanceof UpdateCheckError ? error.message : "Couldn't reach GitHub.";
    setState(force ? { phase: 'error', message } : previous);
  } finally {
    clearTimeout(timeout);
  }
  return state;
}
