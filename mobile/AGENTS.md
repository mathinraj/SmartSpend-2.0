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
    _layout.tsx        Root stack + SQLiteProvider + navigation theme
    (tabs)/            Native bottom tabs: index (Home), history, accounts, analytics
    settings.tsx       Pushed screen
    currency.tsx       Modal
    add-transaction.tsx Modal
  components/
    ui/                Design-system primitives (Text, Card, Screen, Button, Fab, ListRow, Icon, ...)
    *.tsx              Feature components (e.g. transaction-row)
  constants/           theme tokens, default categories, currencies
  db/                  The only place that runs SQL: migrations + one module per table
  hooks/               use-db-query, use-settings, use-theme
  lib/                 Pure helpers (formatting, ids, account display)
  types/models.ts      Domain types shared by db, hooks, and UI
```

## Data layer rules

- All SQL lives in `src/db/`. Screens never call `db.runAsync` directly; they call a function from `src/db/*` and read with `useDbQuery(fn, watchedTables, ...args)`, which re-runs automatically when a watched table changes. Don't add global state stores for database data.
- Schema changes: append a new function to `MIGRATIONS` in `src/db/migrations.ts`. Never edit a shipped migration.
- Account balances are stored, not derived. Only `addTransaction` / `deleteTransaction` (or a new function that uses the same `applyBalance` logic inside `withTransactionAsync`) may change them. Editing a transaction = reverse the old effect, apply the new one, in one SQL transaction.
- `withTransactionAsync` cannot be nested. Functions meant to be composed inside another transaction (like `insertTransaction`) must not open their own.
- Dates are local `YYYY-MM-DD` strings; use `toDateKey` / `parseDateKey` from `src/lib/format.ts`, never `new Date('YYYY-MM-DD')` (parses as UTC).
- Category IDs match the web app so web JSON backups can be imported later.

## UI rules

- Use theme tokens from `src/constants/theme.ts` via `useTheme()`; no hard-coded colors except brand-tinted shadows/overlays.
- Use `Text` (variants + tones) instead of raw `react-native` `Text`. Amounts use `numeric` and `formatCurrency`.
- Icons go through `Icon` and its `ICONS` map (Material Symbols on Android). Category and account icons are emojis, as in the web app.
- Tab screens use `<Screen>` (or a list with the same insets) and keep the ScrollView/list as the first child; wrap with `<View collapsable={false}>` when adding a `Fab`.
- Verify UI changes on the Android emulator, light and dark mode.

## Roadmap

1. Phase 1 (done): scaffold, navigation, theme, SQLite schema, read-only screens, sample data, currency setting.
2. Phase 2: add/edit/delete transaction form, account CRUD, first-run onboarding (name + currency), transaction detail.
3. Phase 3: charts (trends, category donut), planned payments, split tracker, app lock (`expo-local-authentication`), reminders (`expo-notifications`), export/import (JSON compatible with the web app).
4. Phase 4: SMS auto-capture of bank transactions. Needs a custom native module (Expo Modules API) for `READ_SMS`/`RECEIVE_SMS`, so the app must move from Expo Go to a development build. Google Play restricts SMS permissions and requires a permissions declaration; confirm current policy before building. Store parsed messages with `source = 'sms'` and a message fingerprint in `source_ref` (unique index already exists) to avoid duplicates, and always let the user confirm before saving.
