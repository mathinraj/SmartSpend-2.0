import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyList } from '@/components/currency-list';
import { updateSettings } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';

export default function CurrencyScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings();

  async function select(code: string) {
    await updateSettings(db, { currency: code });
    router.back();
  }

  return (
    <CurrencyList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom }}
      selected={settings?.currency}
      onSelect={select}
    />
  );
}
