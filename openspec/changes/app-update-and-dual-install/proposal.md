## Why

Currently the test and production APKs share the same Android `applicationId` (`dev.atman.ccmobile`) but use different signing keys, so only one can be installed on a device at a time. There's also no update mechanism — users must manually check GitHub Releases and re-download the APK to update.

## What Changes

- Add `applicationIdSuffix ".test"` to debug builds so test and production apps can coexist on the same device
- Inject `VITE_APP_VERSION` and `VITE_APP_ENV` at build time so the app knows its own version and environment
- Add an update-check button in the topbar (left of the settings gear) that polls GitHub Releases on startup
- Button shows subtle version text when up-to-date; becomes a blue "更新" button when a newer release exists
- Clicking the update button downloads the APK with a progress bar, then triggers the system package installer
- A small Capacitor plugin to handle APK download-to-file and launch the install intent

## Capabilities

### New Capabilities

- `in-app-update`: Runtime update checking against GitHub Releases, APK download with progress, and system install trigger. The app knows its version and environment (prod/test) via build-time injected env vars.

### Modified Capabilities

- `mobile-ci`: Debug builds get `applicationIdSuffix ".test"`. Build pipeline injects `VITE_APP_VERSION` and `VITE_APP_ENV` environment variables during the Vite build step.
- `version-management`: Version number is now also injected into the web frontend at build time (via `VITE_APP_VERSION`), not just into `package.json` and `build.gradle`.

## Non-goals

- Publishing to Google Play or using Play's in-app update API
- Background/push update notifications — check only happens on app launch
- OTA delta updates — always downloads the full APK
- Supporting iOS (Capacitor plugin is Android-only for now)

## Impact

- `mobile/android/app/build.gradle` — `applicationIdSuffix ".test"` for debug builds
- `.github/workflows/build-apk.yml` — inject `VITE_APP_VERSION` and `VITE_APP_ENV`
- `mobile/vite.config.js` — expose env vars to client bundle
- `mobile/src/app.js` — update check logic, UI button state management, download flow
- `mobile/index.html` — update button element in topbar
- `mobile/app.css` — update button styles (default subtle, active blue)
- New: `mobile/android/app/src/main/java/dev/atman/ccmobile/UpdateInstaller.java` — Capacitor plugin for APK download + install intent
- `mobile/package.json` — register new Capacitor plugin
