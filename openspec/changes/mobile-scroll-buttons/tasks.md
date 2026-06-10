## 1. CSS 样式

- [x] 1.1 在 `mobile/app.css` 添加 `.scroll-btns` 容器样式（position: absolute, right: 12px, bottom: 12px, display: flex, flex-direction: column, gap: 8px, z-index: 60, transition: opacity 0.2s）
- [x] 1.2 添加 `.scroll-btn` 按钮样式（width: 36px, height: 36px, border-radius: 50%, background: rgba(255,255,255,0.12), border: none, color: #d4d4d4, font-size: 18px）
- [x] 1.3 添加 `.scroll-btns.hidden` 隐藏样式（opacity: 0, pointer-events: none）

## 2. DOM 创建与绑定

- [x] 2.1 在 `mobile/src/app.js` 的 `initTerminal()` 末尾调用新函数 `initScrollButtons()`，创建按钮 DOM 并插入 `#terminal-container`
- [x] 2.2 实现 `initScrollButtons()`：创建 `.scroll-btns` 容器和两个 `.scroll-btn` 按钮（↑ 和 ↓），初始为隐藏状态
- [x] 2.3 绑定 ↑ 按钮 click 事件：调用 `term.scrollLines(-5)`，标记 `userScrolledUp = true`，移除按钮组 `.hidden` 类
- [x] 2.4 绑定 ↓ 按钮 click 事件：调用 `term.scrollToBottom()`，标记 `userScrolledUp = false`，添加按钮组 `.hidden` 类

## 3. 滚动状态追踪

- [x] 3.1 添加 `term.onScroll()` 监听，根据 `term.buffer.active.viewportY` 相对于 `term.buffer.active.baseY` 的位置判断是否在底部
- [x] 3.2 当在底部时自动添加 `.hidden` 类，离开底部时移除 `.hidden` 类
- [x] 3.3 确保新数据写入后自动回到底部时按钮自动隐藏（write 触发 scroll 事件，check 位置 → 在底部 → 隐藏）

## 4. 验证

- [ ] 4.1 部署到测试环境（push 触发 CI），在 Android 设备上验证按钮显示/隐藏逻辑和滚动功能
