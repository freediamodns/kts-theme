# Languages

One JSON file per language. The filename is the locale code, the file is the
catalogue, and nothing else in the panel has to be told the language exists.

```
en.json     English   (the reference — every other file falls back to it)
fr.json     Français
```

## Adding one

1. Copy `en.json` to the new locale code — `de.json`, `pt-BR.json`, `ar.json`.
2. Set `$meta` (see below), translate the values, leave the keys alone.
3. Rebuild: `yarn build` (or `yarn build:production`).

That is the whole procedure. The registry walks this folder at build time, so
the new language appears in the picker in the panel header — and in the drawer
on a phone, and beside the theme controls on the sign-in page — with its own
name and its own flag, sorted in with the rest.

## `$meta`

Every field is optional. Anything left out is worked out from the locale code:
the name from `Intl.DisplayNames`, the flag from the region subtag (or the
language's home country), the direction from the language.

```json
{
    "$meta": {
        "name": "Deutsch",
        "english": "German",
        "flag": "de",
        "dir": "ltr"
    }
}
```

| Field     | What it is                                                              |
| --------- | ----------------------------------------------------------------------- |
| `name`    | The language's name **in that language**. What the picker shows.         |
| `english` | The English name, for the tooltip and the `aria-label`.                  |
| `flag`    | ISO 3166-1 alpha-2, lowercase. Drives the `fi-xx` class in `flags.css`.  |
| `dir`     | `ltr` or `rtl`. Applied to `<html dir>` when the language is chosen.     |

`en.json` says `"flag": "gb"` because there is no flag for a language, only for
a country — pick whichever one your users would expect.

## Partial translations are fine

Missing keys fall back to English one key at a time, so a half-finished
catalogue is a usable language rather than a broken panel. The picker measures
each file against `en.json` and shows a percentage next to anything under 95%.

## Plurals

i18next picks the form from the count, using the language's own rules:

```json
{
    "backups": {
        "stored_one": "{{used}} of {{count}} backup stored for this server.",
        "stored_other": "{{used}} of {{count}} backups stored for this server."
    }
}
```

English needs `_one` and `_other`. French also has `_many` (used from a million
up), Polish and Russian have `_few`, Arabic has all six — give a language every
form it uses, or the missing one falls through to English. `count` is reserved
by i18next for the number that chooses the form; any other value you want to
interpolate needs a different name.

## Interpolation and markup

`{{name}}` is a placeholder — keep every one that appears in the English string,
in whatever order the translated sentence needs.

A few strings carry markup, written as tags that map to real elements:

```json
{
    "features": {
        "eula": {
            "body": "… Pressing <accept>I accept</accept> writes <file>eula=true</file> …"
        }
    }
}
```

Translate the text between the tags and leave the tags themselves alone.

## Where the strings come from

Most of the panel reads its own catalogue. Three things do not, and are
translated by key with the server's English as the fallback, so a panel running
an older or newer API still reads correctly:

- `properties.fields.*` — the `server.properties` descriptions the API sends.
- `users.groupNames`, `users.groupDescriptions`, `users.permissions.*` — the
  subuser permission list.
- Anything an administrator typed into the theme editor — custom nav labels,
  sidebar links, notices. That is their text, in whichever language they wrote
  it, and the panel leaves it exactly as written.

## Flags

`fi fi-xx` classes come from `resources/scripts/dezerx/flags.css`, generated
from the SVGs the panel already ships in `public/dezerx/flags/`. To regenerate
it after adding a flag there:

```bash
{
  sed -n '1,33p' resources/scripts/dezerx/flags.css
  ls public/dezerx/flags | sed 's/\.svg$//' | sort | while read -r c; do
    printf ".fi-%s {\n    background-image: url('/dezerx/flags/%s.svg');\n}\n\n" \
      "$(echo "$c" | tr 'A-Z' 'a-z')" "$c"
  done
} > /tmp/flags.css && mv /tmp/flags.css resources/scripts/dezerx/flags.css
```
