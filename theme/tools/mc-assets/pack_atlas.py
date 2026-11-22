#!/usr/bin/env python3
"""Pack renderchest output into a single sprite atlas.

Renderchest writes one image per item, which is correct for its CSS library but
leaves ~1800 files in public/. Every one of them is a separate request and a
separate 4K disk block for a few hundred bytes of payload. This packs them into
one atlas plus an ordered index, so a slot draws a background-position instead
of fetching its own file.
"""

import json
import math
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

# Namespaces renderchest emits, and the key prefix each one gets in the index.
# Plain minecraft items keep their bare id so existing lookups keep working.
NAMESPACES = [
    ("minecraft", ""),
    ("mobheads", "head/"),
    ("_armor_trims", "trim/"),
    ("_decorated_pot", "pot/"),
    ("_leather_armor", "leather/"),
    ("_crossbow", "bow/"),
    ("renderchest", "rc/"),
]


def is_animated(path):
    """Animated textures (sculk, prismarine, command blocks) stay as their own
    files - an atlas cell can only hold one frame."""
    head = open(path, "rb").read(24)

    return head[12:16] == b"VP8X" and bool(head[20] & 0x02)


def read_pam(path):
    """Decode one webp to raw RGBA via dwebp's PAM output."""
    raw = subprocess.run(
        ["dwebp", "-quiet", "-pam", path, "-o", "-"],
        check=True,
        stdout=subprocess.PIPE,
    ).stdout

    header_end = raw.index(b"ENDHDR\n") + 7
    header = raw[:header_end].decode("ascii")

    fields = {}
    for line in header.splitlines():
        parts = line.split()
        if len(parts) == 2:
            fields[parts[0]] = parts[1]

    width = int(fields["WIDTH"])
    height = int(fields["HEIGHT"])
    depth = int(fields["DEPTH"])

    if depth != 4:
        raise ValueError(f"{path}: expected RGBA, got depth {depth}")

    return width, height, raw[header_end:]


def collect(roots):
    """Find every rendered icon across the namespaces, keyed for the index."""
    found = {}

    for root in roots:
        items = os.path.join(root, "items")
        if not os.path.isdir(items):
            continue

        for namespace, prefix in NAMESPACES:
            folder = os.path.join(items, namespace)
            if not os.path.isdir(folder):
                continue

            for entry in os.listdir(folder):
                if not entry.endswith(".webp"):
                    continue

                key = prefix + entry[: -len(".webp")]
                # Later roots win, but nothing should collide across namespaces.
                found[key] = os.path.join(folder, entry)

    return found


def main():
    if len(sys.argv) < 4:
        print("usage: pack_atlas.py <out-dir> <cell-size> <renderchest-dir>...")
        return 1

    out_dir = sys.argv[1]
    cell = int(sys.argv[2])
    roots = sys.argv[3:]

    found = collect(roots)
    if not found:
        print("no icons found", file=sys.stderr)
        return 1

    animated = sorted(key for key in found if is_animated(found[key]))

    keys = sorted(key for key in found if key not in set(animated))
    count = len(keys)

    cols = math.ceil(math.sqrt(count))
    rows = math.ceil(count / cols)

    width = cols * cell
    height = rows * cell
    canvas = bytearray(width * height * 4)

    print(f"packing {count} icons into {cols}x{rows} cells ({width}x{height})")

    # Decoding dominates; dwebp releases the GIL so threads actually help.
    with ThreadPoolExecutor(max_workers=8) as pool:
        decoded = list(pool.map(lambda k: read_pam(found[k]), keys))

    stride = width * 4

    for index, (src_w, src_h, pixels) in enumerate(decoded):
        if src_w != cell or src_h != cell:
            raise ValueError(f"{keys[index]}: expected {cell}px, got {src_w}x{src_h}")

        col = index % cols
        row = index // cols
        left = col * cell * 4
        top = row * cell

        for y in range(cell):
            dst = (top + y) * stride + left
            src = y * cell * 4
            canvas[dst : dst + cell * 4] = pixels[src : src + cell * 4]

    os.makedirs(out_dir, exist_ok=True)

    pam_path = os.path.join(out_dir, "atlas.pam")
    with open(pam_path, "wb") as handle:
        handle.write(
            f"P7\nWIDTH {width}\nHEIGHT {height}\nDEPTH 4\nMAXVAL 255\n"
            f"TUPLTYPE RGB_ALPHA\nENDHDR\n".encode("ascii")
        )
        handle.write(canvas)

    atlas_path = os.path.join(out_dir, "atlas.webp")
    subprocess.run(
        ["cwebp", "-quiet", "-lossless", "-z", "9", "-mt", pam_path, "-o", atlas_path],
        check=True,
    )
    os.remove(pam_path)

    anim_dir = os.path.join(out_dir, "anim")
    os.makedirs(anim_dir, exist_ok=True)

    for key in animated:
        with open(found[key], "rb") as src:
            with open(os.path.join(anim_dir, key.replace("/", "_") + ".webp"), "wb") as dst:
                dst.write(src.read())

    index_path = os.path.join(out_dir, "atlas.json")
    with open(index_path, "w") as handle:
        json.dump(
            {"cell": cell, "cols": cols, "rows": rows, "ids": keys, "animated": animated},
            handle,
            separators=(",", ":"),
        )

    anim_bytes = sum(os.path.getsize(os.path.join(anim_dir, f)) for f in os.listdir(anim_dir))

    print(f"atlas  {atlas_path}  {os.path.getsize(atlas_path):,} bytes")
    print(f"index  {index_path}  {os.path.getsize(index_path):,} bytes")
    print(f"anim   {len(animated)} files  {anim_bytes:,} bytes")

    return 0


if __name__ == "__main__":
    sys.exit(main())
