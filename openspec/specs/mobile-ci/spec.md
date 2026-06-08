## Purpose
Defines the CI/CD pipeline for the Capacitor Android app. Pushes to the test branch trigger automatic APK builds via GitHub Actions, with the resulting APK uploaded to GitHub Releases for direct phone download.

## Requirements

### Requirement: GitHub Actions builds Android APK on test branch push
A push to the test branch SHALL trigger a GitHub Actions workflow that builds the Capacitor Android APK.

#### Scenario: Push to test branch starts build
- **WHEN** code is pushed to the test branch with changes to the mobile/ directory
- **THEN** GitHub Actions checks out the code, installs dependencies, builds the web frontend, syncs Capacitor, and assembles a debug APK

#### Scenario: Push without mobile changes skips build
- **WHEN** code is pushed to the test branch without any changes to the mobile/ directory
- **THEN** the mobile build step is skipped to save CI resources

### Requirement: Test APK is uploaded as GitHub Release
The built test APK SHALL be uploaded to GitHub Releases as an artifact accessible from a mobile browser.

#### Scenario: APK appears in GitHub Releases
- **WHEN** the GitHub Actions workflow completes successfully
- **THEN** the APK file is available as a release artifact on the GitHub repository's Releases page

#### Scenario: User downloads APK on phone
- **WHEN** a user opens the GitHub Releases page on their Android phone
- **THEN** they can download and install the test APK directly from the browser

### Requirement: Test app targets testing server
The APK built from the test branch SHALL be configured to connect to the testing server (easyaitest.wuya.asia) by default.

#### Scenario: Test app connects to test environment
- **WHEN** the test APK is installed and launched
- **THEN** the app's default server URL is set to easyaitest.wuya.asia

### Requirement: Production app targets production server
The APK built from the main branch SHALL be configured to connect to the production server (easyai.wuya.asia) by default.

#### Scenario: Production app connects to production environment
- **WHEN** the production APK is installed and launched
- **THEN** the app's default server URL is set to easyai.wuya.asia

### Requirement: Build uses Capacitor CLI
The CI workflow SHALL use the Capacitor CLI to build the Android APK.

#### Scenario: Capacitor build steps
- **WHEN** the CI workflow executes the mobile build job
- **THEN** it runs `npm ci`, `npm run build`, `npx cap sync android`, and `cd android && ./gradlew assembleDebug` in sequence
