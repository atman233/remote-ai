#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  CC Mobile - 一键部署脚本${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ---- Config ----
SERVER="easyai.wuya.asia"
SSH_USER="${CC_SERVER_USER:-root}"

# ---- Step 0: Password ----
echo -e "${GREEN}设置访问密码 (手机 App 登录用):${NC}"
echo ""
read -sp "请输入密码: " PASSWORD
echo ""
if [ -z "$PASSWORD" ]; then
    echo -e "${RED}密码不能为空${NC}"
    exit 1
fi
echo ""

# ---- Step 1: SSH Key ----
echo -e "${GREEN}[1/4] 配置 SSH 密钥...${NC}"

if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "生成 SSH 密钥对..."
    ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N "" -C "cc-mobile-tunnel"
fi

echo "将公钥复制到服务器 (需要输入服务器密码):"
echo ""
echo -e "  ${CYAN}ssh-copy-id -i ~/.ssh/id_ed25519.pub ${SSH_USER}@${SERVER}${NC}"
echo ""
read -p "按回车继续（复制完成后）..."

# ---- Step 2: Install autossh ----
echo -e "${GREEN}[2/4] 检查 autossh...${NC}"

if ! command -v autossh &>/dev/null; then
    echo "安装 autossh..."
    sudo apt-get update -qq && sudo apt-get install -y autossh
fi
echo "autossh 已就绪"

# ---- Step 3: Systemd Services ----
echo -e "${GREEN}[3/4] 配置 systemd 服务...${NC}"

# Update tunnel services with correct SSH user
sed -i "s/root@${SERVER}/${SSH_USER}@${SERVER}/g" ~/.config/systemd/user/cc-tunnel.service
sed -i "s/root@${SERVER}/${SSH_USER}@${SERVER}/g" ~/.config/systemd/user/cc-tunnel-test.service

# Update daemon tokens
sed -i "s/Environment=TOKEN=CHANGE_ME/Environment=TOKEN=${PASSWORD}/" ~/.config/systemd/user/cc-daemon.service
sed -i "s/Environment=TOKEN=CHANGE_ME/Environment=TOKEN=${PASSWORD}/" ~/.config/systemd/user/cc-daemon-test.service

systemctl --user daemon-reload
systemctl --user enable cc-daemon.service
systemctl --user enable cc-tunnel.service
systemctl --user enable cc-daemon-test.service
systemctl --user enable cc-tunnel-test.service

echo "systemd 服务已配置"

# ---- Step 4: Start Services ----
echo -e "${GREEN}[4/4] 启动服务...${NC}"

systemctl --user restart cc-daemon.service
systemctl --user restart cc-tunnel.service
systemctl --user restart cc-daemon-test.service
systemctl --user restart cc-tunnel-test.service

sleep 2

# ---- Summary ----
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  本地配置完成！${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "守护进程 (正式) 状态:"
systemctl --user status cc-daemon.service --no-pager -l 2>/dev/null || echo "  检查: systemctl --user status cc-daemon.service"
echo ""
echo "守护进程 (测试) 状态:"
systemctl --user status cc-daemon-test.service --no-pager -l 2>/dev/null || echo "  检查: systemctl --user status cc-daemon-test.service"
echo ""
echo "SSH 隧道 (正式) 状态:"
systemctl --user status cc-tunnel.service --no-pager -l 2>/dev/null || echo "  检查: systemctl --user status cc-tunnel.service"
echo ""
echo "SSH 隧道 (测试) 状态:"
systemctl --user status cc-tunnel-test.service --no-pager -l 2>/dev/null || echo "  检查: systemctl --user status cc-tunnel-test.service"

echo ""
echo -e "${RED}========================================${NC}"
echo -e "${RED}  请在公网服务器上执行以下操作:${NC}"
echo -e "${RED}========================================${NC}"
echo ""
echo "1. 安装 Caddy:"
echo ""
echo "   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https"
echo "   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg"
echo "   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list"
echo "   sudo apt update && sudo apt install caddy"
echo ""
echo "2. 复制 Caddy 配置 (包含正式 + 测试两个域名):"
echo ""
echo "   cat server/Caddyfile"
echo "   # 然后手动复制内容到服务器 /etc/caddy/Caddyfile"
echo ""
echo "3. 重启 Caddy:"
echo ""
echo "   ssh ${SSH_USER}@${SERVER} 'sudo systemctl reload caddy'"
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  手机 App 设置:${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "  正式环境:"
echo "    服务器地址: ${SERVER}"
echo "    用户名:     cc"
echo "    密码:       ${PASSWORD}"
echo ""
echo "  测试环境:"
echo "    服务器地址: easyaitest.wuya.asia"
echo "    用户名:     cc"
echo "    密码:       ${PASSWORD}"
echo ""

