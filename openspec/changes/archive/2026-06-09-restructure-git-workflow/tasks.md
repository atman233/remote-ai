## 1. CI workflow update

- [x] 1.1 Change `push.branches` in `build-apk.yml` from `[main, test]` to trigger on all branches, keeping `paths: [mobile/**]`
- [x] 1.2 Update server URL logic: `main` → production, all other branches → test (already correct, just verify)
- [x] 1.3 Remove the `test-latest` rolling Release step (only `main` creates GitHub Releases)

## 2. Config update

- [x] 2.1 Update `openspec/config.yaml` git workflow context to describe the new model (no test branch, feature-*/fix-* convention, archive merges to main)
- [x] 2.2 Update mobile CI context to reflect that all branch pushes trigger builds, only main creates Releases

## 3. Archive behavior

- [x] 3.1 Update `/opsx:archive` skill or hook to: commit uncommitted changes, checkout main, pull, merge --no-ff, push main, delete branch (local + remote), move change to archive

## 4. Branch cleanup

- [x] 4.1 Delete remote `test` branch: `git push origin --delete test`
- [x] 4.2 Delete local stale branches (`test`, `list`, `fix-status-bar-overlay`)
