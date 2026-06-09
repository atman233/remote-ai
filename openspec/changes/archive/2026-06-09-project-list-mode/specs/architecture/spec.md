## MODIFIED Requirements

### Requirement: Daemon manages tmux sessions via PTY
The Node.js daemon SHALL manage tmux sessions using node-pty and expose them through HTTP and WebSocket APIs.

#### Scenario: User lists configured projects
- **WHEN** the mobile app requests GET /api/projects
- **THEN** the daemon returns a JSON list of all configured projects with their name, path, session status, and Claude Code status

#### Scenario: User starts a project session
- **WHEN** the mobile app requests POST /api/projects/:name/start
- **THEN** the daemon creates or reuses a tmux session for the project, auto-launches Claude Code, and returns the session ID and working directory

#### Scenario: User attaches to a tmux session
- **WHEN** the mobile app opens a WebSocket to /api/sessions/:id/pty
- **THEN** the daemon spawns a PTY attaching to the specified tmux session, streaming stdout to the WebSocket and forwarding incoming WebSocket messages as stdin to the PTY
