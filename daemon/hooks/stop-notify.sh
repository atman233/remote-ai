#!/bin/bash
# Claude Code Stop hook — notifies CC Mobile daemon when Claude finishes a turn.
# Usage: bash stop-notify.sh <project-name>
# Called by Claude's Stop hook in .claude/settings.json

PROJECT="${1:-}"
if [ -z "$PROJECT" ]; then
  # Fallback: derive project name from cwd (passed via hook stdin)
  CWD=$(jq -r '.cwd // empty' 2>/dev/null || true)
  PROJECT=$(basename "$CWD" 2>/dev/null || echo "unknown")
fi

# Notify daemon (localhost bypasses auth)
curl -s -X POST "http://127.0.0.1:9528/api/notify" \
  -H "Content-Type: application/json" \
  -d "{\"project\":\"$PROJECT\",\"event\":\"stop\"}" > /dev/null 2>&1 &

exit 0
