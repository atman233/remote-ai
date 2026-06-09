## Purpose
Defines how the daemon reads project configuration from `projects.json` and exposes project metadata via API.

## Requirements

### Requirement: Daemon reads project configuration
The daemon SHALL read project configuration from `daemon/projects.json` and expose it via `GET /api/projects`.

#### Scenario: Valid config returns project list
- **WHEN** the mobile app requests `GET /api/projects` with valid auth
- **AND** `projects.json` contains at least one project
- **THEN** the daemon returns a JSON array of projects, each with `name`, `path`, `hasSession`, and `hasClaudeCode` fields

#### Scenario: Missing config file returns empty list
- **WHEN** the mobile app requests `GET /api/projects` with valid auth
- **AND** `projects.json` does not exist
- **THEN** the daemon returns an empty project list with HTTP 200

#### Scenario: Malformed config returns error
- **WHEN** the mobile app requests `GET /api/projects` with valid auth
- **AND** `projects.json` contains invalid JSON
- **THEN** the daemon returns HTTP 500 with an error message

#### Scenario: Project with active session shows status
- **WHEN** the mobile app requests `GET /api/projects`
- **AND** a tmux session exists for a configured project
- **THEN** that project's `hasSession` field is `true`

#### Scenario: Project with Claude running shows Claude status
- **WHEN** the mobile app requests `GET /api/projects`
- **AND** a tmux session exists for a configured project with Claude Code running
- **THEN** that project's `hasClaudeCode` field is `true`

### Requirement: Project config file format
The `projects.json` file SHALL contain a `projects` array where each entry has a `name` string and a `path` string.

#### Scenario: Valid project entry
- **WHEN** `projects.json` contains `{ "projects": [{ "name": "easyai", "path": "/mnt/e/02-easyai-new" }] }`
- **THEN** the daemon parses and returns this project via the API
