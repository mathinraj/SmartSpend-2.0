import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ensureNotificationPermission } from '@/lib/notifications';
import { SmsReader, type SettingsScreen } from '@/lib/sms/native';

const AUTOSTART_MAKERS = /xiaomi|redmi|poco|oppo|realme|vivo|iqoo|oneplus|huawei|honor|asus|tecno|infinix/i;

interface Step {
  icon: IconName;
  title: string;
  detail: string;
  done?: boolean;
  action: string;
  open: () => void;
}

/** Phone-maker settings that can stop "new bank transaction" alerts when SpendTrak is closed. */
export default function SmsReliableScreen() {
  const colors = useTheme();
  const maker = `${Device.manufacturer ?? ''} ${Device.brand ?? ''}`.trim();
  const [notifications, setNotifications] = useState<boolean | null>(null);
  const [battery, setBattery] = useState<boolean | null>(null);

  useEffect(() => {
    const refresh = () => {
      Notifications.getPermissionsAsync().then((p) => setNotifications(p.granted));
      setBattery(SmsReader?.isIgnoringBatteryOptimizations() ?? null);
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => subscription.remove();
  }, []);

  const open = (kind: SettingsScreen) => () => SmsReader?.openSettings(kind);
  const xiaomi = /xiaomi|redmi|poco/i.test(maker);
  const steps: Step[] = [
    {
      icon: 'bell',
      title: 'Allow notifications',
      detail: 'So SpendTrak can tell you when a bank SMS arrives.',
      done: notifications ?? undefined,
      action: 'Allow',
      open: () => void ensureNotificationPermission().then(setNotifications),
    },
    {
      icon: 'battery',
      title: 'Battery: unrestricted',
      detail: 'Battery savers can stop SpendTrak from seeing new messages while it is closed. Choose "Unrestricted" or "Don\'t optimise".',
      done: battery ?? undefined,
      action: 'Open battery settings',
      open: open('battery'),
    },
  ];
  if (xiaomi) {
    steps.push({
      icon: 'sms',
      title: 'Allow "Notification SMS"',
      detail: 'Xiaomi, Redmi and POCO phones hide bank messages from apps unless this extra permission is on (Permissions → Notification SMS).',
      action: 'Open permissions',
      open: open('smsPermission'),
    });
  }
  if (AUTOSTART_MAKERS.test(maker)) {
    steps.push({
      icon: 'play',
      title: 'Allow autostart',
      detail: 'Lets SpendTrak react to new messages after the phone restarts or the app is cleared from recents.',
      action: 'Open autostart',
      open: open('autostart'),
    });
  }

  return (
    <Screen variant="stack">
      <Text variant="body" tone="secondary">
        {maker ? `On this ${maker} phone, ` : 'On some phones, '}these settings help SpendTrak notice bank messages while it&apos;s closed. Even without
        them, everything is picked up the next time you open SpendTrak.
      </Text>
      {steps.map((step) => (
        <Card key={step.title} style={styles.step}>
          <View style={styles.row}>
            <Icon name={step.icon} color={colors.primary} />
            <Text variant="bodyStrong" style={styles.flex}>
              {step.title}
            </Text>
            {step.done ? <Icon name="check" color={colors.success} /> : null}
          </View>
          <Text variant="caption" tone="secondary">
            {step.detail}
          </Text>
          {step.done ? null : <Button label={step.action} variant="secondary" size="small" onPress={step.open} />}
        </Card>
      ))}
      <Text variant="caption" tone="secondary">
        If a button opens the wrong screen, look for SpendTrak under Settings → Apps.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  flex: {
    flex: 1,
  },
});
