## ADDED Requirements

### Requirement: Floating scroll buttons

系统 SHALL 在终端右下角渲染两个浮动按钮（▲ 和 ▼），z-index: 9999 浮于所有元素之上，提供移动端可触摸操作的对话历史查看方式。

#### Scenario: Scroll buttons always visible
- **WHEN** 终端已连接并接收数据
- **THEN** 浮动按钮始终显示在终端右下角

### Requirement: History overlay

系统 SHALL 在用户点击 ▲ 按钮时显示全屏「对话历史」浮层，展示所有累积的 PTY 输出文本（ANSI 转义序列已剥离）。浮层支持原生触摸滚动。

#### Scenario: Open history overlay
- **WHEN** 用户点击 ▲ 按钮
- **THEN** 全屏历史浮层以 display: flex 显示
- **AND** 浮层内容为 session 开始以来所有 PTY 输出的纯文本
- **AND** 浮层自动滚动到距底部约一屏的位置

#### Scenario: Close history overlay
- **WHEN** 用户点击 ▼ 按钮或浮层右上角 ✕ 按钮
- **THEN** 历史浮层隐藏（display: none），用户回到实时终端视图

### Requirement: Scrollback text accumulation

系统 SHALL 在每次 `ws.onmessage` 收到 PTY 数据时将原始文本追加到累积缓冲区，缓冲区上限 100,000 字符，超出时保留最后 80,000 字符。

#### Scenario: Text accumulation
- **WHEN** WebSocket 收到 PTY 输出数据
- **THEN** 数据被追加到 scrollbackBuf
- **AND** 如果浮层当前可见，浮层内容实时更新并自动滚动到底部

#### Scenario: Buffer trim
- **WHEN** scrollbackBuf 超过 100,000 字符
- **THEN** 缓冲区裁剪至最后 80,000 字符

### Requirement: Hidden native scrollbar

系统 SHALL 隐藏 xterm 原生滚动条，因为滚动查看历史已由浮动按钮和历史浮层替代。

#### Scenario: xterm scrollbar hidden
- **WHEN** 终端渲染
- **THEN** `.xterm .xterm-viewport` 的滚动条不可见（scrollbar-width: none / ::-webkit-scrollbar display: none）
