## Architecture

```
┌─────────────────────────────────────────┐
│              Mobile App                  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Topbar (menu, name, dot, ver, ⚙)  │  │
│  ├────────────────────────────────────┤  │
│  │                                    │  │
│  │  #home-screen (no active project)  │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ Recent Project Card 1        │  │  │
│  │  │ Recent Project Card 2        │  │  │
│  │  │ Recent Project Card 3        │  │  │
│  │  │ [+ New Project Button]       │  │  │
│  │  └──────────────────────────────┘  │  │
│  │                                    │  │
│  │  #terminal-container (active)      │  │
│  │  (hidden when home is shown)       │  │
│  │                                    │  │
│  ├────────────────────────────────────┤  │
│  │ Command Panel (animated collapse)  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Side Drawer (slide-in, existing)        │
│  Settings Modal (existing)               │
│  New Project Modal (new)                 │
└─────────────────────────────────────────┘
```

## Component Details

### Home Screen

- Shown when `activeProject === null`, hidden when a project is connected
- Renders up to 3 cards from `recentProjects` array (stored in Capacitor Preferences / localStorage)
- Each card shows: project name, path, CC badge if running
- Cards have a subtle fade-in stagger animation on first render
- "New Project" button at the bottom with a `+` icon
- **Edge case: 0 projects** — show a centered message "暂无项目，请点击下方按钮创建" guiding the user to create one
- **Edge case: 0 recent but projects exist** — still show the home screen with empty recent section, user can use drawer or create new
- **Edge case: recent project path no longer exists** — card still shows but start will fail with an error message from the daemon

### New Project Modal

- Fields: project name (required), project path (required)
- Client-side validation: both fields non-empty, name alphanumeric + hyphens/underscores
- On submit:
  1. `POST /api/projects` with `{ name, path }`
  2. On success, `POST /api/daemon/restart`
  3. Wait 2s, then `refreshProjects()`
  4. Close modal, show updated home screen
- Error states: name already exists (409), invalid path (400), daemon unreachable (network error)
- The "create" button shows a loading spinner while waiting

### Recent Projects (Client-side)

- Key: `recent_projects` in Capacitor Preferences (fallback: localStorage)
- Value: JSON array of project names, most recent first, max 5 stored (only 3 displayed)
- Updated in `startProject()`: push name to front, deduplicate, trim to 5
- On home screen render, cross-reference with `projects[]` from daemon to get full info (path, hasClaudeCode)
- Projects in `recent` that no longer exist in the daemon's project list are silently dropped from display

### Command Panel Animation

```
Current (instant):
  collapsed: #cmd-buttons { display: none }

New (animated):
  #cmd-panel {
    max-height: 40vh;
    transition: max-height 250ms ease;
  }
  #cmd-panel.collapsed {
    max-height: 32px;  /* handle only */
  }
  #cmd-buttons {
    overflow: hidden;
    transition: opacity 200ms ease;
  }
  #cmd-panel.collapsed #cmd-buttons {
    opacity: 0;
    pointer-events: none;
  }
```

### Daemon Endpoints

#### `POST /api/projects`
- Body: `{ name: string, path: string }`
- Validates name is not empty, path exists on disk
- Validates name is not a duplicate
- Appends to `projects.json`
- Returns `{ success: true, project: { name, path } }`
- Errors: 400 (bad input), 409 (duplicate name), 500 (write error)

#### `POST /api/daemon/restart`
- Returns `{ success: true, message: "restarting" }`
- Calls `process.exit(0)` after a 100ms delay (to allow response to be sent)
- systemd restarts the process automatically

## Data Flow

```
User taps project card
  → startProject(project)    [existing flow]
  → saveRecentProject(name)  [new: update localStorage]
  → terminal replaces home   [new: hide #home-screen]

User taps "New Project"
  → showNewProjectModal()
  → user fills name + path, taps "Create"
  → POST /api/projects { name, path }
  → POST /api/daemon/restart
  → sleep 2s
  → refreshProjects()
  → hide modal, home screen updates

Terminal disconnect / no active project
  → activeProject = null
  → show #home-screen
  → hide #terminal-container
```
