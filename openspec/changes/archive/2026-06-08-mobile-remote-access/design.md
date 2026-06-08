# Design: Mobile Remote Access

## Architecture Overview

```
┌─── 笔记本 WSL ──────────────────────────────────────────────────────────┐
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  守护进程 (Node.js)                          Port: 9528          │   │
│   │                                                                  │   │
│   │  Routes:                                                         │   │
│   │    GET  /api/sessions                    → 列出 tmux 会话        │   │
│   │    GET  /api/sessions/:id/commands       → 读取项目命令配置       │   │
│   │    GET  /api/sessions/:id/pty            → WebSocket 升级        │   │
│   │                                                                  │   │
│   │  Session Manager                    PTY Engine                    │   │
│   │  ┌──────────────────┐               ┌──────────────────┐         │   │
│   │  │ tmux ls          │               │ node-pty         │         │   │
│   │  │ 解析 session 列表 │               │ tmux attach -t   │         │   │
│   │  │ 提取 CWD          │               │   <session>      │         │   │
│   │  │ 检测 CC 进程      │               │                  │         │   │
│   │  └──────────────────┘               │ stdout → WS →    │         │   │
│   │                                      │   xterm.js       │         │   │
│   │  Command Loader                     │ WS stdin → pty   │         │   │
│   │  ┌──────────────────┐               └──────────────────┘         │   │
│   │  │ 读取              │                                            │   │
│   │  │ .claude/         │                                            │   │
│   │  │   commands.json  │                                            │   │
│   │  └──────────────────┘                                            │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   autossh -M 0 -R :9528:localhost:9528 relay@<server> -N                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ SSH -R (持久反向隧道)
                                    ▼
┌─── 公网服务器 (Ubuntu) ──────────────────────────────────────────────────┐
│                                                                          │
│   Caddyfile:                                                             │
│     relay.example.com {                                                  │
│       basicauth {                                                        │
│         <user> <bcrypt-hash>                                             │
│       }                                                                  │
│       reverse_proxy /api/* localhost:9528                                │
│       reverse_proxy /ws/*  localhost:9528                                │
│     }                                                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS + WSS
                                    ▼
┌─── 手机 App (Android APK) ───────────────────────────────────────────────┐
│                                                                          │
│   Capacitor App                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │  public/index.html                                                │   │
│   │                                                                  │   │
│   │  ┌────────────────────────────────────────────────────────────┐  │   │
│   │  │ 侧边栏 (会话列表)                                           │  │   │
│   │  │  ● projectA  [CC运行中]                                     │  │   │
│   │  │  ○ projectB  [空闲]                                         │  │   │
│   │  │  [+ 新建]                                                   │  │   │
│   │  └────────────────────────────────────────────────────────────┘  │   │
│   │                                                                  │   │
│   │  ┌────────────────────────────────────────────────────────────┐  │   │
│   │  │ xterm.js Terminal (WebSocket attach to /ws/:sessionId)      │  │   │
│   │  │                                                            │  │   │
│   │  │ $ claude                                                   │  │   │
│   │  │ > ▊                                                        │  │   │
│   │  └────────────────────────────────────────────────────────────┘  │   │
│   │                                                                  │   │
│   │  ┌────────────────────────────────────────────────────────────┐  │   │
│   │  │ 指令面板 (底部可收起)                                       │  │   │
│   │  │ [确认] [拒绝] [中断] [清屏] ─ [git st] [npm test] [dev]    │  │   │
│   │  └────────────────────────────────────────────────────────────┘  │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
用户点击 [npm test] 按钮
        │
        ▼
指令面板找到对应 command: "npm test\n"
        │
        ▼
通过自定义协议发送到 WebView 内的 JS bridge:
  window.claude.sendStdin("npm test\n")
        │
        ▼
JS 通过已建立的 WebSocket 发送:
  { type: "stdin", data: "npm test\n" }
        │
        ▼
守护进程 WS handler 收到消息 → pty.write("npm test\n")
        │
        ▼
tmux session 内的 shell 收到输入，执行 npm test
        │
        ▼
stdout/stderr 通过 pty → WS → xterm.js → 终端显示
```

## API Design

### `GET /api/sessions`

返回 tmux 会话列表和状态。

```json
{
  "sessions": [
    {
      "id": "projectA",
      "cwd": "/mnt/e/02-easyai-new",
      "hasClaudeCode": true,
      "windows": 1
    },
    {
      "id": "projectB",
      "cwd": "/mnt/e/blog",
      "hasClaudeCode": false,
      "windows": 1
    }
  ]
}
```

实现：解析 `tmux list-sessions -F '#{session_name}:#{pane_current_path}'` 输出，检查进程树中是否有 claude/claude-code 进程。

### `GET /api/sessions/:id/commands`

读取项目目录下的 `.claude/commands.json`。

```json
{
  "version": 1,
  "commands": [
    { "label": "启动 Claude", "text": "claude\n", "order": 0 },
    { "label": "确认",         "text": "y\n",         "order": 1 },
    { "label": "git diff",     "text": "git diff\n",  "order": 10 },
    { "label": "npm run dev",  "text": "npm run dev\n","order": 11 }
  ]
}
```

`order` 决定按钮排列，`text` 就是注入 PTY 的字节。空文件或不存在时返回默认指令集。

### `WS /api/sessions/:id/pty`

xterm.js 兼容的 WebSocket 端点。

```
客户端 → 服务端:  {"type": "stdin", "data": "hello\n"}
服务端 → 客户端:  {"type": "stdout", "data": "\x1b[32m$ \x1b[0m"}
```

实际上可以直接用 xterm.js 的 `AttachAddon`，它期望 WebSocket 就是原始字节流。但我们需要在纯字节流之上增加指令面板的 stdin 注入能力。两种做法：

- **A) 双通道** — 一个 WS 纯字节流给 xterm attach，另开一个 WS 或 HTTP endpoint 收指令面板指令
- **B) 单通道多路复用** — 同一个 WS，用 JSON 消息格式，xterm 那边包一层 adapter

建议用 **A**。xterm.js attach 到纯字节流的 WS（最大兼容性），指令面板的 stdin 通过 HTTP POST 到 `/api/sessions/:id/stdin` 用 `fetch` 发送。同一份 pty handle，两个写入入口，无需多路复用。

实际上再简单一点：指令面板按钮触发 `navigator.clipboard.writeText(command)` 然后调用 Capacitor 插件模拟粘贴 —— 不对，这弯路了。

最简做法：**指令面板直接往 xterm.js 的 Terminal 实例写数据**。

```js
// 指令面板按钮点击事件
function onCommandClick(text) {
  // xterm.js Terminal 实例
  terminal.write(text);  // 直接写入终端显示
  // 同时通过 WS 发送到 pty
  websocket.send(text);
}
```

这样终端立即显示用户操作，同时 pty 收到真实输入。双向一致。不需要额外的 HTTP endpoint，不需要多路复用。前端自己处理。

## `.claude/commands.json` 规格

存放位置：项目根目录下的 `.claude/commands.json`

默认指令集（文件不存在时）：

```json
{
  "version": 1,
  "commands": [
    { "label": "启动 Claude", "text": "claude\n" },
    { "label": "确认 y",     "text": "y\n" },
    { "label": "拒绝 n",     "text": "n\n" },
    { "label": "中断",       "text": "\x03" },
    { "label": "清屏",       "text": "\x0c" }
  ]
}
```

## 守护进程实现

技术栈：
- `express` — HTTP 路由
- `express-ws` 或 `ws` — WebSocket
- `node-pty` — 伪终端
- `basic-auth` — Basic Auth 中间件（或放在 Caddy 层，二选一）

核心流程：

```
启动守护进程
  │
  ├─ 扫描 tmux 会话 (初次 + 定期轮询 5s)
  │     └─ 解析 session_name → { id, cwd, hasClaudeCode }
  │
  └─ HTTP Server listen :9528

WebSocket 连接建立 (/api/sessions/:id/pty)
  │
  ├─ 验证 session 存在
  │
  ├─ node-pty.spawn('tmux', ['attach', '-t', sessionId])
  │
  ├─ pty.onData → ws.send(data)
  │
  └─ ws.onMessage → pty.write(data)
```

## 手机 App 实现

技术栈：
- `@capacitor/cli` — 项目脚手架和 APK 打包
- `xterm` + `xterm-addon-fit` + `xterm-addon-web-links` — 终端渲染
- Vanilla JS 或轻量框架 (Preact/Svelte) — UI 层

页面结构：
- `public/index.html` — 单页应用
- 左侧滑出：会话列表
- 主区域：xterm.js 终端
- 底栏：指令面板按钮组，可收起

Capacitor 插件使用：
- `@capacitor/splash-screen` — 启动屏
- `@capacitor/keyboard` — 键盘事件处理
- `@capacitor/status-bar` — 状态栏

## 安全模型

```
手机 App ── HTTPS ──▶ Caddy (公网) ── SSH Tunnel ──▶ 守护进程 (笔记本)

Auth:      Basic Auth   │             SSH Key Auth    │  ┌──────────┐
          (用户名+密码)   │           (~/.ssh/         │  │ 本地信任  │
                         │            authorized_keys) │  │ localhost │
                         │            已配置          │  └──────────┘
```

- Caddy 层的 Basic Auth 阻止未授权访问
- SSH 反向隧道仅转发 localhost:9528，服务器本地端口不暴露外网
- 守护进程仅监听 127.0.0.1，不直接暴露到 WSL 的 IP

## 故障恢复

| 场景 | 处理 |
|------|------|
| 笔记本休眠 | autossh 断开 → 唤醒后 autossh 自动重连 → tmux 会话保持 |
| 公网服务器重启 | autossh 检测断开 → 自动重连 |
| 手机 App 切后台 | WebSocket 断开 → 前台恢复时重新连接 → tmux 会话仍在 |
| tmux session 被删 | 守护进程定期轮询检测 → 从会话列表移除 → App 显示「会话已关闭」|
| Claude Code 异常退出 | tmux session 保留 shell → 用户在手机终端看到错误信息 → 可重新启动 |
