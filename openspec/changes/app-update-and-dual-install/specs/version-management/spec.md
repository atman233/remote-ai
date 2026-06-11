## MODIFIED Requirements

### Requirement: Version is injected into build artifacts

The computed version SHALL be injected into `package.json` (version field), `build.gradle` (versionCode and versionName), the APK output filename, and the web frontend (via `VITE_APP_VERSION` environment variable) at build time.

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

#### Scenario: Version injected into web frontend

- **GIVEN** the CI determines version `0.0.3`
- **WHEN** the Vite build runs
- **THEN** the built JavaScript has `VITE_APP_VERSION` set to `0.0.3`
