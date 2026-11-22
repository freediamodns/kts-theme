#!/usr/bin/env bash
#
# Generates the Minecraft artwork the player manager draws: item icons, the
# enchantment glint, the HUD sprites, the default skins, worn armour and the
# pack icon.
#
# None of Mojang's artwork ships inside the theme. Everything below is produced
# on this machine from a Minecraft client jar downloaded from Mojang, rendered
# with aternos/renderchest (MIT). Re-run it whenever you want to move to a newer
# Minecraft version.
#
# Usage:
#   tools/mc-assets/fetch.sh
#   MC_VERSION=1.21.4 tools/mc-assets/fetch.sh    # pin a version
#   SIZE=64 tools/mc-assets/fetch.sh              # sharper icons, ~2.4x bytes
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PANEL_DIR="${PANEL_DIR:-$(cd "$HERE/../.." && pwd)}"

SIZE="${SIZE:-32}"
MC_VERSION="${MC_VERSION:-}"
WORK="${WORK:-${TMPDIR:-/tmp}/stark-mc-assets}"

MANIFEST="https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"

PUB="$PANEL_DIR/public/dezerx/mc"
INDEX="$PANEL_DIR/resources/scripts/dezerx/components/mc/atlas.json"

note() { printf '  %s\n' "$*"; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }

sudo_if_needed() {
    if [ "$(id -u)" -eq 0 ]; then "$@"; elif command -v sudo >/dev/null 2>&1; then sudo -n "$@" 2>/dev/null || sudo "$@"; else return 1; fi
}

DEP_LOG="$(mktemp)"
trap 'rm -f "$DEP_LOG"' EXIT

reinstall_pkg() {
    if command -v apt-get >/dev/null 2>&1; then
        sudo_if_needed env DEBIAN_FRONTEND=noninteractive \
            apt-get install -y -q --reinstall "$1" >>"$DEP_LOG" 2>&1
    elif command -v dnf >/dev/null 2>&1; then
        sudo_if_needed dnf reinstall -y -q "$1" >>"$DEP_LOG" 2>&1
    else
        return 1
    fi
}

# Whichever installed package is meant to own a file — the case where a library
# was deleted out from under a package dpkg still believes is intact.
lib_owner_pkg() {
    command -v dpkg-query >/dev/null 2>&1 || return 1
    dpkg-query -S "$1" 2>/dev/null | head -1 | cut -d: -f1
}

install_imagemagick_runtime() {
    if command -v apt-get >/dev/null 2>&1; then
        install_pkg libmagickwand-6.q16-6 || install_pkg libmagickwand-7.q16-10 || install_pkg imagemagick
    else
        install_pkg ImageMagick-libs || install_pkg ImageMagick
    fi
}

install_pkg() {
    if command -v apt-get >/dev/null 2>&1; then
        sudo_if_needed env DEBIAN_FRONTEND=noninteractive \
            apt-get install -y -q --no-install-recommends "$@" >>"$DEP_LOG" 2>&1
    elif command -v dnf >/dev/null 2>&1; then
        sudo_if_needed dnf install -y -q "$@" >>"$DEP_LOG" 2>&1
    elif command -v yum >/dev/null 2>&1; then
        sudo_if_needed yum install -y -q "$@" >>"$DEP_LOG" 2>&1
    else
        return 1
    fi
}

# ---------------------------------------------------------------- php/imagick
#
# renderchest hard-requires ext-imagick, and getting hold of a PHP that actually
# loads it is by far the most common reason this script fails on someone else's
# machine. Installing the package is only one of the things that can be wrong:
#
#   * the module is on disk but not enabled for the CLI SAPI — a postinst that
#     was interrupted, or a stray phpdismod. apt then answers "already the
#     newest version" forever while php -m still never lists it.
#   * the module is enabled but cannot link against ImageMagick, so PHP prints a
#     startup warning to stderr and carries on without it.
#   * the module belongs to a PHP that is not the default `php`.
#
# All three look identical to `php -m | grep imagick`, so each is handled on its
# own and anything left over is reported with the reason PHP actually gave,
# rather than asking for a package that is already installed.

PHP_BIN=""      # interpreter that can render
PHP_OPTS=""     # flags it needs in order to load imagick
PHP=""          # wrapper around the two, written once they are settled

# Every distinct PHP CLI on this box. The panel's own `php` comes first so we
# stay on it when it will do.
php_bins() {
    local c bin real seen=""
    for c in php php8.5 php8.4 php8.3 php8.2 php8.1; do
        bin="$(command -v "$c" 2>/dev/null)" || continue
        [ -n "$bin" ] || continue
        real="$(readlink -f "$bin" 2>/dev/null || printf '%s' "$bin")"
        case " $seen " in *" $real "*) continue ;; esac
        seen="$seen $real"
        printf '%s\n' "$bin"
    done
    return 0
}

# PHP versions installed here, newest first.
php_versions() {
    local c
    for c in php8.5 php8.4 php8.3 php8.2 php8.1; do
        if command -v "$c" >/dev/null 2>&1; then printf '%s\n' "${c#php}"; fi
    done
    return 0
}

loads_imagick()  { "$1" -r 'exit(extension_loaded("imagick") ? 0 : 1);' 2>/dev/null; }
forced_imagick() { "$1" -d extension=imagick.so -r 'exit(extension_loaded("imagick") ? 0 : 1);' 2>/dev/null; }
ext_dir()        { "$1" -r 'echo ini_get("extension_dir");' 2>/dev/null || true; }
imagick_so()     { local d; d="$(ext_dir "$1")"; [ -n "$d" ] || return 1; printf '%s/imagick.so' "$d"; }
has_imagick_so() { local so; so="$(imagick_so "$1")" && [ -f "$so" ]; }

# Why PHP refuses a module that is sitting right there. It only ever says so in
# a startup warning, and display_startup_errors is off on most panels, so the
# probe has to turn it back on or the reason is lost.
imagick_load_error() {
    loads_imagick "$1" && return 0
    "$1" -d display_startup_errors=1 -d display_errors=stderr -d error_reporting=-1 \
         -d extension=imagick.so -m 2>&1 >/dev/null | grep -i -m1 imagick
}

# Shared libraries imagick.so wants and cannot find. Far and away the most
# common reason a freshly installed module will not load: the ImageMagick
# runtime it was built against is missing, and apt sees nothing wrong because
# the dependency is satisfied on paper.
imagick_missing_libs() {
    local so
    command -v ldd >/dev/null 2>&1 || return 0
    so="$(imagick_so "$1")" || return 0
    [ -f "$so" ] || return 0
    ldd "$so" 2>/dev/null | awk '/not found/{print $1}'
}

find_imagick_php() {
    local b
    for b in $(php_bins); do
        if loads_imagick "$b"; then PHP_BIN="$b"; PHP_OPTS=""; return 0; fi
    done
    # Present on disk, just never wired into the CLI's conf.d. Loading it by hand
    # gets renderchest going without touching the panel's PHP configuration.
    for b in $(php_bins); do
        if has_imagick_so "$b" && forced_imagick "$b"; then
            PHP_BIN="$b"; PHP_OPTS="-d extension=imagick.so"; return 0
        fi
    done
    return 1
}

# Debian and Ubuntu keep each module's ini in mods-available and symlink it into
# every SAPI's conf.d. A package left half-configured has the first without the
# second, and apt will never notice because the package is, technically, there.
enable_imagick_modules() {
    local v ini enabled=1
    for v in $(php_versions); do
        ini="/etc/php/$v/mods-available/imagick.ini"
        [ -f "$ini" ] || continue
        [ -d "/etc/php/$v/cli/conf.d" ] || continue
        if ls "/etc/php/$v/cli/conf.d/"*imagick.ini >/dev/null 2>&1; then continue; fi
        # -s cli on purpose: this is a stranger's panel, and enabling a module
        # for php-fpm as a side effect of generating artwork is not our call.
        note "enabling imagick for php${v} (cli)"
        if command -v phpenmod >/dev/null 2>&1 &&
           sudo_if_needed phpenmod -v "$v" -s cli imagick >>"$DEP_LOG" 2>&1; then
            enabled=0; continue
        fi
        if sudo_if_needed ln -sf "$ini" "/etc/php/$v/cli/conf.d/20-imagick.ini" >>"$DEP_LOG" 2>&1; then
            enabled=0
        fi
    done
    return $enabled
}

# imagick.so is on disk and PHP still will not load it. Nothing above helps
# here: the package is installed, so a plain install is a no-op and apt answers
# "already the newest version" however many times it is asked. Only an explicit
# --reinstall replaces the file, and if what is actually missing is the
# ImageMagick runtime underneath, even that will not help until it is back.
repair_unloadable_imagick() {
    local v lib pkg libs repaired=1
    for v in $(php_versions); do
        has_imagick_so "php$v" || continue
        forced_imagick "php$v" && continue

        libs="$(imagick_missing_libs "php$v")"
        for lib in $libs; do
            pkg="$(lib_owner_pkg "$lib")"
            if [ -n "$pkg" ]; then
                note "restoring $pkg (imagick needs $lib)"
                reinstall_pkg "$pkg" && repaired=0
            else
                note "installing the ImageMagick runtime ($lib is missing)"
                install_imagemagick_runtime && repaired=0
            fi
        done

        forced_imagick "php$v" && continue

        # Damaged, half-unpacked, or built for another PHP. A reinstall is the
        # only thing that puts a different file there.
        note "replacing php${v}-imagick, whose module will not load"
        reinstall_pkg "php${v}-imagick" && repaired=0
    done
    return $repaired
}

# dpkg leaves a package "installed" but unconfigured when its postinst was
# interrupted, which is precisely the state where the module never got enabled.
configure_pending_packages() {
    command -v dpkg >/dev/null 2>&1 || return 1
    dpkg -l 'php*-imagick' 2>/dev/null | grep -q '^i[^i]' || return 1
    note "finishing an interrupted package configuration"
    sudo_if_needed dpkg --configure -a >>"$DEP_LOG" 2>&1 || true
    return 0
}

# `php` is what artisan and the queue run through, so nothing here is allowed to
# move it.
PHP_BEFORE="$(readlink -f /usr/bin/php 2>/dev/null || true)"

restore_php_alternative() {
    local now
    now="$(readlink -f /usr/bin/php 2>/dev/null || true)"
    if [ -n "$PHP_BEFORE" ] && [ -n "$now" ] && [ "$now" != "$PHP_BEFORE" ]; then
        note "restoring /usr/bin/php to $PHP_BEFORE"
        sudo_if_needed update-alternatives --set php "$PHP_BEFORE" >>"$DEP_LOG" 2>&1 || true
    fi
}

# Install imagick ONLY for a PHP that is already here.
#
# The generic php-imagick metapackage depends on the *distro's* default PHP, so
# on a panel running any other PHP it drags in a second interpreter with none of
# the panel's extensions. That one can then win /usr/bin/php through
# update-alternatives and break artisan with
# "Call to undefined function Illuminate\Support\mb_split()". Never ask for it.
ensure_imagick() {
    find_imagick_php && return 0

    # Free repairs first — nothing downloaded, nothing that can break.
    enable_imagick_modules && find_imagick_php && return 0
    configure_pending_packages && find_imagick_php && return 0
    repair_unloadable_imagick && find_imagick_php && return 0

    local v pkg refreshed=0
    while :; do
        for v in $(php_versions); do
            pkg="php${v}-imagick"
            note "installing $pkg"
            install_pkg "$pkg" || true
            # apt reports "already the newest version" for a package whose files
            # have since been deleted, half-unpacked or left unloadable, so ask
            # for them back rather than taking its word for it.
            if ! forced_imagick "php$v"; then
                note "reinstalling $pkg"
                reinstall_pkg "$pkg" || true
            fi
            enable_imagick_modules || true
            find_imagick_php && return 0
        done

        # RHEL-family ships it under a different name entirely.
        if command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1; then
            install_pkg php-pecl-imagick || install_pkg php-imagick || true
            find_imagick_php && return 0
        fi

        [ "$refreshed" -eq 1 ] && return 1
        refreshed=1
        if command -v apt-get >/dev/null 2>&1; then
            note "refreshing package lists"
            sudo_if_needed apt-get update -q >>"$DEP_LOG" 2>&1 || true
        fi
    done
}

# What the operator needs in order to finish this by hand. Ordered so the useful
# half survives being tail-ed by the installer's step runner.
imagick_report() {
    set +e
    local b v state err d libs

    if [ -s "$DEP_LOG" ]; then
        echo
        echo "  Last package-manager output:"
        tail -n 6 "$DEP_LOG" | sed 's/^/      /'
    fi

    echo
    echo "  PHP interpreters on this machine:"
    for b in $(php_bins); do
        v="$("$b" -r 'echo PHP_VERSION;' 2>/dev/null)"
        if   loads_imagick "$b";  then state="imagick loaded"
        elif has_imagick_so "$b"; then state="imagick.so present but PHP cannot load it"
        else d="$(ext_dir "$b")"; state="no imagick.so in ${d:-its extension dir}"
        fi
        printf '      %-16s %-8s %s\n' "$b" "${v:-?}" "$state"
    done

    for b in $(php_bins); do
        libs="$(imagick_missing_libs "$b")"
        if [ -n "$libs" ]; then
            echo
            echo "  imagick.so is built against libraries that are not installed:"
            printf '      %s\n' $libs
            echo "      Install the ImageMagick runtime and it will load."
            break
        fi
    done

    for b in $(php_bins); do
        err="$(imagick_load_error "$b")"
        if [ -n "$err" ]; then
            echo
            echo "  PHP reported:"
            echo "      $err"
            break
        fi
    done

    echo
    echo "  Fix it by hand for the PHP your panel runs, then re-run"
    echo "  tools/mc-assets/fetch.sh followed by yarn build:production:"
    echo
    for v in $(php_versions); do
        echo "      apt install --reinstall php${v}-imagick && phpenmod -v ${v} imagick"
    done
    echo "      (RHEL/AlmaLinux: dnf install php-pecl-imagick)"
    echo
}

# renderchest starts a pool of worker interpreters and defaults to eight of them
# however small the box is, each holding decoded textures. Size the pool to the
# machine so a 1 GB VPS is not OOM-killed part-way through.
worker_count() {
    local cpus mem_mb n
    cpus="$(nproc 2>/dev/null || echo 2)"
    mem_mb="$(awk '/^MemAvailable:/{print int($2/1024)}' /proc/meminfo 2>/dev/null || true)"
    [ -n "$mem_mb" ] || mem_mb=2048
    n=$((mem_mb / 300))
    [ "$n" -lt 1 ] && n=1
    [ "$n" -gt "$cpus" ] && n="$cpus"
    [ "$n" -gt 8 ] && n=8
    printf '%s' "$n"
}

# taskmaster (renderchest's worker pool) starts workers by running a php
# executable *by name*, defaulting to a bare `php`. If the interpreter carrying
# imagick is a different one — or needs a -d flag to load it — every worker would
# come up without it. A wrapper is the only form that survives being re-executed
# like that, so everything goes through one.
make_php_wrapper() {
    mkdir -p "$WORK/bin"
    PHP="$WORK/bin/php"
    printf '#!/bin/sh\nexec "%s" %s "$@"\n' "$PHP_BIN" "$PHP_OPTS" > "$PHP"
    chmod +x "$PHP"
}

# ------------------------------------------------------------------ preflight
if ! command -v cwebp >/dev/null 2>&1; then
    note "installing webp"
    install_pkg webp || install_pkg libwebp-tools || true
fi

for tool in curl unzip python3 composer; do
    command -v "$tool" >/dev/null 2>&1 || die "$tool is required but not installed"
done
command -v cwebp >/dev/null 2>&1 || die "cwebp not found - install 'webp' (Debian/Ubuntu) or 'libwebp-tools' (RHEL)"

if ! ensure_imagick; then
    restore_php_alternative
    {
        echo
        echo "renderchest needs a PHP with ext-imagick, and could not get one."
        imagick_report
    } >&2
    exit 1
fi

restore_php_alternative

mkdir -p "$WORK"
make_php_wrapper
note "php $("$PHP" -r 'echo PHP_VERSION;') with imagick${PHP_OPTS:+ (loaded on demand)}, ${SIZE}px icons"

# ---------------------------------------------------------------- client jar
if [ -z "$MC_VERSION" ]; then
    MC_VERSION="$(curl -fsSL "$MANIFEST" | python3 -c 'import sys,json; print(json.load(sys.stdin)["latest"]["release"])')"
fi
note "Minecraft $MC_VERSION"

VER_DIR="$WORK/$MC_VERSION"
JAR="$VER_DIR/client.jar"
ASSETS="$VER_DIR/jar/assets"

if [ ! -d "$ASSETS" ]; then
    mkdir -p "$VER_DIR"
    note "downloading client jar from Mojang"
    CLIENT_URL="$(curl -fsSL "$MANIFEST" | python3 -c "
import sys, json, urllib.request
data = json.load(sys.stdin)
meta = next(v['url'] for v in data['versions'] if v['id'] == '$MC_VERSION')
print(json.load(urllib.request.urlopen(meta))['downloads']['client']['url'])
")"
    curl -fsSL "$CLIENT_URL" -o "$JAR"
    unzip -q -o "$JAR" 'assets/*' 'pack.png' -d "$VER_DIR/jar"
else
    note "reusing extracted assets in $VER_DIR"
fi

# -------------------------------------------------------------- renderchest
# Pinned on purpose. Minecraft moved the armour-trim palettes, and renderchest
# only learned the new layout in 5.2, which is still a beta - so composer's
# newest *stable* (5.1) resolves happily and then dies part-way through the
# render with "Cannot resolve file locator minecraft:textures/trim/quartz.png".
# Set RC_VERSION to any composer constraint to move off it.
RC_VERSION="${RC_VERSION:-^5.2.0@beta}"
RC_DIR="$WORK/renderchest"
RC="$RC_DIR/vendor/aternos/renderchest/renderchest"
RC_STAMP="$RC_DIR/.stark-version"
# The constraint is part of the cache key. A tree left behind by an earlier run
# already satisfies its own lock, so composer would leave it alone and the
# binary-exists test alone would keep handing back the version that fails.
if [ ! -f "$RC" ] || [ "$(cat "$RC_STAMP" 2>/dev/null)" != "$RC_VERSION" ]; then
    note "installing aternos/renderchest $RC_VERSION"
    rm -rf "$RC_DIR"
    mkdir -p "$RC_DIR"
    ( cd "$RC_DIR" && COMPOSER_ALLOW_SUPERUSER=1 "$PHP" "$(command -v composer)" \
        require "aternos/renderchest:$RC_VERSION" --no-interaction -q )
    [ -f "$RC" ] || die "composer could not install aternos/renderchest $RC_VERSION"
    printf '%s\n' "$RC_VERSION" > "$RC_STAMP"
fi

OUT="$VER_DIR/out-$SIZE"
rm -rf "$OUT"
mkdir -p "$OUT/mc" "$OUT/heads"

export TASKMASTER_WORKER_COUNT="${TASKMASTER_WORKER_COUNT:-$(worker_count)}"
export TASKMASTER_WORKER_BIN="$PHP"
export TASKMASTER_WORKER_PROXY_BIN="$PHP"

# renderchest's entrypoint does `require_once 'vendor/autoload.php'` against the
# working directory, so it has to be run from its own composer root. Every path
# handed to it is absolute, so the cd is harmless.
note "rendering items with ${TASKMASTER_WORKER_COUNT} workers (a few minutes)"
( cd "$RC_DIR" && "$PHP" "$RC" -a "$ASSETS" -o "$OUT/mc"    -n minecraft -s "$SIZE" -q 2 -f webp -i >/dev/null )
note "rendering mob heads"
( cd "$RC_DIR" && "$PHP" "$RC" -a "$ASSETS" -o "$OUT/heads" -n mobheads  -s "$SIZE" -q 2 -f webp -i >/dev/null )

note "packing atlas"
python3 "$HERE/pack_atlas.py" "$OUT/atlas" "$SIZE" "$OUT/mc" "$OUT/heads" >/dev/null

# ------------------------------------------------------------------- install
# Built into a staging tree first so a failure part-way never leaves the panel
# with half a set of icons.
STAGE="$OUT/stage"
rm -rf "$STAGE"
mkdir -p "$STAGE/anim" "$STAGE/hud" "$STAGE/skin" "$STAGE/img" \
    "$STAGE/armor/humanoid" "$STAGE/armor/humanoid_leggings" "$STAGE/armor/wings"

cp "$OUT/atlas/atlas.webp"       "$STAGE/atlas.webp"
cp "$OUT/mc/rc-enchantment.webp" "$STAGE/glint.webp"
cp "$OUT/atlas"/anim/*.webp      "$STAGE/anim/"

note "converting HUD sprites"
HUD_SRC="$ASSETS/minecraft/textures/gui/sprites/hud"
while IFS= read -r png; do
    rel="${png#"$HUD_SRC/"}"
    out="$STAGE/hud/${rel%.png}.webp"
    mkdir -p "$(dirname "$out")"
    cwebp -quiet -lossless "$png" -o "$out"
done < <(find "$HUD_SRC" -name '*.png')

# Steve is the wide model, Alex the slim one — taking both from the same folder
# gives you the wrong Alex.
cp "$ASSETS/minecraft/textures/entity/player/wide/steve.png" "$STAGE/skin/steve.png"
cp "$ASSETS/minecraft/textures/entity/player/slim/alex.png"  "$STAGE/skin/alex.png"
cwebp -quiet -lossless "$VER_DIR/jar/pack.png" -o "$STAGE/img/packpng.webp"

# Armour as it is worn, for the player model beside the inventory. These are the
# textures wrapped around the body, not the item icons. Minecraft 1.21.2 moved
# them from models/armor to entity/equipment, so an older jar is read from the
# old layout and written under the new names.
note "converting worn armour"
EQUIP="$ASSETS/minecraft/textures/entity/equipment"
if [ -d "$EQUIP/humanoid" ]; then
    for layer in humanoid humanoid_leggings; do
        for png in "$EQUIP/$layer"/*.png; do
            [ -e "$png" ] || continue
            name="$(basename "${png%.png}")"
            cwebp -quiet -lossless "$png" -o "$STAGE/armor/$layer/$name.webp"
        done
    done
    WINGS="$EQUIP/wings/elytra.png"
else
    LEGACY="$ASSETS/minecraft/textures/models/armor"
    for png in "$LEGACY"/*_layer_[12].png "$LEGACY"/*_layer_[12]_overlay.png; do
        [ -e "$png" ] || continue
        name="$(basename "${png%.png}")"
        case "$name" in
            *_layer_1_overlay) layer=humanoid;          name="${name%_layer_1_overlay}_overlay" ;;
            *_layer_2_overlay) layer=humanoid_leggings; name="${name%_layer_2_overlay}_overlay" ;;
            *_layer_1)         layer=humanoid;          name="${name%_layer_1}" ;;
            *)                 layer=humanoid_leggings; name="${name%_layer_2}" ;;
        esac
        [ "$name" = turtle ] && name=turtle_scute
        cwebp -quiet -lossless "$png" -o "$STAGE/armor/$layer/$name.webp"
    done
    WINGS="$ASSETS/minecraft/textures/entity/elytra.png"
fi
if [ -f "$WINGS" ]; then
    cwebp -quiet -lossless "$WINGS" -o "$STAGE/armor/wings/elytra.webp"
fi
for glint in enchanted_glint_armor enchanted_glint_entity; do
    if [ -f "$ASSETS/minecraft/textures/misc/$glint.png" ]; then
        cwebp -quiet -lossless "$ASSETS/minecraft/textures/misc/$glint.png" -o "$STAGE/armor/glint.webp"
        break
    fi
done

# Armour trims are a grey pattern recoloured from a palette, which the browser does
# the same way the game does, so both are copied as they are. -exact keeps every
# colour bit-for-bit: the recolouring matches on them. The palettes moved from
# trims/color_palettes to palettes/ in 26.1.
note "converting armour trims"
mkdir -p "$STAGE/armor/trims/humanoid" "$STAGE/armor/trims/humanoid_leggings" "$STAGE/armor/trims/palettes"
for layer in humanoid humanoid_leggings; do
    for png in "$ASSETS/minecraft/textures/trims/entity/$layer"/*.png; do
        [ -e "$png" ] || continue
        name="$(basename "${png%.png}")"
        cwebp -quiet -lossless -exact "$png" -o "$STAGE/armor/trims/$layer/$name.webp"
    done
done
if [ -f "$ASSETS/minecraft/textures/palettes/trim_base.png" ]; then
    KEY="$ASSETS/minecraft/textures/palettes/trim_base.png"
    COLOURS="$ASSETS/minecraft/textures/palettes/trim"
else
    KEY="$ASSETS/minecraft/textures/trims/color_palettes/trim_palette.png"
    COLOURS="$ASSETS/minecraft/textures/trims/color_palettes"
fi
if [ -f "$KEY" ]; then
    cwebp -quiet -lossless -exact "$KEY" -o "$STAGE/armor/trims/palettes/key.webp"
fi
for png in "$COLOURS"/*.png; do
    [ -e "$png" ] || continue
    name="$(basename "${png%.png}")"
    [ "$name" = trim_palette ] && continue
    cwebp -quiet -lossless -exact "$png" -o "$STAGE/armor/trims/palettes/$name.webp"
done

# What can be worn on the head besides a helmet: mob skulls drawn from the mob's own
# texture, and the carved pumpkin drawn as the block.
note "converting heads"
mkdir -p "$STAGE/armor/heads" "$STAGE/armor/pumpkin"
for pair in skeleton:skeleton/skeleton wither_skeleton:skeleton/wither_skeleton zombie:zombie/zombie \
            creeper:creeper/creeper piglin:piglin/piglin dragon:enderdragon/dragon; do
    src="$ASSETS/minecraft/textures/entity/${pair#*:}.png"
    if [ -f "$src" ]; then
        cwebp -quiet -lossless "$src" -o "$STAGE/armor/heads/${pair%%:*}.webp"
    fi
done
for pair in front:carved_pumpkin side:pumpkin_side top:pumpkin_top; do
    src="$ASSETS/minecraft/textures/block/${pair#*:}.png"
    if [ -f "$src" ]; then
        cwebp -quiet -lossless "$src" -o "$STAGE/armor/pumpkin/${pair%%:*}.webp"
    fi
done

note "installing into public/dezerx/mc"
mkdir -p "$PUB/img"
rm -rf "$PUB/anim" "$PUB/hud" "$PUB/skin" "$PUB/armor"
cp -a "$STAGE/anim" "$STAGE/hud" "$STAGE/skin" "$STAGE/armor" "$PUB/"
cp -a "$STAGE/atlas.webp" "$STAGE/glint.webp" "$PUB/"
cp -a "$STAGE/img/packpng.webp" "$PUB/img/packpng.webp"
cp "$OUT/atlas/atlas.json" "$INDEX"

# Match whatever owns the rest of the panel's public tree.
if [ -e "$PANEL_DIR/public/dezerx" ]; then
    owner="$(stat -c '%u:%g' "$PANEL_DIR/public/dezerx" 2>/dev/null || true)"
    [ -n "$owner" ] && chown -R "$owner" "$PUB" 2>/dev/null || true
fi

printf '\n  done — %s icons, %s animated, %s HUD sprites, %s armour textures\n' \
    "$(python3 -c "import json;print(len(json.load(open('$INDEX'))['ids']))")" \
    "$(ls "$PUB/anim" | wc -l)" \
    "$(find "$PUB/hud" -name '*.webp' | wc -l)" \
    "$(find "$PUB/armor" -name '*.webp' | wc -l)"
printf '  atlas %s\n\n' "$(du -h "$PUB/atlas.webp" | cut -f1)"
printf '  Rebuild the front-end to pick up the new index:  yarn build:production\n\n'
