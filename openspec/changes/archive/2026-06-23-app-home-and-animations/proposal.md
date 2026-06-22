## Why

The app currently opens to a blank terminal, which feels unfinished. Users have to open the side drawer, find their project, and tap it — two extra steps every time. The command panel expand/collapse is jarring with no transition. And adding a new project requires manually editing `projects.json` on the desktop.

## What Changes

- **Home screen** replaces the empty terminal when no project is connected, showing up to 3 recently used projects as tappable cards
- **One-tap start** — tapping a recent project card immediately starts the session (same flow as drawer today)
- **New project modal** — a button on the home screen opens a form (name + path), POSTs to a new daemon endpoint that appends to `projects.json`, then restarts the daemon
- **Transition animations** — command panel expand/collapse uses `max-height` + `opacity` transition instead of instant `display: none`; project cards fade in on load
- **Recent projects** tracked client-side in localStorage/Capacitor Preferences — each started project bubbles to the top

## Capabilities

### Modified Capabilities

- `project-list-mode`: Home screen now shows recent projects (client-side) alongside the existing drawer (full server-side list)
- `daemon-api`: New `POST /api/projects` and `POST /api/daemon/restart` endpoints

## Non-goals

- Editing or deleting projects from the mobile app
- Server-side "recently used" tracking
- Complex card gestures (swipe to delete, long-press menu, etc.)

## Impact

- `mobile/index.html` — new `#home-screen` section, new project modal
- `mobile/src/app.js` — home screen rendering, recent-projects tracking, new-project form handling
- `mobile/app.css` — home screen styles, card styles, cmd-panel transition animation, fade-in keyframes
- `daemon/index.js` — `POST /api/projects` (validate + append to projects.json), `POST /api/daemon/restart` (process.exit)
