## Purpose
Defines the dual-environment setup: production (port 9528, easyai.wuya.asia) and testing (port 9529, easyaitest.wuya.asia). Both environments are functionally identical and isolated from each other.

## Requirements

### Requirement: Separate production and testing environments
The system SHALL maintain two independent environments — production and testing — with distinct ports, domains, and services.

#### Scenario: Production environment is isolated from testing
- **WHEN** a user connects to easyai.wuya.asia (production)
- **THEN** the request is routed through the production daemon on port 9528, independent of the testing environment

#### Scenario: Testing environment is isolated from production
- **WHEN** a user connects to easyaitest.wuya.asia (testing)
- **THEN** the request is routed through the testing daemon on port 9529, independent of the production environment

### Requirement: Dual daemon services in WSL
WSL SHALL run two separate systemd user services: cc-daemon.service (production, port 9528) and cc-daemon-test.service (testing, port 9529).

#### Scenario: Both daemons run concurrently
- **WHEN** both systemd services are started
- **THEN** production daemon listens on 127.0.0.1:9528 and testing daemon listens on 127.0.0.1:9529 simultaneously without conflict

#### Scenario: Testing daemon mirrors production functionality
- **WHEN** any API endpoint is called on the testing daemon
- **THEN** it behaves identically to the production daemon, only differing in the port number

### Requirement: Dual SSH tunnels for each environment
WSL SHALL run two separate SSH reverse tunnels: cc-tunnel.service (production, forwarding :9528) and cc-tunnel-test.service (testing, forwarding :9529).

#### Scenario: Both tunnels forward independently
- **WHEN** both tunnel services are running
- **THEN** the production tunnel forwards server port 9528 to localhost:9528 and the testing tunnel forwards server port 9529 to localhost:9529

### Requirement: Dual Caddy virtual hosts
The public server SHALL serve two virtual hosts — easyai.wuya.asia and easyaitest.wuya.asia — each reverse-proxying to the corresponding tunnel port.

#### Scenario: Production domain routes to production daemon
- **WHEN** a request reaches easyai.wuya.asia
- **THEN** Caddy reverse-proxies to localhost:9528

#### Scenario: Testing domain routes to testing daemon
- **WHEN** a request reaches easyaitest.wuya.asia
- **THEN** Caddy reverse-proxies to localhost:9529

### Requirement: Environment ports are fixed
Production SHALL use port 9528 and testing SHALL use port 9529.

#### Scenario: Port conventions are consistent
- **WHEN** any service, tunnel, or configuration references an environment
- **THEN** production always maps to 9528 and testing always maps to 9529

### Requirement: Mobile app points to correct environment
The mobile app SHALL allow configuring the server URL so test builds can target the testing environment.

#### Scenario: Test app build uses test server
- **WHEN** a test APK is built via GitHub Actions
- **THEN** the app is configured to connect to easyaitest.wuya.asia by default

#### Scenario: Production app build uses production server
- **WHEN** a production APK is built
- **THEN** the app is configured to connect to easyai.wuya.asia by default
