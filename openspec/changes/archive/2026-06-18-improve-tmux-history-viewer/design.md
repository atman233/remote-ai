## Context

`tools/tmux/tmux-history` 是 tmux pane 历史查看脚本，通过 `capture-pane → load-buffer → show-buffer | less` 四层管道将最近 N 行历史在浮窗中展示。`tools/tmux/tmux.conf` 目前只有一行 `bind-key H`。

存在的问题：
- `load-buffer`/`show-buffer` 中间层污染 tmux paste buffer，且引入潜在的内容错乱
- `less -R` 显示效果一般：长行折行体验差，色彩支持有限，无行号
- tmux.conf 缺少 Copy Mode 配置（mouse、vi 键位），用户只能依赖 popup 脚本

## Goals / Non-Goals

**Goals:**
- 去掉 buffer 中间层，改用临时文件直写
- viewer 支持 bat / nvim / less 三级 fallback
- tmux.conf 补充 mouse、vi 模式 Copy Mode 等基础配置
- 保持 `Prefix + H` 弹窗、`Prefix + [` 原生 Copy Mode 两条路径都可用

**Non-Goals:**
- 不改 daemon PTY attach 方式
- 不加 pipe-pane 持续日志

## Decisions

### 1. 临时文件代替 tmux buffer

**选择**：`capture-pane -p > /tmp/tmux-history-XXXXXX`，然后 viewer 直接读文件

**理由**：`load-buffer` 覆盖默认 paste buffer，用户复制的内容会被覆盖。临时文件隔离了 viewer 和 tmux 的内部状态，且 `mktemp` + `trap EXIT` 确保自动清理。

**替代方案**：命名管道 (FIFO)。更优雅但更复杂，对 viewer 的兼容性也不如普通文件（某些 viewer 对 pipe 输入行为不同）。

### 2. Viewer 优先级：bat > nvim -R > less -R

**选择**：按可用性自动选择

- `bat --paging=always --style=plain`：语法高亮、行号、原生 less pager、鼠标友好
- `nvim -R -c 'normal G' -c 'set nu'`：最强功能（搜索、复制到系统剪贴板），但启动稍慢
- `less -R +G`：最后兜底

**理由**：bat 是 Rust 写的 cat 替代，对终端渲染最友好。nvim 是 power user 选项。less 100% 可用作为 fallback。

### 3. history-limit 设为 5000

**选择**：`set -g history-limit 5000`

**理由**：默认 2000 对 AI Agent 输出不够；50000 过大，10 个 pane 各 5 万行内存消耗可观。5000 是合理平衡点。

### 4. vi 模式 Copy Mode

**选择**：`mode-keys vi` + `v` 开始选择 + `y` 复制到 xclip

**理由**：项目面向开发者，vi 键位是通用习惯。`y` 直接 pipe 到 xclip 打通 tmux → 系统剪贴板。

## Risks / Trade-offs

- [WSL 中 xclip 需要 X Server] → 如果 xclip 不可用，`y` 绑定会失败但不影响其他功能；可后续换成 `clip.exe`（WSL 互通）
- [bat 非默认安装] → 有 nvim 和 less 两级 fallback，不影响基本使用
- [临时文件残留] → `trap EXIT` 在正常退出时清理；kill -9 时残留文件在 /tmp 下系统会回收
