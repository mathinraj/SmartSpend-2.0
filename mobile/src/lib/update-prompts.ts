import { Linking } from 'react-native';

import { showDialog } from '@/lib/dialog';
import { APP_VERSION, RELEASES_PAGE, checkForUpdates, type UpdateInfo } from '@/lib/updates';

/** Opens the link in the browser, which downloads the APK; Android then offers to install it over this version. */
export function downloadUpdate(update: UpdateInfo) {
  void Linking.openURL(update.apk?.url ?? update.pageUrl);
}

export function showUpdateDialog(update: UpdateInfo) {
  showDialog(
    `SpendTrak ${update.version} is available`,
    [
      update.note,
      `You have version ${APP_VERSION}. The download opens in your browser; tap it when it finishes to install. Your data stays.`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    [
      { text: 'Later', style: 'cancel' },
      { text: update.apk ? `Download (${update.apk.sizeMb} MB)` : 'Download', onPress: () => downloadUpdate(update) },
      { text: "What's new", onPress: () => void Linking.openURL(update.pageUrl) },
    ],
    { icon: 'systemUpdate' }
  );
}

/** The Check for updates button: checks now and says what it found. */
export async function checkForUpdatesWithDialog() {
  const result = await checkForUpdates({ force: true });
  if (result.phase === 'available') showUpdateDialog(result.update);
  else if (result.phase === 'current') {
    showDialog("You're up to date", `SpendTrak ${APP_VERSION} is the latest version.`, undefined, { icon: 'check' });
  } else if (result.phase === 'error') {
    showDialog("Couldn't check for updates", `${result.message} Check your connection and try again.`, [
      { text: 'Close', style: 'cancel' },
      { text: 'View releases', onPress: () => void Linking.openURL(RELEASES_PAGE) },
    ]);
  }
}
