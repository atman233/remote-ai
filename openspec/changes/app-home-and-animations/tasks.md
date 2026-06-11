## 1. Daemon — New API Endpoints

- [x] 1.1 Add `POST /api/projects` endpoint: validate name (non-empty, alphanumeric + hyphens/underscores) and path (exists on disk), check for duplicate names (409), append to `projects.json` atomically, return new project object
- [x] 1.2 Add `POST /api/daemon/restart` endpoint: send response, then `process.exit(0)` after 100ms timeout so systemd restarts the daemon

## 2. Home Screen — HTML & CSS

- [x] 2.1 Add `#home-screen` div between topbar and terminal container in `mobile/index.html`, containing `#recent-list` for project cards and `#home-new-btn` button
- [x] 2.2 Add new project modal HTML (`#new-project-modal`) with name input, path input, cancel and create buttons
- [x] 2.3 Style project cards in `mobile/app.css`: dark card with subtle border, name bold, path in smaller gray text, CC badge, press state (background change)
- [x] 2.4 Add fade-in stagger animation keyframes for cards on load
- [x] 2.5 Style home screen empty state (0 projects message) and new project button

## 3. Home Screen — JS Logic

- [x] 3.1 Render recent projects from localStorage cross-referenced with daemon project list; toggle `#home-screen` visibility (show when `activeProject === null`, hide when connected)
- [x] 3.2 Implement recent projects tracking: load/save from Capacitor Preferences (fallback localStorage) under key `recent_projects`; `saveRecentProject()` pushes to front, deduplicates, trims to 5; called in `startProject()` on successful WebSocket connection
- [x] 3.3 Implement new project form handling: client-side validation (non-empty name + path), POST to daemon, handle errors (409 duplicate, 400 bad path, network error), on success POST restart, wait 2s, refresh projects; loading state on create button

## 4. Command Panel — Animation

- [x] 4.1 Replace `display: none` collapse with `max-height` + `opacity` CSS transition in `mobile/app.css`
- [x] 4.2 Adjust `toggleCmdPanel()` in `mobile/src/app.js` to account for smooth transition timing

## 5. Verification

- [ ] 5.1 Test home screen renders with recent projects, cards are tappable and start sessions
- [ ] 5.2 Test new project flow end-to-end (modal → create → daemon restart → appears in list)
- [ ] 5.3 Test command panel expand/collapse animation is smooth
- [ ] 5.4 Test edge cases: 0 projects, 0 recent, duplicate project name, bad path, drawer still works
