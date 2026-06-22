## Why

移动端历史浮层仅展示 WebSocket 连接后的输出，看不到连接前的 tmux pane 历史。且当前双按钮全屏 overlay 交互偏重，用户无法在终端内直接上翻查看。需要更轻快的历史查看方式。

## What Changes

- **新增 daemon history API** — `GET /api/sessions/:id/history?lines=1000`，内部执行 `tmux capture-pane -p -S -<N> -t <session>` 返回纯文本
- **Bottom sheet 替换全屏 overlay** — 移除 `#history-overlay` 及 ▲/▼ 浮动按钮，改为单按钮触发的底部面板
- **单按钮切换** — 右下角一个按钮，点击打开 bottom sheet（历史模式），点击关闭按钮或遮罩退出
- **自动拉取历史** — 打开 bottom sheet 时先展示 `scrollbackBuf`（零延迟），后台调 API 拉取完整 1000 行后替换

## Capabilities

### New Capabilities

- `daemon-history-api`: daemon 新增 HTTP endpoint，返回指定 tmux session 的 pane 历史纯文本

### Modified Capabilities

- `mobile-terminal-scroll`: 移除双按钮全屏 overlay，改为单按钮 bottom sheet 历史模式，自动从 daemon API 拉取完整历史

## Non-goals

- 搜索/过滤历史内容
- 持久化历史日志（pipe-pane）
- 手势交互（滑动进入历史模式等）
- 历史内容的 ANSI 渲染保留

## Impact

- `daemon/index.js` — 新增 `GET /api/sessions/:id/history` endpoint
- `mobile/index.html` — 移除 `#history-overlay` 的 JS 创建逻辑，新增 bottom sheet HTML
- `mobile/src/app.js` — 替换双按钮 + overlay 为单按钮 + bottom sheet，新增 API 调用与 content 更新逻辑
- `mobile/app.css` — 替换 overlay 样式为 bottom sheet 样式，替换 scroll-btns 样式为单按钮样式
- `openspec/specs/mobile-terminal-scroll/spec.md` — 需求变更
