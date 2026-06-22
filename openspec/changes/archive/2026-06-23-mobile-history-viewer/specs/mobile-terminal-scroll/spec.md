## MODIFIED Requirements

### Requirement: Floating scroll buttons

系统 SHALL 在终端右下角渲染单个浮动按钮（📜），用于切换底部历史面板。按钮始终显示在终端已连接状态下，z-index 高于终端元素和命令面板。

#### Scenario: Single toggle button visible
- **WHEN** 终端已连接并接收数据
- **THEN** 单个浮动按钮始终显示在终端右下角

### Requirement: History overlay

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

## REMOVED Requirements

### Requirement: Hidden native scrollbar

**Reason**: xterm 原生滚动条隐藏规则保留给 bottom sheet 交互模式，不再需要强制隐藏。

**Migration**: 保留 CSS 中的 `scrollbar-width: none` 规则（不影响功能），但不再作为 spec 要求。
