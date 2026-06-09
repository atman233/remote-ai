## ADDED Requirements

### Requirement: Archive commits all uncommitted changes
The `/opsx:archive` command SHALL stage and commit all uncommitted changes (including untracked files) on the current feature/fix branch before merging.

#### Scenario: Uncommitted changes are captured
- **GIVEN** the current branch has uncommitted modifications and untracked files
- **WHEN** `/opsx:archive` is executed
- **THEN** all changes are staged via `git add -A` and committed with a message starting with "archive:"

#### Scenario: No uncommitted changes
- **GIVEN** the working tree is clean
- **WHEN** `/opsx:archive` is executed
- **THEN** the commit step is skipped and the merge proceeds

### Requirement: Archive merges branch to main
The `/opsx:archive` command SHALL checkout `main`, pull latest changes, merge the feature/fix branch with `--no-ff`, and push `main` to the remote.

#### Scenario: Successful merge and push
- **GIVEN** the feature branch is up to date with or rebaseable onto `main`
- **WHEN** `/opsx:archive` executes the merge step
- **THEN** `main` fast-forwards to include the feature branch changes and is pushed to `origin/main`

#### Scenario: Merge conflict prevents archive
- **GIVEN** `main` has diverged and a merge conflict exists
- **WHEN** `/opsx:archive` attempts to merge
- **THEN** the archive process aborts with an error message asking the user to rebase manually

### Requirement: Archive deletes the feature branch
After successful merge to `main`, the `/opsx:archive` command SHALL delete the feature/fix branch both locally and from the remote.

#### Scenario: Branch cleaned up after archive
- **GIVEN** the merge to `main` succeeded
- **WHEN** `/opsx:archive` cleans up
- **THEN** the local branch is deleted with `git branch -d` and the remote branch is deleted with `git push origin --delete`

### Requirement: Archive moves openspec change to archive directory
The `/opsx:archive` command SHALL move the completed openspec change directory from `openspec/changes/<name>/` to `openspec/changes/archive/YYYY-MM-DD-<name>/`.

#### Scenario: Change archived with date prefix
- **GIVEN** a completed change at `openspec/changes/my-change/`
- **WHEN** `/opsx:archive my-change` is executed
- **THEN** the directory is moved to `openspec/changes/archive/YYYY-MM-DD-my-change/`
