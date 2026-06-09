const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getSessionCwd(sessionName) {
  try {
    return execSync(
      `tmux display-message -t '${sessionName}' -p '#{pane_current_path}'`,
      { encoding: 'utf-8', timeout: 2000 }
    ).trim();
  } catch {
    return '/';
  }
}

const DEFAULT_COMMANDS = [
  { label: '启动 Claude', text: 'claude\n', order: 0 },
  { label: '确认 y', text: 'y\n', order: 1 },
  { label: '拒绝 n', text: 'n\n', order: 2 },
  { label: '中断', text: '\x03', order: 3 },
  { label: '清屏', text: '\x0c', order: 4 },
];

function loadCommands(cwd) {
  const configPath = path.join(cwd, '.claude', 'commands.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (data.commands && Array.isArray(data.commands)) {
        return data.commands.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    }
  } catch {
    // Invalid JSON or unreadable — fall through to defaults
  }
  return DEFAULT_COMMANDS;
}

module.exports = { getSessionCwd, loadCommands };
