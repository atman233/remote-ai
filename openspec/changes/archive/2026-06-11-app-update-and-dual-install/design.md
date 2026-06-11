## Context

The Capacitor Android app currently has a single `applicationId` (`dev.atman.ccmobile`) for both debug and release builds. Because debug and release are signed with different keys, Android treats a debug install over a release install as a signature mismatch and refuses it. There's no way to run both environments on one device.

Separately, there is no in-app update mechanism. Users must manually check the GitHub Releases page to discover new versions and re-download the APK.

The app is distributed exclusively via GitHub Releases — not Google Play. So we control the update channel entirely.

## Goals / Non-Goals

**Goals:**
- Allow test (debug) and production (release) APKs to coexist on a single Android device
- Show the current app version subtly in the topbar at all times
- Auto-check for newer versions on app launch by querying the GitHub Releases API
- Visually signal when an update is available (blue "更新" button)
- Download the APK with a visible progress bar
- Trigger the system package installer once the download completes

**Non-Goals:**
- Google Play In-App Updates API
- Background/push notifications for updates
- Delta/partial updates — always downloads the full APK
- iOS support (Capacitor plugin is Android-only)
- Version rollback support

## Decisions

### 1. Dual install: `applicationIdSuffix` on debug builds

Add `applicationIdSuffix ".test"` to the `debug` build type in `build.gradle`.

```
Release:  dev.atman.ccmobile         ← production
Debug:    dev.atman.ccmobile.test    ← testing
```

**Rationale:** Pure Gradle solution, no CI changes needed, no frontend impact. Android treats these as entirely separate apps. The suffix `.test` is conventional and self-documenting.

**Alternatives considered:**
- Product flavors → Overkill for a two-variant setup. Adds Gradle complexity for no benefit over `applicationIdSuffix`.
- Separate Capacitor projects → Duplication nightmare.

### 2. Build-time env var injection for version and environment

Inject two new Vite env vars in CI alongside the existing `VITE_DEFAULT_HOST`:

| Variable | Production (main) | Test (non-main) |
|---|---|---|
| `VITE_APP_VERSION` | `0.0.3` (computed semver) | `0.0.4` (computed semver) |
| `VITE_APP_ENV` | `production` | `test` |

`VITE_APP_VERSION` comes from the `steps.version.outputs.version_raw` CI step (already computed). `VITE_APP_ENV` is derived from the branch name check that already exists for `VITE_DEFAULT_HOST`.

**Rationale:** Reuses the existing CI version computation and branch-detection logic. Vite's `import.meta.env` makes these available in client JS at zero runtime cost (they're inlined at build time).

### 3. GitHub Releases API for update checking

- Production: `GET https://api.github.com/repos/<owner>/<repo>/releases/latest`
- Test: `GET https://api.github.com/repos/<owner>/<repo>/releases/tags/test-latest`

The repo owner/name is hardcoded as a constant in `app.js`. Both endpoints are public (no auth needed). Anonymous GitHub API rate limit is 60 req/hour — more than sufficient for a single-user app checking at launch.

Version comparison parses the `tag_name` field (e.g., `v0.0.3`) and compares against `VITE_APP_VERSION` using simple semver string comparison (both follow `major.minor.patch` format).

**Rationale:** GitHub Releases is already the distribution channel. No new infrastructure. The API is well-documented, returns JSON, and requires no authentication for public repos.

**Alternatives considered:**
- Custom `/api/version` endpoint on the daemon → Adds server-side complexity. Daemon is inside WSL and may not be reachable at check time.
- Firebase/App Distribution → Vendor lock-in, overkill for side-load distribution.

### 4. Capacitor plugin for download + install

A single custom Capacitor plugin `UpdateManager` with one async method:

```
downloadAndInstall({ url: string, version: string }): Promise<void>
```

The plugin:
1. Downloads the APK from `url` to `context.getExternalFilesDir(null) + "/updates/"`
2. Emits `downloadProgress` events with `{ percent: number }`
3. On completion, creates a `FileProvider` content URI for the downloaded file
4. Launches `Intent.ACTION_VIEW` with `application/vnd.android.package-archive` MIME type and `FLAG_GRANT_READ_URI_PERMISSION`

The JS side wraps the plugin call in an event listener for progress updates to drive the UI progress bar.

**Rationale:** Bundling download and install in the plugin avoids splitting concerns across JS and native. The plugin handles the only part that truly needs native code (FileProvider URI + install Intent), while progress callbacks give the web UI full control over display.

**FileProvider requirement:** Android 7+ (API 24+) requires `content://` URIs instead of `file://` for sharing files between apps. The app already targets API 36. We need:
- `<provider>` in `AndroidManifest.xml` referencing `androidx.core.content.FileProvider`
- `res/xml/file_paths.xml` granting access to `external-files-path` under `updates/`

**Alternatives considered:**
- `@capacitor/filesystem` + manual download via `fetch` in JS → Can't get download progress from `fetch` streaming cleanly, and still needs native code for the install intent anyway.
- Use `DownloadManager` system service → Simpler download with built-in notification, but inconsistent across manufacturers (Xiaomi, Huawei often customize DownloadManager behavior). Direct download is more reliable.
- `window.open(apkUrl)` → Opens in browser, user must manually tap the downloaded file from notifications. Poor UX.

### 5. UI: version label + update button

The existing topbar HTML is:
```html
<button id="menu-btn">☰</button>
<div id="session-info">…</div>
<button id="settings-btn">⚙</button>
```

New layout:
```html
<button id="menu-btn">☰</button>
<div id="session-info">…</div>
<button id="update-btn" class="update-idle">v0.0.3</button>
<button id="settings-btn">⚙</button>
```

States:
| State | CSS class | Appearance |
|---|---|---|
| Up-to-date | `.update-idle` | Subtle gray text, shows version |
| Update available | `.update-available` | Blue bg, white text "更新" |
| Downloading | `.update-downloading` | Blue bg, progress text "45%" |
| Error | `.update-error` | Red text "重试" |

**Rationale:** The version label serves double duty — it informs the user of the current version AND transforms into a CTA when an update exists. A single element avoids layout jumps.

## Risks / Trade-offs

- **GitHub API rate limit (60 req/hr)** → Risk: User opens/closes the app repeatedly. Mitigation: cache check result in `localStorage` with a 30-minute TTL, skip check if cached result is fresh.
- **FileProvider configuration error** → Risk: Install intent crashes if FileProvider isn't configured correctly. Mitigation: test on a physical device before merging; the plugin catches exceptions and surfaces errors to JS.
- **APK download over cellular** → Risk: Large APK download on mobile data. Mitigation: show file size from GitHub Release metadata before downloading; user can decide.
- **Unknown sources** → Risk: User must have "Install unknown apps" permission enabled for the app. Mitigation: if the install intent fails with a settings-related error, guide user to enable the permission.
- **Keystore loss affecting update signature** → Existing risk, unchanged. As long as the same keystore signs all production builds, updates work.

## Open Questions

- None at this stage — all decisions are straightforward.
