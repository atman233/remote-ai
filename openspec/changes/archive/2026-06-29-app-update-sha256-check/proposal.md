## Why

The current update detection compares git commit SHA only. Same-version micro-iteration rebuilds go undetected, and there is no APK integrity verification. The GitHub repo must also be private, requiring auth tokens for the Releases API.

## What Changes

- Update detection uses version number AND APK SHA256 jointly — either differs triggers update
- CI computes SHA256 of built APK and writes it into the GitHub Release body
- Native plugin exposes `getLocalApkSha256()` to compute installed APK SHA256 at runtime
- Local SHA256 is cached per-version (immutable until next install)
- Remove update-check result caching — check on launch and on manual tap
- Debug keystore committed to repo to fix CI signature conflicts across builds
- Install-unknown-apps permission check before download, with settings redirect
- GitHub repo made public for unauthenticated API access

## Capabilities

### New Capabilities

None — this refines an existing capability.

### Modified Capabilities

- `in-app-update`: Detection criteria changed from commit-SHA-only to version + APK SHA256 joint judgment. Update check no longer cached. Manual re-check on version button tap. Install permission gating added.

## Impact

- `.github/workflows/build-apk.yml` — SHA256 compute step added
- `mobile/src/app.js` — detection logic rewritten, cache removed
- `UpdateManagerPlugin.java` — new `getLocalApkSha256()` method, install permission check
- `AndroidManifest.xml` — `REQUEST_INSTALL_PACKAGES` permission
- `build.gradle` — fixed debug keystore signing
- `mobile/android/app/debug.keystore` — new file
