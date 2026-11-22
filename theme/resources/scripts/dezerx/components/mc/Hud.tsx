import React, { memo, useEffect, useState } from 'react';
import { cn } from '@/dezerx/lib/cn';
import { Atlas, findIcon, GLINT, HUD, iconStyle, loadAtlas } from '@/dezerx/components/mc/textures';
import { useT } from '@/i18n';

export type Fill = 'full' | 'half' | 'empty';

function Sprite({ src, alt = '', className }: { src: string; alt?: string; className?: string }) {
    return (
        <img
            src={src}
            alt={alt}
            aria-hidden={alt === '' ? 'true' : undefined}
            draggable={false}
            style={{ imageRendering: 'pixelated' }}
            className={cn('h-[26px] w-[26px] shrink-0 select-none', className)}
        />
    );
}

function halves(value: number, icons: number): Fill[] {
    const points = Math.max(0, Math.round(value));

    return Array.from({ length: icons }, (_, index) => {
        const filled = points - index * 2;

        return filled >= 2 ? 'full' : filled === 1 ? 'half' : 'empty';
    });
}

const PER_ROW = 10;

const ROW = 'grid w-full max-w-[269px] grid-cols-10 gap-px';

function Cell({ back, front }: { back: string; front?: string | null }) {
    return (
        <span className={'relative aspect-square w-full'}>
            <Sprite src={back} className={'absolute inset-0 h-full w-full'} />
            {front ? <Sprite src={front} className={'absolute inset-0 h-full w-full'} /> : null}
        </span>
    );
}

export function RowSpacer() {
    return (
        <div className={ROW} aria-hidden={'true'}>
            <span className={'aspect-square w-full'} />
        </div>
    );
}

export interface HeartSlot {
    kind: 'health' | 'absorption';
    fill: Fill;
}

const HEART_CAP = 50;

function asPoints(value: number): number {
    return Number.isFinite(value) ? Math.max(0, Math.ceil(value)) : 0;
}

export function heartSlots(health: number, maxHealth: number, absorption: number): HeartSlot[] {
    const held = asPoints(health);
    const extra = asPoints(absorption);
    const most = Math.max(2, asPoints(maxHealth), held);

    const red = Math.ceil(most / 2);
    const gold = Math.ceil(extra / 2);

    const slots: HeartSlot[] = [];

    for (let index = 0; index < Math.min(red + gold, HEART_CAP); index++) {
        const isHealth = index < red;
        const at = isHealth ? index * 2 : (index - red) * 2;
        const of = isHealth ? held : extra;

        slots.push({
            kind: isHealth ? 'health' : 'absorption',
            fill: at >= of ? 'empty' : at + 1 === of ? 'half' : 'full',
        });
    }

    return slots;
}

function heartSource(slot: HeartSlot, hardcore: boolean): string | null {
    if (slot.fill === 'empty') {
        return null;
    }

    const prefix = slot.kind === 'absorption' ? 'absorbing_' : '';

    return `${HUD}/heart/${prefix}${hardcore ? 'hardcore_' : ''}${slot.fill}.webp`;
}

export function inRows(slots: HeartSlot[]): HeartSlot[][] {
    const rows: HeartSlot[][] = [];

    for (let at = 0; at < slots.length; at += PER_ROW) {
        rows.push(slots.slice(at, at + PER_ROW));
    }

    return rows.reverse();
}

export const HeartRow = memo(function HeartRow({
    health,
    maxHealth = 20,
    absorption = 0,
    hardcore = false,
}: {
    health: number;
    maxHealth?: number;
    absorption?: number;
    hardcore?: boolean;
}) {
    const rows = inRows(heartSlots(health, maxHealth, absorption));
    const extra = asPoints(absorption);
    const container = `${HUD}/heart/${hardcore ? 'container_hardcore' : 'container'}.webp`;

    const label = `${Math.round(health)} health${extra > 0 ? `, ${extra} absorption` : ''}`;

    return (
        <div className={'flex w-full max-w-[269px] flex-col gap-px'} role={'img'} aria-label={label}>
            {rows.map((row, index) => (
                <div key={index} className={ROW}>
                    {row.map((slot, at) => (
                        <Cell key={at} back={container} front={heartSource(slot, hardcore)} />
                    ))}
                </div>
            ))}
        </div>
    );
});

export const HungerRow = memo(function HungerRow({ food }: { food: number }) {
    return (
        <div className={ROW} role={'img'} aria-label={`${Math.round(food)} hunger`}>
            {halves(food, PER_ROW).map((fill, index) => (
                <Cell
                    key={index}
                    back={`${HUD}/food_empty.webp`}
                    front={fill === 'empty' ? null : `${HUD}/food_${fill}.webp`}
                />
            ))}
        </div>
    );
});

export const ArmorRow = memo(function ArmorRow({ points }: { points: number }) {
    if (points <= 0) {
        return null;
    }

    return (
        <div className={ROW} role={'img'} aria-label={`${Math.round(points)} armour`}>
            {halves(points, PER_ROW).map((fill, index) => (
                <Cell
                    key={index}
                    back={`${HUD}/armor_empty.webp`}
                    front={fill === 'empty' ? null : `${HUD}/armor_${fill}.webp`}
                />
            ))}
        </div>
    );
});

export const XpBar = memo(function XpBar({ progress }: { progress: number }) {
    const t = useT();
    const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);

    return (
        <div className={'flex items-center'}>
            <div
                className={'relative h-[14px] w-full overflow-hidden'}
                role={'progressbar'}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label={t('hud.xpProgress')}
            >
                <img
                    src={`${HUD}/experience_bar_background.webp`}
                    alt={''}
                    aria-hidden={'true'}
                    draggable={false}
                    style={{ imageRendering: 'pixelated' }}
                    className={'absolute inset-0 h-full w-full select-none'}
                />
                <img
                    src={`${HUD}/experience_bar_progress.webp`}
                    alt={''}
                    aria-hidden={'true'}
                    draggable={false}
                    style={{ imageRendering: 'pixelated', clipPath: `inset(0 ${100 - percent}% 0 0)` }}
                    className={'absolute inset-0 h-full w-full select-none'}
                />
            </div>
        </div>
    );
});

const ICON = 42;

function Glint() {
    return (
        <span
            aria-hidden={'true'}
            className={'animate-enchant pointer-events-none absolute motion-reduce:animate-none'}
            style={{
                width: '200%',
                height: '200%',
                top: '-50%',
                left: '-50%',
                imageRendering: 'pixelated',
                mixBlendMode: 'screen',
                opacity: 0.6,
                backgroundImage: `url(${GLINT})`,
                backgroundSize: '512px 512px',
                filter: 'blur(2px) contrast(200%)',
                transform: 'rotate(-8deg)',
            }}
        />
    );
}

export const McItem = memo(function McItem({
    id,
    count,
    damage,
    maxDamage,
    enchanted,
}: {
    id: string;
    count: number;
    damage?: number | null;
    maxDamage?: number | null;
    enchanted?: boolean;
}) {
    const [atlas, setAtlas] = useState<Atlas | null>(null);

    useEffect(() => {
        let live = true;

        void loadAtlas().then((loaded) => {
            if (live) {
                setAtlas(loaded);
            }
        });

        return () => {
            live = false;
        };
    }, []);

    const icon = atlas === null ? null : findIcon(atlas, id);

    const worn = typeof damage === 'number' && typeof maxDamage === 'number' && maxDamage > 0 && damage > 0;

    const left = worn ? Math.max(0, 1 - (damage as number) / (maxDamage as number)) : 1;

    return (
        <span className={'relative flex h-full w-full items-center justify-center'}>
            {atlas === null || icon === null ? (
                atlas === null ? null : (
                    <span aria-hidden={'true'} className={'select-none font-mono text-xl font-bold text-[#4a4a4a]'}>
                        {'?'}
                    </span>
                )
            ) : (
                <span
                    aria-hidden={'true'}
                    className={'relative select-none'}
                    style={{
                        width: `${ICON}px`,
                        height: `${ICON}px`,
                        ...iconStyle(atlas, icon, ICON, enchanted === true),
                    }}
                >
                    {enchanted && <Glint />}
                </span>
            )}

            {count > 1 && (
                <span
                    className={
                        'pointer-events-none absolute bottom-[2px] right-[2px] font-minecraft text-[18px] leading-none text-white'
                    }
                    style={{
                        WebkitTextStrokeWidth: '0.5px',
                        WebkitTextStrokeColor: '#000',
                        paintOrder: 'stroke fill',
                        textShadow: '1px 0 0 #000, -1px 0 0 #000, 0 1px 0 #000, 0 -1px 0 #000, 2px 2px 0 #3f3f3f',
                    }}
                >
                    {count}
                </span>
            )}

            {worn && (
                <span
                    aria-hidden={'true'}
                    className={'absolute bottom-[4px] left-1/2 h-[6px] w-[34px] -translate-x-1/2 bg-black'}
                >
                    <span
                        className={'absolute left-0 top-0 h-[3px]'}
                        style={{
                            width: `${left * 100}%`,
                            background: `hsl(${Math.round(left * 120)} 100% 45%)`,
                        }}
                    />
                </span>
            )}
        </span>
    );
});
