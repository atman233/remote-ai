## ADDED Requirements

### Requirement: App detects status bar height at runtime
The mobile app SHALL read the device's status bar height via Capacitor's StatusBar plugin on startup and apply it as a CSS custom property `--safe-top` on the document root element.

#### Scenario: Status bar height detected successfully
- **GIVEN** the app is running on an Android device with Capacitor StatusBar plugin available
- **WHEN** the app initializes
- **THEN** `--safe-top` on `:root` is set to the measured status bar height in pixels

#### Scenario: StatusBar plugin unavailable
- **GIVEN** the StatusBar plugin fails or is unavailable (e.g., running in a browser)
- **WHEN** the app initializes
- **THEN** `--safe-top` falls back to `env(safe-area-inset-top, 0px)` and the app remains usable

### Requirement: Top bar is positioned below the status bar
The top bar (`#topbar`) SHALL be rendered entirely below the device's status bar, with all interactive buttons visible and tappable.

#### Scenario: Top bar buttons are accessible
- **GIVEN** the app is connected and displaying the top bar
- **WHEN** the user looks at the top of the screen
- **THEN** the menu button (hamburger), session info, and settings button are fully visible and not obscured by the status bar

### Requirement: Drawer starts below the status bar
The side drawer (`#drawer`) SHALL start its layout below the device's status bar, with its header and close button fully visible.

#### Scenario: Drawer header is accessible
- **GIVEN** the user opens the side drawer
- **WHEN** the drawer is displayed
- **THEN** the drawer header ("会话列表") and close button are fully visible and tappable below the status bar

### Requirement: Drawer overlay covers below status bar only
The drawer overlay (`#drawer-overlay`) SHALL cover the content area below the status bar, not extend behind it.

#### Scenario: Overlay dims content area without overlapping status bar
- **GIVEN** the user opens the side drawer
- **WHEN** the overlay is shown
- **THEN** the overlay starts below the status bar and covers the remaining content area
