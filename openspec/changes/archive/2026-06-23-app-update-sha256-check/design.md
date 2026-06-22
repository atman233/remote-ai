## Context

The current update detection compares the git commit SHA from the GitHub Release body against `APP_BUILD_SHA` embedded at build time. This has two problems:

1. Same-version micro-iteration rebuilds produce the same version number but different commit SHA — the current check catches this, but unintentionally and without the right semantics.
2. There is no APK integrity verification (SHA256 of the actual file).

Additionally, update-check results are cached for 30 minutes in localStorage, which delays update discovery when a new release is pushed shortly after a check. The cache was designed to avoid GitHub API rate limits, but with the repo now public, rate limits are a non-issue (60 req/hr for anonymous users, more than enough for a single-user app checking at launch).

CI debug builds use an ephemeral debug keystore generated per CI VM, causing signature mismatch errors when installing a new test build over an old one.

## Goals / Non-Goals

**Goals:**
- Detect updates by comparing version number AND APK SHA256 jointly — either differs → update
- CI computes SHA256 of the built APK and includes it in the GitHub Release body
- App computes its own installed APK SHA256 at runtime (one-time, cached per version)
- Remove update-check result caching — check once on launch, plus manual re-check on tap
- Fix CI signature conflicts by committing a fixed debug keystore
- Gate APK download on "install unknown apps" permission (Android 8.0+), redirect to settings if missing

**Non-Goals:**
- Delta/partial updates — still downloads full APK each time
- Push notifications for updates
- SHA256 verification of downloaded APK before install (can be added later)
- iOS support

## Decisions

### 1. SHA256 computed at CI build time, embedded in release body

CI workflow adds a `Compute APK SHA256` step after each build, running `sha256sum` on the output APK. The hash is written to `$GITHUB_OUTPUT` and injected into the release body as `SHA256: <hex>`.

**Rationale:** GitHub Release API does not expose asset SHA256 natively. Computing it in CI and including it in the release body is the simplest way to make it available to the app.

### 2. Local APK SHA256 computed at runtime via Capacitor plugin

A new `getLocalApkSha256()` method on `UpdateManagerPlugin` reads the installed APK via `PackageInfo.applicationInfo.sourceDir`, streams it through `MessageDigest.getInstance("SHA-256")`, and returns the hex digest. The JavaScript layer caches this result in localStorage keyed by `APP_VERSION` — the APK file is immutable after install, so recomputation is unnecessary until the next update.

**Rationale:** The APK SHA256 cannot be embedded at Vite build time because the APK is built by Gradle AFTER the web frontend. Runtime computation is the only viable approach. Streaming with an 8KB buffer keeps memory usage low even for large APKs.

**Alternatives considered:**
- Two-pass CI build (build Vite with placeholder, build APK, patch SHA256 into APK assets) → Complex, fragile, hard to maintain.

### 3. Update check result caching removed

The 30-minute localStorage cache for update-check results is removed entirely. The app checks once on `DOMContentLoaded` and provides a manual re-check by tapping the version button.

**Rationale:** The cache introduced a UX issue where users would not see available updates for up to 30 minutes. With the repo public and a single-user app, the GitHub API call (lightweight JSON) is negligible. If rate limits ever become a concern, the cache can be re-added with a shorter TTL.

### 4. Fixed debug keystore committed to repository

A standard Android debug keystore (`debug.keystore`) with well-known credentials is committed to `mobile/android/app/`. The `build.gradle` is updated to configure the `debug` signing config to use this keystore, and the `debug` build type applies `signingConfig signingConfigs.debug`.

**Rationale:** Each CI VM generates a unique debug keystore by default. Without a fixed keystore, every test build has a different signature, and Android refuses to install one over another ("Conflicting app signatures"). Committing a debug keystore is safe because debug signing is not a security boundary — it only identifies builds for update compatibility.

### 5. Install permission gating before download

Before downloading the APK, the plugin checks `PackageManager.canRequestPackageInstalls()` (Android 8.0+). If not granted, it opens `Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES` pointing to the app's package and emits a `downloadError` event with instructions for the user.

**Rationale:** Checking before download avoids wasteful re-downloads. The native plugin is the right place because the permission check requires Android APIs not available in JavaScript.

## Risks / Trade-offs

- **Runtime SHA256 computation on first launch** → Reading the full APK file (3-8MB) for SHA256 on first launch takes <1 second on modern devices. Subsequent launches use the cached value. Risk is low.
- **Debug keystore exposure** → The committed keystore uses public well-known passwords. This is by design — debug signing is not a security boundary. Production builds use a separate secret-backed keystore. No risk.
