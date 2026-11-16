import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { CURRENCIES } from '@/constants/currencies';
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
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom }}
      data={CURRENCIES}
      keyExtractor={(c) => c.code}
      renderItem={({ item, index }) => (
        <ListRow
          divider={index > 0}
          leading={<Text style={{ fontSize: 24 }}>{item.flag}</Text>}
          title={item.name}
          subtitle={`${item.code} · ${item.symbol}`}
          trailing={settings?.currency === item.code ? <Icon name="check" color={colors.primary} /> : null}
          onPress={() => select(item.code)}
        />
      )}
    />
  );
}
