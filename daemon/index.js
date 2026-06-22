const fs = require('fs');
const path = require('path');
const express = require('express');
const expressWs = require('express-ws');
const pty = require('node-pty');

const { getSessionCwd, loadCommands } = require('./session-manager');
const { listProjects, getProject, sessionExists } = require('./project-manager');

const PORT = process.env.PORT || 9528;
const HOST = process.env.HOST || '127.0.0.1';
const TOKEN = process.env.TOKEN || '';

const app = express();
expressWs(app);

// ---- Auth Middleware ----
function authCheck(req, res, next) {
  if (!TOKEN) return next(); // No token configured, skip auth

  // Check query param (for WebSocket which can't set headers)
  if (req.query.token === TOKEN) return next();

  // Check Authorization header
  const auth = req.headers.authorization || '';
  if (auth === `Bearer ${TOKEN}`) return next();

  // Also accept Basic auth where password is the token
  if (auth.startsWith('Basic ')) {
    const creds = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
    const [_user, pass] = creds.split(':');
    if (pass === TOKEN) return next();
  }

  res.status(401).json({ error: 'Unauthorized' });
}

// ---- Middleware ----
app.use(express.json());

// CORS must come before auth (preflight OPTIONS has no auth header)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(authCheck);

const { execSync } = require('child_process');

// ---- HTTP API ----

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ---- Projects API ----

app.get('/api/projects', (_req, res) => {
  try {
    const projects = listProjects();
    res.json({ projects });
  } catch (e) {
    log(RED(`Failed to list projects: ${e.message}`));
    res.status(500).json({ error: '读取项目配置失败' });
  }
});

app.post('/api/projects/:name/start', (req, res) => {
  const { name } = req.params;
  const project = getProject(name);

  if (!project) {
    return res.status(404).json({ error: '项目不存在: ' + name });
  }

  try {
    fs.accessSync(project.path, fs.constants.R_OK);
  } catch {
    return res.status(400).json({ error: '项目路径不存在: ' + project.path });
  }

  try {
    // Reuse existing session if present
    const { execSync } = require('child_process');
    const exists = (() => {
      try { execSync(`tmux has-session -t '${name}' 2>/dev/null`, { timeout: 2000 }); return true; } catch { return false; }
    })();

    if (!exists) {
      // Create tmux session in project directory
      execSync(`tmux new-session -d -s '${name}' -c '${project.path}'`, { timeout: 5000 });
      log(GREEN(`Created session: ${name} at ${project.path}`));
      // Auto-launch Claude
      execSync(`tmux send-keys -t '${name}' 'claude' Enter`, { timeout: 2000 });
      log(`Launched Claude in session: ${name}`);
    } else {
      log(`Reusing existing session: ${name}`);
    }

    res.json({ id: name, cwd: project.path });
  } catch (e) {
    log(RED(`Failed to start project session: ${name} ${e.message}`));
    res.status(500).json({ error: '启动项目会话失败: ' + e.message });
  }
});

const CONFIG_PATH = path.join(__dirname, 'projects.json');

app.post('/api/projects', (req, res) => {
  const { name, path: projectPath } = req.body || {};

  if (!name || typeof name !== 'string' || !/^[a-zA-Z0-9_\-.]+$/.test(name.trim())) {
    return res.status(400).json({ error: '项目名称无效，仅允许字母、数字、下划线、连字符和点' });
  }
  if (!projectPath || typeof projectPath !== 'string') {
    return res.status(400).json({ error: '项目路径不能为空' });
  }

  const trimmedName = name.trim();
  const trimmedPath = projectPath.trim();

  try {
    fs.mkdirSync(trimmedPath, { recursive: true });
    log(`Created directory: ${trimmedPath}`);
  } catch (e) {
    return res.status(400).json({ error: '无法创建项目目录: ' + e.message });
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    config = { projects: [] };
  }

  if (!config.projects || !Array.isArray(config.projects)) {
    config.projects = [];
  }

  if (config.projects.some((p) => p.name === trimmedName)) {
    return res.status(409).json({ error: '项目名称已存在: ' + trimmedName });
  }

  config.projects.push({ name: trimmedName, path: trimmedPath });

  try {
    const tmpPath = CONFIG_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf-8');
    fs.renameSync(tmpPath, CONFIG_PATH);
    log(GREEN(`Added project: ${trimmedName} at ${trimmedPath}`));
    res.json({ success: true, project: { name: trimmedName, path: trimmedPath } });
  } catch (e) {
    log(RED(`Failed to write projects.json: ${e.message}`));
    res.status(500).json({ error: '写入项目配置失败' });
  }
});

app.delete('/api/projects/:name', (req, res) => {
  const { name } = req.params;

  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return res.status(404).json({ error: '无项目配置' });
  }

  if (!config.projects || !Array.isArray(config.projects)) {
    return res.status(404).json({ error: '无项目配置' });
  }

  const idx = config.projects.findIndex((p) => p.name === name);
  if (idx === -1) {
    return res.status(404).json({ error: '项目不存在: ' + name });
  }

  config.projects.splice(idx, 1);

  try {
    const tmpPath = CONFIG_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf-8');
    fs.renameSync(tmpPath, CONFIG_PATH);
  } catch (e) {
    log(RED(`Failed to write projects.json: ${e.message}`));
    return res.status(500).json({ error: '写入项目配置失败' });
  }

  // Kill tmux session if it exists
  try {
    execSync(`tmux kill-session -t '${name}' 2>/dev/null`, { timeout: 3000 });
    log(`Killed tmux session: ${name}`);
  } catch {
    // Session may not exist, that's fine
  }

  log(GREEN(`Removed project: ${name}`));
  res.json({ success: true });
});

app.post('/api/daemon/restart', (_req, res) => {
  res.json({ success: true, message: 'restarting' });
  setTimeout(() => {
    log(YELLOW('Daemon restarting...'));
    process.exit(0);
  }, 100);
});

app.get('/api/sessions/:id/commands', (req, res) => {
  const cwd = getSessionCwd(req.params.id);
  const commands = loadCommands(cwd);
  res.json({ commands });
});

app.get('/api/sessions/:id/history', (req, res) => {
  const { id } = req.params;
  const lines = Math.min(parseInt(req.query.lines) || 1000, 5000);

  if (!sessionExists(id)) {
    return res.status(404).json({ error: '会话不存在: ' + id });
  }

  try {
    const text = execSync(
      `tmux capture-pane -p -e -S '-${lines}' -t '${id}'`,
      { timeout: 5000, encoding: 'utf-8', maxBuffer: 2 * 1024 * 1024 }
    );
    res.json({ text, lines, session: id });
  } catch (e) {
    if (e.killed) {
      res.status(504).json({ error: '历史获取超时' });
    } else {
      log(RED(`History capture failed for ${id}: ${e.message}`));
      res.status(500).json({ error: '历史获取失败' });
    }
  }
});

// ---- WebSocket ----

app.ws('/api/sessions/:id/pty', (ws, req) => {
  const sessionId = req.params.id;

  log(GREEN(`WS connect: ${sessionId}`));

  if (!sessionExists(sessionId)) {
    ws.send('\x1b[31m会话不存在或已关闭\x1b[0m\n');
    ws.close();
    return;
  }

  const term = pty.spawn('tmux', ['attach', '-t', sessionId], {
    name: 'xterm-256color',
    cols: 120,
    rows: 35,
    cwd: process.env.HOME,
    env: Object.assign({}, process.env, { TERM: 'xterm-256color' }),
  });

  function handleMessage(msg) {
    try {
      let raw;
      if (Buffer.isBuffer(msg)) {
        raw = msg.toString('utf-8');
      } else if (typeof msg === 'string') {
        raw = msg;
      } else if (msg instanceof ArrayBuffer) {
        raw = Buffer.from(msg).toString('utf-8');
      } else if (Array.isArray(msg)) {
        raw = Buffer.concat(msg.map((b) => Buffer.from(b))).toString('utf-8');
      } else {
        return;
      }

      // Check if it's a resize command
      try {
        const parsed = JSON.parse(raw);
        if (parsed.cols && parsed.rows) {
          term.resize(parsed.cols, parsed.rows);
          return;
        }
      } catch {
        // Not JSON, treat as raw stdin
      }

      // JSON stdin message
      try {
        const parsed = JSON.parse(raw);
        if (parsed.type === 'stdin') {
          term.write(parsed.data);
          return;
        }
      } catch {
        // Not JSON, treat as raw stdin
      }

      term.write(raw);
    } catch {
      // PTY already dead
    }
  }

  term.onData((data) => {
    try {
      ws.send(data);
    } catch {
      // WS closed
    }
  });

  ws.on('message', handleMessage);
  ws.on('close', () => {
    log(YELLOW(`WS disconnect: ${sessionId}`));
    term.kill();
  });
  ws.on('error', () => term.kill());
});

// ---- Start ----

app.listen(PORT, HOST, () => {
  log(CYAN(`Daemon listening on ${HOST}:${PORT}`));
  const projects = listProjects();
  log(`Found ${projects.length} project(s)`);
  projects.forEach((p) =>
    log(`  ${p.name}  ${GRAY(p.path)}  ${p.hasClaudeCode ? GREEN('CC') : ''}`)
  );
});

// ---- ANSI helpers ----
const R = (n) => `\x1b[${n}m`;
const GRAY = (s) => `${R(90)}${s}${R(0)}`;
const GREEN = (s) => `${R(32)}${s}${R(0)}`;
const RED = (s) => `${R(31)}${s}${R(0)}`;
const YELLOW = (s) => `${R(33)}${s}${R(0)}`;
const CYAN = (s) => `${R(36)}${s}${R(0)}`;

function log(msg) {
  const ts = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`${GRAY(ts)} ${msg}`);
}
