## ADDED Requirements

### Requirement: Debug builds use applicationIdSuffix for coexistence with release

The debug build type SHALL append the suffix `.test` to the `applicationId`, producing `dev.atman.ccmobile.test` for debug builds. The release build SHALL retain the base `applicationId` of `dev.atman.ccmobile`. This allows both build types to be installed simultaneously on the same Android device.

#### Scenario: Debug build has suffixed application ID

- **GIVEN** a debug build of the app
- **WHEN** the APK is assembled
- **THEN** the Android package name is `dev.atman.ccmobile.test`

#### Scenario: Release build retains base application ID

- **GIVEN** a release build of the app
- **WHEN** the APK is assembled
- **THEN** the Android package name is `dev.atman.ccmobile`

#### Scenario: Both apps coexist on one device

- **GIVEN** a release APK (`dev.atman.ccmobile`) is installed on a device
- **WHEN** a debug APK (`dev.atman.ccmobile.test`) is installed
- **THEN** both apps appear as separate icons and can run independently

### Requirement: Build pipeline injects version and environment into web frontend

The CI workflow SHALL inject `VITE_APP_VERSION` (the computed semver without `v` prefix, e.g., `0.0.3`) and `VITE_APP_ENV` (`production` for main branch, `test` for all other branches) as environment variables during the Vite build step.

#### Scenario: Production build injects environment metadata

- **GIVEN** a push to `main` with computed version `0.0.3`
- **WHEN** the CI workflow runs the Vite build
- **THEN** `VITE_APP_VERSION=0.0.3` and `VITE_APP_ENV=production` are available in the built JavaScript

#### Scenario: Test build injects environment metadata

- **GIVEN** a push to a `feature-*` branch with computed version `0.0.4`
- **WHEN** the CI workflow runs the Vite build
- **THEN** `VITE_APP_VERSION=0.0.4` and `VITE_APP_ENV=test` are available in the built JavaScript
