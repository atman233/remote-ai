const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(__dirname, 'projects.json');
const DAEMON_PORT = process.env.PORT || 9528;
const DAEMON_TOKEN = process.env.TOKEN || '';

// ---- Hook Config Injection ----
// Generates the hook config that lets Claude Code notify the daemon of lifecycle events

function hookConfigFor(projectName) {
  const authHeader = DAEMON_TOKEN ? `-H 'Authorization: Bearer ${DAEMON_TOKEN}'` : '';
  return {
    hooks: {
      // Stop & PermissionRequest: direct hook config (no matcher)
      Stop: [{
        type: 'command',
        command: `curl -s -X POST http://localhost:${DAEMON_PORT}/api/notify ${authHeader} -H 'Content-Type: application/json' -d '${JSON.stringify({ session: projectName, event: 'stop', title: '回复完成' })}'`,
        timeout: 5000,
      }],
      // Notification: matcher-based hook config
      Notification: [{
        matcher: 'permission_prompt|elicitation_dialog',
        hooks: [{
          type: 'command',
          command: `curl -s -X POST http://localhost:${DAEMON_PORT}/api/notify ${authHeader} -H 'Content-Type: application/json' -d '${JSON.stringify({ session: projectName, event: 'needs_input', title: '需要操作' })}'`,
          timeout: 5000,
        }],
      }],
      PermissionRequest: [{
        type: 'command',
        command: `curl -s -X POST http://localhost:${DAEMON_PORT}/api/notify ${authHeader} -H 'Content-Type: application/json' -d '${JSON.stringify({ session: projectName, event: 'permission', title: '请求权限' })}'`,
        timeout: 5000,
      }],
    },
  };
}

function ensureHooksConfig(projectName, projectPath) {
  const claudeDir = path.join(projectPath, '.claude');
  const localSettingsPath = path.join(claudeDir, 'settings.local.json');

  try {
    fs.mkdirSync(claudeDir, { recursive: true });
  } catch {
    return;
  }

  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8'));
  } catch {
    // File doesn't exist or is invalid — start fresh
  }

  // Merge hooks: keep existing hooks, overwrite only the ones we manage
  const newHookConfig = hookConfigFor(projectName);
  if (!existing.hooks) existing.hooks = {};
  Object.assign(existing.hooks, newHookConfig.hooks);

  try {
    fs.writeFileSync(localSettingsPath, JSON.stringify(existing, null, 2), 'utf-8');
  } catch {
    // Can't write — silently skip
  }
}

function listProjects() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return [];
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    if (!data.projects || !Array.isArray(data.projects)) return [];

    return data.projects.map((p) => ({
      name: p.name,
      path: p.path,
      hasSession: sessionExists(p.name),
      hasClaudeCode: detectClaudeCode(p.name),
    }));
  } catch {
    return [];
  }
}

function getProject(name) {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    if (!data.projects || !Array.isArray(data.projects)) return null;
    return data.projects.find((p) => p.name === name) || null;
  } catch {
    return null;
  }
}

function sessionExists(name) {
  try {
    execSync(`tmux has-session -t '${name}' 2>/dev/null`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

function detectClaudeCode(sessionName) {
  try {
    const procs = execSync(
      `tmux list-panes -t '${sessionName}' -F '#{pane_pid}'`,
      { encoding: 'utf-8', timeout: 2000 }
    ).trim();

    if (!procs) return false;

    return procs.split('\n').some((pid) => {
      try {
        const tree = execSync(
          `ps -o comm= --ppid ${pid.trim()} 2>/dev/null; cat /proc/${pid.trim()}/task/${pid.trim()}/children 2>/dev/null`,
          { encoding: 'utf-8', timeout: 1000 }
        );
        return /claude/i.test(tree);
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

module.exports = { listProjects, getProject, sessionExists, detectClaudeCode, ensureHooksConfig };
