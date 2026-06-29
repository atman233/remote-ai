# Tasks: Background Notification

## Phase 1 - Foreground Service

- [x] 1.1 Create `ForegroundService.java` — Android foreground service with notification channel
- [x] 1.2 Create `ForegroundServicePlugin.java` — Capacitor plugin bridging JS ↔ native
- [x] 1.3 Register plugin in `MainActivity.java`
- [x] 1.4 Add permissions and service declaration in `AndroidManifest.xml`
- [x] 1.5 Integrate ForegroundService calls in `app.js` (ws.onopen → start, ws.onclose → stop)
- [ ] 1.6 Build and test on device

## Phase 2 - Stop Hook + Notification

- [x] 2.1 Create `daemon/hooks/stop-notify.sh` — hook script to call daemon
- [x] 2.2 Add `POST /api/notify` endpoint in daemon
- [x] 2.3 Install `@capacitor/local-notifications` and configure
- [x] 2.4 Add notification channel creation at app startup
- [x] 2.5 Add project stop-notification toggle UI in drawer
- [x] 2.6 Implement hook install/remove on toggle (write `.claude/settings.json`)
- [x] 2.7 Handle WS `{"type":"notify"}` → schedule local notification
- [x] 2.8 Handle notification tap → return to app
- [ ] 2.9 Build and test on device
