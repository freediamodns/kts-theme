import { CSSProperties } from 'react';

const ROOT = '/dezerx/mc';

export const ATLAS = `${ROOT}/atlas.webp`;

export const GLINT = `${ROOT}/glint.webp`;

export const HUD = `${ROOT}/hud`;

export interface Atlas {
    cell: number;
    cols: number;
    rows: number;
    index: Map<string, number>;
    animated: Set<string>;
}

interface AtlasFile {
    cell: number;
    cols: number;
    rows: number;
    ids: string[];
    animated: string[];
}

const EMPTY: Atlas = {
    cell: 0,
    cols: 0,
    rows: 0,
    index: new Map(),
    animated: new Set(),
};

let cache: Atlas | null = null;
let pending: Promise<Atlas> | null = null;

export function loadAtlas(): Promise<Atlas> {
    if (cache) {
        return Promise.resolve(cache);
    }

    if (!pending) {
        pending = import(/* webpackChunkName: "mc-items" */ './atlas.json')
            .then((module) => {
                const data = ((module as { default?: AtlasFile }).default ?? module) as unknown as AtlasFile;

                cache = {
                    cell: data.cell,
                    cols: data.cols,
                    rows: data.rows,
                    index: new Map(data.ids.map((id, at) => [id, at])),
                    animated: new Set(data.animated),
                };

                return cache;
            })
            .catch(() => {
                cache = EMPTY;

                return cache;
            });
    }

    return pending;
}

export function bareId(id: string): string {
    return id.replace('minecraft:', '');
}

export type Icon = { kind: 'sprite'; at: number } | { kind: 'animated'; src: string };

export function findIcon(atlas: Atlas, id: string): Icon | null {
    const bare = bareId(id);

    if (atlas.animated.has(bare)) {
        return { kind: 'animated', src: `${ROOT}/anim/${bare}.webp` };
    }

    const at = atlas.index.get(bare);

    return at === undefined ? null : { kind: 'sprite', at };
}

export function iconStyle(atlas: Atlas, icon: Icon, size: number, masked = false): CSSProperties {
    const image = icon.kind === 'animated' ? `url(${icon.src})` : `url(${ATLAS})`;

    const dimensions =
        icon.kind === 'animated' ? `${size}px ${size}px` : `${atlas.cols * size}px ${atlas.rows * size}px`;

    const position =
        icon.kind === 'animated'
            ? '0 0'
            : `${-(icon.at % atlas.cols) * size}px ${-Math.floor(icon.at / atlas.cols) * size}px`;

    return {
        backgroundImage: image,
        backgroundSize: dimensions,
        backgroundPosition: position,
        imageRendering: 'pixelated',
        ...(masked
            ? {
                  WebkitMaskImage: image,
                  maskImage: image,
                  WebkitMaskSize: dimensions,
                  maskSize: dimensions,
                  WebkitMaskPosition: position,
                  maskPosition: position,
              }
            : null),
    };
}
