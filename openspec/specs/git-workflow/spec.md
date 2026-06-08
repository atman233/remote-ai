## Purpose
Defines the git branching strategy: all feature work forks from main, opsx:propose automatically creates a feature branch, features merge to test for validation, and only tested code reaches main.

## Requirements

### Requirement: Feature branches fork from main
All new feature development SHALL start by forking a feature branch from the main branch.

#### Scenario: Developer starts new feature
- **WHEN** a new feature or change is initiated
- **THEN** a new branch is created from the latest main branch, never from a stale or intermediate branch

### Requirement: opsx:propose creates a feature branch first
The `opsx:propose` command SHALL automatically create a feature branch from main before generating any artifacts (proposal.md, specs, design.md, tasks.md).

#### Scenario: Proposal execution triggers branch creation
- **WHEN** a user runs `opsx:propose` with a change name
- **THEN** the system first creates a branch named after the change from main, then generates all proposal artifacts on that branch

#### Scenario: Branch already exists
- **WHEN** a branch with the change name already exists
- **THEN** opsx:propose checks out that existing branch and proceeds with artifact generation

### Requirement: Feature branches merge to test branch for validation
Completed feature branches SHALL be merged into the test branch, not directly into main.

#### Scenario: Feature is ready for testing
- **WHEN** implementation on a feature branch is complete
- **THEN** the feature branch is merged into the test branch, and the test branch is pushed to trigger CI validation

#### Scenario: Multiple features are tested together
- **WHEN** multiple feature branches are merged into test
- **THEN** the test environment runs all merged features simultaneously for integration testing

### Requirement: Test branch triggers CI build
A push to the test branch SHALL trigger a GitHub Actions workflow that builds a test APK.

#### Scenario: Test APK is built automatically
- **WHEN** code is pushed to the test branch
- **THEN** GitHub Actions builds a Capacitor Android APK and uploads it as a GitHub Release artifact

### Requirement: Tested features merge to main
After successful testing, feature branches SHALL be merged into main for production deployment.

#### Scenario: Feature passes testing
- **WHEN** the test APK has been manually validated on a phone
- **THEN** the feature branch is merged into main, and the production environment is updated

### Requirement: Main branch represents production
The main branch SHALL always reflect the code running in the production environment.

#### Scenario: Production code equals main HEAD
- **WHEN** code is deployed to the production environment
- **THEN** it exactly matches the HEAD of the main branch
