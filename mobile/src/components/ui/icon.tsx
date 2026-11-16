import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** SF Symbols on iOS, Material Symbols on Android. Add new icons here rather than inline. */
const ICONS = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  transfer: { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' },
  income: { ios: 'arrow.down.left', android: 'south_west', web: 'south_west' },
  expense: { ios: 'arrow.up.right', android: 'north_east', web: 'north_east' },
  wallet: { ios: 'wallet.pass', android: 'account_balance_wallet', web: 'account_balance_wallet' },
  receipt: { ios: 'list.bullet.rectangle', android: 'receipt_long', web: 'receipt_long' },
  chart: { ios: 'chart.pie', android: 'pie_chart', web: 'pie_chart' },
  currency: { ios: 'dollarsign.circle', android: 'currency_exchange', web: 'currency_exchange' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  calendar: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  person: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
} as const satisfies Record<string, SymbolViewProps['name']>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
}

export function Icon({ name, size = 24, color }: IconProps) {
  const colors = useTheme();
  return <SymbolView name={ICONS[name]} size={size} tintColor={color ?? colors.text} />;
}
