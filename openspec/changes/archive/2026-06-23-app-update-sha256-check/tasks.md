## 1. CI Build Pipeline

- [x] 1.1 Add SHA256 computation step after production APK build
- [x] 1.2 Add SHA256 computation step after test APK build
- [x] 1.3 Include SHA256 hash in production GitHub Release body
- [x] 1.4 Include SHA256 hash in test GitHub Release body

## 2. Native Capacitor Plugin

- [x] 2.1 Add `getLocalApkSha256()` method to `UpdateManagerPlugin.java`
- [x] 2.2 Add `REQUEST_INSTALL_PACKAGES` permission to AndroidManifest.xml
- [x] 2.3 Add install permission check before download (redirect to settings if missing)

## 3. Frontend Update Detection

- [x] 3.1 Parse SHA256 from GitHub Release body in `checkForUpdate()`
- [x] 3.2 Call `getLocalApkSha256()` at runtime and cache per-version
- [x] 3.3 Change detection logic to version + SHA256 joint judgment
- [x] 3.4 Remove update-check result caching (always fetch on launch)
- [x] 3.5 Enable manual re-check on version button tap in idle state

## 4. CI Signing Fix

- [x] 4.1 Generate fixed debug keystore
- [x] 4.2 Commit debug keystore to `mobile/android/app/`
- [x] 4.3 Configure `build.gradle` debug signing config to use committed keystore

## 5. Repository

- [x] 5.1 Make GitHub repository public for unauthenticated API access
