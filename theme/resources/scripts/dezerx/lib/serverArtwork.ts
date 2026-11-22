import type { Server } from '@/api/server/getServer';
import type { EggArt, ThemeConfig } from '@/dezerx/lib/panelTheme';

export interface ResolvedArt {
    image: string;
    imageLight: string;
    logo: string | null;
}

const ART_KEYWORDS: ReadonlyArray<[string, string]> = [
    ['paper', 'paper'],
    ['purpur', 'paper'],
    ['pufferfish', 'paper'],
    ['spigot', 'paper'],
    ['bukkit', 'paper'],
    ['fabric', 'fabric'],
    ['quilt', 'fabric'],
    ['neoforge', 'neoforge'],
    ['forge', 'forge'],
    ['bungeecord', 'bungeecord'],
    ['waterfall', 'bungeecord'],
    ['velocity', 'bungeecord'],
    ['vanilla', 'vanilla'],
    ['sponge', 'vanilla'],
    ['minecraft', 'vanilla'],
];

export function shippedArtSet(eggName: string | undefined): string | null {
    if (!eggName) {
        return null;
    }

    const name = eggName.toLowerCase();

    for (const [keyword, slug] of ART_KEYWORDS) {
        if (name.includes(keyword)) {
            return slug;
        }
    }

    return null;
}

export function shippedArt(slug: string): ResolvedArt {
    return {
        image: `/dezerx/eggs/bg/${slug}.webp`,
        imageLight: `/dezerx/eggs/bg/light/${slug}.webp`,
        logo: `/dezerx/eggs/${slug}.webp`,
    };
}

export function resolveEggArt(uuid: string | undefined, name: string | undefined, theme: ThemeConfig): ResolvedArt {
    const configured: EggArt | undefined = uuid
        ? theme['servers.eggArt'].find((row) => row.egg === uuid)
        : undefined;

    const slug = shippedArtSet(name);
    const shipped = slug ? shippedArt(slug) : null;

    return {
        image: configured?.image || shipped?.image || theme['servers.defaultArt'],
        imageLight:
            configured?.imageLight ||
            shipped?.imageLight ||
            theme['servers.defaultArtLight'] ||
            theme['servers.defaultArt'],
        logo: configured?.logo || shipped?.logo || null,
    };
}

export function resolveArt(server: Server, theme: ThemeConfig): ResolvedArt {
    return resolveEggArt(server.egg?.uuid, server.egg?.name, theme);
}
