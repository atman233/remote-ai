## Purpose
Defines how selecting a project in the mobile app creates or reuses a tmux session and auto-launches Claude Code.

## Requirements

### Requirement: Start project session
The daemon SHALL create or reuse a tmux session for a project and auto-launch Claude Code via `POST /api/projects/:name/start`.

#### Scenario: New session created for valid project
- **WHEN** the mobile app requests `POST /api/projects/:name/start` with valid auth
- **AND** the project exists in `projects.json`
- **AND** the project path exists on disk
- **AND** no tmux session exists for this project
- **THEN** the daemon creates a new tmux session named after the project in the project's working directory
- **AND** sends `claude\n` to the session to start Claude Code
- **AND** returns `{ id, cwd }` with HTTP 200

#### Scenario: Existing session reused
- **WHEN** the mobile app requests `POST /api/projects/:name/start` with valid auth
- **AND** a tmux session with the project name already exists
- **THEN** the daemon returns `{ id, cwd }` for the existing session without creating a new one or re-sending `claude\n`

#### Scenario: Unknown project returns error
- **WHEN** the mobile app requests `POST /api/projects/:name/start`
- **AND** the project name is not found in `projects.json`
- **THEN** the daemon returns HTTP 404 with an error message

#### Scenario: Invalid project path returns error
- **WHEN** the mobile app requests `POST /api/projects/:name/start`
- **AND** the project exists in `projects.json` but its path does not exist on disk
- **THEN** the daemon returns HTTP 400 with an error message indicating the project path is invalid

### Requirement: Session naming convention
Tmux sessions created by the daemon SHALL use the project name as the session name.

#### Scenario: Session name matches project name
- **WHEN** a session is created for project "easyai"
- **THEN** the tmux session is named "easyai"
