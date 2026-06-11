## 1. Build Configuration — Dual Install & Env Vars

- [x] 1.1 Add `applicationIdSuffix ".test"` to the `debug` build type in `mobile/android/app/build.gradle`
- [x] 1.2 Inject `VITE_APP_VERSION` and `VITE_APP_ENV` in `.github/workflows/build-apk.yml` during the "Set default server URL" step
- [x] 1.3 Update `mobile/vite.config.js` to expose `VITE_APP_VERSION` and `VITE_APP_ENV` via `import.meta.env`

## 2. Native Capacitor Plugin — APK Download & Install

- [x] 2.1 Create `mobile/android/app/src/main/java/dev/atman/ccmobile/UpdateManagerPlugin.java` with `downloadAndInstall()` method that downloads the APK via `HttpURLConnection`, emits progress events, saves to external files dir, and launches install intent
- [x] 2.2 Create `mobile/android/app/src/main/res/xml/file_paths.xml` granting `external-files-path` under `updates/`
- [x] 2.3 Add `<provider>` for `FileProvider` in `AndroidManifest.xml` referencing `file_paths.xml`
- [x] 2.4 Register `UpdateManagerPlugin` in `MainActivity.java` by overriding `onCreate` and calling `registerPlugin(UpdateManagerPlugin.class)`

## 3. Frontend — Update Button & UI Logic

- [x] 3.1 Add update button element (`#update-btn`) to the topbar in `mobile/index.html`, positioned between `#session-info` and `#settings-btn`
- [x] 3.2 Add CSS for all button states in `mobile/app.css`: `.update-idle` (subtle gray), `.update-available` (blue bg, white text), `.update-downloading` (progress bar), `.update-error` (red text)
- [x] 3.3 Implement update check in `mobile/src/app.js`: fetch GitHub Releases API (prod → `/releases/latest`, test → `/releases/tags/test-latest`), parse semver from `tag_name`, compare against `VITE_APP_VERSION`, apply button state
- [x] 3.4 Add 30-minute cache for update check results in localStorage to avoid API rate limits
- [x] 3.5 Hook up native plugin: load plugin with Capacitor's `registerPlugin`, call `downloadAndInstall()` on button tap, listen for `downloadProgress` events to drive button text

## 4. Verification

- [ ] 4.1 Build debug APK and verify `applicationId` is `dev.atman.ccmobile.test` in the installed app *(requires physical device)*
- [ ] 4.2 Install both release and debug APKs on a physical device, confirm both coexist *(requires physical device)*
- [ ] 4.3 Trigger a test build with a bumped version, verify the update button turns blue and download/install flow works end-to-end *(requires CI + physical device)*
