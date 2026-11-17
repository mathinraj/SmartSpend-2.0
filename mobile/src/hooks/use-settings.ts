import { getSettings } from '@/db/settings';
import { useDbQuery } from '@/hooks/use-db-query';

export function useSettings() {
  return useDbQuery(getSettings, ['settings']);
}
