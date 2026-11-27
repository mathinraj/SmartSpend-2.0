import { router } from 'expo-router';

import { EMPTY_HISTORY_FILTERS, setHistoryFilters } from '@/lib/history-filters';

/** Opens History showing only this account's transactions (replacing any other History filters). */
export function openAccountHistory(accountId: string) {
  setHistoryFilters({ ...EMPTY_HISTORY_FILTERS, accountIds: [accountId] });
  router.navigate('/history');
}

/** Opens Analytics on the Accounts section, focused on this account. */
export function openAccountAnalytics(accountId: string) {
  router.navigate({ pathname: '/analytics', params: { account: accountId } });
}
