import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** SF Symbols on iOS, Material Symbols on Android. Add new icons here rather than inline. */
const ICONS = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  upload: { ios: 'square.and.arrow.up', android: 'upload', web: 'upload' },
  download: { ios: 'square.and.arrow.down', android: 'download', web: 'download' },
  table: { ios: 'tablecells', android: 'table_view', web: 'table_view' },
  backspace: { ios: 'delete.left', android: 'backspace', web: 'backspace' },
  fingerprint: { ios: 'faceid', android: 'fingerprint', web: 'fingerprint' },
  repeat: { ios: 'repeat', android: 'event_repeat', web: 'event_repeat' },
  people: { ios: 'person.2', android: 'group', web: 'group' },
  pause: { ios: 'pause.circle', android: 'pause_circle', web: 'pause_circle' },
  play: { ios: 'play.circle', android: 'play_circle', web: 'play_circle' },
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
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  filter: { ios: 'line.3.horizontal.decrease.circle', android: 'tune', web: 'tune' },
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
