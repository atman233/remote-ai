#!/bin/bash
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  CC Mobile - 启动脚本${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ---- Ensure tmux is installed ----
if ! command -v tmux &>/dev/null; then
    echo "安装 tmux..."
    sudo apt-get update -qq && sudo apt-get install -y tmux
fi

# ---- Check services ----
echo ""

check_svc() {
    if systemctl --user is-active --quiet $1 2>/dev/null; then
        echo -e "  $1: ${GREEN}运行中${NC}"
    else
        echo -e "  $1: 未运行，启动中..."
        systemctl --user restart $1
    fi
}

check_svc cc-daemon.service
check_svc cc-tunnel.service
check_svc cc-daemon-test.service
check_svc cc-tunnel-test.service

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  启动完成！${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "配置的项目 (daemon/projects.json):"
if [ -f daemon/projects.json ]; then
    cat daemon/projects.json | grep -E '"name"|"path"' | paste - - | sed 's/.*"name": "\(.*\)".*"path": "\(.*\)".*/  \1 -> \2/' 2>/dev/null || echo "  (无)"
else
    echo "  (无)"
fi
echo ""
echo "tmux 会话:"
tmux list-sessions 2>/dev/null || echo "  (无)"
echo ""
echo "手机 App (正式): easyai.wuya.asia"
echo "手机 App (测试): easyaitest.wuya.asia"
echo ""

