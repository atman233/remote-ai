## Context

Currently there are three branch types: `main` (production), `test` (CI trigger for testing), and feature branches. Features merge to `test` for CI builds, then to `main` for production. The `test` branch is a pure pass-through — it exists solely to trigger CI builds.

The user wants to eliminate `test` and let each feature/fix branch serve as its own testable unit. Pushing any branch triggers a CI build (test config for non-main, prod config for main). Archive (`/opsx:archive`) becomes the ceremony that closes a feature loop: commit, merge to main, push, cleanup.

## Goals / Non-Goals

**Goals:**
- Eliminate `test` branch entirely
- Any push to a `feature-*` or `fix-*` branch triggers a test APK build
- `/opsx:archive` automates the full close-out: commit uncommitted changes, merge to main, push, delete branch
- `main` push still triggers production build

**Non-Goals:**
- Changing build tooling (still Capacitor + Gradle)
- Adding staging/preview environments
- Automatic version bumping

## Decisions

### 1. CI trigger: all branches, with server selection by branch name

Instead of listing specific branches, the workflow triggers on any push. Server selection: `main` → production, any other branch → test.

**Why not pattern-based triggers (`feature-*/fix-*`)**: GitHub Actions `push.branches` patterns have quirks — `**` or omitting branches entirely is more reliable. The server selection logic already uses `github.ref_name`, only `main` gets prod; everything else gets test.

**Trade-off**: Every push triggers a build (even on branches without mobile changes). Mitigation: keep the `paths` filter on `mobile/**`.

### 2. Branch naming: `feature-<topic>` / `fix-<topic>`

The `openspec/config.yaml` context will document this convention. `/opsx:propose` derives the prefix from the change name (most changes are fixes → `fix-`, new capabilities → `feature-`). For backward compatibility, simple kebab-case names without prefix are still allowed.

### 3. Archive: auto-commit, merge, push, delete

The `/opsx:archive` skill will execute these git operations in order:
1. `git add -A` (stage everything, including uncommitted openspec artifacts)
2. `git commit -m "archive: <change-name>"`
3. `git checkout main && git pull --ff-only`
4. `git merge <branch> --no-ff`
5. `git push origin main`
6. `git branch -d <branch> && git push origin --delete <branch>`
7. Move openspec change to archive directory

If any step fails (e.g., main has diverged, merge conflict), the process stops and reports the error.

### 4. No more rolling test Release

Feature/fix branch builds only upload to GitHub Actions artifacts (not Releases). Only `main` builds create a GitHub Release. This avoids cluttering the Releases page with every test build.

## Risks / Trade-offs

- **[Risk] Merge conflict on archive** → Mitigation: check for conflicts before merge; if found, abort and ask user to rebase manually
- **[Risk] `git pull --ff-only` on main may fail if main has new commits** → Mitigation: if pull fails, abort archive and ask user to rebase feature branch onto latest main first
- **[Risk] CI builds on every push may consume GitHub Actions minutes** → Mitigation: keep `paths` filter; user controls push frequency

## Migration Plan

1. Update CI workflow first (so it triggers on all branches)
2. Update config.yaml (document new workflow)
3. Update `/opsx:archive` behavior
4. Delete `test` branch (local + remote)
5. Clean up stale branches
