## MODIFIED Requirements

### Requirement: Feature branches fork from main
All new feature development SHALL start by forking a feature branch from the main branch. Branch names SHALL follow the convention `feature-<topic>` for new features or `fix-<topic>` for bug fixes.

#### Scenario: Developer starts new feature
- **GIVEN** the main branch is the latest production code
- **WHEN** a new feature or change is initiated via `/opsx:propose`
- **THEN** a new branch named `feature-<topic>` or `fix-<topic>` is created from the latest main branch

#### Scenario: Developer starts a bug fix
- **GIVEN** the main branch is the latest production code
- **WHEN** a bug fix is initiated
- **THEN** a new branch named `fix-<topic>` is created from main

### Requirement: opsx:propose creates a feature branch first
The `opsx:propose` command SHALL automatically create a `feature-<topic>` or `fix-<topic>` branch from main before generating any artifacts.

#### Scenario: Proposal execution triggers branch creation
- **GIVEN** a change name like "add-dark-mode"
- **WHEN** a user runs `opsx:propose add-dark-mode`
- **THEN** the system creates a branch named `feature-add-dark-mode` from main, then generates all proposal artifacts on that branch

#### Scenario: Fix proposal uses fix prefix
- **GIVEN** a change name like "fix-status-bar-overlay"
- **WHEN** a user runs `opsx:propose fix-status-bar-overlay`
- **THEN** the system creates a branch named `fix-status-bar-overlay` from main

#### Scenario: Branch already exists
- **GIVEN** a branch with the change name already exists
- **WHEN** opsx:propose is run
- **THEN** the system checks out that existing branch and proceeds with artifact generation

## REMOVED Requirements

### Requirement: Feature branches merge to test branch for validation
**Reason**: The `test` branch is eliminated. Feature/fix branches are pushed directly to trigger CI builds in the test environment.
**Migration**: Push feature/fix branches directly; CI builds non-main branches with test server configuration.

### Requirement: Test branch triggers CI build
**Reason**: Replaced by CI triggering on any branch push (non-main → test, main → production).
**Migration**: CI workflow now triggers on all branch pushes.

### Requirement: Multiple features are tested together
**Reason**: With the test branch removed, features are tested independently on their own branches. Integration testing happens naturally when features merge to main.
**Migration**: Test features independently by pushing their respective branches.

## RENAMED Requirements

FROM: Tested features merge to main
TO: Archive merges feature branch to main and pushes

### Requirement: Archive merges feature branch to main and pushes
After successful testing, the `/opsx:archive` command SHALL merge the feature/fix branch into main and push to trigger production deployment.

#### Scenario: Archive completes the feature lifecycle
- **GIVEN** a feature branch has been tested and is ready for production
- **WHEN** the user runs `/opsx:archive`
- **THEN** the branch is committed, merged to main with `--no-ff`, main is pushed to `origin/main`, and the feature branch is deleted locally and remotely

### Requirement: Main branch represents production
The main branch SHALL always reflect the code running in the production environment.

#### Scenario: Production code equals main HEAD
- **GIVEN** code is deployed to the production environment
- **WHEN** a user checks the main branch
- **THEN** it exactly matches the code running in production
