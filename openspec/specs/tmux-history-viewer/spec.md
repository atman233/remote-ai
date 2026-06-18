## ADDED Requirements

### Requirement: Tmux Copy Mode configuration

`tools/tmux/tmux.conf` SHALL 包含以下配置项，供用户 source 到 `~/.tmux.conf`：

- `set -g history-limit 5000` — 滚动缓冲区上限
- `set -g mouse on` — 鼠标支持
- `setw -g mode-keys vi` — Copy Mode 使用 vi 键位
- vi 模式下 `v` 开始选择，`y` 复制选中到系统剪贴板
- `bind-key H run-shell "tmux-history"` — 浮窗历史查看快捷键

#### Scenario: Native Copy Mode with vi keys

- **WHEN** 用户在 tmux 内按 `Prefix + [`
- **THEN** 进入 Copy Mode，可使用 `j`/`k` 逐行滚动、`Ctrl+u`/`Ctrl+d` 半页翻页、`/` 搜索、`q` 退出

#### Scenario: Copy to system clipboard

- **WHEN** 用户在 Copy Mode 中按 `v` 开始选择，按 `y` 确认
- **THEN** 选中文本通过 xclip 写入系统剪贴板

#### Scenario: Mouse scroll in Copy Mode

- **WHEN** 用户在 tmux pane 中滚动鼠标滚轮
- **THEN** 自动进入 Copy Mode 并滚动历史

### Requirement: Popup history viewer without buffer layer

`tools/tmux/tmux-history` 脚本 SHALL 直接捕获 pane 历史到临时文件，不经由 tmux paste buffer。

#### Scenario: Capture to temp file

- **WHEN** 执行 `tmux-history`
- **THEN** 脚本通过 `capture-pane -p -S -N` 将最近 N 行写入 `mktemp` 创建的临时文件
- **AND** 脚本在退出时自动删除该临时文件

#### Scenario: No tmux buffer pollution

- **WHEN** 用户在 `tmux-history` 执行前已通过 `tmux load-buffer` 或 Copy Mode 复制了一段文本到 paste buffer
- **THEN** `tmux-history` 执行后 paste buffer 内容不变

### Requirement: Viewer auto-selection in popup

`tmux-history` 脚本 SHALL 按以下优先级选择 viewer 在 `display-popup` 浮窗中展示历史：

1. `bat --paging=always --style=plain`（若已安装）
2. `nvim -R -c 'normal G' -c 'set nu'`（若已安装）
3. `less -R +G`（默认可用）

#### Scenario: bat available

- **WHEN** 系统已安装 `bat`
- **THEN** 浮窗使用 `bat` 展示历史，具备语法高亮和行号

#### Scenario: nvim fallback

- **WHEN** 系统未安装 `bat` 但已安装 `nvim`
- **THEN** 浮窗使用 `nvim` 只读模式展示历史

#### Scenario: less fallback

- **WHEN** 系统未安装 `bat` 和 `nvim`
- **THEN** 浮窗使用 `less -R +G` 展示历史
