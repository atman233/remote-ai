## 1. Android native layout

- [x] 1.1 Add `android:fitsSystemWindows="true"` to the CoordinatorLayout in `mobile/android/app/src/main/res/layout/activity_main.xml`

## 2. JavaScript status bar detection

- [x] 2.1 In `mobile/src/app.js`, add an `initSafeArea()` function that calls `StatusBar.getInfo()` and sets `--safe-top` CSS variable on `documentElement`
- [x] 2.2 Call `initSafeArea()` at app startup before any UI rendering
- [x] 2.3 Wrap the StatusBar call in try/catch with fallback to `env(safe-area-inset-top, 0px)`

## 3. CSS layout adaptation

- [x] 3.1 In `mobile/app.css`, add `padding-top: var(--safe-top)` to `#drawer` so the drawer content starts below the status bar
- [x] 3.2 Add `margin-top: var(--safe-top)` to `#drawer-overlay` so the overlay starts below the status bar
- [x] 3.3 Add `margin-top: var(--safe-top)` to `#topbar` as a safeguard (in addition to body padding-top)
