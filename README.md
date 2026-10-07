# Muscle Foundation

A mobile-first, offline-capable workout companion for John Barban's 12-week Muscle Building Foundation program. The program dataset preserves the prescribed exercise order, sets, reps, rest periods, and source spellings. Workout entries, notes, preferences, and metrics are separate user data.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

```sh
npm install
npm run dev
```

Vite serves the development app at the address printed in the terminal. The app is designed for phone-sized screens and desktop browsers.

## Build and test

```sh
npm test
npm run build
npm run preview
```

The build is static and can be hosted from any HTTPS static-file host. No backend, account, database, analytics, or API is used.

## Install and work offline

Open the deployed HTTPS site in a supported browser, then use its install option / browser menu to add Muscle Foundation to the home screen. The web app manifest and service worker cache the application shell and built JavaScript/CSS. After the first successful load, reload once while online to ensure the service worker controls the page; then verify the app in airplane mode. Bump the service-worker cache name when publishing a new asset bundle.

Core workout data and timers are local and do not make network requests. Exercise illustrations are bundled CSS placeholders; there are no externally hosted image dependencies. The UI uses system fonts, so it does not fetch fonts.

## Local data and privacy

All app data is stored in one versioned localStorage record:

```text
muscle-foundation-app:v1
```

Schema version 1 includes settings, current program position, workout sessions (source prescription and performed sets are stored separately), body metrics, week notes, and the last-updated timestamp. There is no cloud copy or account. Clearing site data or uninstalling the browser app can remove the local record.

## Backups

In **Settings → Local backup**, export a JSON backup and save it somewhere safe. Import validates the backup, then merges sessions and measurements by ID; matching IDs from the imported file replace their local counterparts. A malformed or unsupported backup is rejected before state is changed. Reset requires two confirmations and clears local app data.

## Source and supplemental content

Workout names and prescriptions are the program source data. The exercise directory's muscle groups and brief safety/form reminders are supplemental reference text, not claims from the source PDF. Source spellings such as “Overheard Tricep Extension” and “Seated Dumbell Curls” remain intact in the program data. Search aliases are separate. Images are intentionally placeholders until legally reusable local imagery and attribution are available.

## Assumptions and scope

- The program's five days are a sequence, not calendar appointments; completion advances to the next program day, not based on elapsed time.
- Moving program position is a user-confirmed override and does not edit session prescriptions.
- Bodyweight is optional. Historical weights retain the unit active when logged.
- Progress charts use local history only and do not infer or recommend training loads.
