## ADDED Requirements

### Requirement: Notification endpoint receives hook callbacks

Daemon SHALL 提供 `POST /api/notify` HTTP endpoint，接收来自 Claude Code hooks 的通知回调。

入参 JSON body: `{ session: string, event: string, title: string, message?: string }`

#### Scenario: Stop event notification
- **WHEN** Claude Code Stop hook 触发并 POST 到 `/api/notify`
- **WITH** body `{ "session": "my-project", "event": "stop", "title": "回复完成" }`
- **THEN** daemon 返回 HTTP 200 `{ "ok": true }`
- **AND** 将通知入队到 session 的 pending queue
- **AND** 通过 WebSocket 广播 `{"type":"notify","event":"stop","title":"回复完成","id":"<uuid>","time":"<ISO>"}` 到对应 session 的所有已连接客户端

#### Scenario: Permission request notification
- **WHEN** Claude Code PermissionRequest hook 触发并 POST 到 `/api/notify`
- **WITH** body `{ "session": "my-project", "event": "permission", "title": "请求权限" }`
- **THEN** daemon 返回 HTTP 200
- **AND** 入队并广播通知

#### Scenario: Notification event with permission_prompt matcher
- **WHEN** Claude Code Notification hook (matcher: permission_prompt) 触发
- **WITH** body `{ "session": "my-project", "event": "needs_input", "title": "需要操作" }`
- **THEN** daemon 返回 HTTP 200
- **AND** 入队并广播通知

### Requirement: Pending notification queue

Daemon SHALL 为每个 session 维护一个内存通知队列，用于 App 断线后恢复遗漏通知。

#### Scenario: Queue stores notifications
- **WHEN** daemon 收到一个 notify POST
- **THEN** 通知被追加到 `pendingNotifications[sessionName]` 队列末尾

#### Scenario: Queue has max capacity
- **WHEN** 队列长度达到 20 条
- **AND** 新通知到达
- **THEN** 最旧的通知被驱逐

#### Scenario: Queue TTL expiration
- **WHEN** 通知入队超过 30 分钟
- **THEN** 定时清理器（每 10 分钟运行）移除该通知

### Requirement: Pending notifications retrieval endpoint

Daemon SHALL 提供 `GET /api/sessions/:id/notifications` endpoint，返回待处理通知。

#### Scenario: Retrieve pending notifications
- **WHEN** 客户端请求 `GET /api/sessions/:id/notifications`
- **THEN** 返回 `{ notifications: [{id, event, title, message, time}, ...] }`，HTTP 200

#### Scenario: Empty queue
- **WHEN** session 无待处理通知
- **THEN** 返回 `{ notifications: [] }`

#### Scenario: Session not found in queue
- **WHEN** 请求的 session 无记录（可能尚未触发任何通知）
- **THEN** 返回 `{ notifications: [] }`

### Requirement: WebSocket auto-flush on connect

WebSocket 客户端连接时，daemon SHALL 自动发送该 session 的所有待处理通知。

#### Scenario: Client reconnects and receives pending
- **WHEN** WebSocket 客户端连接到 `/api/sessions/:id/pty`
- **AND** pending queue 中有 3 条通知
- **THEN** daemon 在连接建立后顺序发送 3 条 `{"type":"notify",...}` 消息
- **AND** 发送完毕后清空该 session 队列（假设仅一个客户端）

#### Scenario: Client acknowledges notifications
- **WHEN** daemon 收到 `{"type":"ack_notifications","ids":["n1","n2"]}` 消息
- **THEN** daemon 从队列中移除 id 为 "n1" 和 "n2" 的通知

### Requirement: Mobile receives and displays notifications

移动端 SHALL 解析 WebSocket 中的 `{"type":"notify",...}` 消息并展示通知。

#### Scenario: App in background shows system notification
- **WHEN** 移动端收到 notify 消息且 app 处于后台
- **THEN** 调用 `LocalNotifications.schedule()` 弹出 Android 系统通知
- **AND** 通知标题为 notify 消息中的 title 字段
- **AND** 通知内容为 notify 消息中的 message 字段（可选）
- **AND** 点击通知打开 CC Mobile app

#### Scenario: App in foreground shows in-app toast
- **WHEN** 移动端收到 notify 消息且 app 处于前台（终端可见）
- **THEN** 在屏幕底部显示轻量 toast，文案为 title
- **AND** toast 在 2 秒后自动消失

#### Scenario: Reconnect recovery displays missed notifications
- **WHEN** WebSocket 连接建立后收到 pending 通知列表
- **THEN** 逐条调用 `LocalNotifications.schedule()` 展示遗漏通知

### Requirement: Android foreground service keeps connection alive

移动端 SHALL 在连接项目会话期间启动 Android 前台服务以保持 WebSocket 存活。

#### Scenario: Start foreground service on session connect
- **WHEN** 用户连接到一个项目（WebSocket 建立成功）
- **THEN** 启动 `NotificationForegroundService`
- **AND** 状态栏显示持久通知 "CC Mobile 已连接 · <project-name>"

#### Scenario: Stop foreground service on session disconnect
- **WHEN** 用户断开连接或返回主屏幕
- **THEN** 停止 `NotificationForegroundService`
- **AND** 状态栏持久通知消失

#### Scenario: Foreground service auto-restarts if killed
- **WHEN** Android 异常终止前台服务
- **THEN** 服务自动重启（START_STICKY）
- **AND** 持久通知重新显示
