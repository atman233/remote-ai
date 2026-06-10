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
  { label: '/resume', text: '/resume', kind: 'builtin' },
  { label: '/new', text: '/new', kind: 'builtin' },
  { label: '/bug', text: '/bug', kind: 'builtin' },
  { label: '/clear', text: '/clear', kind: 'builtin' },
  { label: '/compact', text: '/compact', kind: 'builtin' },
  { label: '/init', text: '/init', kind: 'builtin' },
  { label: '/doctor', text: '/doctor', kind: 'builtin' },
  { label: '/status', text: '/status', kind: 'builtin' },
  { label: '/review', text: '/review', kind: 'builtin' },
  { label: '/setup', text: '/setup', kind: 'builtin' },
];

const TERMINAL_COMMANDS = [
  { label: 'Esc', text: '\x1b', kind: 'terminal' },
  { label: 'Tab', text: '\x09', kind: 'terminal' },
  { label: '←Tab', text: '\x1b[Z', kind: 'terminal' },
  { label: '↑', text: '\x1b[A', kind: 'terminal' },
  { label: '↓', text: '\x1b[B', kind: 'terminal' },
  { label: 'Enter', text: '\r', kind: 'terminal' },
  { label: '确认 y', text: 'y\n', kind: 'terminal' },
  { label: '拒绝 n', text: 'n\n', kind: 'terminal' },
  { label: '中断', text: '\x03', kind: 'terminal' },
  { label: '清屏', text: '\x0c', kind: 'terminal' },
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
        commands.push({ label, text: label, kind: 'project' });
      }
    }
  }

  walk(commandsDir, []);
  return commands;
}

function loadCommands(cwd) {
  const projectCommands = discoverCommands(path.join(cwd, '.claude', 'commands'));
  return [
    ...TERMINAL_COMMANDS,
    ...BUILTIN_CLAUDE_COMMANDS,
    ...projectCommands,
  ];
}

module.exports = { getSessionCwd, loadCommands };
