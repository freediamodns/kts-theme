import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { UserRound } from 'lucide-react';
import { getPlayerCape, getPlayerSkin, playerTextureUrl } from '@/api/server/players';
import type { InventoryItem } from '@/dezerx/components/mc/Inventory';
import type { ArmorSlot, Equipment, PlayerScene } from '@/dezerx/components/mc/playerScene';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

const WORN: Record<number, ArmorSlot> = {
    103: 'head',
    102: 'chest',
    101: 'legs',
    100: 'feet',
};

function outfitOf(server: string, items: InventoryItem[]): string {
    const worn: Equipment = {};

    for (const item of items) {
        const slot = WORN[item.slot];

        if (slot) {
            worn[slot] = {
                id: item.id,
                color: item.color ?? null,
                enchanted: item.enchanted,
                trim: item.trim ?? null,
                skull: item.skull ? playerTextureUrl(server, item.skull) : null,
            };
        }
    }

    return JSON.stringify(worn);
}

export const PlayerModel = memo(function PlayerModel({
    server,
    player,
    name,
    items,
    className,
}: {
    server: string;
    player: string;
    name: string | null;
    items: InventoryItem[];
    className?: string;
}) {
    const t = useT();
    const host = useRef<HTMLDivElement>(null);
    const [scene, setScene] = useState<PlayerScene | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

    const outfit = outfitOf(server, items);
    const equipment = useMemo(() => JSON.parse(outfit) as Equipment, [outfit]);

    useEffect(() => {
        const element = host.current;

        if (!element) {
            return;
        }

        const controller = new AbortController();
        let created: PlayerScene | null = null;
        let seen: IntersectionObserver | null = null;
        let sized: ResizeObserver | null = null;

        setState('loading');

        Promise.all([
            import(/* webpackChunkName: "player-model" */ '@/dezerx/components/mc/playerScene'),
            getPlayerSkin(server, player, controller.signal),
        ])
            .then(async ([module, skin]) => {
                if (controller.signal.aborted) {
                    return;
                }

                const model = module.createPlayerScene(element.clientWidth, element.clientHeight);

                created = model;
                model.canvas.className = 'block touch-none';
                element.appendChild(model.canvas);

                seen = new IntersectionObserver(([entry]) => model.setActive(entry?.isIntersecting ?? false));
                seen.observe(element);

                sized = new ResizeObserver(() => model.setSize(element.clientWidth, element.clientHeight));
                sized.observe(element);

                setScene(model);

                await model.setSkin(skin.image, skin.slim);

                if (!controller.signal.aborted) {
                    setState('ready');
                }

                if (skin.cape) {
                    getPlayerCape(server, player, controller.signal)
                        .then((cape) => model.setCape(cape))
                        .catch(() => undefined);
                }
            })
            .catch((error) => {
                if (!controller.signal.aborted && !axios.isCancel(error)) {
                    setState('failed');
                }
            });

        return () => {
            controller.abort();
            seen?.disconnect();
            sized?.disconnect();
            created?.dispose();
            setScene(null);
        };
    }, [server, player]);

    useEffect(() => {
        void scene?.setEquipment(equipment);
    }, [scene, equipment]);

    return (
        <div
            role={'img'}
            aria-label={t('players.model', { name: name ?? t('common.unknown') })}
            title={state === 'ready' ? t('players.modelHint') : undefined}
            className={cn(
                'relative shrink-0 overflow-hidden rounded-[2px] border-2 bg-[#000000]',
                'border-b-[#ffffff] border-l-[#373737] border-r-[#ffffff] border-t-[#373737]',
                className
            )}
        >
            <div
                ref={host}
                className={cn(
                    'absolute inset-0 cursor-grab transition-opacity duration-500 active:cursor-grabbing motion-reduce:transition-none',
                    state === 'ready' ? 'opacity-100' : 'opacity-0'
                )}
            />

            {state === 'failed' && (
                <UserRound className={'absolute inset-0 m-auto h-10 w-10 text-white/20'} aria-hidden={'true'} />
            )}
        </div>
    );
});
