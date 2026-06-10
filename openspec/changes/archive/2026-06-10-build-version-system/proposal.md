## Why

The build pipeline currently has no real version tracking (uses CI run number as a one-off tag), test builds accumulate indefinitely as GitHub Releases, and the APK output is always named `app-debug.apk` with no environment or version distinction. This makes it impossible to tell builds apart and wasteful on storage.

## What Changes

- Introduce semver-based versioning (`v0.0.3`) driven by a `VERSION` file (major.minor) + auto-counted patch from existing git tags
- CI auto-creates a git tag for each production build, driving patch auto-increment
- Test builds use a fixed `test-latest` tag that gets force-updated, keeping exactly 1 test release
- Production APKs named `ai-remote-vX.X.X.apk`, test APKs named `ai-remote-test-vX.X.X.apk`
- Production builds signed with a release keystore instead of debug keys; test builds keep debug signing
- Version injected into `package.json`, `build.gradle` (versionCode + versionName), and APK filename at build time

## Capabilities

### New Capabilities

- `version-management`: Auto-incrementing semver from VERSION file + git tag count. Version injected into all build artifacts (package.json, build.gradle, APK name). CI auto-tags production builds.

### Modified Capabilities

- `mobile-ci`: Production builds now use `assembleRelease` with keystore signing instead of `assembleDebug`. Test builds upload to fixed `test-latest` tag instead of creating new per-branch releases. APK artifact naming includes version and environment.

## Non-goals

- Auto-increment on literally every git commit (recursive problem; using CI build + tag approach instead)
- Changing the Capacitor app ID (`dev.atman.ccmobile`) or package structure
- Version bumping for non-mobile changes

## Impact

- `.github/workflows/build-apk.yml` — major rewrite of version logic, signing, and release steps
- `mobile/android/app/build.gradle` — signingConfig + APK output name + dynamic version injection
- `mobile/package.json` — version field dynamically set by CI
- New file: `VERSION` at repo root (stores `0.0`)
- New GitHub Secrets: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
