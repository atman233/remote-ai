### Requirement: Command objects include a kind field
Every command object returned by `/api/sessions/:id/commands` SHALL include a `kind` field whose value is one of `"terminal"`, `"builtin"`, or `"project"`.

- `"terminal"` — keyboard emulation commands that send raw control bytes (Esc, Ctrl+C, Tab, etc.)
- `"builtin"` — Claude Code built-in slash commands (`/resume`, `/clear`, etc.)
- `"project"` — custom slash commands discovered from `.claude/commands/` directory

#### Scenario: Command response includes kind fields
- **WHEN** the mobile app requests commands for any session
- **THEN** every command object in the response includes a `kind` field with a valid value

### Requirement: Mobile command panel groups commands by kind
The mobile app SHALL render command buttons grouped by their `kind` field, with terminal commands first, built-in commands second, and project commands last. Groups SHALL be separated by a visible divider. An empty group SHALL be omitted entirely (no separator rendered for it).

#### Scenario: All three groups present
- **WHEN** the command list includes commands of all three kinds
- **THEN** the panel renders terminal buttons, a separator, built-in buttons, a separator, and project buttons in that order

#### Scenario: Project group is empty
- **WHEN** the project has no custom commands from `.claude/commands/`
- **THEN** only terminal and built-in groups render with one separator between them

### Requirement: Command kind groups have distinct visual styles
The mobile app SHALL apply distinct CSS styles to each command kind group so users can visually distinguish them. Terminal commands SHALL use a muted/gray style, built-in commands SHALL use the accent blue style, and project commands SHALL use a green style.

#### Scenario: Visual distinction between groups
- **WHEN** the command panel is open with commands of all three kinds
- **THEN** terminal, builtin, and project buttons are rendered with visibly different border colors
