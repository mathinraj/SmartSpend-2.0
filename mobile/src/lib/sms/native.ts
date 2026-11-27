import { requireOptionalNativeModule } from 'expo';

/** One inbox message from a business sender (the native side drops personal and promotional ones). */
export interface InboxSms {
  id: number;
  address: string;
  body: string;
  /** Epoch milliseconds. */
  date: number;
}

export type SettingsScreen = 'app' | 'battery' | 'autostart' | 'smsPermission';

interface SmsReaderModule {
  hasPermission(): boolean;
  readInbox(sinceMs: number, limit: number): Promise<InboxSms[]>;
  readMessage(id: number): Promise<string | null>;
  configureAlerts(enabled: boolean, notify: boolean, link: string): void;
  isIgnoringBatteryOptimizations(): boolean;
  openSettings(kind: SettingsScreen): SettingsScreen;
}

/** The local module in `modules/sms-reader` (Android only); null on iOS, web, and builds without it. */
export const SmsReader = requireOptionalNativeModule<SmsReaderModule>('SmsReader');
