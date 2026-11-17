# SpendTrak for Android

Native Android app for SpendTrak, built with Expo (React Native). It lives alongside the Next.js web app in the repo root and shares no runtime code with it. All data is stored on the device in SQLite.

## Run it

Requirements: Node.js 20+, Android Studio with an emulator (or a USB-connected phone), and `adb` on your `PATH`.

```bash
cd mobile
npm install
npm run android        # starts Metro and opens the app in Expo Go on the emulator
```

Press `r` in the terminal to reload, `m` for the dev menu. In the app, Home or Settings has **Load sample data** to explore with demo accounts and transactions.

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Working on it with AI agents

`AGENTS.md` holds the project conventions (folder layout, data-layer rules, UI rules, roadmap). Point agents at it before asking for changes.
