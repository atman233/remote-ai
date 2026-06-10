## 1. Version infrastructure

- [x] 1.1 Create `VERSION` file at repo root with initial content `0.0`
- [x] 1.2 Update `mobile/android/app/build.gradle` to accept versionCode and versionName from Gradle properties (`-PversionCode` / `-PversionName`), with hardcoded defaults as fallback
- [x] 1.3 Update `mobile/android/app/build.gradle` to set APK output filename using `archivesBaseName` or `applicationVariants` based on the version and build type (release → `ai-remote-vX.X.X`, debug → `ai-remote-test-vX.X.X`)
- [x] 1.4 Configure `signingConfigs` in `mobile/android/app/build.gradle` for release builds, reading keystore path, password, alias from Gradle properties

## 2. CI workflow update

- [x] 2.1 Add version computation step to `build-apk.yml`: read VERSION file, count matching git tags, compute full version
- [x] 2.2 Add version injection step: use `sed` or `jq` to set version in `package.json` before build
- [x] 2.3 Update Gradle build step to pass version properties (`-PversionCode`, `-PversionName`, signing properties)
- [x] 2.4 Update APK upload step to use the versioned filename

## 3. Release flow (test builds)

- [x] 3.1 Replace per-branch test release logic with fixed `test-latest` tag: delete existing `test-latest` tag + release if present, then create new pre-release
- [x] 3.2 Remove the old per-branch release step that created `test-<branch>-<run>` tags

## 4. Release flow (production builds)

- [x] 4.1 Update production release step to use `assembleRelease` instead of `assembleDebug`
- [x] 4.2 Add keystore decoding step: decode `KEYSTORE_BASE64` secret to a file before Gradle build
- [x] 4.3 Add git tag creation step: after successful release upload, create and push tag `v<major>.<minor>.<patch>`

## 5. Secrets and keystore

- [x] 5.1 Generate release keystore with `keytool` and encode as base64
- [x] 5.2 Add GitHub Secrets: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
- [x] 5.3 Add `keystore.jks` and `*.jks` to `.gitignore`

## 6. Validation

- [x] 6.1 Push to a test branch and verify test build produces `ai-remote-test-v0.0.X.apk` and updates `test-latest` release
- [x] 6.2 Merge to main and verify production build produces `ai-remote-v0.0.X.apk`, creates version tag, and is release-signed
