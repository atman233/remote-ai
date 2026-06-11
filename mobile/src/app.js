import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Preferences } from '@capacitor/preferences';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar } from '@capacitor/status-bar';

// ---- App Info ----
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';
const APP_BUILD_SHA = import.meta.env.VITE_APP_BUILD_SHA || 'dev';
const APP_ENV = import.meta.env.VITE_APP_ENV || 'test';
const GITHUB_API = 'https://api.github.com/repos/atman233/remote-ai';
const UPDATE_CACHE_KEY = 'update_check_v2';
const CACHE_TTL = 5 * 60 * 1000;

// ---- State ----
let settings = { host: '', user: '', pass: '' };
let projects = [];
let recentProjects = [];
let activeProject = null;
let ws = null;
let term = null;
let fitAddon = null;
let reconnectTimer = null;
let scrollbackBuf = '';
let historyOverlay = null;
let historyContent = null;
let updateDownloadUrl = null;
let updateListenersAdded = false;
const RECENT_KEY = 'recent_projects';

// ---- DOM refs ----
const $ = (id) => document.getElementById(id);
const topbar = $('topbar');
const menuBtn = $('menu-btn');
const sessionName = $('session-name');
const connDot = $('connection-dot');
const settingsBtn = $('settings-btn');
const updateBtn = $('update-btn');
const drawer = $('drawer');
const drawerOverlay = $('drawer-overlay');
const drawerClose = $('drawer-close');
const sessionList = $('session-list');
const drawerRefresh = $('drawer-refresh');
const terminalContainer = $('terminal-container');
const statusOverlay = $('status-overlay');
const statusText = $('status-text');
const statusRetry = $('status-retry');
const cmdPanel = $('cmd-panel');
const cmdPanelHandle = $('cmd-panel-handle');
const cmdButtons = $('cmd-buttons');
const homeScreen = $('home-screen');
const recentList = $('recent-list');
const homeNewBtn = $('home-new-btn');
const newProjectModal = $('new-project-modal');
const newProjName = $('new-proj-name');
const newProjPath = $('new-proj-path');
const newProjCreate = $('new-proj-create');
const newProjCancel = $('new-proj-cancel');
const settingsModal = $('settings-modal');
const settingHost = $('setting-host');
const settingUser = $('setting-user');
const settingPass = $('setting-pass');
const settingsSave = $('settings-save');
const settingsCancel = $('settings-cancel');

// ---- Status Bar ----
async function initStatusBar() {
  try {
    const info = await StatusBar.getInfo();
    document.documentElement.style.setProperty('--safe-top', `${info.height}px`);
  } catch {
    // Fall back to CSS env() with a sensible default
    document.documentElement.style.setProperty('--safe-top', 'env(safe-area-inset-top, 24px)');
  }
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  await initStatusBar();
  await loadSettings();

  initTerminal();

  menuBtn.addEventListener('click', toggleDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);
  drawerClose.addEventListener('click', closeDrawer);
  drawerRefresh.addEventListener('click', refreshProjects);
  initVersionDisplay();
  updateBtn.addEventListener('click', onUpdateClick);
  settingsBtn.addEventListener('click', () => showSettingsModal());
  settingsSave.addEventListener('click', saveSettings);
  settingsCancel.addEventListener('click', () => hideModal(settingsModal));
  statusRetry.addEventListener('click', reconnect);
  cmdPanelHandle.addEventListener('click', toggleCmdPanel);
  homeNewBtn.addEventListener('click', showNewProjectModal);
  newProjCreate.addEventListener('click', createProject);
  newProjCancel.addEventListener('click', () => hideModal(newProjectModal));

  loadRecentProjects();
  checkForUpdate();

  if (settings.host && settings.pass) {
    await refreshProjects();
  } else {
    showSettingsModal();
  }

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
  await refreshProjects();
}

// ---- Update Check ----
function initVersionDisplay() {
  updateBtn.textContent = 'v' + APP_VERSION;
  updateBtn.className = 'update-idle';
}

async function checkForUpdate() {
  const cache = readUpdateCache();
  if (cache) {
    applyUpdateResult(cache);
    return;
  }

  try {
    const endpoint = APP_ENV === 'production'
      ? `${GITHUB_API}/releases/latest`
      : `${GITHUB_API}/releases/tags/test-latest`;

    const resp = await fetch(endpoint);
    if (!resp.ok) return;
    const release = await resp.json();

    let downloadUrl = null;
    let remoteVersion = null;
    let remoteSha = null;

    if (release.assets) {
      const apk = release.assets.find(a => a.name.endsWith('.apk'));
      if (apk) {
        downloadUrl = apk.browser_download_url;
        const vMatch = apk.name.match(/v(\d+\.\d+\.\d+)/);
        if (vMatch) remoteVersion = vMatch[1];
      }
    }

    // Extract commit SHA from release body (e.g., "Commit: abc1234")
    const shaMatch = release.body && release.body.match(/Commit:\s*([a-f0-9]+)/i);
    if (shaMatch) remoteSha = shaMatch[1].slice(0, 7);

    // Fallback to tag_name for version display
    if (!remoteVersion) {
      remoteVersion = release.tag_name.replace(/^v/, '');
    }

    // Update available if the remote build SHA differs from ours
    const isNewer = !!(remoteSha && remoteSha !== APP_BUILD_SHA);

    const result = { isNewer, remoteVersion, downloadUrl, timestamp: Date.now() };
    writeUpdateCache(result);
    applyUpdateResult(result);
  } catch {
    // Silently ignore — no update UI shown on error
  }
}

function readUpdateCache() {
  try {
    const raw = localStorage.getItem(UPDATE_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp < CACHE_TTL) return data;
  } catch {}
  return null;
}

function writeUpdateCache(result) {
  try { localStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify(result)); } catch {}
}

function applyUpdateResult(result) {
  if (result.isNewer && result.downloadUrl) {
    updateDownloadUrl = result.downloadUrl;
    updateBtn.textContent = '更新';
    updateBtn.className = 'update-available';
  }
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function onUpdateClick() {
  if (updateBtn.classList.contains('update-available') ||
      updateBtn.classList.contains('update-error')) {
    startUpdate();
  }
}

async function startUpdate() {
  if (!updateDownloadUrl) return;

  updateBtn.textContent = '0%';
  updateBtn.className = 'update-downloading';

  // Browser dev fallback
  try {
    const core = await import('@capacitor/core');
    if (!core.Capacitor.isNativePlatform()) {
      window.open(updateDownloadUrl, '_blank');
      updateBtn.textContent = 'v' + APP_VERSION;
      updateBtn.className = 'update-idle';
      return;
    }

    const UpdateManager = core.registerPlugin('UpdateManager');

    if (!updateListenersAdded) {
      updateListenersAdded = true;
      UpdateManager.addListener('downloadProgress', (data) => {
        updateBtn.textContent = data.percent + '%';
      });
      UpdateManager.addListener('downloadComplete', () => {
        updateBtn.textContent = 'v' + APP_VERSION;
        updateBtn.className = 'update-idle';
        updateDownloadUrl = null;
      });
      UpdateManager.addListener('downloadError', (data) => {
        console.error('Download error:', data.message);
        updateBtn.textContent = '重试';
        updateBtn.className = 'update-error';
      });
    }

    await UpdateManager.downloadAndInstall({
      url: updateDownloadUrl,
      version: APP_VERSION
    });
  } catch (e) {
    console.error('Update failed:', e);
    updateBtn.textContent = '重试';
    updateBtn.className = 'update-error';
  }
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

// ---- Projects ----
async function refreshProjects() {
  try {
    const resp = await fetch(`${baseUrl()}/api/projects`, { headers: authHeaders() });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    projects = data.projects || [];
    renderProjectList();
    renderHomeScreen();
  } catch (e) {
    console.error('Failed to fetch projects:', e);
    projects = [];
    renderProjectList();
    renderHomeScreen();
  }
}

function renderProjectList() {
  sessionList.innerHTML = '';
  if (projects.length === 0) {
    sessionList.innerHTML = '<div style="padding:16px;color:var(--fg2);text-align:center">未配置项目</div>';
    return;
  }
  projects.forEach((p) => {
    const div = document.createElement('div');
    div.className = 'session-item' + (activeProject && activeProject.name === p.name ? ' active' : '');
    div.innerHTML = `
      <span class="name">${esc(p.name)}</span>
      ${p.hasClaudeCode ? '<span class="badge">CC</span>' : ''}
      <button class="delete-btn" data-name="${esc(p.name)}" aria-label="删除">×</button>
    `;
    div.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn')) return;
      startProject(p);
      closeDrawer();
    });
    sessionList.appendChild(div);
  });

  // Attach delete handlers to drawer items
  sessionList.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDrawer();
      deleteProject(btn.dataset.name);
    });
  });
}

// ---- Recent Projects ----
function loadRecentProjects() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    recentProjects = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(recentProjects)) recentProjects = [];
  } catch {
    recentProjects = [];
  }
}

async function saveRecentProject(name) {
  loadRecentProjects();
  recentProjects = recentProjects.filter((n) => n !== name);
  recentProjects.unshift(name);
  if (recentProjects.length > 5) recentProjects = recentProjects.slice(0, 5);
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: RECENT_KEY, value: JSON.stringify(recentProjects) });
  } catch {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentProjects));
  }
}

// ---- Home Screen ----
function showHomeScreen() {
  homeScreen.classList.remove('hidden');
  terminalContainer.classList.add('hidden');
}

function hideHomeScreen() {
  homeScreen.classList.add('hidden');
  terminalContainer.classList.remove('hidden');
}

function renderHomeScreen() {
  recentList.innerHTML = '';

  // Build display list: recent projects that exist in daemon config, plus any non-recent ones
  const recentSet = new Set(recentProjects);
  const recentOrdered = recentProjects
    .filter((name) => projects.some((p) => p.name === name))
    .slice(0, 3);
  const remaining = projects.filter((p) => !recentSet.has(p.name));

  const display = [...recentOrdered, ...remaining].slice(0, 3).map((name) => {
    if (typeof name === 'string') return projects.find((p) => p.name === name);
    return name;
  }).filter(Boolean);

  if (display.length === 0) {
    recentList.innerHTML = '<div class="home-empty">暂无项目<br>点击下方按钮创建第一个项目</div>';
    return;
  }

  display.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <div class="card-header">
        <span class="card-name">${esc(p.name)}</span>
        ${p.hasClaudeCode ? '<span class="card-badge">CC</span>' : ''}
        <button class="card-delete" data-name="${esc(p.name)}" aria-label="删除">×</button>
      </div>
      <span class="card-path">${esc(p.path)}</span>
    `;
    card.addEventListener('click', (e) => {
      // Don't start if delete button was clicked
      if (e.target.closest('.card-delete')) return;
      startProject(p);
    });
    recentList.appendChild(card);
  });

  // Attach delete handlers
  recentList.querySelectorAll('.card-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteProject(btn.dataset.name);
    });
  });
}

// ---- Delete Project ----
async function deleteProject(name) {
  if (!confirm(`确定删除项目 "${name}"？\n\n这将删除配置和对应的 tmux 会话。`)) return;

  try {
    const resp = await fetch(`${baseUrl()}/api/projects/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      alert(data.error || '删除失败');
      return;
    }

    // If this was the active project, disconnect
    if (activeProject && activeProject.name === name) {
      if (ws) { ws.close(1000); ws = null; }
      activeProject = null;
      sessionName.textContent = '未连接';
      setStatus('offline');
      showHomeScreen();
    }

    // Remove from recent
    recentProjects = recentProjects.filter((n) => n !== name);
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key: RECENT_KEY, value: JSON.stringify(recentProjects) });
    } catch {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recentProjects));
    }

    await refreshProjects();
    showStatus('删除成功', false);
    setTimeout(hideStatus, 1500);
  } catch (e) {
    alert('删除失败: ' + e.message);
  }
}

// ---- New Project ----
function showNewProjectModal() {
  newProjName.value = '';
  newProjPath.value = '';
  newProjCreate.textContent = '创建';
  newProjCreate.disabled = false;
  showModal(newProjectModal);
}

async function createProject() {
  const name = newProjName.value.trim();
  const projectPath = newProjPath.value.trim();

  if (!name) {
    alert('请输入项目名称');
    return;
  }
  if (!projectPath) {
    alert('请输入项目路径');
    return;
  }

  newProjCreate.textContent = '创建中...';
  newProjCreate.disabled = true;

  try {
    const resp = await fetch(`${baseUrl()}/api/projects`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, path: projectPath }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      alert(data.error || '创建失败');
      newProjCreate.textContent = '创建';
      newProjCreate.disabled = false;
      return;
    }

    // Restart daemon
    try {
      await fetch(`${baseUrl()}/api/daemon/restart`, {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // Daemon restart may kill the connection before response
    }

    hideModal(newProjectModal);
    showStatus('守护进程重启中...', false);

    // Wait for daemon to come back
    await new Promise((r) => setTimeout(r, 2500));

    // Save as recent
    await saveRecentProject(name);

    // Refresh project list
    await refreshProjects();
    hideStatus();
  } catch (e) {
    alert('创建失败: ' + e.message);
    newProjCreate.textContent = '创建';
    newProjCreate.disabled = false;
  }
}

// ---- Connection ----
async function startProject(project) {
  if (ws) {
    ws.close(1000);
    ws = null;
  }

  hideHomeScreen();
  activeProject = project;
  sessionName.textContent = project.name;
  setStatus('offline');
  showStatus('启动中...', false);

  try {
    const resp = await fetch(`${baseUrl()}/api/projects/${encodeURIComponent(project.name)}/start`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      showStatus(err.error || '启动失败', true);
      return;
    }
  } catch (e) {
    showStatus('启动失败: ' + e.message, true);
    return;
  }

  // Fetch commands for this project
  try {
    const resp = await fetch(`${baseUrl()}/api/sessions/${encodeURIComponent(project.name)}/commands`, {
      headers: authHeaders(),
    });
    if (resp.ok) {
      const data = await resp.json();
      renderCommands(data.commands || []);
    }
  } catch {
    renderCommands([]);
  }

  connectWS(project.name);
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
    scrollbackBuf = '';
    saveRecentProject(sessionId);
    if (term) {
      term.clear();
      term.focus();
      fitAddon.fit();
    }
  };

  ws.onmessage = (evt) => {
    if (!term) return;
    try {
      let raw;
      if (evt.data instanceof ArrayBuffer) {
        raw = new Uint8Array(evt.data);
        term.write(raw);
      } else if (typeof evt.data === 'string') {
        raw = evt.data;
        term.write(raw);
      }
      if (raw) {
        if (typeof raw === 'string') {
          scrollbackBuf += raw;
        } else {
          scrollbackBuf += new TextDecoder().decode(raw);
        }
      }
      // Trim buffer to ~100K chars
      if (scrollbackBuf.length > 100000) {
        scrollbackBuf = scrollbackBuf.slice(-80000);
      }
      // Update overlay if visible
      if (historyOverlay && historyOverlay.classList.contains('active')) {
        historyContent.textContent = stripAnsi(scrollbackBuf);
        historyContent.scrollTop = historyContent.scrollHeight;
      }
    } catch {
      // ignore write errors
    }
  };

  ws.onclose = (evt) => {
    if (evt.code === 1000) return;
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
  if (activeProject) {
    connectWS(activeProject.name);
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

  const ro = new ResizeObserver(() => { fitAddon.fit(); });
  ro.observe(terminalContainer);

  term.onData((data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });

  term.onResize(({ cols, rows }) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ cols, rows }));
    }
  });

  initScrollButtons();
}

// ---- Scroll Buttons ----
function initScrollButtons() {
  // Build history overlay
  historyOverlay = document.createElement('div');
  historyOverlay.id = 'history-overlay';

  const header = document.createElement('div');
  header.id = 'history-overlay-header';
  header.innerHTML = '<span>对话历史</span>';

  const closeBtn = document.createElement('button');
  closeBtn.id = 'history-overlay-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', hideHistory);
  header.appendChild(closeBtn);

  historyContent = document.createElement('pre');
  historyContent.id = 'history-content';

  historyOverlay.appendChild(header);
  historyOverlay.appendChild(historyContent);
  document.body.appendChild(historyOverlay);

  // Floating toggle buttons
  const container = document.createElement('div');
  container.className = 'scroll-btns';

  const upBtn = document.createElement('button');
  upBtn.className = 'scroll-btn';
  upBtn.textContent = '▲';

  const downBtn = document.createElement('button');
  downBtn.className = 'scroll-btn';
  downBtn.textContent = '▼';

  upBtn.addEventListener('click', showHistory);
  downBtn.addEventListener('click', hideHistory);

  container.appendChild(upBtn);
  container.appendChild(downBtn);
  document.body.appendChild(container);
}

function showHistory() {
  if (!historyOverlay || !historyContent) return;
  historyContent.textContent = stripAnsi(scrollbackBuf);
  // Scroll to show content just above the live viewport
  historyContent.scrollTop = Math.max(0, historyContent.scrollHeight - historyContent.clientHeight - 300);
  historyOverlay.classList.add('active');
}

function hideHistory() {
  if (historyOverlay) historyOverlay.classList.remove('active');
}

function stripAnsi(text) {
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\].*?(\x07|\x1b\\)/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

// ---- Command Panel ----
function renderCommands(commands) {
  cmdButtons.innerHTML = '';
  const groups = { terminal: [], builtin: [], project: [] };
  commands.forEach((cmd) => {
    const kind = (groups[cmd.kind] && cmd.kind) || 'builtin';
    groups[kind].push(cmd);
  });

  ['terminal', 'builtin', 'project'].forEach((kind, ki) => {
    if (!groups[kind].length) return;
    if (ki > 0 && cmdButtons.children.length) {
      const sep = document.createElement('div');
      sep.className = 'cmd-separator';
      cmdButtons.appendChild(sep);
    }
    groups[kind].forEach((cmd) => {
      const btn = document.createElement('button');
      btn.className = 'cmd-btn kind-' + kind;
      btn.textContent = cmd.label;
      btn.addEventListener('click', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(cmd.text);
          term.write(cmd.text);
        }
      });
      if (cmd.text.endsWith('\n') && cmd.text.length > 1) {
        btn.classList.add('send');
      }
      cmdButtons.appendChild(btn);
    });
  });
}

function toggleCmdPanel() {
  cmdPanel.classList.toggle('collapsed');
  setTimeout(() => term && fitAddon && fitAddon.fit(), 300);
}

// ---- Drawer ----
function toggleDrawer() {
  drawer.classList.toggle('open');
  drawerOverlay.classList.toggle('active');
  if (drawer.classList.contains('open')) refreshProjects();
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

// ---- Utils ----
function esc(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
