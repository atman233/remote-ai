## Purpose
Defines the in-app update mechanism. The app displays its version, checks GitHub Releases for newer versions on launch, shows an update button when a new version is available, downloads the APK with progress feedback, and triggers the system package installer.

## Requirements

### Requirement: App displays current version in topbar

The app SHALL display its current version number as a subtle text element in the topbar, positioned to the left of the settings button. The version text SHALL be sourced from the build-time injected `VITE_APP_VERSION` environment variable.

#### Scenario: Version is displayed on launch

- **GIVEN** the app was built with `VITE_APP_VERSION=0.0.3`
- **WHEN** the app launches and renders the topbar
- **THEN** the version text shows `v0.0.3` in a subtle gray style

### Requirement: Auto-check for updates on launch

The app SHALL check for updates on every launch by querying the GitHub Releases API. The check SHALL NOT be cached — a fresh API call SHALL be made on every launch. The check endpoint SHALL depend on the build environment:
- Production apps (`VITE_APP_ENV=production`) SHALL query `/repos/<owner>/<repo>/releases/latest`
- Test apps (`VITE_APP_ENV=test`) SHALL query `/repos/<owner>/<repo>/releases/tags/test-latest`

Update detection SHALL use joint criteria: an update is available if the remote version differs from the app version OR the remote APK SHA256 differs from the local APK SHA256. The app SHALL also support manual re-check when the user taps the version button.

#### Scenario: Production app checks latest release

- **GIVEN** the app is a production build (`VITE_APP_ENV=production`) with version `0.0.3`
- **WHEN** the app launches
- **THEN** it fetches the latest GitHub Release and compares both version and SHA256 against local values

#### Scenario: Test app checks test-latest pre-release

- **GIVEN** the app is a test build (`VITE_APP_ENV=test`) with version `0.0.4`
- **WHEN** the app launches
- **THEN** it fetches the `test-latest` GitHub Release and compares both version and SHA256 against local values

#### Scenario: Same version with different SHA256 triggers update

- **GIVEN** the app version is `0.0.4` and the remote version is also `0.0.4`
- **WHEN** the remote APK SHA256 differs from the locally installed APK SHA256
- **THEN** the update button is shown (micro-iteration rebuild)

### Requirement: Update button becomes a CTA when new version is available

If the remote version differs from the app version OR the remote APK SHA256 differs from the local APK SHA256, the version display element SHALL transform into a blue button with white text "更新" (update). The button SHALL be clearly visually distinct from its idle state. Tapping the button when no update is available SHALL trigger a manual re-check.

#### Scenario: New version available

- **GIVEN** the current app version is `0.0.3` and the remote release version is `0.0.4`
- **WHEN** the update check completes
- **THEN** the update button changes to a blue background with white text "更新"

#### Scenario: App is already up to date

- **GIVEN** the current app version is `0.0.3`, the remote release version is also `0.0.3`, and the SHA256 values match
- **WHEN** the update check completes
- **THEN** the update button remains in its subtle idle state showing `v0.0.3`

#### Scenario: Manual re-check on version button tap

- **GIVEN** the update button is in idle state showing the current version
- **WHEN** the user taps the version button
- **THEN** a fresh update check is performed immediately

### Requirement: Install permission is checked before download

Before downloading the APK, the native plugin SHALL check whether the app has permission to install packages (`REQUEST_INSTALL_PACKAGES` on Android 8.0+). If permission is not granted, the plugin SHALL open the system settings page for "Install unknown apps" and emit an error event instructing the user to enable permission before retrying.

#### Scenario: Permission not granted

- **GIVEN** the app does not have "install unknown apps" permission
- **WHEN** the user taps the "更新" button
- **THEN** the system settings page for "Install unknown apps" opens and the button displays "重试"

#### Scenario: Permission already granted

- **GIVEN** the app has "install unknown apps" permission
- **WHEN** the user taps the "更新" button
- **THEN** the APK download begins immediately

### Requirement: CI builds use a fixed debug signing key

The CI workflow SHALL use a committed debug keystore for signing test APK builds, ensuring consistent signatures across CI runs. This SHALL prevent "Conflicting app signatures" errors when installing a new test build over a previous test build.

#### Scenario: Test build update succeeds

- **GIVEN** a test APK from a previous CI run is installed
- **WHEN** a new test APK from a subsequent CI run is downloaded and installed
- **THEN** the installation succeeds without signature conflict errors

### Requirement: Download with progress bar

When the user taps the "更新" button, the app SHALL download the APK from the GitHub Release asset URL and display a progress bar (percentage) within the button area. The download SHALL be handled by the native Capacitor plugin, with progress events emitted back to the JavaScript layer.

#### Scenario: Download progress is displayed

- **GIVEN** the user taps the "更新" button and the APK download starts
- **WHEN** the native plugin emits progress events
- **THEN** the button text updates to show the download percentage (e.g., "45%")

#### Scenario: Download completes

- **GIVEN** the APK download reaches 100%
- **WHEN** the native plugin reports completion
- **THEN** the app triggers the system package installer for the downloaded APK

### Requirement: System package installer is triggered

After the APK download completes, the native plugin SHALL create a `FileProvider` content URI for the downloaded APK file and launch an `ACTION_VIEW` intent with the `application/vnd.android.package-archive` MIME type, causing the Android system package installer to open.

#### Scenario: Installer opens after download

- **GIVEN** the APK has been downloaded to the app's external files directory
- **WHEN** the native plugin launches the install intent
- **THEN** the Android package installer screen appears, prompting the user to confirm installation

### Requirement: Error handling and retry

If the download or install fails, the button SHALL display red text "重试" (retry). Tapping the button again SHALL restart the download.

#### Scenario: Download fails

- **GIVEN** the APK download fails due to a network error
- **WHEN** the native plugin reports the error
- **THEN** the button displays red text "重试"

#### Scenario: User retries after error

- **GIVEN** the button is in error state showing "重试"
- **WHEN** the user taps the button
- **THEN** a new download is started and progress is displayed
