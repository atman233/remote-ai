## ADDED Requirements

### Requirement: Floating scroll buttons

系统 SHALL 在终端右下角渲染单个浮动按钮（📜），用于切换底部历史面板。按钮始终显示在终端已连接状态下，z-index 高于终端元素和命令面板。

#### Scenario: Single toggle button visible
- **WHEN** 终端已连接并接收数据
- **THEN** 单个浮动按钮始终显示在终端右下角

### Requirement: History bottom sheet

系统 SHALL 在用户点击 📜 按钮时从底部弹出半屏历史面板（bottom sheet），展示 tmux pane 完整历史文本（ANSI 转义序列已剥离）。面板支持原生触摸滚动。

#### Scenario: Open history bottom sheet
- **WHEN** 用户点击 📜 按钮
- **THEN** 底部面板从底部滑入，覆盖终端约 60% 高度
- **AND** 终端上方出现半透明遮罩
- **AND** 面板内容首先展示 scrollbackBuf 已有数据（零延迟）
- **AND** 系统后台异步请求 `GET /api/sessions/:id/history?lines=1000`
- **AND** API 返回后，面板内容替换为完整历史文本
- **AND** 面板滚动到距底部约一屏的位置

#### Scenario: Close history bottom sheet via close button
- **WHEN** 用户点击面板右上角 ✕ 按钮
- **THEN** 底部面板滑出，遮罩消失，用户回到实时终端视图

#### Scenario: Close history bottom sheet via overlay tap
- **WHEN** 用户点击面板上方遮罩区域
- **THEN** 底部面板滑出，遮罩消失

#### Scenario: History API failure fallback
- **WHEN** `GET /api/sessions/:id/history` 请求失败
- **THEN** 面板保留展示 scrollbackBuf 内容
- **AND** 面板底部显示轻量提示 "无法加载完整历史"

### Requirement: Scrollback text accumulation

系统 SHALL 在每次 `ws.onmessage` 收到 PTY 数据时将原始文本追加到累积缓冲区，缓冲区上限 100,000 字符，超出时保留最后 80,000 字符。

#### Scenario: Text accumulation
- **WHEN** WebSocket 收到 PTY 输出数据
- **THEN** 数据被追加到 scrollbackBuf
- **AND** 如果浮层当前可见，浮层内容实时更新并自动滚动到底部

#### Scenario: Buffer trim
- **WHEN** scrollbackBuf 超过 100,000 字符
- **THEN** 缓冲区裁剪至最后 80,000 字符
