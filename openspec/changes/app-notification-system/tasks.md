## 1. Daemon Notification Infrastructure

- [ ] 1.1 新增 `POST /api/notify` 端点，接收 `{session, event, title, message?}` JSON body
- [ ] 1.2 新增 `GET /api/sessions/:id/notifications` 端点，返回对应 session 的待处理通知队列
- [ ] 1.3 实现 per-session 内存通知队列（Map<sessionName, Notification[]>），max 20 条，TTL 30 分钟
- [ ] 1.4 实现 TTL 清理定时器（每 10 分钟扫描过期条目）
- [ ] 1.5 扩展 WebSocket 协议：广播通知时发送 `{"type":"notify","event":"stop","title":"...","id":"...","time":"..."}` JSON
- [ ] 1.6 WebSocket 客户端连接时自动 flush 该 session 的 pending 队列
- [ ] 1.7 新增 `broadcastToSession(sessionName, message)` 辅助函数

## 2. Hook Configuration Auto-Injection

- [ ] 2.1 在 `project-manager.js` 中实现 `ensureHooksConfig(projectName, projectPath)` 函数
- [ ] 2.2 项目创建时（`POST /api/projects`）自动写入 `.claude/settings.local.json` hook 配置
- [ ] 2.3 守护进程启动时扫描所有已有项目，确保 hook 配置存在
- [ ] 2.4 Hook 配置模板：Stop + Notification(permission_prompt|elicitation_dialog) + PermissionRequest

## 3. Mobile: Capacitor Local Notifications Setup

- [ ] 3.1 `npm install @capacitor/local-notifications@^8.0.0`
- [ ] 3.2 在 `app.js` 中使用 Capacitor 检测原生平台后初始化 `LocalNotifications`
- [ ] 3.3 在 app 启动时调用 `LocalNotifications.requestPermissions()` 请求通知权限（Android 13+）
- [ ] 3.4 在 `capacitor.config.json` 中配置 `LocalNotifications` 插件选项（smallIcon, iconColor）

## 4. Mobile: Android Foreground Service

- [ ] 4.1 新建 `mobile/android/.../NotificationForegroundService.kt`，实现前台服务
- [ ] 4.2 创建前台服务通知 channel（"CC Mobile 连接"）
- [ ] 4.3 在 `AndroidManifest.xml` 中声明 foreground service 和 `FOREGROUND_SERVICE_DATA_SYNC` 权限
- [ ] 4.4 在 `MainActivity.kt` 中暴露 `startForegroundService(projectName)` 和 `stopForegroundService()` 方法
- [ ] 4.5 实现 `START_STICKY` 行为（服务被异常杀死后自动重启）

## 5. Mobile: Notification Handler

- [ ] 5.1 在 `app.js` 的 WebSocket `onmessage` 中解析 `{"type":"notify",...}` 消息
- [ ] 5.2 实现 `handleNotification(data)` 函数，区分前台/后台行为
- [ ] 5.3 前台：显示 in-app toast（底部浮动，2s 自动消失）
- [ ] 5.4 后台：调用 `LocalNotifications.schedule()` 弹出系统通知
- [ ] 5.5 系统通知点击行为：打开 CC Mobile app 并导航到对应会话

## 6. Mobile: Reconnect Recovery

- [ ] 6.1 WebSocket `onopen` 时发送 `{"type":"get_pending_notifications"}` 请求
- [ ] 6.2 接收守守护进程返回的 pending 通知列表
- [ ] 6.3 逐条调用 `LocalNotifications.schedule()` 展示遗漏通知
- [ ] 6.4 展示完毕后发送 `{"type":"ack_notifications","ids":[...]}` 确认清除

## 7. Mobile: UI

- [ ] 7.1 在 `app.css` 中新增 `.inapp-toast` 样式（底部居中，半透明黑底白字，淡入淡出动画）
- [ ] 7.2 在 `index.html` 或 JS 中创建 toast 容器元素
- [ ] 7.3 实现 `showToast(message, duration=2000)` 函数

## 8. Integration & Spec

- [ ] 8.1 连接项目时启动前台服务，断开/返回主屏时停止
- [ ] 8.2 更新 `openspec/specs/architecture/spec.md` — 守护进程新增通知端点
- [ ] 8.3 新建 `openspec/specs/notification-system/spec.md` — 端到端通知系统规格
- [ ] 8.4 `npx cap sync` 确保原生插件变更同步到 Android 项目
- [ ] 8.5 手动测试：发送消息 → 退到后台 → 等待 Claude 完成 → 验证通知弹出
- [ ] 8.6 手动测试：app 被杀后重开 → 验证遗漏通知恢复
