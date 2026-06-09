## Why

The mobile app's session list is empty on first use because it relies on tmux sessions that don't exist yet. Users must manually create a session, connect to it, then type `claude` — three manual steps. Switching to a project-driven model where projects are pre-configured on the daemon side and Claude auto-starts makes the mobile experience one-tap.

## What Changes

- **New**: `daemon/projects.json` config file storing project name + path pairs
- **New**: `GET /api/projects` endpoint returning projects with live session status
- **New**: `POST /api/projects/:name/start` endpoint — creates or reuses a tmux session in the project path, auto-launches `claude`
- **Removed**: `GET /api/sessions` and `POST /api/sessions` endpoints (**BREAKING**)
- **Changed**: Mobile app drawer from "session list" to "project list"
- **Changed**: Clicking a project auto-starts the session + Claude, then connects the terminal
- **Removed**: "New Session" modal and button in mobile app
- **Changed**: `start.sh` no longer creates default tmux sessions

## Capabilities

### New Capabilities

- `project-config`: Daemon reads a `projects.json` config file listing project name/path pairs, and exposes them via `GET /api/projects`
- `project-session-start`: Selecting a project via `POST /api/projects/:name/start` creates or reuses a tmux session in the project directory and auto-launches Claude Code

### Modified Capabilities

- `architecture`: The `GET /api/sessions` scenario is replaced by `GET /api/projects`; session creation moves from manual `POST /api/sessions` to project-driven `POST /api/projects/:name/start`

## Impact

- **Daemon**: `index.js` (new routes, removed routes), new `project-manager.js`, new `projects.json`, `session-manager.js` (simplified)
- **Mobile**: `index.html` (UI rework), `src/app.js` (sessions → projects flow)
- **Deployment**: `start.sh` (remove default session creation)
- **Breaking API change**: Clients must migrate from `/api/sessions` to `/api/projects`

## Non-goals

- File browsing or project editing on mobile
- Multiple Claude instances per project
- Project CRUD via mobile app (editing is done on the desktop daemon directly)
- Database-backed project storage
