/** The Android app is published as GitHub releases (APKs), not on the Play Store yet. */
export const ANDROID_RELEASES_URL = 'https://github.com/mathinraj/SmartSpend-2.0/releases/latest';
export const ANDROID_REQUIREMENTS = 'Free · Android 7.0 or newer · about 19 MB';

export const ANDROID_HIGHLIGHTS = [
  { icon: 'fa-solid fa-arrows-rotate', text: 'Syncs automatically with this web app through your Google Drive' },
  { icon: 'fa-solid fa-fingerprint', text: 'Fingerprint, face, PIN or password lock' },
  { icon: 'fa-solid fa-bell', text: 'Reminders and bill alerts as real phone notifications' },
  { icon: 'fa-solid fa-plane-slash', text: 'A native app that works fully offline' },
];

export const ANDROID_FEATURES = [
  { icon: '☁️', title: 'Automatic Google Drive sync', desc: 'Every change is saved to your own Google Drive within seconds and shows up here on the web, and the other way round. Prefer control? Switch to manual backup.' },
  { icon: '🔐', title: 'Real app lock', desc: 'Unlock with your fingerprint or face, or a PIN or password. Balances can stay hidden until you peek.' },
  { icon: '🔔', title: 'Notifications that work', desc: 'Daily, weekly or repeating reminders with Do Not Disturb hours, plus alerts before planned payments are due.' },
  { icon: '📊', title: 'Every web feature', desc: 'Accounts, analytics, splits, planned payments, categories with any emoji, calendar view and running balances — all there.' },
  { icon: '📤', title: 'Export to your phone', desc: 'Save data backups, Excel, PDF or CSV straight to Downloads/spendtrak-backup, or share them to any app.' },
  { icon: '🕘', title: 'Restore earlier versions', desc: 'Daily copies of the last 7 days are kept in your Drive, so a mistake is always one tap from undone.' },
];

export const ANDROID_INSTALL_STEPS = [
  { title: 'Open the latest release', desc: 'On your phone, open the GitHub release page from the button on this page.' },
  { title: 'Download the right file', desc: 'Most phones need the arm64-v8a APK. Not sure? The universal APK works on every phone.' },
  { title: 'Install it', desc: 'Open the download. If Android asks, allow "Install unknown apps" for your browser, then tap Install.' },
  { title: 'Bring your data', desc: 'In the app, open Settings → Google Drive and sign in with the same Google account you use here.' },
];
