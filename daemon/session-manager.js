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

const BUILTIN_CLAUDE_COMMANDS = [
  { label: '/resume', text: '/resume\n' },
  { label: '/new', text: '/new\n' },
  { label: '/bug', text: '/bug\n' },
  { label: '/clear', text: '/clear\n' },
  { label: '/compact', text: '/compact\n' },
  { label: '/init', text: '/init\n' },
  { label: '/doctor', text: '/doctor\n' },
  { label: '/status', text: '/status\n' },
  { label: '/review', text: '/review\n' },
  { label: '/setup', text: '/setup\n' },
];

const TERMINAL_COMMANDS = [
  { label: '启动 Claude', text: 'claude\n' },
  { label: '确认 y', text: 'y\n' },
  { label: '拒绝 n', text: 'n\n' },
  { label: '中断', text: '\x03' },
  { label: '清屏', text: '\x0c' },
];

function discoverCommands(commandsDir) {
  const commands = [];

  function walk(dir, segments) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      const name = path.parse(entry.name).name;
      if (entry.isDirectory()) {
        walk(full, [...segments, name]);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const label = '/' + [...segments, name].join(':');
        commands.push({ label, text: label + '\n' });
      }
    }
  }

  walk(commandsDir, []);
  return commands;
}

function loadCommands(cwd) {
  const projectCommands = discoverCommands(path.join(cwd, '.claude', 'commands'));
  return [
    ...projectCommands,
    ...BUILTIN_CLAUDE_COMMANDS,
    ...TERMINAL_COMMANDS,
  ];
}

module.exports = { getSessionCwd, loadCommands };
