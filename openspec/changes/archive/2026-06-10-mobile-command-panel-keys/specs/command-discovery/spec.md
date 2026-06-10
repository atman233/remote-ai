## MODIFIED Requirements

### Requirement: Command list includes terminal control helpers
The daemon SHALL include terminal interaction commands in every command response, placed before built-in and project commands. The terminal commands are: Esc (`\x1b`), Tab (`\x09`), Shift+Tab (`\x1b[Z`), ↑ (`\x1b[A`), ↓ (`\x1b[B`), Enter (`\r`), `确认 y` (`y\n`), `拒绝 n` (`n\n`), `中断` (`\x03`), and `清屏` (`\x0c`). Each terminal command SHALL have `kind: "terminal"`.

#### Scenario: Terminal helpers present
- **GIVEN** a project session is active
- **WHEN** the mobile app requests commands
- **THEN** the response includes 10 terminal control commands, each with `kind: "terminal"`

## ADDED Requirements

### Requirement: Slash commands use two-step execution
Built-in and project slash commands SHALL NOT include a trailing newline in their `text` field. Clicking a slash command button SHALL type the command text into the terminal without executing it. The user SHALL use the Enter button or keyboard Enter to execute. Terminal commands `确认 y` and `拒绝 n` are exempt from this rule and SHALL auto-submit with `\n`.

#### Scenario: Click slash command then Enter to execute
- **WHEN** the user taps a `/opsx:apply` button then taps `Enter`
- **THEN** the command text appears in the terminal and then executes correctly without an extra empty command

### Requirement: Built-in commands carry kind field
All Claude Code built-in slash commands (`/resume`, `/new`, `/bug`, `/clear`, `/compact`, `/init`, `/doctor`, `/status`, `/review`, `/setup`) returned by the daemon SHALL include `kind: "builtin"`.

#### Scenario: Built-in commands have correct kind
- **WHEN** the mobile app requests commands for any session
- **THEN** all 10 built-in Claude Code commands include `kind: "builtin"`

### Requirement: Project commands carry kind field
All project-specific commands discovered from `.claude/commands/` directory SHALL include `kind: "project"`.

#### Scenario: Project commands have correct kind
- **GIVEN** the project has `.claude/commands/opsx/apply.md`
- **WHEN** the mobile app requests commands
- **THEN** the `/opsx:apply` command entry includes `kind: "project"`
