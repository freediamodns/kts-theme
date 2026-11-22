#!/usr/bin/env bash
set -uo pipefail

PRODUCT_NAME="KTS Host"
VERSION="v1.1.0"
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
die(){ echo; printf "  %b ${RED}%s${R}\n" "$CRS" "$1"; echo; exit 1; }
ask(){ local p="$1" d="${2:-}"; local a; read -r -p "  ${ARR}  ${p} " a; echo "${a:-$d}"; }
art(){ ( cd "$PANEL_DIR" && php artisan "$@" ); }

run_step(){
  local label="$1"; shift
  local log; log="$(mktemp)"
  ( "$@" >"$log" 2>&1 ) &
  local pid=$! frames='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏' i=0
  tput civis 2>/dev/null || true
  while kill -0 "$pid" 2>/dev/null; do printf "\r  ${BLU}%s${R} %s " "${frames:i++%10:1}" "$label"; sleep 0.08; done
  wait "$pid"; local rc=$?
  tput cnorm 2>/dev/null || true
  if [[ $rc -eq 0 ]]; then printf "\r  %b %s\033[K\n" "$CHK" "$label"
  else printf "\r  %b %s\033[K\n" "$CRS" "$label"
    echo "${RED}  ── output ─────────────────────────────${R}"; sed 's/^/    /' "$log" | tail -20
    echo "${RED}  ───────────────────────────────────────${R}"; rm -f "$log"; return $rc; fi
  rm -f "$log"
}

detect_web_user(){
  local u="" p
  for p in storage/framework storage bootstrap/cache public; do
    if [[ -e "$PANEL_DIR/$p" ]]; then u="$(stat -c '%U' "$PANEL_DIR/$p" 2>/dev/null)"
      [[ -n "$u" && "$u" != "root" && "$u" != "UNKNOWN" ]] && { printf '%s' "$u"; return; }; fi
  done
  u="$(ps -eo user:32,comm 2>/dev/null | awk '$2 ~ /(php-fpm|php_fpm|php[0-9]|lsphp|litespeed|nginx|apache2|httpd|caddy)/ && $1 != "root" {print $1}' | sort | uniq -c | sort -rn | awk 'NR==1{print $2}')"
  [[ -n "$u" && "$u" != "root" ]] && { printf '%s' "$u"; return; }
  printf 'www-data'
}
detect_web_group(){
  local u="$1" g p
  for p in storage/framework storage bootstrap/cache public; do
    if [[ -e "$PANEL_DIR/$p" ]]; then g="$(stat -c '%G' "$PANEL_DIR/$p" 2>/dev/null)"
      [[ -n "$g" && "$g" != "root" && "$g" != "UNKNOWN" ]] && { printf '%s' "$g"; return; }; fi
  done
  g="$(id -gn "$u" 2>/dev/null)"; printf '%s' "${g:-$u}"
}

reload_php(){
  local svc done=1
  for svc in $(systemctl list-unit-files --type=service --no-legend 2>/dev/null | awk '{print $1}' | grep -E '^php.*fpm.*\.service$'); do
    systemctl reload "$svc" 2>/dev/null || systemctl restart "$svc" 2>/dev/null; done=0
  done
  if [[ $done -eq 1 ]]; then service --status-all 2>/dev/null | grep -oE 'php[0-9.]*-fpm' | while read -r s; do service "$s" reload 2>/dev/null || true; done; fi
  return 0
}

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo; printf "  %b ${RED}${B}This updater must be run as root.${R}\n" "$CRS"
  echo "  Re-run it with sudo:"; echo "     ${CYN}sudo bash update.sh${R}"; echo; exit 1
fi

[[ -f "$PANEL_DIR/artisan" ]] || PANEL_DIR="$(ask "Path to your Pterodactyl install:" "/var/www/pterodactyl")"
[[ -f "$PANEL_DIR/artisan" ]] || die "No Pterodactyl install found at ${PANEL_DIR}."
[[ -d "$PANEL_DIR/resources/scripts/dezerx" ]] || die "This panel does not have KTS Host installed. Use install.sh instead."

clear 2>/dev/null || true
echo
printf "  ${D}Powered by ${R}${B}KTS Host${R}  ${GRY}·${R}  ${CYN}https://ktshost.asia${R}\n"
hr
printf "  ${B}${WHT}KTS Host${R} ${GRY}Updater${R}  ${BLU}${VERSION}${R}\n"
printf "  ${GRY}Panel${R}  ${WHT}%s${R}\n" "$PANEL_DIR"
hr; echo

echo "  ${B}${WHT}Choose an update${R}"
declare -a ZIPS=()
while IFS= read -r z; do [[ -n "$z" ]] && ZIPS+=("$z"); done < <(
  find "$SCRIPT_DIR" "$PANEL_DIR" "$PWD" "$HOME" -maxdepth 1 -type f -iname '*.zip' 2>/dev/null \
    | while read -r p; do readlink -f "$p"; done | sort -u
)
[[ ${#ZIPS[@]} -gt 0 ]] || die "No .zip files found in ${SCRIPT_DIR}, ${PANEL_DIR}, ${PWD} or ${HOME}. Upload a KTS Host zip and re-run."

i=1
for z in "${ZIPS[@]}"; do
  sz="$(du -h "$z" 2>/dev/null | cut -f1)"; dt="$(date -r "$z" '+%Y-%m-%d %H:%M' 2>/dev/null)"
  printf "    ${B}%2d${R}  %-52s ${GRY}%6s  %s${R}\n" "$i" "$(basename "$z")" "${sz:-?}" "${dt:-}"
  i=$((i+1))
done
echo
CHOICE="$(ask "Which zip do you want to apply? [1-${#ZIPS[@]}]:" "")"
[[ "$CHOICE" =~ ^[0-9]+$ && "$CHOICE" -ge 1 && "$CHOICE" -le ${#ZIPS[@]} ]] || die "That was not one of the choices."
ZIP="${ZIPS[$((CHOICE-1))]}"
echo "  ${CHK} Selected ${WHT}$(basename "$ZIP")${R}"
echo

command -v unzip >/dev/null 2>&1 || die "unzip is required (apt-get install unzip / dnf install unzip)."

STAGE="$(mktemp -d)"; KEEP_DIR=""; trap 'rm -rf "$STAGE" "${KEEP_DIR:-/nonexistent}"' EXIT
unzip -oq "$ZIP" -d "$STAGE" || die "Could not read that zip."
if   [[ -d "$STAGE/theme" && ( -d "$STAGE/theme/app" || -d "$STAGE/theme/resources" ) ]]; then THEME_ROOT="$STAGE/theme"
elif [[ -d "$STAGE/app" && -d "$STAGE/resources" ]]; then THEME_ROOT="$STAGE"
else die "That zip does not look like a KTS Host theme (no theme/ or app+resources inside)."; fi
[[ -d "$THEME_ROOT/resources/scripts/dezerx" ]] || die "That zip is missing the KTS Host theme files (resources/scripts/dezerx)."

echo "  ${B}${WHT}Ready to update${R} ${GRY}(replaces the theme files and rebuilds assets)${R}"
GO="$(ask "Continue? [Y/n]:" "y")"
shopt -s nocasematch; [[ "$GO" == n* ]] && { echo "  Aborted."; exit 0; }; shopt -u nocasematch
echo

echo "  ${B}${WHT}Updating${R}"
OLD_REV="$(grep -m1 -oE '^/\*!b:[^*]*\*/' "$PANEL_DIR/resources/scripts/dezerx/theme.css" 2>/dev/null || true)"

# The theme ships only a placeholder item index — Mojang's artwork is generated
# per server, not redistributed. Hold on to whatever this panel already
# generated so applying an update does not blank every item icon.
ATLAS_REL="resources/scripts/dezerx/components/mc/atlas.json"
OLD_ATLAS=""
if [[ -f "$PANEL_DIR/$ATLAS_REL" ]] && ! grep -q '"ids":\[\]' "$PANEL_DIR/$ATLAS_REL" 2>/dev/null; then
  OLD_ATLAS="$(mktemp)"; cp "$PANEL_DIR/$ATLAS_REL" "$OLD_ATLAS"
fi

PRESERVE=(
  "resources/scripts/routers/routes.custom.ts"
)
KEEP_DIR="$(mktemp -d)"
for rel in "${PRESERVE[@]}"; do
  if [[ -f "$PANEL_DIR/$rel" ]]; then
    mkdir -p "$KEEP_DIR/$(dirname "$rel")"
    cp -a "$PANEL_DIR/$rel" "$KEEP_DIR/$rel"
  fi
done

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

run_step "Applying theme files"         bash -c "cp -a '$THEME_ROOT/.' '$PANEL_DIR/'" || die "Could not copy the theme files."
run_step "Removing replaced stock file" bash -c "rm -f '$PANEL_DIR/resources/scripts/i18n.ts'"

KEPT=0
for rel in "${PRESERVE[@]}"; do
  [[ -f "$KEEP_DIR/$rel" ]] || continue
  cp -a "$KEEP_DIR/$rel" "$PANEL_DIR/$rel" && KEPT=$((KEPT+1))
done
[[ $KEPT -gt 0 ]] && printf "  %b %s\n" "$CHK" "Kept your own files (${KEPT})"

if [[ -n "$OLD_ATLAS" ]]; then
  run_step "Preserving generated Minecraft index" bash -c "cp '$OLD_ATLAS' '$PANEL_DIR/$ATLAS_REL' && rm -f '$OLD_ATLAS'"
fi

WEB_USER="$(detect_web_user)"; WEB_GROUP="$(detect_web_group "$WEB_USER")"
run_step "Fixing permissions (${WEB_USER}:${WEB_GROUP})" bash -c "
  cd '$PANEL_DIR' &&
  mkdir -p public/dezerx/uploads public/dezerx/og storage bootstrap/cache &&
  chown -R '$WEB_USER':'$WEB_GROUP' public/dezerx storage bootstrap/cache &&
  chmod -R u+rwX public/dezerx storage bootstrap/cache
" || echo "  ${YEL}Note:${R} could not set permissions on public/dezerx (${WEB_USER}:${WEB_GROUP})."

run_step "Ensuring PHP dependency (aternos/nbt)" bash -c "cd '$PANEL_DIR' && composer require aternos/nbt:^1.12 --no-interaction --no-scripts" || die "composer require failed."
run_step "Installing front-end packages (yarn)"  bash -c "cd '$PANEL_DIR' && (yarn install --frozen-lockfile || yarn install)" || die "yarn install failed."

if [[ -d "$PANEL_DIR/public/dezerx/mc/render" || -f "$PANEL_DIR/resources/scripts/dezerx/components/mc/items.json" ]]; then
  run_step "Removing superseded item artwork" bash -c "
    rm -rf '$PANEL_DIR/public/dezerx/mc/render' '$PANEL_DIR/resources/scripts/dezerx/components/mc/items.json'" || true
fi

NEEDS_ASSETS=0
[[ -f "$PANEL_DIR/$ATLAS_REL" ]] || NEEDS_ASSETS=1
grep -q '"ids":\[\]' "$PANEL_DIR/$ATLAS_REL" 2>/dev/null && NEEDS_ASSETS=1
[[ -f "$PANEL_DIR/public/dezerx/mc/atlas.webp" ]] || NEEDS_ASSETS=1
[[ -d "$PANEL_DIR/public/dezerx/mc/armor" ]] || NEEDS_ASSETS=1
[[ -d "$PANEL_DIR/public/dezerx/mc/armor/trims" ]] || NEEDS_ASSETS=1
[[ -d "$PANEL_DIR/public/dezerx/mc/armor/heads" ]] || NEEDS_ASSETS=1

if [[ "$NEEDS_ASSETS" -eq 1 ]]; then
  run_step "Generating Minecraft assets (renderchest)" bash -c "cd '$PANEL_DIR' && bash tools/mc-assets/fetch.sh" \
    || echo "  ${YEL}Note:${R} Minecraft artwork was not generated. The panel is fine — item icons show a placeholder until you run ${WHT}tools/mc-assets/fetch.sh${R} followed by ${WHT}yarn build:production${R} (needs php-imagick; see ${WHT}tools/mc-assets/README.md${R})."
fi

run_step "Building the theme (yarn build)"       bash -c "cd '$PANEL_DIR' && yarn build:production" || die "The front-end build failed (see output above)."

run_step "Database migrations"          art migrate --force || die "Database migrations failed."
run_step "Clearing config cache"        art config:clear
run_step "Rebuilding route cache"       bash -c "cd '$PANEL_DIR' && php artisan route:clear && php artisan route:cache"
run_step "Clearing view cache"          art view:clear
run_step "Reloading PHP (opcache)"      reload_php
run_step "Restarting the queue worker"  art queue:restart

art up || true

echo; hr
printf "  %b  ${B}${GRN}%s is up to date${R} on ${WHT}%s${R}\n" "$CHK" "$PRODUCT_NAME" "$PANEL_DIR"
echo "  ${GRY}Applied:${R} $(basename "$ZIP")"
echo "  ${GRY}Backup:${R}  ${BK}"
echo
printf "  ${D}Powered by KTS Host · ktshost.asia${R}\n"
echo
