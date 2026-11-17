import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { LockGate } from '@/components/lock-gate';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReminderSync } from '@/hooks/use-reminder-sync';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import type { Settings } from '@/types/models';

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      {/* The app draws edge-to-edge on Android; without these flags the system bar insets are applied twice. */}
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge>
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          onInit={migrateDbIfNeeded}
          options={{ enableChangeListener: true }}>
          <RootNavigator />
        </SQLiteProvider>
      </KeyboardProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const settings = useSettings();
  if (!settings) return null;
  return <AppStack settings={settings} />;
}

function AppStack({ settings }: { settings: Settings }) {
  useReminderSync(settings);

  useEffect(() => {
    Appearance.setColorScheme(settings.theme === 'system' ? 'auto' : settings.theme);
  }, [settings.theme]);

  return (
    <LockGate settings={settings}>
      <Stack screenOptions={{ headerShadowVisible: false }}>
        <Stack.Protected guard={settings.onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="transaction/new" options={{ title: 'Add transaction', presentation: 'modal' }} />
          <Stack.Screen name="transaction/[id]" options={{ title: 'Transaction' }} />
          <Stack.Screen name="transaction/edit/[id]" options={{ title: 'Edit transaction', presentation: 'modal' }} />
          <Stack.Screen name="history-filters" options={{ title: 'Filter transactions', presentation: 'modal' }} />
          <Stack.Screen name="account/new" options={{ title: 'Add account', presentation: 'modal' }} />
          <Stack.Screen name="account/[id]" options={{ title: 'Edit account', presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="customize" options={{ title: 'Customize' }} />
          <Stack.Screen name="categories/index" options={{ title: 'Categories' }} />
          <Stack.Screen name="categories/new" options={{ title: 'Add category', presentation: 'modal' }} />
          <Stack.Screen name="categories/[id]" options={{ title: 'Edit category', presentation: 'modal' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile', presentation: 'modal' }} />
          <Stack.Screen name="currency" options={{ title: 'Currency', presentation: 'modal' }} />
          <Stack.Screen name="planned/index" options={{ title: 'Planned payments' }} />
          <Stack.Screen name="planned/new" options={{ title: 'Add planned payment', presentation: 'modal' }} />
          <Stack.Screen name="planned/[id]" options={{ title: 'Edit planned payment', presentation: 'modal' }} />
          <Stack.Screen name="splits/index" options={{ title: 'Split money' }} />
          <Stack.Screen name="splits/person/[name]" options={{ title: '' }} />
          <Stack.Screen name="splits/add-person" options={{ title: 'Add person', presentation: 'modal' }} />
          <Stack.Screen name="splits/entry" options={{ title: 'Entry', presentation: 'modal' }} />
          <Stack.Screen name="splits/settle" options={{ title: 'Settle up', presentation: 'modal' }} />
          <Stack.Screen name="security" options={{ title: 'App lock' }} />
          <Stack.Screen name="pin-setup" options={{ title: 'Set PIN', presentation: 'modal' }} />
          <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
        </Stack.Protected>
        <Stack.Protected guard={!settings.onboarded}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </LockGate>
  );
}
