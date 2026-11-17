This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

# SpendTrak (project-specific)

Android-first native port of the SpendTrak web app (the Next.js app in the repo root). Offline, private, no backend: all data lives in on-device SQLite. Feature reference for parity is the root `README.md`; reuse its behavior and category/currency data, not its code.

## Layout

```
src/
  app/                 Routes only
    _layout.tsx        Providers + root stack; `Stack.Protected` shows onboarding until `settings.onboarded`
    onboarding.tsx     First run: welcome → name → currency
    (tabs)/            Native bottom tabs: index (Home), history, accounts, analytics
    transaction/       new (modal), [id] (detail), edit/[id] (modal)
    account/           new (modal), [id] (edit modal), pay-bill (credit card payment as a transfer)
    planned/           index (list), new, [id] (modals)
    splits/            index (people), person/[name], add-person, entry, settle (modals)
    settings.tsx       Pushed screen; customize (theme, Home layout, balances, default type), security, reminders likewise
    categories/        index (list), new, [id] (modals)
    profile.tsx, currency.tsx, pin-setup.tsx  Modals
  components/
    ui/                Design-system primitives (Text, Card, Screen, FormScreen, Button, Chip, Field, SwitchRow, ...)
    charts/            DonutChart (react-native-svg), MonthBars, BarChart, CategoryBreakdown (plain Views)
    analytics/         One component per Analytics tab (overview, categories, cards, accounts, trends); each takes an `AnalyticsScope`
    lock-gate.tsx      PIN overlay shown at launch and after the lock timeout
    *.tsx              Feature components (transaction-form, account-form, planned-form, pin-pad, rows)
  constants/           theme tokens, default categories, currencies
  db/                  The only place that runs SQL: migrations + one module per table
  hooks/               use-db-query, use-settings, use-theme
  lib/                 Pure helpers (formatting, ids, account display)
  types/models.ts      Domain types shared by db, hooks, and UI
```

## Data layer rules

- All SQL lives in `src/db/`. Screens never call `db.runAsync` directly; they call a function from `src/db/*` and read with `useDbQuery(fn, watchedTables, ...args)`, which re-runs automatically when a watched table changes. Don't add global state stores for database data.
- Schema changes: append a new function to `MIGRATIONS` in `src/db/migrations.ts`. Never edit a shipped migration.
- History's running balance (`getRunningBalances`) is derived the other way round: it starts from stored balances and undoes `balanceDeltas` newest-first, so it stays correct only while every balance change goes through those deltas.
- Account balances are stored, not derived. Only `addTransaction` / `deleteTransaction` (or a new function that uses the same `applyBalance` logic inside `withTransactionAsync`) may change them. Editing a transaction = reverse the old effect, apply the new one, in one SQL transaction.
- Never write `DELETE FROM table` without a `WHERE`: SQLite then truncates the table in one step and skips the change events `useDbQuery` relies on, so screens show stale data. Use `DELETE FROM table WHERE 1` to clear a table.
- `withTransactionAsync` cannot be nested. Functions meant to be composed inside another transaction (like `insertTransaction`) must not open their own.
- Dates are local `YYYY-MM-DD` strings; use `toDateKey` / `parseDateKey` from `src/lib/format.ts`, never `new Date('YYYY-MM-DD')` (parses as UTC).
- Category IDs match the web app so web JSON backups can be imported later.
- Custom account types live in `settings.customAccountTypes` (web format); accounts point at one with `custom_type_id` and copy its emoji into `icon`, so `accountEmoji` needs no type lookup. Account order is `sort_order`, shown within each type group on the Accounts tab.
- `src/db/backup.ts` reads and writes the web app's JSON backup format (web field names like `billingDate`, `splitLedger`). When adding a table or column, add it to both `buildBackup` and `importBackup` so backups stay round-trippable between the two apps.
- Split balances: positive = they owe you. `split_paid` and `settlement`/`paid` raise it; `split_owed` and `settlement`/`received` lower it (same as the web app). Shares created from an expense carry its `transaction_id` and are deleted with it.
- Split expenses: `split_amount` is the total of the other people's shares. `deduct_my_share` (set from `splitBankDeduction` when the expense is created, never recomputed) makes `applyBalance` take only `amount - split_amount` from the account. Spending totals (`getPeriodSummary`, `getCategoryTotals`, `getMonthlyTotals`) take a `SplitAmountMode` and count only your share when it is `my_share` (the default, like the web app). They also take an optional `accountIds` list (empty = all accounts) that filters on `account_id`; transfers never count toward these totals. Analytics date ranges come from `periodRange` in `src/lib/analytics-period.ts`; aggregate queries that aren't about a single table live in `src/db/analytics.ts`.

## App size

- Release builds use R8 code shrinking, resource shrinking, and compressed native libraries (`useLegacyPackaging`), set through the `expo-build-properties` plugin in `app.json` (mirrored in `android/gradle.properties`, which is regenerated by prebuild). Build with `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a` (about 19 MB). If the native compile fails without a clear error (clang processes killed), stop Metro and the Gradle daemon and add `--max-workers=3`.
- `expo-image-picker` is configured in `app.json` with camera and microphone permissions off; the app only reads the photo library.
- Don't add native packages the app doesn't import; each one adds native libraries and code. After adding any native module, test the release APK, not just Expo Go: R8 can strip code a library loads by reflection, which only fails in release builds (fix with keep rules in `android/app/proguard-rules.pro`).

## Device features

- PDF and Excel exports share one `buildReport` (`src/db/reports.ts`); `src/lib/report-files.ts` renders it as HTML for `expo-print` and as .xlsx. Request the PDF as base64 and write it yourself: in Expo Go the printed file's own URI can't be read back. Android's print engine fails on CSS `@page` margins, so pad the body instead.
- Anything that opens system UI the app goes to the background for (share sheet, file picker, biometric prompt) must run inside `withLockSuppressed` from `src/lib/lock.ts`, or the app lock will trigger on return.
- The lock PIN or password (`settings.lockType`) is stored only as a salted SHA-256 hash in `expo-secure-store`, never in SQLite or backups.
- Logos (Brandfetch) and feedback (EmailJS) read `EXPO_PUBLIC_BRANDFETCH_CLIENT_ID` and `EXPO_PUBLIC_EMAILJS_*` from the gitignored `mobile/.env.local` (same public keys as the web app's `.env.local`); without them the logo picker hides and feedback explains it isn't set up. EAS cloud builds need these as EAS environment variables. EmailJS rejects app requests unless "Allow EmailJS API for non-browser applications" is on in its dashboard, and "Use Private Key" must stay off (a private key can't be kept secret inside an app).
- Exports go through `exportWithPrompt` in `src/lib/backup-actions.ts`: "Save to Files" writes into a `spendtrak-backup` folder in Downloads through the Storage Access Framework (Android doesn't allow picking the Downloads root itself, so the user picks or creates the subfolder once; its URI is remembered in `settings.backupFolderUri`), "Share to an app" opens the share sheet. Only the JSON data backup can be imported; reports (Excel, PDF, CSV) are read-only.
- Profile photos (`src/lib/profile-photo.ts`) come from the system photo picker, or the file picker where it's missing, and are centre-cropped and saved as a 512 px JPEG in the app's documents folder. `profilePhotoUri` and `backupFolderUri` are device-only settings and are not part of backups.
- Custom reminders: daily/weekly ones use repeating triggers; repeating (interval) ones are scheduled as individual dates for the next 24 hours, skipping Do Not Disturb, and are topped up whenever `syncReminders` runs (app launch, settings changes). Expo Go may fail to update the notification channel; `ensureChannel` tolerates that.
- Notifications are scheduled only by `syncReminders` in `src/lib/notifications.ts`, which `useReminderSync` re-runs whenever settings or planned payments change. Don't schedule notifications elsewhere; extend `syncReminders`.
- Local notifications work in Expo Go; push notifications don't (and aren't used).

## UI rules

- Use theme tokens from `src/constants/theme.ts` via `useTheme()`; no hard-coded colors except brand-tinted shadows/overlays. The `theme` setting is applied once in `_layout.tsx` with `Appearance.setColorScheme`, so `useColorScheme`/`useTheme` already reflect it.
- Account balances (not transaction amounts) shown on screen go through `useBalancePrivacy(settings.hideBalances).formatBalance` so "Hide balances" masks them; offer a `PeekButton` where they appear.
- Use `Text` (variants + tones) instead of raw `react-native` `Text`. Amounts use `numeric` and `formatCurrency`.
- Icons go through `Icon` and its `ICONS` map (Material Symbols on Android). Category and account icons are emojis, as in the web app.
- Tab screens use `<Screen>` (or a list with the same insets) and keep the ScrollView/list as the first child; wrap with `<View collapsable={false}>` when adding a `Fab`.
- Forms use `<FormScreen footer={<Button .../>}>`: it keeps the focused input and the footer above the keyboard (react-native-keyboard-controller). Disable the primary button and use its label to say what's missing (e.g. "Choose a category") instead of showing error alerts.
- Date/time selection goes through `pickDate` / `pickTime` in `src/lib/pickers.ts` (Android system dialogs).
- Confirmations and messages use `showDialog` from `src/lib/dialog.ts` (same arguments as `Alert.alert`, plus an optional icon), rendered by `DialogHost` in `_layout.tsx`. Don't use `Alert.alert`; it ignores the app theme.
- Reorderable lists use `DraggableList` (`src/components/ui/draggable-list.tsx`): hold the handle, drag, release. It also exposes increment/decrement accessibility actions.
- Forms initialize state from props once, so route screens load the record first and render the form only when it exists.
- Verify UI changes on the Android emulator, light and dark mode.

## Roadmap

1. Phase 1 (done): scaffold, navigation, theme, SQLite schema, read-only screens, sample data, currency setting.
2. Phase 2 (done, v1.1.0): add/edit/delete transactions, transaction detail, account add/edit/delete, first-run onboarding, profile name. Not yet: category management, split expenses.
3. Phase 3 (done, v1.2.0): analytics charts with month switching, planned payments (mark paid logs an expense), split tracker (people, entries, settle up, split from the expense form), app lock (PIN + biometrics), daily and due-date reminders, JSON backup export/import compatible with the web app, CSV export. Not yet: category management, uneven splits, PDF/Excel export, Google Drive sync.
4. Phase 4 (deferred, do not start without being asked): SMS auto-capture of bank transactions. Needs a custom native module (Expo Modules API) for `READ_SMS`/`RECEIVE_SMS`, so the app must move from Expo Go to a development build. Google Play restricts SMS permissions and requires a permissions declaration; confirm current policy before building. Store parsed messages with `source = 'sms'` and a message fingerprint in `source_ref` (unique index already exists) to avoid duplicates, and always let the user confirm before saving.
5. Phase 5 (done, v1.3.0, web parity: daily-use gaps). Each step is one task:
   1. (done) History: search (all / note / category / amount / account), type tabs (all / expense / income / transfer), filter screen (multiple categories, multiple accounts, date range, amount range) with removable filter chips and a result count.
   2. (done) Category management: add / edit / delete categories and subcategories (name, emoji, color), reorder with up/down arrows, reachable from Settings and from the transaction form's category chips. Keep web category IDs for defaults; new ones get generated IDs.
   3. (done) Splits: settings for bank deduction (full amount / only my share) and expense recording (my share / full amount, default my share like the web app) and make analytics respect it; uneven (custom per-person) splits in the expense form; edit split entries; optional account on "They paid for me".
   4. (done) Settings: theme (system / light / dark), hide balances with a temporary peek, dashboard toggles (balance vs monthly-expenses card, income/expense stats, accounts strip, split card), exclude credit cards from total, default transaction type.
6. Phase 6 (done, v1.4.0, analytics and accounts):
   1. (done) Analytics period presets (this month, last month, this year, 30 days, 90 days, custom) and a multi-account filter; data functions take an account ID list.
   2. (done) Analytics sections: overview (avg daily spend, savings rate, transaction count, daily chart, spending by weekday, top 5 expenses), category month-vs-month comparison, credit cards (utilization, spend per card, bill payments), per-account analytics, 12-month trend.
   3. (done) Accounts: custom account types, reorder, credit card "Pay bill" (records a transfer), link to that account's analytics.
   4. (done) History: calendar view (dots and counts per day, tap to filter) and running balance toggle.
7. Phase 7 (done except Drive sync, v1.5.0, data and sync):
   1. (done) Migration adding `payment_app` to transactions and `logo_url` to accounts; round-trip them in `buildBackup` / `importBackup` so web backups lose nothing.
   2. (done) PDF export (`expo-print`) and Excel export (own minimal .xlsx writer on `fflate`; the npm `xlsx`/SheetJS build has known CVEs), shared through `withLockSuppressed`.
   3. (deferred, do not start without being asked) Google Drive sync in the web app's appDataFolder format (push, pull with merge, delete cloud backup, last-sync time), so web and phone sync with each other. Needs an Android OAuth client tied to the signing key.
   4. (done) Backup reminder (every 7 days, via `syncReminders`) and "Reset everything".
8. Phase 8 (done, v1.6.0, polish): multiple custom reminders (daily / weekly / repeating) with Do Not Disturb hours, profile photo (a default avatar for now; show the Google account photo through `ProfileAvatar`'s `photoUri` once Google sign-in exists), payment app / UPI field, bank logos (Brandfetch), feedback (EmailJS), optional password lock.
9. v1.7.0 (done, tweaks): profile photo from the gallery, custom emoji category icons, drag-to-reorder subcategories, themed dialogs, PIN check before turning off the app lock, Export screen (data backup, Excel, PDF, CSV; save to Downloads or share) and Import, richer sample data (splits, planned payments, payment apps).
