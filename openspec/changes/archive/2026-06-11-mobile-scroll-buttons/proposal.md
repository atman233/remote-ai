## Why

移动端使用 xterm.js 终端展示 AI 对话内容，xterm 内部滚动条在手机上太窄（~10px）无法触摸操作，且终端截获了触摸事件导致单指滑动无法触发滚动。对话输出较长时，用户看不到上方被截断的内容。

## What Changes

- 在终端容器右下角叠加两个半透明浮动按钮：「向上滚动」和「回到底部」
- 点击向上滚动按钮调用 `term.scrollLines(-5)` 逐页上翻
- 用户滚动离开底部后自动显示按钮组，在底部时自动隐藏
- 点击回到底部按钮调用 `term.scrollToBottom()`

## Capabilities

### New Capabilities

- `mobile-terminal-scroll`: 移动端终端浮动滚动按钮，提供触摸友好的滚动方式

### Modified Capabilities

<!-- No existing capabilities modified -->

## Impact

- `mobile/src/app.js` — 新增按钮 DOM 创建、事件绑定和 xterm scroll 调用
- `mobile/app.css` — 新增浮动按钮样式
- 不涉及后端、API、WebSocket 协议变更

## Non-goals

- 不改变 xterm.js 本身的滚动条样式或触摸行为
- 不添加双指手势或复杂触摸交互
- 不在桌面端显示此按钮（桌面端鼠标滚轮可用）
