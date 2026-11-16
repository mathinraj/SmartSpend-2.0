import { FlatList, type FlatListProps } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { CURRENCIES, type Currency } from '@/constants/currencies';
import { useTheme } from '@/hooks/use-theme';

export interface CurrencyListProps extends Pick<FlatListProps<Currency>, 'contentContainerStyle' | 'style'> {
  selected: string | undefined;
  onSelect: (code: string) => void;
}

export function CurrencyList({ selected, onSelect, ...rest }: CurrencyListProps) {
  const colors = useTheme();
  return (
    <FlatList
      data={CURRENCIES}
      keyExtractor={(c) => c.code}
      renderItem={({ item, index }) => (
        <ListRow
          divider={index > 0}
          leading={<Text style={{ fontSize: 24 }}>{item.flag}</Text>}
          title={item.name}
          subtitle={`${item.code} · ${item.symbol}`}
          trailing={selected === item.code ? <Icon name="check" color={colors.primary} /> : null}
          onPress={() => onSelect(item.code)}
          showChevron={false}
        />
      )}
      {...rest}
    />
  );
}
