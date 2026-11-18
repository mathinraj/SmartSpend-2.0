import type { IconName } from '@/components/ui/icon';
import type { SyncState } from '@/db/sync';
import type { SyncStatus } from '@/lib/drive-sync';
import { formatShortDate, toDateKey } from '@/lib/format';

/** "just now", "5 min ago", "today 14:05", or a date and time. */
export function formatSyncTime(iso: string): string {
  const then = new Date(iso);
  const minutes = Math.round((Date.now() - then.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const time = then.toTimeString().slice(0, 5);
  return toDateKey(then) === toDateKey(new Date()) ? `today ${time}` : `${formatShortDate(toDateKey(then))} ${time}`;
}

/** The sync state in one line, for the Drive screen and the Settings row. */
export function describeSync(state: SyncState, status: SyncStatus): { icon: IconName; title: string; detail: string } {
  const manual = state.mode === 'manual';
  switch (status.phase) {
    case 'syncing':
      return { icon: 'sync', title: manual ? 'Backing up…' : 'Syncing…', detail: 'Talking to Google Drive' };
    case 'offline':
      return { icon: 'cloudOff', title: 'Waiting for a connection', detail: status.message ?? '' };
    case 'signin':
      return { icon: 'warning', title: 'Sign in again', detail: 'Tap to reconnect your Google account' };
    case 'error':
      return { icon: 'warning', title: 'Sync problem', detail: status.message ?? '' };
    case 'idle':
      return {
        icon: 'cloudDone',
        title: state.lastSyncAt ? `${manual ? 'Backed up' : 'Synced'} ${formatSyncTime(state.lastSyncAt)}` : 'Not synced yet',
        detail: manual ? 'Manual backup' : 'Syncing automatically',
      };
  }
}
