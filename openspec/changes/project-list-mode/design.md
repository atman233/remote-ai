## Context

Currently the mobile app shows tmux sessions as its entry point. Users see an empty list until they manually create a session, connect, and type `claude`. This three-step process makes the mobile app feel broken on first use.

The daemon already has all the primitives needed: tmux management, PTY attachment, command sending. We just need to switch the abstraction layer from "raw tmux sessions" to "configured projects" and add auto-launch.

## Goals / Non-Goals

**Goals:**
- Replace session list with a project list backed by a static config file
- One-tap project entry: select a project → auto-create/attach tmux session → Claude starts automatically
- Session reuse: selecting the same project again reattaches to the existing session
- Keep the PTY/WebSocket/terminal pipeline unchanged

**Non-Goals:**
- Project CRUD from mobile (editing is done on the desktop)
- Multiple Claude instances per project
- Database or persistent session history

## Decisions

### 1. Project config as a static JSON file

`daemon/projects.json`:
```json
{
  "projects": [
    { "name": "easyai", "path": "/mnt/e/02-easyai-new" }
  ]
}
```

**Why**: Simplest possible config format. No database, no admin UI, no config hot-reload needed. The user edits this file directly on the desktop. The daemon reads it on each API call.

**Alternatives considered**:
- Environment variables: messy for multiple projects, hard to represent name/path pairs
- CLI/admin commands: overengineered for a config that changes rarely
- Database: violates non-goal of no-database

### 2. New API surface: /api/projects

Two endpoints replace the old `/api/sessions` ones:
- `GET /api/projects` — reads `projects.json`, checks tmux for each project's session status, returns list with `hasSession` and `hasClaudeCode` fields
- `POST /api/projects/:name/start` — creates or reuses a tmux session, sends `claude\n` to start Claude Code, returns session info

**Why**: Clean separation. The old `/api/sessions` was a raw tmux proxy; this is a project abstraction that happens to use tmux underneath.

**Alternatives considered**:
- Keep `/api/sessions` and add project endpoints: more API surface, confusing overlap
- Single `/api/projects/:name/session` endpoint: mixes GET (status) and POST (start) concerns

### 3. Session naming convention

Tmux sessions are named after the project name (`projects.json` `name` field). The start endpoint checks `tmux has-session -t <name>` to decide create vs. reuse.

**Why**: Simple 1:1 mapping between project name and tmux session name. No need for a separate session registry.

### 4. Auto-launch Claude via send-keys

After creating a session (`tmux new-session -d -s <name> -c <path>`), the daemon sends `tmux send-keys -t <name> 'claude' Enter` to start Claude Code.

**Why**: Uses tmux's built-in key injection rather than spawning a process in the session. This means `claude` runs as a child of the tmux session's shell, exactly as if the user typed it.

### 5. Remove old session endpoints entirely

`GET /api/sessions` and `POST /api/sessions` are removed. This is a breaking change, but there is only one client (the mobile app) which is updated simultaneously.

**Why**: No backward compatibility needed for a single-client system.

## Risks / Trade-offs

- **[Risk] projects.json has invalid path** → `POST /api/projects/:name/start` returns 400 with "项目路径不存在"
- **[Risk] projects.json is malformed JSON** → `GET /api/projects` returns 500, daemon logs the error
- **[Risk] Claude not installed** → User sees a tmux session with a "command not found" message in the terminal, same as typing `claude` manually
- **[Risk] Session reuse means old Claude state persists** → This is intentional (keeps conversation history). User can manually exit Claude and restart within the same session

## Migration Plan

1. Create `daemon/projects.json` with existing project(s)
2. Deploy new daemon code (stops serving old `/api/sessions` endpoints)
3. Deploy new mobile APK (uses `/api/projects` endpoints)
4. No data migration needed — tmux sessions are ephemeral

Rollback: revert daemon + mobile to previous versions. No persistent state affected.
