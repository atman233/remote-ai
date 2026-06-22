## Why

用户在移动端使用 CC Mobile 时，发送消息给 Claude Code 后往往会切换到其他应用或锁定屏幕。当前没有任何通知机制告知用户 Claude 已完成回复或需要用户操作，用户只能不断回来查看终端，体验很差。

## What Changes

利用 Claude Code 原生的 29 个生命周期 Hooks（`Stop`、`Notification`、`PermissionRequest`），在服务端精确捕获 "AI 执行完毕" 和 "需要用户操作" 两类关键事件，通过守护进程中转至移动端的 WebSocket 连接，在移动端触发 Android 原生通知。

- **守护进程新增通知端点** — `POST /api/notify` 接收 hook 回调，`GET /api/sessions/:id/notifications` 返回待处理通知队列
- **Claude Code hooks 配置** — 在项目 `.claude/settings.json` 中配置 Stop/Notification/PermissionRequest hooks，触发时 curl 通知守护进程
- **Android 前台服务** — 连接会话期间保持 WebSocket 存活，状态栏显示 "CC Mobile · 已连接" 持久通知
- **移动端通知展示** — 应用在后台时通过 `@capacitor/local-notifications` 弹出 Android 系统通知；在前台时显示轻量 in-app toast
- **断线恢复** — 守护进程缓存每个会话的最近通知（最多 20 条，TTL 30 分钟），App 重连时自动推送遗漏通知

## Capabilities

### New Capabilities

- `notification-system`: 端到端通知系统，从 Claude Code hooks 到 Android 系统通知的完整链路

### Modified Capabilities

- `architecture`: 守护进程新增通知端点与内存队列

## Non-goals

- FCM 推送（Google Firebase Cloud Messaging）集成
- 通知的远程回复/交互（与 Claude 对话）
- 通知偏好设置 UI（通知开关、勿扰模式等）
- 多设备通知同步

## Impact

- `daemon/index.js` — 新增 `POST /api/notify` 和 `GET /api/sessions/:id/notifications` 端点，通知队列，WebSocket 协议扩展
- `mobile/package.json` — 新增 `@capacitor/local-notifications` 依赖
- `mobile/src/app.js` — 通知处理逻辑、前台服务启动/停止、断线恢复
- `mobile/android/.../AndroidManifest.xml` — 前台服务声明、通知权限
- `mobile/android/.../NotificationForegroundService.kt` — 新增前台服务实现
- `mobile/app.css` — 新增 in-app toast 样式
- `openspec/specs/notification-system/spec.md` — 新增能力规格
- 项目 `.claude/settings.json` — hook 配置模板
