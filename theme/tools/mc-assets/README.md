# Minecraft assets

The player manager draws Minecraft item icons, HUD sprites and the default
skins. **None of that artwork ships with the theme** — Mojang's assets are theirs
to distribute, not ours. It is generated on your own server instead, from a
Minecraft client jar downloaded straight from Mojang.

The installer runs this for you. If it was skipped — no network, or `php-imagick`
could not be installed — run it yourself at any time:

```bash
cd /var/www/pterodactyl
tools/mc-assets/fetch.sh
yarn build:production
```

## What it needs

- PHP 8.1+ with **`ext-imagick`** (`apt install php8.3-imagick`, for whichever
  version your panel runs — never the plain `php-imagick`, which pulls in your
  distro's default PHP and can take `/usr/bin/php` away from the panel)
- `cwebp` (`apt install webp`)
- composer, curl, unzip, python3
- Outbound access to `piston-meta.mojang.com` and `repo.packagist.org`

The script sorts imagick out itself where it can: it renders with whichever PHP
on the machine actually loads the extension — not always the default `php` —
enables the module for the CLI when the package is installed but was never wired
up, replaces it when its files have gone missing or refuse to load, and puts
back the ImageMagick runtime it links against. If it still cannot find a working
one it prints the state of every PHP on the machine, any library the module is
missing, and what PHP itself says about imagick, so the remaining fix is a short
one. Note that `apt` reporting `php8.3-imagick is already the newest version` is
not proof it works — the module can be installed and still be unloadable, which
is the case that message hides.

## Options

```bash
MC_VERSION=1.21.4 tools/mc-assets/fetch.sh   # pin a Minecraft version
SIZE=64 tools/mc-assets/fetch.sh             # sharper icons, ~2.4x the bytes
RC_VERSION='^5.3' tools/mc-assets/fetch.sh   # a different renderchest release
```

`SIZE=32` is the default and matches the panel's icon display size. 64 looks
better on high-DPI screens but takes the atlas from ~870 KB to ~2 MB, and it is
fetched in full the first time someone opens the player manager.

The renderchest version is pinned to `^5.2.0@beta`, because that is the first
release that reads Minecraft's current armour-trim palettes; the newest *stable*
renderchest still stops on a trimmed item with `Cannot resolve file locator
minecraft:textures/trim/quartz.png`. Changing `RC_VERSION` re-installs it — the
cached copy under `/tmp/stark-mc-assets` is keyed on the constraint.

## Until it has run

The panel works fine — item slots just show a `?` placeholder instead of an
icon, the HUD bars are blank and the player model wears no armour. Nothing
errors and nothing blocks the build.

## What it produces

```
public/dezerx/mc/
  atlas.webp    every static item icon in one sprite sheet
  glint.webp    the enchantment glint texture
  anim/         the ~19 items whose textures animate in game
  hud/          hearts, hunger, armour, air, xp bar
  skin/         the default Steve and Alex skins
  armor/        worn armour, trims, elytra, mob heads, the carved pumpkin and the
                armour glint, for the player model
  img/          the default pack icon
resources/scripts/dezerx/components/mc/
  atlas.json    the atlas index — rebuild the front-end after this changes
```

Icons are rendered with [`aternos/renderchest`](https://github.com/aternosorg/renderchest)
(MIT), which draws Minecraft's real block models — including chests and shulker
boxes, whose models are hard-coded in the game and unreachable by resource packs.

Intermediates are cached under `/tmp/stark-mc-assets` so a re-run at a different
size skips the download. Safe to delete.
