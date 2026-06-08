# Mobile Remote Access for Claude Code

## Summary

构建一套远程访问方案，让用户可以通过 Android 手机 App 操作运行在笔记本电脑 WSL 中的 Claude Code。公网服务器仅作中继转发，不运行任何 AI/代码逻辑。

## Motivation

当前使用 Claude Code 必须坐在电脑前，但很多场景下用户需要移动端操作：
- 小问题需要快速处理，不想开电脑
- 电脑在执行长任务时，人离开座位但仍想监控进度
- 临时灵感来了，想通过手机给 Claude Code 下指令

## Approach

**终端流式传输 + 指令面板** — 笔记本上运行守护进程管理 tmux/PTY 会话，通过 SSH 反向隧道暴露到公网服务器，手机 App（Capacitor + WebView）通过 WebSocket 连接终端流，上层叠加快捷指令面板解决手机终端输入痛点。

## Key Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| 手机 App 形态 | Capacitor + WebView (APK) | 纯 PWA 不够，需要后台/通知能力；WebView 壳包 xterm.js 前端开发最快 |
| 终端直连协议 | WebSocket + xterm.js | 行业标准终端流方案，成熟稳定 |
| 指令注入方式 | 直接往 PTY 写字节 | 最简单，和键盘输入行为一致 |
| 会话管理 | tmux session 管理 | 断开重连不丢状态，天然支持多会话 |
| 服务端 | Caddy + Basic Auth | 自动 HTTPS，配置极简 |
| 守护进程语言 | Node.js (node-pty) | PTY 支持最好，生态成熟 |
| 认证 | Basic Auth | 单人使用，配置最简单 |

## Components

1. **守护进程** (笔记本 WSL，Node.js) — tmux 会话管理 + PTY 引擎 + HTTP/WS API
2. **SSH 反向隧道** (笔记本 → 公网服务器) — autossh 维持持久连接
3. **Caddy 反代** (公网服务器) — HTTPS + Basic Auth + WSS 代理
4. **手机 App** (Capacitor + WebView) — xterm.js 终端 + 指令面板 + 会话列表

## Scope

- ✅ 手机端连接桌面 Claude Code 进行交互
- ✅ 多 tmux 会话切换（多项目并行）
- ✅ 快捷指令面板（从项目 `.claude/commands.json` 读取）
- ✅ 断开重连，会话保持
- ✅ 基础安全（HTTPS + Basic Auth）
- ❌ 文件浏览/编辑（超出范围，暂不实现）
- ❌ 多用户支持（仅单人使用）
- ❌ CI/CD 集成（后续考虑）
