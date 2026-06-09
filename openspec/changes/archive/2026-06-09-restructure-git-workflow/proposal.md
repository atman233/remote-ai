## Why

The three-branch model (main → test → feature) adds unnecessary complexity. The `test` branch is a pass-through that provides no value beyond what pushing directly to feature branches would. Each feature/fix should be its own testable branch. Archive should fully close the loop by merging to main.

## What Changes

- **BREAKING**: Remove `test` branch. Feature/fix branches become the only development branches, forked from and merged back to `main`
- CI triggers on any branch push (not just `main`/`test`); `main` → production, all others → test environment
- Branch naming convention: `feature-<topic>` for new features, `fix-<topic>` for bug fixes
- `/opsx:archive` auto-merges the current feature/fix branch to `main`, pushes, then deletes the branch locally and remotely
- No more `test-latest` GitHub Release; feature/fix branch builds produce artifacts only (not Releases)
- CI workflow path filter expands from `mobile/**` to also include `openspec/**` and `.github/workflows/**`
- Update `git-workflow` and `mobile-ci` specs to reflect the new branching model

## Capabilities

### New Capabilities

- `opsx-archive-auto-merge`: The archive command automatically commits uncommitted changes, merges the branch to main, pushes, and cleans up the branch

### Modified Capabilities

- `git-workflow`: Remove test branch concept; feature/fix branches push directly for CI; archive merges to main
- `mobile-ci`: CI triggers on all branch pushes (main for prod, others for test); remove test-latest Release

## Impact

- **Files**: `.github/workflows/build-apk.yml`, `openspec/config.yaml`, `.claude/commands/opsx/` (archive hook)
- **Git**: Delete `test` branch (local + remote), delete stale feature branches
- **Specs**: `git-workflow` (MODIFIED), `mobile-ci` (MODIFIED), new `opsx-archive-auto-merge` (ADDED)

## Non-goals

- Changing the production deployment mechanism
- Adding multi-environment support beyond the existing prod/test server split
- Changing how `/opsx:propose` creates the branch (it already forks from main, just the naming convention is formalized)
