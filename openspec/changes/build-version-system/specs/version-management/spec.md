## ADDED Requirements

### Requirement: Version is derived from VERSION file and git tags

The system SHALL determine the app version by reading the `VERSION` file at the repository root (containing `major.minor`) and counting existing git tags matching the pattern `v<major>.<minor>.*` to derive the patch number. The full version SHALL be `v<major>.<minor>.<patch>`.

#### Scenario: First build with new major.minor

- **GIVEN** `VERSION` contains `0.0` and no tags matching `v0.0.*` exist
- **WHEN** a production build is triggered on main
- **THEN** the version is `v0.0.1`

#### Scenario: Subsequent build increments patch

- **GIVEN** `VERSION` contains `0.0` and tag `v0.0.1` exists
- **WHEN** a production build is triggered on main
- **THEN** the version is `v0.0.2`

### Requirement: CI creates git tag for production builds

Each successful production build on the `main` branch SHALL create a git tag matching the version format `v<major>.<minor>.<patch>` and push it to the remote repository.

#### Scenario: Tag created after production build

- **GIVEN** a production build on `main` completes successfully with version `v0.0.3`
- **WHEN** the CI uploads the release
- **THEN** a git tag `v0.0.3` is created and pushed to origin

### Requirement: Version is injected into build artifacts

The computed version SHALL be injected into `package.json` (version field), `build.gradle` (versionCode and versionName), and the APK output filename at build time.

#### Scenario: Version injected into package.json

- **GIVEN** the CI determines version `0.0.3`
- **WHEN** the build job runs
- **THEN** `mobile/package.json` has its version field set to `0.0.3`

#### Scenario: Version injected into build.gradle

- **GIVEN** the CI determines version `0.0.3`
- **WHEN** the Gradle build runs
- **THEN** versionCode is set to `3` and versionName is set to `0.0.3`

#### Scenario: Version used in APK filename

- **GIVEN** the CI determines version `0.0.3` and the build is for production
- **WHEN** the APK is assembled
- **THEN** the output APK is named `ai-remote-v0.0.3.apk`

### Requirement: Test builds use same version scheme without creating tags

Test builds (non-main branches) SHALL compute the version using the same `VERSION` file + tag count logic as production, but SHALL NOT create a new git tag.

#### Scenario: Test build reads current version

- **GIVEN** `VERSION` contains `0.0` and tag `v0.0.3` exists (latest production release)
- **WHEN** a test build runs on a feature branch
- **THEN** the version is computed as `v0.0.4` (next patch) but no git tag is created
