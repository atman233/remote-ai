## Context

移动端 App 使用 xterm.js 渲染终端，在 WebView 中以 flex 布局占满屏幕。当前 `#terminal-container` 设置了 `overflow: hidden`，所有滚动依赖 xterm 内部机制。xterm 默认滚动条宽度约 10px，在移动端触屏上无法用手指操作；且 xterm 截获单指触摸事件用于文本选择，用户无法通过滑动手势滚动终端缓冲区。`scrollback: 5000` 已配置，缓冲区有数据但不可达。

## Goals / Non-Goals

**Goals:**
- 提供触摸友好的终端滚动方式
- 用户能向上翻看历史对话内容
- 用户能快速回到底部（最新输出）
- 纯前端变更，不涉及后端

**Non-Goals:**
- 不改动 xterm.js 内部的触摸行为或滚动条样式
- 不添加桌面端特定的交互（桌面有鼠标滚轮可用，但按钮同样可用）
- 不改变终端布局结构

## Decisions

### 按钮定位：固定在 `#terminal-container` 右下角

在 JS 中动态创建按钮 DOM，插入到 `#terminal-container` 内，CSS `position: absolute` 定位在右下角。xterm.js 的 `.xterm` 元素本身 `height: 100%` 铺满容器，按钮浮在终端上方。

**替代方案**: 用 CSS `::after` 伪元素 + 额外 wrapper → 过于 hack，不如 JS 创建 DOM 直观可控。

### 滚动步长：一次滚动 5 行

`term.scrollLines(-5)` 向上翻 5 行。5 行是一个适中的步长——xterm 默认字体 13px，5 行约 65px，在手机屏幕上约 1/10 视口高度，不会跳动过大也不会滚动太慢。

**替代方案**: 3 行（太慢）、10 行（跳动太大）、page-up（xterm 无直接 page up API，需根据 rows 计算）。

### 按钮组作为单一日志组件

两个按钮（↑ 上滚、↓ 回到底部）放在同一个容器内。当终端在底部时整个容器隐藏（opacity: 0），离开底部时显示。避免按钮遮挡正在输入的内容。

### 显示/隐藏触发：自定义事件而非轮询

在用户点击 ↑ 时显示按钮组，点击 ↓ 或终端自然滚动到底部时隐藏。用 `term.onScroll()` 监听 xterm 内部的滚动位置变化来同步按钮显示状态。

**替代方案**: 用 `scroll` 事件监听 `.xterm-viewport` → 不可靠，xterm 的 viewport 元素是内部实现细节。

## Risks / Trade-offs

- 按钮遮挡终端内容右下角 → 按钮较小（36×36px）、半透明（opacity: 0.7），不影响核心阅读区域
- xterm `onScroll` 事件在程序化写入时也会触发 → 用标志位区分用户主动滚动和 `term.write()` 导致的自动滚动
- 按钮可能和 cmd-panel 收起/展开产生布局冲突 → 按钮在 `#terminal-container` 内部定位，不受 cmd-panel 影响
