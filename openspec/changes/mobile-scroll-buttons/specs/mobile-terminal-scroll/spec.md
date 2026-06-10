## ADDED Requirements

### Requirement: Floating scroll buttons displayed on terminal

系统 SHALL 在终端容器右下角渲染两个半透明浮动按钮：「向上滚动」（↑）和「回到底部」（↓），提供触屏可操作的终端缓冲区滚动方式。

#### Scenario: Scroll buttons appear when scrolled away from bottom
- **WHEN** 用户向上滚动终端缓冲区（离开最新输出位置）
- **THEN** 浮动按钮组以 opacity: 0.7 显示在终端右下角，距离右边缘 12px、下边缘 12px

#### Scenario: Scroll buttons hidden when at bottom
- **WHEN** 终端滚动回到最底部（显示最新输出）
- **THEN** 浮动按钮组自动隐藏（opacity: 0）

### Requirement: Scroll up by lines

系统 SHALL 在用户点击「向上滚动」按钮时，将终端缓冲区向上滚动 5 行。

#### Scenario: User taps scroll up button
- **WHEN** 用户点击「向上滚动」按钮
- **THEN** 终端缓冲区向上滚动 5 行（term.scrollLines(-5)）
- **AND** 按钮组保持可见

### Requirement: Scroll to bottom

系统 SHALL 在用户点击「回到底部」按钮时，将终端缓冲区滚动到最新输出位置。

#### Scenario: User taps scroll to bottom button
- **WHEN** 用户点击「回到底部」按钮
- **THEN** 终端滚动到缓冲区最底部（term.scrollToBottom()）
- **AND** 按钮组自动隐藏

### Requirement: Button visibility tracking

系统 SHALL 通过 xterm 的 scroll 事件追踪终端滚动位置，以决定按钮组的显示/隐藏状态。

#### Scenario: Programmatic write does not show buttons
- **WHEN** 终端通过 `term.write()` 接收到新的输出数据
- **AND** 用户在终端最底部
- **THEN** 按钮组保持隐藏状态

#### Scenario: User scroll action shows buttons
- **WHEN** 用户通过点击「向上滚动」按钮触发滚动
- **AND** 终端缓冲区离开最底部
- **THEN** 按钮组保持可见
