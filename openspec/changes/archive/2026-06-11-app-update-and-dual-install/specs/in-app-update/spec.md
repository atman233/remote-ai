## ADDED Requirements

### Requirement: App displays current version in topbar

The app SHALL display its current version number as a subtle text element in the topbar, positioned to the left of the settings button. The version text SHALL be sourced from the build-time injected `VITE_APP_VERSION` environment variable.

#### Scenario: Version is displayed on launch

- **GIVEN** the app was built with `VITE_APP_VERSION=0.0.3`
- **WHEN** the app launches and renders the topbar
- **THEN** the version text shows `v0.0.3` in a subtle gray style

### Requirement: Auto-check for updates on launch

The app SHALL check for a newer version on every launch by querying the GitHub Releases API. The check endpoint SHALL depend on the build environment:
- Production apps (`VITE_APP_ENV=production`) SHALL query `/repos/<owner>/<repo>/releases/latest`
- Test apps (`VITE_APP_ENV=test`) SHALL query `/repos/<owner>/<repo>/releases/tags/test-latest`

#### Scenario: Production app checks latest release

- **GIVEN** the app is a production build (`VITE_APP_ENV=production`) with version `0.0.3`
- **WHEN** the app launches
- **THEN** it fetches the latest GitHub Release and compares its `tag_name` (e.g., `v0.0.4`) against `0.0.3`

#### Scenario: Test app checks test-latest pre-release

- **GIVEN** the app is a test build (`VITE_APP_ENV=test`) with version `0.0.4`
- **WHEN** the app launches
- **THEN** it fetches the `test-latest` GitHub Release and compares its `tag_name` against `0.0.4`

### Requirement: Update button becomes a CTA when new version is available

If the remote version is strictly greater than the current app version, the version display element SHALL transform into a blue button with white text "更新" (update). The button SHALL be clearly visually distinct from its idle state.

#### Scenario: New version available

- **GIVEN** the current app version is `0.0.3` and the remote release version is `0.0.4`
- **WHEN** the update check completes
- **THEN** the update button changes to a blue background with white text "更新"

#### Scenario: App is already up to date

- **GIVEN** the current app version is `0.0.3` and the remote release version is also `0.0.3`
- **WHEN** the update check completes
- **THEN** the update button remains in its subtle idle state showing `v0.0.3`

### Requirement: Update check is cached for 30 minutes

To avoid excessive GitHub API calls, the update check result SHALL be cached in localStorage with a 30-minute TTL. If a cached check exists and is still fresh, the check SHALL be skipped and the cached result used.

#### Scenario: Fresh cache skips API call

- **GIVEN** an update check was performed 10 minutes ago and the result is cached
- **WHEN** the app launches
- **THEN** no GitHub API call is made and the cached result is used

#### Scenario: Stale cache triggers new API call

- **GIVEN** an update check was performed 35 minutes ago
- **WHEN** the app launches
- **THEN** a fresh GitHub API call is made

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
