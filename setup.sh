#!/bin/bash

set -e

CYAN='\033[0;36m'
YELLOW='\033[1;33m'
WHITE='\033[1;97m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

clear

echo -e "${CYAN}██╗ ██╗  ████████╗ ███████╗    ${WHITE}    ${YELLOW}██╗  ██╗ ███████╗ ███████╗${NC}"
echo -e "${CYAN}██║ ██╚══╝██╔═══██╗╚════██║    ${WHITE}    ${YELLOW}██║ ██╔╝ ██╔═══██╗██╔════╝${NC}"
echo -e "${CYAN}██║     ████████║     ██╔╝     ${WHITE}&   ${YELLOW}█████╔╝  ███████║██████╗  ${NC}"
echo -e "${CYAN}██║     ╚██╔═══██║  ██╔╝      ${WHITE}    ${YELLOW}██╔═██╗  ╚════██║╚════██║${NC}"
echo -e "${CYAN}██║     ██║   ██║  ██║        ${WHITE}    ${YELLOW}██║  ██╗     ██║ ██║   ██║${NC}"
echo

echo -e "${GREEN}>>> Starting KTS Host Theme Setup...${NC}"

if [[ "${EUID}" -ne 0 ]]; then
    echo -e "${RED}Run this installer with sudo or as root.${NC}"
    exit 1
fi

if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
    echo -e "${RED}curl or wget is required.${NC}"
    exit 1
fi

if ! command -v unzip >/dev/null 2>&1; then
    echo -e "${RED}unzip is required.${NC}"
    exit 1
fi

WORK_DIR="$(mktemp -d /tmp/kts-host-install.XXXXXX)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo -e "\n${YELLOW}[1/3] Downloading and extracting KTS Host theme...${NC}"
cd "$WORK_DIR"

THEME_ZIP_URL="https://github.com/freediamodns/kts-theme/raw/refs/heads/master/theme.zip"

if command -v curl >/dev/null 2>&1; then
    curl -fL --progress-bar -o theme.zip "$THEME_ZIP_URL"
else
    wget --https-only -O theme.zip "$THEME_ZIP_URL"
fi

unzip -oq theme.zip

if [[ ! -d "$WORK_DIR/theme" || ! -f "$WORK_DIR/install.sh" ]]; then
    echo -e "${RED}Downloaded theme package has an invalid structure.${NC}"
    exit 1
fi

chmod +x install.sh
bash install.sh

PANEL_DIR="/var/www/pterodactyl"

echo -e "\n${YELLOW}[2/3] Checking Pterodactyl index file...${NC}"
if [[ -f "$PANEL_DIR/public/index.php" ]]; then
    echo "Pterodactyl index.php kept unchanged."
else
    curl -fsSL "https://raw.githubusercontent.com/pterodactyl/panel/master/public/index.php" \
        -o "$PANEL_DIR/public/index.php"
fi

echo -e "${YELLOW}[3/3] Fixing panel permissions...${NC}"
if [[ -d "$PANEL_DIR" ]]; then
    find "$PANEL_DIR" -type d -exec chmod 755 {} +
    find "$PANEL_DIR" -type f -exec chmod 644 {} +
    chmod -R 775 "$PANEL_DIR/storage" "$PANEL_DIR/bootstrap/cache"

    if id www-data >/dev/null 2>&1; then
        chown -R www-data:www-data "$PANEL_DIR"
    elif id nginx >/dev/null 2>&1; then
        chown -R nginx:nginx "$PANEL_DIR"
    fi
else
    echo -e "${RED}Pterodactyl directory not found: $PANEL_DIR${NC}"
    exit 1
fi

echo -e "\n${GREEN}>>> KTS Host setup complete.${NC}"
