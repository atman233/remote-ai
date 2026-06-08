# Tasks: Mobile Remote Access

## Phase 1 — 守护进程 (笔记本 WSL)

### Task 1.1: 初始化 Node.js 项目
- `mkdir daemon && cd daemon && npm init`
- 安装依赖: `express`, `express-ws`, `node-pty`, `chalk`
- 配置 TypeScript (可选，看偏好)

### Task 1.2: tmux 会话管理器
- 封装 `tmux list-sessions` 解析
- 提取 session name、CWD、窗口数
- 检测 session 中是否有 Claude Code 进程 (`tmux capture-pane -t X -p | head`)
- 5 秒轮询刷新会话列表
- 输出数据结构: `{ sessions: [{ id, cwd, hasClaudeCode, windows }] }`

### Task 1.3: PTY 引擎
- `node-pty` spawn `tmux attach -t <session>`
- stdout → callback 转发
- stdin write 封装
- 会话断开时 PTY cleanup

### Task 1.4: HTTP API
- `GET /api/sessions` — 返回当前 tmux 会话列表
- `GET /api/sessions/:id/commands` — 读取 `<cwd>/.claude/commands.json`，不存在时返回默认指令集
- `GET /health` — 健康检查

### Task 1.5: WebSocket 端点
- `WS /api/sessions/:id/pty` — xterm.js 兼容的原始字节流
- 连接时 spawn PTY attach 到对应 tmux session
- stdout → ws send (raw bytes)
- ws message → pty write
- 连接关闭时 kill PTY (但不 kill tmux session)

### Task 1.6: 守护进程 systemd 配置
- 创建 `~/.config/systemd/user/cc-daemon.service`
- 随 WSL 启动自动运行
- 日志输出到 journald

---

## Phase 2 — SSH 隧道

### Task 2.1: SSH 反向隧道配置
- 笔记本生成 SSH Key (如果没有)
- 将公钥添加到服务器 `~/.ssh/authorized_keys`
- 测试手动隧道: `ssh -R :9528:localhost:9528 user@server`

### Task 2.2: autossh 持久化 + systemd
- 安装 autossh
- 创建 systemd user service: `cc-tunnel.service`
- 配置自动重连参数
- 随 WSL 启动自动运行

---

## Phase 3 — 公网服务器

### Task 3.1: Caddy 安装与配置
- 安装 Caddy 2.x
- 配置域名 + 自动 HTTPS (Let's Encrypt)
- 配置 Basic Auth
- 配置反向代理到 `localhost:9528`
- 确保 WebSocket 升级正常工作

### Task 3.2: 防火墙
- 仅开放 22、80、443
- 9528 端口仅监听 localhost（通过 SSH 隧道接入）

---

## Phase 4 — 手机 App

### Task 4.1: Capacitor 项目初始化
- `npm create @capacitor/app`
- 安装 xterm 相关依赖: `xterm`, `xterm-addon-fit`, `xterm-addon-web-links`
- 配置 Android platform
- 配置签名（debug 阶段用 debug keystore）
- 验证 APK 可构建

### Task 4.2: UI 布局
- **主区域**: xterm.js Terminal 实例，全屏显示
- **底栏**: 指令面板，横排按钮，可左右滑动（横向 ScrollView）
- **左侧**: 抽屉式会话列表，滑出/收起
- **顶部**: 当前会话名 + 连接状态指示器
- 响应式：键盘弹出时终端区域自动缩小

### Task 4.3: xterm.js 集成
- 创建 Terminal 实例 + fit addon
- 连接到守护进程 WS: `wss://relay.example.com/api/sessions/:id/pty`
- WebSocket 断开时显示「重连中...」遮罩 + 自动重连（指数退避）
- 配置字体大小适配移动端
- 移动端双击后放大交互优化（或者直接禁止缩放）

### Task 4.4: 会话列表
- 启动时 `GET /api/sessions` 获取会话列表
- 渲染会话卡片：名称、状态、CWD
- 点击切换 → 断开旧 WS → 建立新 WS
- 空状态提示「未检测到 tmux 会话」

### Task 4.5: 指令面板
- 加载会话后 `GET /api/sessions/:id/commands` 获取指令集
- 按 `order` 排序渲染按钮
- 按钮点击 → `terminal.write(text)` + `websocket.send(text)`
- 面板可收起/展开（拖拽或按钮切换）
- 长按按钮可编辑自定义指令（写入 local 配置，暂不同步回项目）

### Task 4.6: 认证
- App 设置页面输入: 服务器地址 + 用户名 + 密码
- 持久化存储（Capacitor Preferences 或 localStorage）
- 所有 HTTP/WS 请求带上 Basic Auth header
- Auth 失败时提示用户

### Task 4.7: 错误处理与状态管理
- 连接超时 → 显示超时提示 + 重试按钮
- SSH 隧道断开 → WS 断连 → UI 提示 + 自动重连
- 服务器不可达 → 显示网络错误
- 会话被删除 → 返回会话列表页面

---

## Phase 5 — 打磨

### Task 5.1: 指令模板系统（可选）
- 支持参数占位符: `{ "label": "commit", "text": "git commit -m \"$1\"", "params": ["message"] }`
- 按钮点击弹出输入框 → 填入参数 → 拼装完整指令 → 注入

### Task 5.2: 通知
- Capacitor Push Notifications 插件
- 守护进程检测 Claude Code 输出中有特定模式（如 "Done"、"Error"）时推送通知
- 长任务完成时提醒用户

### Task 5.3: 性能优化
- xterm.js WebGL renderer (移动端更高效)
- 大量输出时限制行数 (scrollback buffer)
- 节流 stdout 转发

---

## 依赖关系

```
Phase 1 (守护进程) ────┐
                       ├──▶ Phase 4 (手机 App)
Phase 2 (SSH 隧道) ────┤
                       │
Phase 3 (公网服务器) ──┘
                       │
                       └──▶ Phase 5 (打磨)
```

Phase 1-3 可部分并行，Phase 4 依赖 Phase 1 完成 API 后可开始。Phase 5 在所有基础设施完成后进行。
