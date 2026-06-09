## Purpose
Defines the three-tier system architecture: WSL (local), public server (relay), and mobile app (client). This is the foundational architecture for remote mobile access to Claude Code.

## Requirements

### Requirement: System architecture is three-tier
The system SHALL consist of three tiers: WSL (local), public server (relay), and mobile app (client).

#### Scenario: Mobile app connects to Claude Code in WSL
- **WHEN** user opens the mobile app and connects to the server
- **THEN** the app communicates via HTTPS/WSS to Caddy on the public server, which reverse-proxies through an SSH reverse tunnel to the Node.js daemon in WSL, which attaches to a tmux session running Claude Code

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

### Requirement: SSH reverse tunnel connects WSL to public server
The system SHALL maintain a persistent SSH reverse tunnel from WSL to the public server using autossh.

#### Scenario: Tunnel auto-recovers after network interruption
- **WHEN** the SSH connection drops due to network interruption or server restart
- **THEN** autossh detects the disconnection and automatically re-establishes the reverse tunnel within 10 seconds

### Requirement: Caddy provides HTTPS termination and reverse proxy
The public server SHALL run Caddy to provide automatic HTTPS and reverse proxy to the SSH tunnel port.

#### Scenario: Mobile app connects via HTTPS
- **WHEN** the mobile app makes an HTTPS request to the server domain
- **THEN** Caddy handles TLS termination and forwards the request to the local tunnel port

### Requirement: Daemon binds to localhost only
The daemon SHALL listen only on 127.0.0.1 and never expose its port directly to the network.

#### Scenario: External connection to daemon is blocked
- **WHEN** an external client attempts to connect directly to the daemon port
- **THEN** the connection is refused because the daemon only binds to 127.0.0.1

### Requirement: Mobile app is a Capacitor WebView
The mobile app SHALL be built using Capacitor with an Android WebView rendering an xterm.js terminal.

#### Scenario: App renders terminal from WebSocket stream
- **WHEN** the app establishes a WebSocket connection to the daemon
- **THEN** terminal output is rendered in an xterm.js Terminal instance inside the WebView
