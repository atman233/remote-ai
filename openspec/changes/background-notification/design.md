# Design: Background Notification

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Phase 1: Foreground Service                            │
│                                                         │
│  app.js ──start()──▶ ForegroundServicePlugin            │
│                        │                                │
│                        ▼                                │
│                     ForegroundService.java              │
│                     (Android Native)                    │
│                        │                                │
│                        ▼                                │
│              通知栏: "Claude 已连接"                     │
│              进程不被系统杀掉                            │
│              WebSocket 保持连接                          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Phase 2: Stop Hook + Notification                     │
│                                                         │
│  Claude Stop ──▶ hook 脚本 ──▶ POST /api/notify         │
│                                   │                    │
│  daemon ──▶ WS message ──▶ app.js ──▶ LocalNotif       │
│              {"type":"notify",                           │
│               "event":"stop"}   ──▶ 通知栏              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Phase 1 Details

### ForegroundServicePlugin (Capacitor Plugin)

```java
// 两个方法:
start(options: { title: string }) → void
stop() → void
```

- `start()` 创建 Android notification channel，启动 ForegroundService
- `stop()` 停止服务并移除通知

### ForegroundService (Android Service)

- `foregroundServiceType: "dataSync"` (Android 14+)
- 通知显示 "Claude 已连接 - 点击返回" + 项目名称
- 点击通知回到 MainActivity

### JS 侧集成

```javascript
// ws.onopen 时:
ForegroundService.start({ title: `Claude: ${sessionId}` });

// ws.onclose 时:
ForegroundService.stop();
```

## Phase 2 Details

### Stop Hook 脚本

位置: `daemon/hooks/stop-notify.sh`

```bash
#!/bin/bash
# 通知 daemon Claude 完成了一轮回复
curl -s -X POST "http://127.0.0.1:9528/api/notify" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"project":"'$PROJECT_NAME'","event":"stop"}'
```

### Daemon 新端点

```
POST /api/notify
Body: { "project": "xxx", "event": "stop" }
```

收到请求后，向对应项目的所有 WebSocket 客户端广播 `{"type":"notify","event":"stop"}`。

如果当前没有连接的 WebSocket 客户端（手机不在线），静默忽略。

### 项目级 Stop 开关

在项目卡片 UI 上加一个铃铛图标按钮，状态切换逻辑：

- **开启**: 写入 `.claude/settings.json` 的 Stop hook（项目级），调用 Claude hooks reload
- **关闭**: 移除 hook 配置，同样 reload

开关状态持久化到 `localStorage` / `Preferences`，作为项目的附加属性。

### 通知显示

手机收到 `{"type":"notify","event":"stop"}` 后：

```javascript
LocalNotifications.schedule({
  notifications: [{
    id: Date.now(),
    title: 'Claude 完成回复',
    body: `项目: ${activeProject}`,
    channelId: 'claude-notifications',
    autoCancel: true,
    extra: { project: activeProject }
  }]
});
```

点击通知 → app 回到前台 → WebSocket 恢复 → 可见终端输出。

## Files Changed

### Phase 1
| File | Action | Description |
|------|--------|-------------|
| `mobile/android/.../ForegroundService.java` | NEW | Android 前台服务 |
| `mobile/android/.../ForegroundServicePlugin.java` | NEW | Capacitor 插件 |
| `mobile/android/.../MainActivity.java` | EDIT | 注册插件 |
| `mobile/android/.../AndroidManifest.xml` | EDIT | 权限 + service |
| `mobile/src/app.js` | EDIT | 调 ForegroundService |

### Phase 2
| File | Action | Description |
|------|--------|-------------|
| `daemon/hooks/stop-notify.sh` | NEW | Stop hook 脚本 |
| `daemon/index.js` | EDIT | 新增 POST /api/notify |
| `mobile/src/app.js` | EDIT | 项目开关 UI + 通知处理 |
| `mobile/package.json` | EDIT | 加 @capacitor/local-notifications |

## Risks

- 部分国产厂商 ROM 即使有前台服务仍然可能杀进程（需后续 FCM 兜底）
- Stop hook 每轮都触发，可能产生大量通知（用户可接受）
- 前台服务通知无法隐藏（Android 强制要求）
