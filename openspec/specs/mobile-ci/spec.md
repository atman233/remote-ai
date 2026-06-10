## Purpose
Defines the CI/CD pipeline for the Capacitor Android app. Pushes to any branch with mobile/ changes trigger automatic APK builds via GitHub Actions. Non-main branches build with test server config and upload to a fixed test-latest pre-release. Main branch builds with production config, release signing, and uploads to versioned GitHub Releases with auto-created git tags.

## Requirements

### Requirement: GitHub Actions builds Android APK on any branch push
A push to any branch with changes to the `mobile/` directory SHALL trigger a GitHub Actions workflow that builds the Capacitor Android APK.

#### Scenario: Push to feature branch starts build
- **GIVEN** a push to a `feature-*` or `fix-*` branch includes changes to `mobile/`
- **WHEN** GitHub Actions receives the push event
- **THEN** it checks out the code, determines the version from VERSION + git tags, installs dependencies, builds the web frontend, syncs Capacitor, and assembles a debug APK named `ai-remote-test-v<version>.apk`

#### Scenario: Push without mobile changes skips build
- **GIVEN** a push to any branch does not include changes to `mobile/`
- **WHEN** GitHub Actions receives the push event
- **THEN** the mobile build job is skipped to save CI resources

#### Scenario: Push to main triggers production build
- **GIVEN** a push to `main` includes changes to `mobile/`
- **WHEN** GitHub Actions receives the push event
- **THEN** it builds the APK with production server configuration (`easyai.wuya.asia`), signs it with the release keystore, names it `ai-remote-v<version>.apk`, uploads it as a GitHub Release, and creates a git tag for the version

### Requirement: Non-main branch builds use test server configuration
Any APK built from a branch other than `main` SHALL be configured to connect to the testing server (`easyaitest.wuya.asia`) by default.

#### Scenario: Feature branch APK connects to test environment
- **GIVEN** a push to a `feature-*` branch
- **WHEN** the CI workflow builds the APK
- **THEN** the app's default server URL is set to `easyaitest.wuya.asia`

### Requirement: Main branch builds use production server configuration
Any APK built from the `main` branch SHALL be configured to connect to the production server (`easyai.wuya.asia`) by default.

#### Scenario: Main branch APK connects to production environment
- **GIVEN** a push to `main`
- **WHEN** the CI workflow builds the APK
- **THEN** the app's default server URL is set to `easyai.wuya.asia`

### Requirement: Build uses Capacitor CLI
The CI workflow SHALL use the Capacitor CLI to build the Android APK.

#### Scenario: Capacitor build steps
- **GIVEN** the CI workflow executes the mobile build job
- **WHEN** it runs the build
- **THEN** it executes `npm ci`, `npm run build`, `npx cap sync android`, and `cd android && ./gradlew assembleDebug` or `assembleRelease` in sequence depending on the branch

### Requirement: Test builds upload to a single test-latest release
Test builds from non-main branches SHALL upload to a fixed GitHub Release tag `test-latest`, overwriting the previous test release so that at most one test build exists at any time.

#### Scenario: First test build creates test-latest
- **GIVEN** no `test-latest` tag exists
- **WHEN** a test build completes on a feature branch
- **THEN** a new pre-release with tag `test-latest` is created with the APK attached

#### Scenario: Subsequent test build replaces test-latest
- **GIVEN** a `test-latest` pre-release already exists
- **WHEN** a new test build completes
- **THEN** the old `test-latest` tag and release are deleted and replaced with the new build

### Requirement: Production builds use release keystore signing
Production APK builds on `main` SHALL be signed with a release keystore whose credentials are stored in GitHub Secrets.

#### Scenario: Production APK is release-signed
- **GIVEN** a push to `main`
- **WHEN** the CI workflow builds the APK
- **THEN** it runs `assembleRelease` with the signing configuration loaded from GitHub Secrets (KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD)

### Requirement: APK artifact uses versioned filename
The built APK SHALL be named with the app name, environment, and version according to the pattern:
- Production: `ai-remote-v<version>.apk`
- Test: `ai-remote-test-v<version>.apk`

#### Scenario: Production APK has versioned name
- **GIVEN** a production build with version `v0.0.3`
- **WHEN** the APK is assembled
- **THEN** the output file is `ai-remote-v0.0.3.apk`

#### Scenario: Test APK has versioned name
- **GIVEN** a test build with computed version `v0.0.4`
- **WHEN** the APK is assembled
- **THEN** the output file is `ai-remote-test-v0.0.4.apk`
