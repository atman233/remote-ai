import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Preferences } from '@capacitor/preferences';
import { Keyboard } from '@capacitor/keyboard';

// ---- State ----
let settings = { host: '', user: '', pass: '' };
let sessions = [];
let activeSession = null;
let ws = null;
let term = null;
let fitAddon = null;
let reconnectTimer = null;

// ---- DOM refs ----
const $ = (id) => document.getElementById(id);
const topbar = $('topbar');
const menuBtn = $('menu-btn');
const sessionName = $('session-name');
const connDot = $('connection-dot');
const settingsBtn = $('settings-btn');
const drawer = $('drawer');
const drawerOverlay = $('drawer-overlay');
const drawerClose = $('drawer-close');
const sessionList = $('session-list');
const drawerRefresh = $('drawer-refresh');
const drawerNew = $('drawer-new');
const terminalContainer = $('terminal-container');
const statusOverlay = $('status-overlay');
const statusText = $('status-text');
const statusRetry = $('status-retry');
const cmdPanel = $('cmd-panel');
const cmdPanelHandle = $('cmd-panel-handle');
const cmdButtons = $('cmd-buttons');
const settingsModal = $('settings-modal');
const settingHost = $('setting-host');
const settingUser = $('setting-user');
const settingPass = $('setting-pass');
const settingsSave = $('settings-save');
const settingsCancel = $('settings-cancel');
const newSessionModal = $('new-session-modal');
const newSessionName = $('new-session-name');
const newSessionCreate = $('new-session-create');
const newSessionCancel = $('new-session-cancel');

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  // Load settings from Capacitor Preferences (or localStorage fallback)
  await loadSettings();

  // Init xterm
  initTerminal();

  // Wire events
  menuBtn.addEventListener('click', toggleDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);
  drawerClose.addEventListener('click', closeDrawer);
  drawerRefresh.addEventListener('click', refreshSessions);
  drawerNew.addEventListener('click', () => showModal(newSessionModal));
  settingsBtn.addEventListener('click', () => showSettingsModal());
  settingsSave.addEventListener('click', saveSettings);
  settingsCancel.addEventListener('click', () => hideModal(settingsModal));
  statusRetry.addEventListener('click', reconnect);
  cmdPanelHandle.addEventListener('click', toggleCmdPanel);
  newSessionCreate.addEventListener('click', createSession);
  newSessionCancel.addEventListener('click', () => hideModal(newSessionModal));

  // If settings exist, connect
  if (settings.host && settings.pass) {
    await refreshSessions();
  } else {
    showSettingsModal();
  }

  // Handle keyboard
  try {
    Keyboard.addListener('keyboardWillShow', (info) => {
      terminalContainer.style.height = `calc(100% - ${info.keyboardHeight}px)`;
      setTimeout(() => term && fitAddon && fitAddon.fit(), 100);
    });
    Keyboard.addListener('keyboardWillHide', () => {
      terminalContainer.style.height = '';
      setTimeout(() => term && fitAddon && fitAddon.fit(), 100);
    });
  } catch { /* Not running in Capacitor */ }
});

// ---- Settings ----
async function loadSettings() {
  try {
    const defaultHost = import.meta.env.VITE_DEFAULT_HOST || '';
    settings.host = (await Preferences.get({ key: 'host' })).value || defaultHost;
    settings.user = (await Preferences.get({ key: 'user' })).value || '';
    settings.pass = (await Preferences.get({ key: 'pass' })).value || '';
  } catch {
    const defaultHost = import.meta.env.VITE_DEFAULT_HOST || '';
    settings.host = localStorage.getItem('cc_host') || defaultHost;
    settings.user = localStorage.getItem('cc_user') || '';
    settings.pass = localStorage.getItem('cc_pass') || '';
  }
}

function showSettingsModal() {
  settingHost.value = settings.host;
  settingUser.value = settings.user;
  settingPass.value = settings.pass;
  showModal(settingsModal);
}

async function saveSettings() {
  settings.host = settingHost.value.trim();
  settings.user = settingUser.value.trim();
  settings.pass = settingPass.value.trim();
  try {
    await Preferences.set({ key: 'host', value: settings.host });
    await Preferences.set({ key: 'user', value: settings.user });
    await Preferences.set({ key: 'pass', value: settings.pass });
  } catch {
    localStorage.setItem('cc_host', settings.host);
    localStorage.setItem('cc_user', settings.user);
    localStorage.setItem('cc_pass', settings.pass);
  }
  hideModal(settingsModal);
  await refreshSessions();
}

// ---- Auth header helper ----
function authHeaders() {
  return {
    'Authorization': 'Bearer ' + settings.pass,
    'Content-Type': 'application/json',
  };
}

function baseUrl() {
  return `https://${settings.host}`;
}

function wsUrl(path) {
  return `wss://${settings.host}${path}?token=${encodeURIComponent(settings.pass)}`;
}

// ---- Sessions ----
async function refreshSessions() {
  try {
    const resp = await fetch(`${baseUrl()}/api/sessions`, { headers: authHeaders() });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    sessions = data.sessions || [];
    renderSessionList();
  } catch (e) {
    console.error('Failed to fetch sessions:', e);
    sessions = [];
    renderSessionList();
  }
}

function renderSessionList() {
  sessionList.innerHTML = '';
  if (sessions.length === 0) {
    sessionList.innerHTML = '<div style="padding:16px;color:var(--fg2);text-align:center">未检测到 tmux 会话</div>';
    return;
  }
  sessions.forEach((s) => {
    const div = document.createElement('div');
    div.className = 'session-item' + (activeSession && activeSession.id === s.id ? ' active' : '');
    div.innerHTML = `
      <span class="name">${esc(s.id)}</span>
      ${s.hasClaudeCode ? '<span class="badge">CC</span>' : ''}
    `;
    div.addEventListener('click', () => {
      connectToSession(s);
      closeDrawer();
    });
    sessionList.appendChild(div);
  });
}

// ---- Connection ----
async function connectToSession(session) {
  if (ws) {
    ws.close(1000);
    ws = null;
  }

  activeSession = session;
  sessionName.textContent = session.id;
  setStatus('offline');

  // Fetch commands for this session
  try {
    const resp = await fetch(`${baseUrl()}/api/sessions/${encodeURIComponent(session.id)}/commands`, {
      headers: authHeaders(),
    });
    if (resp.ok) {
      const data = await resp.json();
      renderCommands(data.commands || []);
    }
  } catch {
    renderCommands([]);
  }

  // Connect WebSocket
  connectWS(session.id);
}

function connectWS(sessionId) {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  showStatus('连接中...', false);

  try {
    ws = new WebSocket(wsUrl(`/api/sessions/${encodeURIComponent(sessionId)}/pty`));
  } catch (e) {
    showStatus('连接失败: ' + e.message, true);
    return;
  }

  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    hideStatus();
    setStatus('online');
    if (term) {
      term.clear();
      term.focus();
      fitAddon.fit();
    }
  };

  ws.onmessage = (evt) => {
    if (!term) return;
    try {
      if (evt.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(evt.data));
      } else if (typeof evt.data === 'string') {
        term.write(evt.data);
      }
    } catch {
      // ignore write errors
    }
  };

  ws.onclose = (evt) => {
    if (evt.code === 1000) return; // Intentional close
    setStatus('offline');
    const msg = evt.code === 1006 ? '连接中断' : `断开 (${evt.code})`;
    showStatus(msg, true);
    scheduleReconnect(sessionId);
  };

  ws.onerror = () => {
    setStatus('offline');
    showStatus('连接错误', true);
  };
}

function scheduleReconnect(sessionId) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    showStatus('重连中...', false);
    connectWS(sessionId);
  }, 3000);
}

function reconnect() {
  if (activeSession) {
    connectWS(activeSession.id);
  }
}

// ---- Terminal ----
function initTerminal() {
  term = new Terminal({
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Source Code Pro', monospace",
    fontSize: 13,
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#4fc3f7',
      selectionBackground: '#264f78',
      black: '#1e1e1e',
      red: '#f44747',
      green: '#608b4e',
      yellow: '#d7ba7d',
      blue: '#569cd6',
      magenta: '#c586c0',
      cyan: '#4ec9b0',
      white: '#d4d4d4',
      brightBlack: '#888888',
      brightRed: '#f44747',
      brightGreen: '#608b4e',
      brightYellow: '#d7ba7d',
      brightBlue: '#569cd6',
      brightMagenta: '#c586c0',
      brightCyan: '#4ec9b0',
      brightWhite: '#ffffff',
    },
    allowProposedApi: true,
    scrollback: 5000,
    cursorBlink: true,
    cursorStyle: 'bar',
  });

  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon());

  term.open(terminalContainer);
  fitAddon.fit();

  // Monitor resize
  const ro = new ResizeObserver(() => { fitAddon.fit(); });
  ro.observe(terminalContainer);

  // If user types directly in terminal, forward to WS
  term.onData((data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });

  // If we resize, tell the server
  term.onResize(({ cols, rows }) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ cols, rows }));
    }
  });
}

// ---- Command Panel ----
function renderCommands(commands) {
  cmdButtons.innerHTML = '';
  commands.forEach((cmd) => {
    const btn = document.createElement('button');
    btn.className = 'cmd-btn';
    btn.textContent = cmd.label;
    btn.addEventListener('click', () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(cmd.text);
        term.write(cmd.text);
      }
    });
    // Visual hint for send action
    if (cmd.text.endsWith('\n') && cmd.text.length > 1) {
      btn.classList.add('send');
    }
    cmdButtons.appendChild(btn);
  });
}

function toggleCmdPanel() {
  cmdPanel.classList.toggle('collapsed');
  setTimeout(() => term && fitAddon && fitAddon.fit(), 150);
}

// ---- Drawer ----
function toggleDrawer() {
  drawer.classList.toggle('open');
  drawerOverlay.classList.toggle('active');
  if (drawer.classList.contains('open')) refreshSessions();
}

function closeDrawer() {
  drawer.classList.remove('open');
  drawerOverlay.classList.remove('active');
}

// ---- Status ----
function setStatus(s) {
  connDot.className = s === 'online' ? 'dot-online' : 'dot-offline';
}

function showStatus(text, showRetry) {
  statusText.textContent = text;
  statusOverlay.classList.remove('hidden');
  statusRetry.classList.toggle('hidden', !showRetry);
}

function hideStatus() {
  statusOverlay.classList.add('hidden');
}

// ---- Modal ----
function showModal(el) { el.classList.remove('hidden'); }
function hideModal(el) { el.classList.add('hidden'); }

// ---- New Session ----
async function createSession() {
  const name = newSessionName.value.trim();
  if (!name) return;
  try {
    const resp = await fetch(`${baseUrl()}/api/sessions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    });
    if (resp.ok) {
      hideModal(newSessionModal);
      newSessionName.value = '';
      await refreshSessions();
    } else {
      const err = await resp.json().catch(() => ({}));
      alert('创建失败: ' + (err.error || '未知错误'));
    }
  } catch (e) {
    alert('创建失败: ' + e.message);
  }
}

// ---- Utils ----
function esc(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
