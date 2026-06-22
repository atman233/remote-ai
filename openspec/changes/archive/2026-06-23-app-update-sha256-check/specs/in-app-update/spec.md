## MODIFIED Requirements

### Requirement: Auto-check for updates on launch

The app SHALL check for updates on every launch by querying the GitHub Releases API. The check endpoint SHALL depend on the build environment:
- Production apps (`VITE_APP_ENV=production`) SHALL query `/repos/<owner>/<repo>/releases/latest`
- Test apps (`VITE_APP_ENV=test`) SHALL query `/repos/<owner>/<repo>/releases/tags/test-latest`

The check SHALL NOT be cached — a fresh API call SHALL be made on every launch. The app SHALL also support manual re-check when the user taps the version button.

Update detection SHALL use joint criteria: an update is available if the remote version differs from the app version OR the remote APK SHA256 differs from the local APK SHA256.

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

If the remote version differs from the app version OR the remote APK SHA256 differs from the local APK SHA256, the version display element SHALL transform into a blue button with white text "更新" (update). Tapping the button when no update is available SHALL trigger a manual re-check.

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Update check is cached for 30 minutes

**Reason:** Caching delayed update discovery by up to 30 minutes. With the repo public and single-user usage, the API call overhead is negligible.
**Migration:** None. The update check now always fetches fresh data on launch.
