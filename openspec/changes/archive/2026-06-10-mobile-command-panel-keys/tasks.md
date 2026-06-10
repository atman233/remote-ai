## 1. Daemon command model changes

- [x] 1.1 Add `kind: "terminal"` to all TERMINAL_COMMANDS entries
- [x] 1.2 Add Esc (`\x1b`), Tab (`\x09`), Shift+Tab (`\x1b[Z]`) entries to TERMINAL_COMMANDS
- [x] 1.3 Add `kind: "builtin"` to all BUILTIN_CLAUDE_COMMANDS entries
- [x] 1.4 Add `kind: "project"` to commands returned by `discoverCommands()`

## 2. Mobile command panel rendering

- [x] 2.1 Rewrite `renderCommands()` to group commands by `kind` field
- [x] 2.2 Render separator elements between non-empty groups
- [x] 2.3 Add CSS classes `.kind-terminal` (gray), `.kind-builtin` (blue), `.kind-project` (green) to `app.css`
- [x] 2.4 Apply kind CSS class to each button in `renderCommands()`

## 3. Verification

- [x] 3.1 Verify `/api/sessions/:id/commands` returns all 8 terminal + 10 builtin commands with correct `kind` fields
- [x] 3.2 Verify command panel renders three groups with separators and correct colors in mobile app
