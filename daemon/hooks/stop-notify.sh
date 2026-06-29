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
# Priority: PORT env > port file > default 9528
DAEMON_PORT="${PORT:-}"
if [ -z "$DAEMON_PORT" ] && [ -f /tmp/cc-daemon-port ]; then
  DAEMON_PORT=$(cat /tmp/cc-daemon-port 2>/dev/null)
fi
DAEMON_PORT="${DAEMON_PORT:-9528}"
curl -s -X POST "http://127.0.0.1:${DAEMON_PORT}/api/notify" \
  -H "Content-Type: application/json" \
  -d "{\"project\":\"$PROJECT\",\"event\":\"stop\"}" > /dev/null 2>&1 &

exit 0
