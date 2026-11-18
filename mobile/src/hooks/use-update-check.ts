import { useEffect } from 'react';
import { AppState } from 'react-native';

import { checkForUpdates } from '@/lib/updates';

/** Quietly checks GitHub for a newer release shortly after launch and when the app comes back (at most every few hours). */
export function useUpdateCheck() {
  useEffect(() => {
    const timer = setTimeout(() => void checkForUpdates(), 5_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkForUpdates();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);
}
