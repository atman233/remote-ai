## MODIFIED Requirements

### Requirement: GitHub Actions builds Android APK on any branch push
A push to any branch with changes to the `mobile/` directory SHALL trigger a GitHub Actions workflow that builds the Capacitor Android APK.

#### Scenario: Push to feature branch starts build
- **GIVEN** a push to a `feature-*` or `fix-*` branch includes changes to `mobile/`
- **WHEN** GitHub Actions receives the push event
- **THEN** it checks out the code, installs dependencies, builds the web frontend, syncs Capacitor, and assembles a debug APK

#### Scenario: Push without mobile changes skips build
- **GIVEN** a push to any branch does not include changes to `mobile/`
- **WHEN** GitHub Actions receives the push event
- **THEN** the mobile build job is skipped to save CI resources

#### Scenario: Push to main triggers production build
- **GIVEN** a push to `main` includes changes to `mobile/`
- **WHEN** GitHub Actions receives the push event
- **THEN** it builds the APK with production server configuration (`easyai.wuya.asia`) and uploads it as a GitHub Release

## REMOVED Requirements

### Requirement: Test APK is uploaded as GitHub Release
**Reason**: Only main branch builds create GitHub Releases. Feature/fix branch builds upload to GitHub Actions artifacts only.
**Migration**: Download test APKs from the Actions run artifacts page instead of the Releases page.

## ADDED Requirements

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
- **THEN** it executes `npm ci`, `npm run build`, `npx cap sync android`, and `cd android && ./gradlew assembleDebug` in sequence
