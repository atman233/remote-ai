const express = require('express');
const expressWs = require('express-ws');
const pty = require('node-pty');

const { listSessions, getSessionCwd, loadCommands } = require('./session-manager');

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
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(authCheck);

const { execSync } = require('child_process');

// ---- HTTP API ----

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/sessions', (_req, res) => {
  const sessions = listSessions();
  res.json({ sessions });
});

app.post('/api/sessions', (req, res) => {
  const { name } = req.body || {};
  if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
    return res.status(400).json({ error: '无效的会话名称' });
  }
  try {
    execSync(`tmux new-session -d -s ${name}`, { timeout: 5000 });
    log(GREEN(`Created session: ${name}`));
    res.json({ id: name, cwd: process.env.HOME || '/', hasClaudeCode: false, windows: 1 });
  } catch (e) {
    log(RED(`Failed to create session: ${name} ${e.message}`));
    res.status(500).json({ error: '创建会话失败: ' + e.message });
  }
});

app.get('/api/sessions/:id/commands', (req, res) => {
  const cwd = getSessionCwd(req.params.id);
  const commands = loadCommands(cwd);
  res.json({ commands });
});

// ---- WebSocket ----

app.ws('/api/sessions/:id/pty', (ws, req) => {
  const sessionId = req.params.id;

  log(GREEN(`WS connect: ${sessionId}`));

  const sessions = listSessions();
  if (!sessions.find((s) => s.id === sessionId)) {
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
  const sessions = listSessions();
  log(`Found ${sessions.length} tmux session(s)`);
  sessions.forEach((s) =>
    log(`  ${s.id}  ${GRAY(s.cwd)}  ${s.hasClaudeCode ? GREEN('CC') : ''}`)
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
