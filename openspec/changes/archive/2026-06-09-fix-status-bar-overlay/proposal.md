## Why

The top bar (menu button, session info, settings button) and the drawer header are obscured by the phone's status bar on Android devices, making them partially or fully inaccessible. The current CSS-only safe area approach (`env(safe-area-inset-top)`) returns 0 on most Android devices because the WebView does not receive proper safe area insets from the system.

## What Changes

- Read the actual status bar height at runtime via the Capacitor StatusBar plugin and set it as a CSS variable
- Apply the status bar height as padding/margin to the top bar, drawer overlay, and modals
- Add `fitsSystemWindows` to the Android layout XML so the WebView coordinates with system window insets
- Adjust `#drawer` and `#drawer-overlay` to start below the status bar instead of at `top: 0`

## Capabilities

### New Capabilities

- `status-bar-adaptation`: The app detects and adapts to the device's status bar height at runtime, ensuring all interactive UI elements (top bar, drawer, modals) are positioned below the status bar

### Modified Capabilities

None. This is a pure UI fix with no spec-level requirement changes.

## Impact

- **Files**: `mobile/app.css`, `mobile/src/app.js`, `mobile/android/app/src/main/res/layout/activity_main.xml`
- **Plugin**: Already uses `@capacitor/status-bar` (no new dependency)
- **Risk**: Low — CSS variable fallback ensures layout degrades gracefully even if the plugin fails

## Non-goals

- Changing the status bar color or style
- Adding native Android immersive/fullscreen mode
- Handling iOS safe areas (platform not currently supported)
