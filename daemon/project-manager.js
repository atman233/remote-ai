const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(__dirname, 'projects.json');

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
      stopNotify: detectStopNotify(p.path),
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

function detectStopNotify(projectPath) {
  try {
    const settingsPath = path.join(projectPath, '.claude', 'settings.json');
    if (!fs.existsSync(settingsPath)) return false;
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const hooks = settings.hooks;
    if (!hooks || !hooks.Stop) return false;
    return hooks.Stop.some((h) => h.command && h.command.includes('stop-notify.sh'));
  } catch {
    return false;
  }
}

module.exports = { listProjects, getProject, sessionExists, detectClaudeCode, detectStopNotify };
