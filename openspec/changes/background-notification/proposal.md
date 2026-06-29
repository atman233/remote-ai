# Background Notification

## Summary

解决 CC Mobile app 切到后台后 WebSocket 断连导致的"任务完成但用户收不到消息"问题。

## Problem

Android 在 app 切入后台约 5 分钟后会杀掉 WebSocket 连接，此时即使 Claude 任务完成或需要用户确认，手机端也无法感知。

## Solution

分两阶段实现：

### Phase 1: Android 前台服务 (Foreground Service)
- 利用 Android 原生 Foreground Service 机制保活进程
- 连接 WebSocket 时启动前台服务，通知栏常驻 "Claude 已连接"
- 断开时停止前台服务
- 纯 Android 层改动，外部依赖最少

### Phase 2: Claude Stop Hook + 本地通知
- 每个项目可配置是否开启 Stop 通知
- 开启时自动写入项目级 `.claude/settings.json` Stop hook
- Claude 每轮回复完成时，hook 脚本通知 daemon
- daemon 通过 WebSocket 推送事件到手机
- 手机使用 `@capacitor/local-notifications` 弹出系统通知

## Scope

- 仅 Android 端
- 不影响现有 daemon 逻辑
- 不依赖外部推送服务（FCM 等）

## Why

用户期望在离开手机应用后，仍能及时获知 Claude 的任务状态变化。
