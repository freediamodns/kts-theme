import React from 'react';
import { cn } from '@/dezerx/lib/cn';

interface Game {
    slug: string;
    name: string;
}

const GAMES: Game[] = [
    { slug: 'minecraft', name: 'Minecraft' },
    { slug: 'rust', name: 'Rust' },
    { slug: 'palworld', name: 'Palworld' },
    { slug: 'fivem', name: 'FiveM' },
    { slug: 'redm', name: 'RedM' },
    { slug: 'zomboid', name: 'Project Zomboid' },
    { slug: 'hytale', name: 'Hytale' },
    { slug: 'squad', name: 'Squad' },
    { slug: 'arma3', name: 'Arma 3' },
];

const SHIPPED: string[] = GAMES.map((game) => `/dezerx/games/${game.slug}.webp`);

const COPIES = 6;

const BLUR_STEPS = [
    { blur: 2, solid: 38, clear: 56 },
    { blur: 6, solid: 27, clear: 43 },
    { blur: 14, solid: 16, clear: 32 },
    { blur: 30, solid: 4, clear: 21 },
];

const WALKS: ReadonlyArray<{ stride: number; offset: number }> = [
    { stride: 1, offset: 0 },
    { stride: 2, offset: 3 },
    { stride: 4, offset: 7 },
    { stride: 5, offset: 1 },
    { stride: 3, offset: 5 },
];

function ordering(art: string[], columnIndex: number): string[] {
    const { stride, offset } = WALKS[columnIndex % WALKS.length]!;

    return art.map((_, i) => art[(offset + i * stride) % art.length] as string);
}

function GameCard({ src }: { src: string }) {
    return (
        <div
            className={cn(
                'mb-4 overflow-hidden rounded-2xl border border-line bg-card shadow-panel',
                'transition-transform duration-300 ease-out',
                'hover:-translate-y-2'
            )}
        >
            <img
                src={src}
                alt={''}
                width={460}
                height={215}
                loading={'eager'}
                decoding={'async'}
                className={'h-full w-full object-cover'}
                draggable={false}
            />
        </div>
    );
}

export interface GameShowcaseProps {
    className?: string;
    columns?: number;
    speed?: number;
    tilt?: boolean;
    art?: string[] | null;
    mask?: string;
}

export default function GameShowcase({
    className,
    columns = 4,
    speed = 52,
    tilt = true,
    art = null,
    mask = 'var(--wall-mask)',
}: GameShowcaseProps) {
    const covers = art && art.length > 0 ? art : SHIPPED;

    return (
        <div
            aria-hidden={'true'}
            className={cn('absolute -inset-px overflow-hidden', className)}
            style={
                mask
                    ? {
                          maskImage: mask,
                          WebkitMaskImage: mask,
                          maskComposite: 'intersect',
                          WebkitMaskComposite: 'source-in',
                      }
                    : undefined
            }
        >
            <div
                className={'absolute inset-0 flex items-start justify-center gap-4'}
                style={{
                    transform: tilt
                        ? 'perspective(1600px) rotateX(10deg) rotateZ(-10deg) scale(1.4)'
                        : 'scale(1.1)',
                }}
            >
                {Array.from({ length: Math.max(1, columns) }, (_, columnIndex) => {
                    const column = ordering(covers, columnIndex);

                    return (
                        <div
                            key={columnIndex}
                            className={'flex w-[200px] shrink-0 animate-scroll-y flex-col'}
                            style={{
                                animationDuration: `${speed + columnIndex * Math.max(4, Math.round(speed / 5))}s`,
                                animationDirection: columnIndex % 2 === 1 ? 'reverse' : 'normal',
                            }}
                        >
                            {Array.from({ length: COPIES }).flatMap((_, copy) =>
                                column.map((src, index) => <GameCard key={`${copy}-${index}-${src}`} src={src} />)
                            )}
                        </div>
                    );
                })}
            </div>

            {BLUR_STEPS.map(({ blur, solid, clear }) => {
                const gradient = `linear-gradient(97deg, #000 ${solid}%, transparent ${clear}%)`;

                return (
                    <div
                        key={blur}
                        className={'pointer-events-none absolute inset-0 hidden [.light_&]:block'}
                        style={{
                            backdropFilter: `blur(${blur}px)`,
                            WebkitBackdropFilter: `blur(${blur}px)`,
                            maskImage: gradient,
                            WebkitMaskImage: gradient,
                        }}
                    />
                );
            })}
        </div>
    );
}

export { GameShowcase, SHIPPED as SHIPPED_COVERS };
