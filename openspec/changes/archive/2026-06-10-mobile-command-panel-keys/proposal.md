## Why

Mobile soft keyboards lack Esc, Tab, and Shift+Tab keys, making it impossible to dismiss or navigate Claude Code's interactive prompts (e.g., `/add-dir` shows "Esc to cancel"). The command panel already sends raw bytes for Ctrl+C (`\x03`) — the same mechanism works for the missing keys but hasn't been wired up.

## What Changes

- **Add Esc, Tab, Shift+Tab terminal commands** in `session-manager.js`, sending raw byte sequences (`\x1b`, `\x09`, `\x1b[Z`) to the PTY
- **Add `kind` field to all commands** (`terminal`, `builtin`, `project`) so the mobile client can distinguish them
- **Group commands visually** in the mobile command panel by kind, with distinct border colors (gray/blue/green) and separator lines between groups

## Capabilities

### New Capabilities

- `command-kind-tagging`: All commands returned by the daemon include a `kind` field — `terminal` for keyboard emulation, `builtin` for Claude Code built-in slash commands, `project` for custom commands from `.claude/commands/`

### Modified Capabilities

- `command-discovery`: Terminal command list expands from 5 to 8 entries (adds Esc, Tab, Shift+Tab); all command objects gain a `kind` field

## Non-goals

- Persistent key bar or floating buttons in the mobile UI (separate change)
- Detecting active prompts or showing contextual keys
- Changing the `/api/sessions/:id/commands` endpoint shape beyond adding `kind`

## Impact

- **daemon/session-manager.js**: add `kind` to all command objects, add 3 new terminal commands
- **mobile/src/app.js**: `renderCommands()` groups by kind, renders separators, applies CSS class per kind
- **mobile/app.css**: new classes for each command kind
