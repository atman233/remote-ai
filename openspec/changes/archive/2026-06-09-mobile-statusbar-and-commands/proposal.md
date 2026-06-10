## Why

The mobile app has two usability issues: (1) the top bar is obscured by the device status bar because the StatusBar plugin height detection was never wired up (only CSS `env()` fallback is used, which returns 0 in many WebView contexts), and (2) the quick command panel only shows 5 hardcoded terminal control commands instead of surfacing the project's actual Claude Code slash commands.

## What Changes

- **Import Capacitor StatusBar plugin** in the mobile app JS and call `StatusBar.getHeight()` on startup to set `--safe-top` dynamically, implementing the already-spec'd `status-bar-adaptation` behavior
- **Scan `.claude/commands/` directory** in the daemon's command loader and generate quick-command entries from markdown files (e.g., `opsx/apply.md` → label `/opsx:apply`, text `/opsx:apply\n`)
- **Add Claude Code built-in commands** (`/resume`, `/new`, `/bug`, `/clear`, `/compact`, `/init`, `/doctor`, `/status`, `/review`, `/setup`) as default commands alongside the existing terminal helpers
- **Remove dependency on `.claude/commands.json`** — the daemon will auto-discover commands from the `.claude/commands/` directory tree instead

## Non-goals

- Editing or creating slash commands from the mobile app
- Displaying command descriptions or arguments in the command panel (label only)
- Supporting custom user commands from outside `.claude/commands/`

## Capabilities

### New Capabilities

- `command-discovery`: The daemon discovers slash commands by scanning `.claude/commands/` directory for markdown files, and includes Claude Code built-in commands. These are served via the existing `/api/sessions/:id/commands` endpoint.

### Modified Capabilities

- `status-bar-adaptation`: **BUG FIX** — the spec requires runtime StatusBar height detection via the Capacitor plugin, but the JS code never imported StatusBar or called `getHeight()`. The CSS `env()` fallback alone is insufficient. Fix the implementation to match the existing spec.

## Impact

- **mobile/src/app.js**: import StatusBar, add init call to get height and set `--safe-top`
- **mobile/index.html**: add `viewport-fit=cover` to viewport meta tag to ensure `safe-area-inset` variables work
- **daemon/session-manager.js**: rewrite `loadCommands()` to scan `.claude/commands/` directory and include built-in Claude Code commands
- **daemon/index.js**: no API changes (same endpoint, expanded response payload)
