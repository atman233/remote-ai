## 1. Daemon — Project config

- [x] 1.1 Create `daemon/projects.json` with initial project configuration
- [x] 1.2 Create `daemon/project-manager.js` — read projects.json, check session status via tmux, expose helper functions

## 2. Daemon — New API endpoints

- [x] 2.1 Add `GET /api/projects` route — returns project list with live session/Claude status
- [x] 2.2 Add `POST /api/projects/:name/start` route — creates or reuses tmux session, cd to project path, auto-sends `claude\n`

## 3. Daemon — Remove old session API

- [x] 3.1 Remove `GET /api/sessions` and `POST /api/sessions` routes from index.js
- [x] 3.2 Clean up `session-manager.js` — keep only `getSessionCwd`, `loadCommands`, `detectClaudeCode`, `countWindows`

## 4. Mobile — UI update

- [x] 4.1 Update `index.html` — rename drawer to "项目列表", remove new-session modal
- [x] 4.2 Update `src/app.js` — replace session fetching with project fetching, add `startProject()` flow, remove session creation logic
- [x] 4.3 Update command panel to work with project-based flow

## 5. Deployment

- [x] 5.1 Update `start.sh` — remove default tmux session creation logic

## 6. Testing

- [x] 6.1 Test locally: start daemon, verify `GET /api/projects` returns configured projects
- [x] 6.2 Test locally: `POST /api/projects/:name/start` creates session and launches Claude
- [ ] 6.3 Test mobile: project list appears, tap to connect and auto-enter Claude
- [ ] 6.4 Test session reuse: tap same project again, verify reconnection to existing session
