import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { DialogHost } from '@/components/dialog-host';
import { LaunchAnimation } from '@/components/launch-animation';
import { LockGate } from '@/components/lock-gate';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDriveSync } from '@/hooks/use-drive-sync';
import { useReminderSync } from '@/hooks/use-reminder-sync';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { useUpdateCheck } from '@/hooks/use-update-check';
import { markAppReady } from '@/lib/launch';
import type { Settings } from '@/types/models';

// LaunchAnimation hides the native splash itself, on the frame it takes over.
SplashScreen.preventAutoHideAsync();

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
        <DialogHost />
      </KeyboardProvider>
      <StatusBar style="auto" />
      <LaunchAnimation />
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
  useDriveSync();
  useUpdateCheck();

  useEffect(() => {
    Appearance.setColorScheme(settings.theme === 'system' ? 'auto' : settings.theme);
  }, [settings.theme]);

  useEffect(markAppReady, []);

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
          <Stack.Screen name="account/pay-bill" options={{ title: 'Pay card bill', presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="customize" options={{ title: 'Customize' }} />
          <Stack.Screen name="feedback" options={{ title: 'Send feedback', presentation: 'modal' }} />
          <Stack.Screen name="developer" options={{ title: 'Meet the developer' }} />
          <Stack.Screen name="export" options={{ title: 'Export', presentation: 'modal' }} />
          <Stack.Screen name="drive" options={{ title: 'Google Drive sync' }} />
          <Stack.Screen name="drive-restore" options={{ title: 'Restore an earlier version', presentation: 'modal' }} />
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
          <Stack.Screen name="pin-setup" options={{ title: 'App lock', presentation: 'modal' }} />
          <Stack.Screen name="lock-verify" options={{ title: 'Turn off app lock', presentation: 'modal' }} />
          <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
          <Stack.Screen name="reminder" options={{ title: 'Reminder', presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!settings.onboarded}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </LockGate>
  );
}
