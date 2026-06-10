## ADDED Requirements

### Requirement: Viewport meta tag includes viewport-fit=cover
The mobile app's HTML entry point SHALL include `viewport-fit=cover` in the viewport meta tag so that CSS `env(safe-area-inset-*)` variables resolve to non-zero values in Android WebView.

#### Scenario: safe-area-inset-top resolves in WebView
- **GIVEN** the app is running in a Capacitor WebView on a device with a status bar
- **WHEN** the app loads
- **THEN** `env(safe-area-inset-top)` CSS variable returns the device's actual status bar inset height (as a fallback when the JS StatusBar plugin is not yet available)

### Requirement: Status bar height fallback is a sensible default
The app SHALL use a default fallback of 24px when neither the StatusBar plugin nor the CSS `env()` value is available.

#### Scenario: Fallback applied when both sources fail
- **GIVEN** the StatusBar plugin is unavailable AND `env(safe-area-inset-top)` resolves to 0
- **WHEN** the app initializes
- **THEN** `--safe-top` is set to `24px`
