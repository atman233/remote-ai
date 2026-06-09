## Context

The mobile app runs inside an Android WebView via Capacitor. The WebView renders edge-to-edge, but `env(safe-area-inset-top)` returns 0 on most Android devices because the WebView does not automatically receive safe area insets from the Android system. The top bar (`#topbar`), side drawer (`#drawer`), and drawer overlay (`#drawer-overlay`) all start at `top: 0`, placing them behind the status bar.

## Goals / Non-Goals

**Goals:**
- Top bar, drawer header, modals, and overlay fully visible and tappable on all Android devices
- No hardcoded pixel values — adapt to actual status bar height at runtime

**Non-Goals:**
- Changing the status bar color or style
- Full immersive/fullscreen mode
- iOS safe area handling

## Decisions

### 1. Runtime status bar height via Capacitor StatusBar plugin + CSS variable

Use `StatusBar.getInfo()` from `@capacitor/status-bar` to read the actual status bar height in pixels at startup. Set it as `--safe-top` on `document.documentElement`, replacing the CSS-only `env()` fallback.

**Why not CSS-only**: `env(safe-area-inset-top)` returns 0 on most Android WebViews. Only works reliably on iOS Safari and Android devices with display cutouts.

**Why not native-only (`fitsSystemWindows`)**: Setting `fitsSystemWindows` on the Android layout only insets the native WebView container — it doesn't affect CSS layout inside the WebView. The JavaScript side still needs to know the height.

### 2. Combine both approaches: native layout + runtime JS

Set `fitsSystemWindows="true"` on the CoordinatorLayout in `activity_main.xml` so the WebView itself doesn't render behind system bars, AND set `--safe-top` from JS as a fallback/adjustment. On devices where `fitsSystemWindows` works, the JS-measured height will be 0 (already accounted for). On devices where it doesn't (or where Capacitor renders edge-to-edge by default), the JS-measured height corrects the layout.

### 3. Apply safe-top to fixed-position elements

The `#drawer` and `#drawer-overlay` are `position: fixed` and ignore body padding. They need `padding-top: var(--safe-top)` (drawer) or `margin-top: var(--safe-top)` applied directly.

The `#topbar` already benefits from body `padding-top`, but should also have its own `margin-top: var(--safe-top)` as a safeguard against edge cases where body padding is collapsed.

## Risks / Trade-offs

- **[Risk] `StatusBar.getInfo()` may fail on some Android versions** → Mitigation: wrap in try/catch with fallback to CSS `env()` value; app remains usable
- **[Risk] `fitsSystemWindows` may double-inset (native + JS both apply)** → Mitigation: on devices where `fitsSystemWindows` properly insets, the status bar height reported by Capacitor will be 0 or the insets already accounted for; test on multiple devices
- **[Risk] Status bar height changes after rotation** → Mitigation: unlikely on Android (status bar height is constant); if needed, re-read on `resize` event
