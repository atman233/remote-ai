## Context

当前移动端历史查看使用全屏 `#history-overlay` + 双浮动按钮（▲ 打开/▼ 关闭）。overlay 内容为 `scrollbackBuf`——WebSocket 连接以来的 PTY 输出内存缓冲。交互偏重（全屏切换），内容有限（无连接前历史）。

`tmux-history-viewer` spec 要求 tmux history-limit ≥ 5000，意味着 server 端已有充足历史可供查询。

## Goals / Non-Goals

**Goals:**
- 移动端能查看最近 ~1000 行 tmux pane 完整历史（含连接前内容）
- Bottom sheet 交互，比全屏 overlay 更轻快
- 单按钮触发，退出有明确按钮
- 打开即自动拉取历史，无需手动操作

**Non-Goals:**
- 搜索/过滤
- 持久化日志
- 手势交互
- ANSI 渲染保留

## Decisions

### 1. Bottom sheet 替代全屏 overlay

**选择:** 从底部滑上的半屏面板（~60vh），覆盖在终端上方，半透明遮罩

**理由:** 移动端 bottom sheet 是标准的「临时查看」模式，用户的视野仍可看到终端状态，不会感觉完全离开终端。相比全屏 overlay 更轻量。

**替代方案:** 保持全屏 overlay 但优化样式 → 不如 bottom sheet 符合移动端交互习惯

### 2. 单按钮替代双按钮

**选择:** 右下角一个 📜 按钮。点击打开 bottom sheet；面板内用 ✕ 按钮或点击遮罩关闭。

**理由:** 双按钮（▲ 打开/▼ 关闭）认知负担大。单按钮 toggle 更直观。

### 3. API: GET /api/sessions/:id/history?lines=N

**选择:** Daemon 新增 endpoint，接收 `lines` query param（默认 1000），内部执行 `tmux capture-pane -p -S -<N> -t <session>`，返回 `{ text: "...", lines: N, session: "..." }`。

**理由:** `tmux capture-pane` 是 tmux 原生接口，稳定可靠，已有 `tmux-history` 脚本使用。不过 pipe-pane、不落地文件，一次请求完成。

**替代方案:**
- `pipe-pane` 持续日志 → 重且不是用户当前需求（只要 1000 行）
- 在 WebSocket 连接时预取历史 → 耦合连接和查看两个独立操作
- `capture-pane -e` 保留 ANSI → 移动端不做 ANSI 渲染，纯文本就够了

### 4. 双阶段内容加载

**选择:** 打开 bottom sheet 时立即展示 `scrollbackBuf`（已有内存数据，零延迟），同时异步调 API 拉取完整历史。API 返回后替换内容。API 失败则在底部显示轻量错误提示，不影响 scrollbackBuf 的展示。

**理由:** 打开即见内容（不白屏等待），网络响应 0.2-0.5s 后无缝替换为完整历史。用户感知延迟为零。

### 5. Scrollback buffer 保留

**选择:** 保留现有 `scrollbackBuf` 累积逻辑（WS onmessage → 追加 → 100K 裁剪），不改动。

**理由:** 作为 bottom sheet 的即时数据源和 API 失败的兜底。且开销极小（内存字符串）。

## Risks / Trade-offs

- [tmux session 不存在] → `capture-pane` 返回错误，API 返回 404，客户端保留 scrollbackBuf 展示
- [大量历史文本传输] → 1000 行纯文本约 50-200KB，HTTP gzip 后 10-40KB，移动网络可接受。timeout 设 10s
- [capture-pane 耗时] → 1000 行 capture 通常 <50ms，设置 5s exec timeout 即可
- [bottom sheet 在 Capacitor WebView 中的表现] → 使用 CSS `transform: translateY()` transition，性能良好
