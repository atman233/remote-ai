## Why

当前 `tools/tmux/tmux-history` 脚本通过 `capture-pane → load-buffer → show-buffer | less` 四层管道查看 pane 历史，存在内容重复和显示效果差的问题。重复源于 buffer 中间层和 node-pty attach 重绘；显示差源于 less 对长行/色彩/鼠标支持有限。需要在保留 popup 弹窗便利性的同时，修复重复问题并提升显示体验，同时补充原生 Copy Mode 配置作为主力方案。

## What Changes

- 重写 `tools/tmux/tmux-history`：去掉 `load-buffer`/`show-buffer` 中间层，改用临时文件直写；viewer 优先 `bat` > `nvim -R` > `less -R`
- 扩展 `tools/tmux/tmux.conf`：增加 `mouse on`、vi 模式 Copy Mode 键位、`history-limit` 等配置
- 保持 `Prefix + H` 绑定不变，保持 `Prefix + [` 原生 Copy Mode 可用

## Capabilities

### New Capabilities

- `tmux-history-viewer`: tmux pane 历史查看工具的配置和脚本，包括原生 Copy Mode 键位设置和浮窗 popup 查看器

### Modified Capabilities

无。现有 spec 不涉及 tmux 配置层。

## Non-goals

- 不改变 daemon 的 PTY attach 方式（node-pty 重绘导致的 scrollback 重复是独立问题）
- 不改变 mobile 端的 `mobile-terminal-scroll` 机制
- 不加 `pipe-pane` 持续日志记录（需要时另开 change）

## Impact

- `tools/tmux/tmux-history`：重写
- `tools/tmux/tmux.conf`：扩展
- 无 API/daemon/mobile 端变更
