## Context

CC Mobile 是一个 Capacitor Android 应用，通过 WebSocket → 守护进程 → tmux → Claude Code 实现远程终端交互。用户发消息后切换应用或锁屏，无法得知 Claude 何时完成回复或需要交互。

**核心发现：** Claude Code 内置 29 个生命周期 hook 事件。其中 `Stop`（Claude 完成回复时触发）、`Notification`（权限对话框/空闲警告时触发）、`PermissionRequest`（工具审批时触发）精确覆盖用户需要的通知场景。无需任何终端输出模式匹配。

## Goals / Non-Goals

**Goals:**
- Claude 完成回复时，Android 系统通知提醒用户
- Claude 需要用户操作（权限确认、输入等）时，Android 系统通知提醒用户
- 连接会话期间即使 app 退到后台，也能保持 WebSocket 存活接收通知
- App 被 Android 杀掉后重新打开时，能恢复遗漏的通知

**Non-Goals:**
- FCM 推送（Google 基础设施依赖重，v2 考虑）
- 远程回复/交互通知
- 通知偏好设置
- 多设备同步

## Decisions

### 1. 事件检测：Claude Code 原生 Hooks（非终端输出监控）

**选择:** 配置 Claude Code 的 `Stop`、`Notification`、`PermissionRequest` hooks，触发时 curl 调用守护进程的 `/api/notify` 端点。

**理由:** Claude Code hooks 是**语义级别**的事件——`Stop` 精确代表 "Claude 完成当前轮次"，不是基于输出停顿的猜测。相比监控 PTY 输出（脆弱、依赖模式匹配），hooks 是官方支持的可靠机制。

**替代方案:**
- 终端输出监控 → 不可靠，依赖未文档化的提示符/ANSI 模式
- tmux alert-silence → 只能检测静默，无法区分 "思考中" 和 "已完成"

### 2. 通知传递链路：Hook → 守护进程 → WebSocket → 移动端

```
Claude Code hook 触发
  → curl POST http://localhost:9528/api/notify
  → 守护进程接收，识别来源 session
  → 广播到对应 session 的 WebSocket 客户端
  → 移动端收到 {"type":"notify","event":"stop"}
  → 根据 app 前后台状态展示通知
```

**选择:** 复用现有 WebSocket 连接传递通知事件。hook 触发后通过本地 HTTP 调用守护进程（同一台机器，localhost），守护进程识别 session 后通过 WebSocket 转发。

**理由:** 无需新增通信通道。localhost HTTP 调用延迟极低（< 1ms）。守护进程与 Claude Code 在同一机器，curl 零网络开销。

**替代方案:**
- Hook 直接通过第三方服务（ntfy、Bark 等）推送 → 需额外 app，用户不接受
- 守护进程监听文件变更 → 轮询开销，延迟高

### 3. 后台保活：Android 前台服务

**选择:** 连接项目时启动 Android 前台服务，显示持久通知 "CC Mobile · <project-name> 已连接"。断开或返回主屏幕时停止服务。

**理由:** 前台服务是 Android 官方推荐的保活机制。状态栏持久通知对用户透明（显示连接状态）。电量开销极小（空闲 WebSocket 仅心跳包）。这是 ntfy、Telegram、微信等所有即时通讯应用的通用做法。

**注意事项:**
- Android 8+ 前台服务必须在 5 秒内调用 `startForeground()` 并显示通知
- 持久通知的 notification channel 可被用户静音（不影响系统通知的 channel）

**替代方案:**
- 不做保活，仅依赖 pending queue → 通知全部延迟到下次打开 app
- WorkManager 定时唤醒 → 15 分钟间隔，延迟太久

### 4. App 被杀后的恢复：守护进程通知队列 + 重连补偿

**选择:** 守护进程为每个 session 维护内存通知队列（最多 20 条，TTL 30 分钟）。当移动端 WebSocket 断开再重连时，守护进程自动将队列中的通知发送给客户端。

```
守护进程:
  session "my-project"
    └─ pending_notifications: [
         {event:"stop", title:"回复完成", time:"14:32:05", id:"n1"},
         {event:"needs_input", title:"需要确认", time:"14:35:22", id:"n2"},
       ]

客户端重连:
  WebSocket connected
  → 守护进程自动发送 pending notifications
  → 客户端收到后逐条展示 LocalNotifications
```

**理由:** 无法完全阻止 Android 杀掉 app（尤其是国产 ROM）。当杀 app 不可避免时，至少保证用户重新打开 app 时能收到遗漏通知。30 分钟 TTL 覆盖大部分场景。

**替代方案:**
- FCM 推送 → v1 不引入 Google 依赖
- 不做补偿 → 遗漏通知永远丢失，用户体验差
- WorkManager 定时轮询 → 间隔太短耗电，间隔太长延迟高

### 5. 前台/后台区分展示

| App 状态 | 通知展示方式 |
|----------|------------|
| 前台（终端可见） | In-app toast（底部浮动，2s 自动消失） |
| 后台（app 不可见） | Android 系统通知（声音/震动/通知栏） |
| App 已杀（重连恢复） | Android 系统通知（逐条弹出，不合并） |

**选择:** 前台仅用轻量 toast（用户正看着终端，不需要打断），后台用系统通知。恢复时逐条展示而非合并，防止用户错过多次重要通知。

**理由:** 前台弹系统通知会遮挡终端且多余（用户正在看）。后台必须用系统通知才能打断用户。

### 6. Capacitor Local Notifications 插件

**选择:** 使用官方 `@capacitor/local-notifications@^8.0.0` 插件。

**理由:** 官方维护，Capacitor v8 兼容，与项目现有 `@capacitor/preferences`、`@capacitor/keyboard` 等插件风格一致。Android 13+ 权限处理（`POST_NOTIFICATIONS`）由插件封装。

## Architecture Diagram

```
┌─ 服务器（WSL/远程主机）──────────────────────┐
│                                              │
│  Claude Code (tmux session "my-project")     │
│  ┌─────────────────────────────────────────┐ │
│  │ hooks:                                  │ │
│  │  Stop → curl localhost:9528/api/notify   │ │
│  │  Notification → curl localhost:9528/... │ │
│  │  PermissionRequest → curl localhost:... │ │
│  └──────────────┬──────────────────────────┘ │
│                 │ HTTP POST (localhost)       │
│  ┌──────────────▼──────────────────────────┐ │
│  │  Daemon (Node.js :9528)                 │ │
│  │                                          │ │
│  │  POST /api/notify                       │ │
│  │    - 识别 session（来自项目 hook 配置）   │ │
│  │    - 入队 pending_notifications[session] │ │
│  │    - broadcast 到 WS 客户端              │ │
│  │                                          │ │
│  │  GET /api/sessions/:id/notifications    │ │
│  │    - 返回 pending_notifications[session] │ │
│  │                                          │ │
│  │  WS /api/sessions/:id/pty               │ │
│  │    - on connect: flush pending queue     │ │
│  │    - on message: PTY 数据或 JSON 控制    │ │
│  └──────────────┬──────────────────────────┘ │
└──────────────────┼──────────────────────────┘
                   │ WSS (WebSocket)
┌──────────────────┼──────────────────────────┐
│  Android 设备     │                          │
│  ┌───────────────▼─────────────────────────┐│
│  │  CC Mobile App                          ││
│  │                                         ││
│  │  WebSocket 消息处理:                    ││
│  │    {"type":"notify","event":"stop",...}  ││
│  │      ↓                                  ││
│  │    检测 App 是否在前台                   ││
│  │      ↓                                  ││
│  │    ┌─ 前台 → in-app toast (2s 消失)     ││
│  │    └─ 后台 → LocalNotifications.        ││
│  │             schedule()                  ││
│  │                                         ││
│  │  ForegroundService                      ││
│  │    - 连接会话时 startForeground()        ││
│  │    - 持久通知: "CC Mobile · my-project" ││
│  │    - 断开时 stopForeground()            ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

## Risks / Trade-offs

- [前台服务被用户手动停止] → 用户可在系统设置或通知栏关闭前台服务通知。关闭后 Android 可能杀掉 WebSocket。此时退化为纯重连恢复模式。
- [Claude Code hooks 未配置] → 如果项目没有 `.claude/settings.json` hook 配置，通知不会触发。需要在项目创建或 daemon 重启时自动注入 hook 配置。
- [AskUserQuestion 不触发 hook] → Claude Code 已知限制（issue #59908），`AskUserQuestion` 工具调用不触发 `Notification` hook。这个问题无法在 v1 解决，影响范围较小（Claude 较少使用 AskUserQuestion）。
- [通知队列内存泄漏] → 如果 session 永不重连，队列会一直占用内存。30 分钟 TTL + 定时清理（每 10 分钟扫描过期条目）。
- [多 WebSocket 客户端] → 同一 session 可能有多个 WS 连接。通知应广播给所有已连接客户端，但 pending queue 只需确认一次即可清理。

## Hook Configuration

每个需要通知的项目在其 `.claude/settings.json` 中配置：

```json
{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "curl -s -X POST http://localhost:9528/api/notify -H 'Content-Type: application/json' -d '{\"session\":\"$(basename $(pwd))\",\"event\":\"stop\",\"title\":\"回复完成\"}'",
        "timeout": 5000
      }]
    }],
    "Notification": [{
      "matcher": "permission_prompt|elicitation_dialog",
      "hooks": [{
        "type": "command",
        "command": "curl -s -X POST http://localhost:9528/api/notify -H 'Content-Type: application/json' -d '{\"session\":\"$(basename $(pwd))\",\"event\":\"needs_input\",\"title\":\"需要操作\"}'",
        "timeout": 5000
      }]
    }],
    "PermissionRequest": [{
      "hooks": [{
        "type": "command",
        "command": "curl -s -X POST http://localhost:9528/api/notify -H 'Content-Type: application/json' -d '{\"session\":\"$(basename $(pwd))\",\"event\":\"permission\",\"title\":\"请求权限\"}'",
        "timeout": 5000
      }]
    }]
  }
}
```

项目在守护进程创建时通过 project-manager 自动将 hook 配置写入项目的 `.claude/settings.local.json`（不污染 git 仓库）。
