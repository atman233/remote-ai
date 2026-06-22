## ADDED Requirements

### Requirement: Daemon notification API

The daemon SHALL provide notification endpoints that receive events from Claude Code hooks and forward them to connected mobile clients.

#### Scenario: Claude Code hook triggers notification
- **WHEN** Claude Code lifecycle hook (Stop, Notification, PermissionRequest) fires and POSTs to `/api/notify`
- **THEN** the daemon receives the notification, enqueues it for the target session, and broadcasts it via WebSocket to all connected mobile clients for that session

#### Scenario: Mobile client recovers missed notifications on reconnect
- **WHEN** a mobile client connects to a session WebSocket after being disconnected
- **THEN** the daemon automatically flushes all pending notifications from the session's queue to that client
