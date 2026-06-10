## Context

The current CI pipeline (`build-apk.yml`) builds a Capacitor Android APK via `assembleDebug`, always producing `app-debug.apk`. Versions are not tracked — the release tag uses `github.run_number` (v8, v12, v14...), which is non-sequential and resets across workflow changes. Test builds create a new GitHub Release per branch push with no cleanup, causing unbounded accumulation.

The mobile app has `versionCode 1` and `versionName "1.0"` hardcoded in `build.gradle`, and `"version": "1.0.0"` in `package.json`. Neither is used for anything.

## Goals / Non-Goals

**Goals:**
- Semver versioning (`v0.0.1`) auto-incremented per production build via git tags
- Version injected into `package.json`, `build.gradle`, and APK filename at build time
- Test builds go to a single `test-latest` GitHub Release (force-update, no accumulation)
- Production APKs signed with release keystore and named `ai-remote-vX.X.X.apk`
- Test APKs named `ai-remote-test-vX.X.X.apk`

**Non-Goals:**
- Auto-increment on every git commit (impractical: recursive version file changes)
- Changing the Capacitor app ID or package structure
- Publishing to Google Play

## Decisions

### 1. Version source: VERSION file + git tag count

`VERSION` at repo root stores `major.minor` (e.g., `0.0`). CI counts existing tags matching `v<major>.<minor>.*` to derive the next patch number.

**Rationale:** Major/minor are semantic decisions a human should make. Patch is mechanical — it increments on every production build. Using git tags as the source of truth means no external state, fully git-versioned, and the count is trivially queryable with `git tag`.

**Alternatives considered:**
- Bump a file on every commit → recursive (the bump commit triggers another bump)
- Use `github.run_number` → non-sequential, resets on workflow rename
- Manual tags only → no automation, easy to forget

### 2. Test builds: fixed `test-latest` tag

Non-main builds upload to a single `test-latest` GitHub Release (pre-release). Each new test build force-updates this release by deleting the old tag first.

**Rationale:** One pre-release at a time. No cleanup scripts needed. The `test-latest` tag is self-documenting.

### 3. Signing: release keystore via GitHub Secrets

A single release keystore is generated once. The keystore file (base64), passwords, and alias are stored in GitHub Secrets. CI decodes the keystore at build time and configures `signingConfigs` in `build.gradle`.

**Rationale:** The keystore itself never enters the repo. Passwords are never in plaintext. The same keystore signs all production builds, which is required for Android app updates (same signing key = same app identity).

The signature naturally changes with each version because the APK content (versionCode, versionName) changes — no special per-version signing needed.

### 4. APK naming: Gradle output rename

`build.gradle` sets the APK output filename based on environment variable or version, producing:
- Production: `ai-remote-v0.0.3.apk`
- Test: `ai-remote-test-v0.0.3.apk`

The CI workflow passes the computed version to Gradle via an env var or `-P` property.

### 5. versionCode strategy

`versionCode` = `patch` (the integer from tag count + 1). Since tags are only created on production builds and are strictly additive, versionCode is always increasing.

For example: v0.0.1 → versionCode 1, v0.0.2 → versionCode 2, etc.

If major or minor is bumped (e.g., `0.0` → `0.1`), the tag pattern changes (`v0.1.*`), and the count starts fresh from 1. This means versionCode could regress from e.g. 5 → 1. To prevent this, a fallback: if new major.minor's versionCode would be ≤ the previous max, use the global max + 1 instead. But this edge case is unlikely early on, so we defer the complexity. The initial `VERSION` will be `0.0` and will stay there for the foreseeable future.

## Risks / Trade-offs

- **Keystore loss** → If GitHub Secrets are lost and the keystore file is gone, the app cannot be updated (Android requires same signature for updates). Mitigation: back up the keystore file + passwords offline.
- **Tag count reset on major.minor bump** → versionCode could regress. Mitigation: documented above; will add global counter if needed.
- **Ghost tag scenario** → If someone manually creates a `v0.0.X` tag that doesn't match the count, the next CI build may try to create a duplicate tag. Mitigation: CI uses `gh release create` which will fail on duplicate; logs will surface the issue.
- **Test builds don't get signed** → Test APKs use debug keystore. If a tester installs both test and production APKs on the same device, Android will treat them as different apps (different signatures), which is actually desirable.
