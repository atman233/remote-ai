## 1. tmux.conf 配置扩展

- [x] 1.1 添加 `history-limit 5000`、`mouse on`、`mode-keys vi`
- [x] 1.2 添加 vi Copy Mode 的 `v` 开始选择、`y` 复制到 xclip 绑定
- [x] 1.3 保留 `bind-key H run-shell "tmux-history"` 不变

## 2. tmux-history 脚本重写

- [x] 2.1 去掉 `tmux load-buffer` / `tmux show-buffer` 中间层
- [x] 2.2 改为 `capture-pane -p > mktemp 临时文件` + `trap EXIT` 清理
- [x] 2.3 实现 viewer 优先级：bat > nvim -R > less -R
- [x] 2.4 保持 `TMUX_HISTORY_LINES` 环境变量和 pane-id 参数支持不变
