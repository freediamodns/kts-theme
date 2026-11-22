#!/usr/bin/env bash
set -uo pipefail

PRODUCT_ID="7"
PRODUCT_NAME="KTS Host"
VERSION="v1.1.0"
THEME_DIR="theme"
PANEL_DIR="${PANEL_DIR:-/var/www/pterodactyl}"

if [[ -t 1 ]]; then
  B=$'\e[1m'; D=$'\e[2m'; R=$'\e[0m'
  BLU=$'\e[38;5;39m'; CYN=$'\e[38;5;45m'; GRN=$'\e[38;5;79m'
  RED=$'\e[38;5;203m'; YEL=$'\e[38;5;221m'; GRY=$'\e[38;5;244m'; WHT=$'\e[97m'
else
  B=''; D=''; R=''; BLU=''; CYN=''; GRN=''; RED=''; YEL=''; GRY=''; WHT=''
fi
CHK="${GRN}✔${R}"; CRS="${RED}✖${R}"; ARR="${BLU}➜${R}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

hr(){ printf "${GRY}  %s${R}\n" "────────────────────────────────────────────────────────────────"; }

banner(){
  clear 2>/dev/null || true
  echo
  printf "  ${D}Powered by ${R}${B}KTS Host${R}  ${GRY}·${R}  ${CYN}https://ktshost.asia${R}\n"
  hr
  local logo=(
"          ${D}░${R}                    "
"       ${BLU}▒▓${CYN}███${BLU}▓▒${R}               "
"    ${BLU}▒▓${CYN}█████████${BLU}▓▒${R}            "
" ${BLU}▒▓${CYN}███████████████${BLU}▓▒${R}         "
"${BLU}▓${CYN}█████████${WHT}▒▒${CYN}█████████${BLU}▒${R}        "
"${CYN}███████${WHT}▒░     ░▓${CYN}██████${BLU}▒${R}        "
"${CYN}███████${WHT}▒   ▒░    ░▒${CYN}███${BLU}▒${R}        "
"${BLU}▓${CYN}████████${WHT}▓░░██▓░    ░▒░${R}        "
"  ${WHT}░▓${CYN}██████${WHT}▒ █████▓░${R}            "
"${BLU}▓${WHT}▒░  ░▓${CYN}███${WHT}▒ ▓${CYN}███████${WHT}▓░${R}        "
"${CYN}████${WHT}▒░  ░▓░   ▒▓${CYN}██████${BLU}▒${R}        "
"${CYN}███████${WHT}▒      ▒▓${CYN}██████${BLU}▒${R}        "
"${BLU}▒${CYN}█████████${WHT}▒▒▓${CYN}████████${BLU}▓░${R}       "
"  ${WHT}░▓${CYN}██████████████${BLU}▓▒${R}          "
"     ${WHT}░▓${CYN}████████${BLU}▓▒${R}             "
"        ${WHT}░▓${CYN}██${BLU}▓▒${R}                "
  )
  local info=(
"" ""
"  ${B}${WHT}KTS Host${R} ${GRY}Installer${R}  ${BLU}${VERSION}${R}"
"  ${GRY}────────────────────────────${R}"
"  ${GRY}Domain    ${R} ${WHT}${DOMAIN:-—}${R}"
"  ${GRY}Started   ${R} ${WHT}$(date -u '+%Y-%m-%d %H:%M UTC')${R}"
"  ${GRY}Product   ${R} ${WHT}${PRODUCT_NAME}${R} ${GRY}(#${PRODUCT_ID})${R}"
"  ${GRY}Panel     ${R} ${WHT}${PANEL_DIR}${R}"
"" "" "" "" "" "" ""
  )
  local i
  for i in "${!logo[@]}"; do
    printf "   %b   %b\n" "${logo[$i]}" "${info[$i]:-}"
  done
  hr
  echo
}

run_step(){
  local label="$1"; shift
  local log; log="$(mktemp)"
  ( "$@" >"$log" 2>&1 ) &
  local pid=$! frames='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏' i=0
  tput civis 2>/dev/null || true
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${BLU}%s${R} %s " "${frames:i++%10:1}" "$label"
    sleep 0.08
  done
  wait "$pid"; local rc=$?
  tput cnorm 2>/dev/null || true
  if [[ $rc -eq 0 ]]; then
    printf "\r  %b %s\033[K\n" "$CHK" "$label"
  else
    printf "\r  %b %s\033[K\n" "$CRS" "$label"
    echo "${RED}  ── output ─────────────────────────────${R}"
    sed 's/^/    /' "$log" | tail -20
    echo "${RED}  ───────────────────────────────────────${R}"
    rm -f "$log"; return $rc
  fi
  rm -f "$log"
}

die(){ echo; printf "  %b ${RED}%s${R}\n" "$CRS" "$1"; echo; exit 1; }
ask(){ local p="$1" d="${2:-}"; local a; read -r -p "  ${ARR}  ${p} " a; echo "${a:-$d}"; }

normalize_domain(){
  local d="${1:-}"
  d="${d#"${d%%[![:space:]]*}"}"; d="${d%"${d##*[![:space:]]}"}"
  d="${d//\"/}"; d="${d//\'/}"
  d="${d#http://}"; d="${d#https://}"
  d="${d#*://}"
  d="${d%%/*}"
  d="${d,,}"
  printf '%s' "$d"
}

detect_web_user(){
  local u="" p
  for p in storage/framework storage bootstrap/cache public; do
    if [[ -e "$PANEL_DIR/$p" ]]; then
      u="$(stat -c '%U' "$PANEL_DIR/$p" 2>/dev/null)"
      [[ -n "$u" && "$u" != "root" && "$u" != "UNKNOWN" ]] && { printf '%s' "$u"; return; }
    fi
  done
  u="$(ps -eo user:32,comm 2>/dev/null | awk '$2 ~ /(php-fpm|php_fpm|php[0-9]|lsphp|litespeed|nginx|apache2|httpd|caddy)/ && $1 != "root" {print $1}' | sort | uniq -c | sort -rn | awk 'NR==1{print $2}')"
  [[ -n "$u" && "$u" != "root" ]] && { printf '%s' "$u"; return; }
  printf 'www-data'
}
detect_web_group(){
  local u="$1" g
  for p in storage/framework storage bootstrap/cache public; do
    if [[ -e "$PANEL_DIR/$p" ]]; then
      g="$(stat -c '%G' "$PANEL_DIR/$p" 2>/dev/null)"
      [[ -n "$g" && "$g" != "root" && "$g" != "UNKNOWN" ]] && { printf '%s' "$g"; return; }
    fi
  done
  g="$(id -gn "$u" 2>/dev/null)"
  printf '%s' "${g:-$u}"
}

asset_rev(){
  printf 'stark-rev:%s' "$1" | sha256sum | cut -c1-32
}

finalize_assets(){
  local rev="$1" ts css
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir -p "$PANEL_DIR/public/dezerx" "$PANEL_DIR/storage"
  printf '%s.%s\n' "$ts" "$rev" > "$PANEL_DIR/storage/.dz-install" 2>/dev/null || true
  chmod 600 "$PANEL_DIR/storage/.dz-install" 2>/dev/null || true
  css="$PANEL_DIR/resources/scripts/dezerx/theme.css"
  if [[ -f "$css" ]] && ! grep -q '/\*!b:' "$css"; then
    printf '/*!b:%s*/\n' "$rev" | cat - "$css" > "$css.tmp" && mv "$css.tmp" "$css"
  fi
}

ensure_node(){
  local need=0
  if command -v node >/dev/null 2>&1; then
    local maj; maj="$(node -v 2>/dev/null | sed 's/v//; s/\..*//')"
    [[ "${maj:-0}" -ge 20 ]] || need=1
  else
    need=1
  fi
  if [[ $need -eq 1 ]]; then
    if command -v apt-get >/dev/null 2>&1; then
      curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
      apt-get install -y nodejs >/dev/null 2>&1
    elif command -v dnf >/dev/null 2>&1; then
      curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
      dnf install -y nodejs >/dev/null 2>&1
    elif command -v yum >/dev/null 2>&1; then
      curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
      yum install -y nodejs >/dev/null 2>&1
    fi
  fi
  command -v yarn >/dev/null 2>&1 || npm i -g yarn >/dev/null 2>&1
  command -v node >/dev/null 2>&1 && command -v yarn >/dev/null 2>&1
}

art(){ ( cd "$PANEL_DIR" && php artisan "$@" ); }

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo
  printf "  %b ${RED}${B}This installer must be run as root.${R}\n" "$CRS"
  echo "  Re-run it with sudo:"
  echo "     ${CYN}sudo bash install.sh${R}"
  echo
  exit 1
fi

DOMAIN=""
[[ -f "$PANEL_DIR/config/app.php" && -f "$PANEL_DIR/artisan" ]] || { PANEL_DIR="$(ask "Path to your Pterodactyl install:" "/var/www/pterodactyl")"; }
[[ -f "$PANEL_DIR/artisan" ]] || die "No Pterodactyl install found at ${PANEL_DIR}."

ENV_DOMAIN="$(normalize_domain "$(grep -E '^APP_URL=' "$PANEL_DIR/.env" 2>/dev/null | head -1 | sed 's/^APP_URL=//')")"
DOMAIN="$ENV_DOMAIN"

banner

echo "  ${B}${WHT}Preflight${R}"
CLEAN="$(ask "Do you have any other theme or addons (Blueprint/ainx) installed? [y/N]:" "n")"
shopt -s nocasematch
if [[ "$CLEAN" == y* ]]; then
  echo
  echo "  ${RED}${B}Stop.${R} KTS Host installs onto a ${B}clean${R} Pterodactyl panel."
  echo "  Restore your panel to stock first, then run this installer again:"
  echo "     ${CYN}https://pterodactyl.io/panel/1.0/updating.html${R}"
  echo
  exit 1
fi
if [[ -d "$PANEL_DIR/.blueprint" ]] || command -v blueprint >/dev/null 2>&1; then
  echo
  echo "  ${RED}${B}Blueprint/ainx detected on this panel.${R}"
  echo "  Please restore a clean Pterodactyl install first:"
  echo "     ${CYN}https://pterodactyl.io/panel/1.0/updating.html${R}"
  echo
  exit 1
fi
shopt -u nocasematch
echo "  ${CHK} Panel looks clean"
echo

echo "  ${B}${WHT}Ready to install${R} ${GRY}(this replaces the panel front-end and rebuilds assets)${R}"
GO="$(ask "Continue? [Y/n]:" "y")"
shopt -s nocasematch; [[ "$GO" == n* ]] && { echo "  Aborted."; exit 0; }; shopt -u nocasematch
echo

echo "  ${B}${WHT}Installing${R}"
[[ -d "$SCRIPT_DIR/$THEME_DIR" ]] || die "Missing ${THEME_DIR}/ beside the installer (re-unzip kts-host-v1.zip)."
[[ -f "$SCRIPT_DIR/$THEME_DIR/artisan" || -d "$SCRIPT_DIR/$THEME_DIR/app" ]] || die "The ${THEME_DIR}/ folder looks incomplete."

BK="$HOME/kts-host-backup-$(date -u +%Y%m%d-%H%M%S)"
run_step "Backing up panel to ${BK}" bash -c "
  umask 077 &&
  mkdir -p '$BK' &&
  tar czf '$BK/files.tar.gz' -C '$PANEL_DIR' app resources routes config database public composer.json package.json 2>/dev/null;
  if grep -q '^DB_' '$PANEL_DIR/.env' 2>/dev/null; then
    DB_D=\$(grep '^DB_DATABASE=' '$PANEL_DIR/.env'|cut -d= -f2-|tr -d '\"');
    DB_U=\$(grep '^DB_USERNAME=' '$PANEL_DIR/.env'|cut -d= -f2-|tr -d '\"');
    DB_P=\$(grep '^DB_PASSWORD=' '$PANEL_DIR/.env'|cut -d= -f2-|tr -d '\"');
    MYSQL_PWD=\"\$DB_P\" mysqldump -u\"\$DB_U\" \"\$DB_D\" > '$BK/database.sql' 2>/dev/null || true;
  fi; true" || die "Backup failed — not continuing."

PANEL_PHP_EXTS="mbstring openssl pdo_mysql tokenizer bcmath dom curl zip simplexml"

php_runs_panel(){
  local e
  "$1" -r 'exit(function_exists("mb_split") ? 0 : 1);' 2>/dev/null || return 1
  for e in $PANEL_PHP_EXTS; do
    "$1" -r "exit(extension_loaded('$e') ? 0 : 1);" 2>/dev/null || return 1
  done
  return 0
}

PHP_FIX_MARK="$(mktemp)"
ensure_panel_php(){
  php_runs_panel php && return 0
  local c
  for c in php8.5 php8.4 php8.3 php8.2 php8.1; do
    command -v "$c" >/dev/null 2>&1 || continue
    php_runs_panel "$c" || continue
    { update-alternatives --set php "/usr/bin/$c" || alternatives --set php "/usr/bin/$c"; } >/dev/null 2>&1 || true
    if php_runs_panel php; then echo "$c" > "$PHP_FIX_MARK"; return 0; fi
  done
  return 1
}

run_step "Checking PHP can run the panel" ensure_panel_php \
  || die "The 'php' command is missing extensions the panel needs (${PANEL_PHP_EXTS}). Point it at a working PHP with 'update-alternatives --config php' and re-run."

if [[ -s "$PHP_FIX_MARK" ]]; then
  echo "  ${YEL}Note:${R} switched ${WHT}php${R} to ${WHT}$(cat "$PHP_FIX_MARK")${R} — the previous default was missing extensions the panel needs."
fi
rm -f "$PHP_FIX_MARK"

art down || true

run_step "Applying theme files"        bash -c "cp -a '$SCRIPT_DIR/$THEME_DIR/.' '$PANEL_DIR/'" || die "Could not copy the theme files."
run_step "Removing replaced stock file" bash -c "rm -f '$PANEL_DIR/resources/scripts/i18n.ts'"

REV="$(asset_rev "open")"
run_step "Finalizing assets"              bash -c "$(declare -f finalize_assets); PANEL_DIR='$PANEL_DIR' finalize_assets '$REV'"

run_step "Ensuring Node.js 22 and Yarn"           ensure_node || die "Node.js/Yarn could not be installed. Install Node 20+ and Yarn, then re-run."
run_step "Installing PHP dependency (aternos/nbt)" bash -c "cd '$PANEL_DIR' && composer require aternos/nbt:^1.12 --no-interaction --no-scripts" || die "composer require failed."
run_step "Installing front-end packages (yarn)"    bash -c "cd '$PANEL_DIR' && (yarn install --frozen-lockfile || yarn install)" || die "yarn install failed."
run_step "Generating Minecraft assets (renderchest)" bash -c "cd '$PANEL_DIR' && bash tools/mc-assets/fetch.sh" \
  || echo "  ${YEL}Note:${R} Minecraft artwork was not generated. The panel is fine — item icons show a placeholder until you run ${WHT}tools/mc-assets/fetch.sh${R} followed by ${WHT}yarn build:production${R} (needs php-imagick; see ${WHT}tools/mc-assets/README.md${R})."

run_step "Building the theme (yarn build)"         bash -c "cd '$PANEL_DIR' && yarn build:production" || die "The front-end build failed (see output above)."

run_step "Database migrations"          art migrate --force || die "Database migrations failed."

WEB_USER="$(detect_web_user)"; WEB_GROUP="$(detect_web_group "$WEB_USER")"
run_step "Fixing permissions (${WEB_USER}:${WEB_GROUP})" bash -c "
  cd '$PANEL_DIR' &&
  mkdir -p public/dezerx/uploads public/dezerx/og storage bootstrap/cache &&
  chown -R '$WEB_USER':'$WEB_GROUP' public/dezerx storage bootstrap/cache &&
  chmod -R u+rwX public/dezerx storage bootstrap/cache
" || echo "  ${YEL}Note:${R} could not set permissions on public/dezerx — image uploads may 500 until you chown it to your web user (${WEB_USER}:${WEB_GROUP})."

run_step "Clearing config cache"        art config:clear
run_step "Rebuilding route cache"       bash -c "cd '$PANEL_DIR' && php artisan route:clear && php artisan route:cache"
run_step "Clearing view cache"          art view:clear
run_step "Restarting the queue worker"  art queue:restart

art up || true

echo
hr
printf "  %b  ${B}${GRN}KTS Host is installed${R} on ${WHT}%s${R}\n" "$CHK" "${DOMAIN:-panel}"
echo "  ${GRY}Backup:${R} ${BK}"
echo
printf "  ${D}Powered by KTS Host · ktshost.asia${R}\n"
echo
