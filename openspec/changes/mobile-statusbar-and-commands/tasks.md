## 1. Status bar height detection (mobile)

- [x] 1.1 Import `StatusBar` from `@capacitor/status-bar` in `mobile/src/app.js`
- [x] 1.2 Add `initStatusBar()` function that calls `StatusBar.getHeight()`, sets `--safe-top` CSS variable on `:root`, with fallback to `env(safe-area-inset-top, 24px)`
- [x] 1.3 Call `initStatusBar()` in the DOMContentLoaded handler before terminal initialization
- [x] 1.4 Adjust drawer and drawer overlay CSS to start at `var(--safe-top)` instead of top: 0

## 2. Command auto-discovery (daemon)

- [x] 2.1 Rewrite `loadCommands()` in `daemon/session-manager.js` to recursively scan `.claude/commands/` for `.md` files and derive slash command labels from file paths
- [x] 2.2 Add Claude Code built-in commands (`/resume`, `/new`, `/bug`, `/clear`, `/compact`, `/init`, `/doctor`, `/status`, `/review`, `/setup`) and terminal helpers to the command list
- [x] 2.3 Sort commands: custom slash commands first, then built-in Claude Code commands, then terminal helpers last
- [x] 2.4 Verify the `/api/sessions/:id/commands` endpoint returns the expanded command set

## 3. Verification

- [x] 3.1 Test daemon command API with curl against a project session
- [ ] 3.2 Verify mobile UI: top bar visible below status bar, drawer and overlay correctly positioned (requires Android device/build)
