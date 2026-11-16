import { Platform } from 'react-native';

const brand = {
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',
  onPrimary: '#FFFFFF',
  success: '#00B894',
  danger: '#FF6B6B',
  warning: '#FDCB6E',
  info: '#74B9FF',
};

const light = {
  ...brand,
  background: '#F8F9FE',
  card: '#FFFFFF',
  cardMuted: '#F0F1F8',
  text: '#2D3436',
  textSecondary: '#636E72',
  textMuted: '#B2BEC3',
  border: '#E8ECF4',
  shadow: '0 2px 12px rgba(108, 92, 231, 0.08)',
};

export type ThemeColors = typeof light;

const dark: ThemeColors = {
  ...brand,
  background: '#121212',
  card: '#1E1E1E',
  cardMuted: '#2A2A2A',
  text: '#E0E0E0',
  textSecondary: '#9E9E9E',
  textMuted: '#616161',
  border: '#2C2C2C',
  shadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
};

export const Colors = { light, dark };

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Extra bottom padding tab screens need to clear the tab bar. The iOS tab bar floats over content;
 * the Android one sits below it and also covers the system navigation inset.
 */
export const BottomTabInset = Platform.select({ ios: 50, default: 0 });
