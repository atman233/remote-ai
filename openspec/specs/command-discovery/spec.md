### Requirement: Daemon discovers slash commands from .claude/commands/ directory
The daemon SHALL scan the project's `.claude/commands/` directory recursively for `.md` files and generate a command list for the mobile command panel. Non-markdown files and hidden files/directories (starting with `.`) SHALL be skipped.

#### Scenario: Project has opsx commands
- **GIVEN** the project has `.claude/commands/opsx/apply.md`, `propose.md`, `archive.md`, `explore.md`
- **WHEN** the mobile app requests commands for that project's session
- **THEN** the response includes `/opsx:apply`, `/opsx:propose`, `/opsx:archive`, `/opsx:explore` as command entries with text set to the command label followed by `\n`

#### Scenario: Project has no .claude/commands/ directory
- **GIVEN** the project does not have a `.claude/commands/` directory
- **WHEN** the mobile app requests commands
- **THEN** the response returns only the built-in Claude Code commands plus terminal control commands, with no error

#### Scenario: .claude/commands/ contains nested subdirectories
- **GIVEN** the project has `.claude/commands/useful/foo/bar.md`
- **WHEN** commands are requested
- **THEN** the command label is `/useful:foo:bar` (path segments joined with `:`, `.md` stripped)

### Requirement: Command list includes Claude Code built-in commands
The daemon SHALL include a fixed set of Claude Code built-in slash commands in every command response: `/resume`, `/new`, `/bug`, `/clear`, `/compact`, `/init`, `/doctor`, `/status`, `/review`, `/setup`.

#### Scenario: Built-in commands appear alongside project commands
- **GIVEN** a project session is active
- **WHEN** the mobile app requests commands
- **THEN** the response includes all 10 built-in Claude Code commands plus any project-specific commands from `.claude/commands/`

### Requirement: Command list includes terminal control helpers
The daemon SHALL include terminal interaction commands (`启动 Claude`, `确认 y`, `拒绝 n`, `中断`, `清屏`) in every command response, placed after the slash commands.

#### Scenario: Terminal helpers present
- **GIVEN** a project session is active
- **WHEN** the mobile app requests commands
- **THEN** the response includes the 5 terminal control commands
