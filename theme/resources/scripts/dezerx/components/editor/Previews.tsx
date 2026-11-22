import React, { ComponentType, CSSProperties } from 'react';
import { Bell, CheckCircle2, FolderClosed, Rocket, Server, Settings, X } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { iconStyle, toastSurface, type IconFamily, type IconSet } from '@/dezerx/lib/panelTheme';
import { useIconSet } from '@/dezerx/icons/runtime';
import { TOAST_TONE_COLOR, ToastGlow } from '@/dezerx/components/ui/Toast';
import { Button } from '@/dezerx/components/ui/Button';
import { Input } from '@/dezerx/components/ui/Input';
import AuthLayout from '@/dezerx/layouts/AuthLayout';

const FRAME = 'relative h-[84px] w-full overflow-hidden rounded-xl bg-base ring-1 ring-line-field';

const LUCIDE_SAMPLES: Record<string, ComponentType<{ className?: string }>> = {
    Server,
    FolderClosed,
    Settings,
};

function Fill({ className }: { className?: string }) {
    return <span aria-hidden={'true'} className={cn('block rounded-[2px] bg-ink/15', className)} />;
}

function Mark({ className }: { className?: string }) {
    return <span aria-hidden={'true'} className={cn('block rounded-[2px] bg-accent', className)} />;
}

const WALLPAPER_BLOCKS = ['bg-ink/25', 'bg-accent/60', 'bg-ink/10', 'bg-ink/40', 'bg-ink/15', 'bg-accent/30'];

function Wallpaper({ className, style }: { className?: string; style?: CSSProperties }) {
    return (
        <span aria-hidden={'true'} style={style} className={cn('grid grid-cols-3 grid-rows-2', className)}>
            {WALLPAPER_BLOCKS.map((tone, index) => (
                <span key={index} className={cn('block', tone)} />
            ))}
        </span>
    );
}

function Rows({ count = 3, active = -1 }: { count?: number; active?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, index) =>
                index === active ? (
                    <Mark key={index} className={'h-1.5 w-full opacity-80'} />
                ) : (
                    <Fill key={index} className={'h-1.5 w-full'} />
                )
            )}
        </>
    );
}

function SidebarPreview({ value }: { value: string }) {
    const railed = value === 'rail';

    return (
        <div className={cn(FRAME, 'flex gap-1.5 p-1.5')}>
            <div
                className={cn(
                    'flex shrink-0 flex-col gap-1.5 bg-card p-1.5',
                    railed ? 'w-5' : value === 'compact' ? 'w-8' : 'w-11',
                    value === 'floating' && 'rounded-lg',
                    value === 'bordered' && 'border-r border-ink/25'
                )}
            >
                <Mark className={'h-1.5 w-full'} />
                <Rows count={railed ? 4 : 3} />
            </div>

            <div className={'flex flex-1 flex-col gap-1.5 rounded-md bg-card p-2'}>
                <Fill className={'h-2 w-2/3'} />
                <Fill className={'h-full w-full'} />
            </div>
        </div>
    );
}

function ActivePreview({ value }: { value: string }) {
    const row = 'flex h-5 items-center gap-2 rounded-md px-2';

    const quiet = (
        <span aria-hidden={'true'} className={row}>
            <Fill className={'h-2 w-2 shrink-0 rounded-[3px]'} />
            <Fill className={'h-1.5 flex-1'} />
        </span>
    );

    return (
        <div className={cn(FRAME, 'flex items-center justify-center p-3')}>
            <span aria-hidden={'true'} className={'flex w-32 flex-col gap-1 rounded-lg bg-card p-1.5'}>
                {quiet}

                <span
                    className={cn(
                        row,
                        'relative',
                        value === 'pill' && 'bg-accent/40',
                        value === 'bar' && 'bg-accent/20',
                        value === 'glow' && 'bg-accent/20 ring-1 ring-accent',
                        value === 'solid' && 'bg-accent',
                        value === 'gradient' && 'bg-gradient-to-r from-accent/50 to-transparent'
                    )}
                >
                    {value === 'bar' && (
                        <Mark className={'absolute -left-1.5 top-1/2 h-3 w-[3px] -translate-y-1/2 rounded-full'} />
                    )}

                    {value === 'dot' && <Mark className={'h-1.5 w-1.5 shrink-0 rounded-full'} />}

                    {value !== 'dot' && (
                        <span
                            className={cn(
                                'block h-2 w-2 shrink-0 rounded-[3px]',
                                value === 'solid' ? 'bg-base/70' : 'bg-accent'
                            )}
                        />
                    )}

                    <span
                        className={cn(
                            'block h-1.5 flex-1 rounded-[2px]',
                            value === 'solid' ? 'bg-base/70' : 'bg-accent'
                        )}
                    />

                    {value === 'underline' && <Mark className={'absolute inset-x-2 bottom-0 h-[2px]'} />}
                </span>

                {quiet}
            </span>
        </div>
    );
}

function SearchPreview({ value }: { value: string }) {
    return (
        <div className={cn(FRAME, 'flex flex-col gap-1.5 p-2')}>
            <div className={'flex items-center gap-1'}>
                <span
                    aria-hidden={'true'}
                    className={cn(
                        'block h-2.5 bg-ink/20',
                        value === 'pill' ? 'rounded-full' : 'rounded-[3px]',
                        value === 'wide' ? 'flex-1' : 'w-1/2'
                    )}
                />
                {value !== 'wide' && <Fill className={'ml-auto h-2.5 w-2.5 rounded-full'} />}
            </div>

            <Fill className={'h-3.5 w-full'} />
            <Fill className={'h-3.5 w-full'} />
        </div>
    );
}

function BorderPreview({ value }: { value: string }) {
    return (
        <div className={cn(FRAME, 'flex items-center justify-center p-3')}>
            <span
                aria-hidden={'true'}
                className={cn(
                    'flex h-14 w-full flex-col gap-1.5 rounded-lg bg-card p-2.5',
                    value === 'none' && 'border border-transparent',
                    value === 'subtle' && 'border border-ink/10',
                    value === 'strong' && 'border border-ink/30',
                    value === 'accent' && 'border border-accent'
                )}
            >
                <Fill className={'h-1.5 w-1/2'} />
                <Fill className={'h-1.5 w-full'} />
                <Fill className={'h-1.5 w-4/5'} />
            </span>
        </div>
    );
}

function ShadowPreview({ value }: { value: string }) {
    return (
        <div className={cn(FRAME, 'flex items-center justify-center p-2')}>
            <span
                aria-hidden={'true'}
                style={{
                    boxShadow:
                        value === 'none'
                            ? 'none'
                            : value === 'soft'
                            ? '0 4px 10px -6px rgb(0 0 0 / 0.5)'
                            : value === 'deep'
                            ? '0 10px 18px -8px rgb(0 0 0 / 0.75)'
                            : '0 4px 10px -5px rgb(0 0 0 / 0.4)',
                }}
                className={'flex h-14 w-full flex-col gap-1.5 rounded-lg bg-card p-2.5'}
            >
                <Fill className={'h-1.5 w-1/2'} />
                <Fill className={'h-1.5 w-full'} />
                <Fill className={'h-1.5 w-4/5'} />
            </span>
        </div>
    );
}

function LogoPreview({ value }: { value: string }) {
    return (
        <div className={cn(FRAME, 'flex items-center justify-center gap-1.5 p-2')}>
            {value !== 'text' && <Mark className={'h-6 w-6 shrink-0 rounded-md'} />}
            {value !== 'image' && (
                <span className={'flex flex-col gap-1'}>
                    <Fill className={'h-1.5 w-10'} />
                    <Fill className={'h-1 w-6'} />
                </span>
            )}
        </div>
    );
}

const CARD_ANIMATIONS: Record<string, string> = {
    fade: 'dz-card-fade',
    rise: 'dz-card-rise',
    slide: 'dz-card-slide',
    zoom: 'dz-card-zoom',
};

function RowAnimationPreview({ value }: { value: string }) {
    const animation = CARD_ANIMATIONS[value];

    return (
        <div className={cn(FRAME, 'flex flex-col gap-1.5 overflow-hidden p-2')}>
            {Array.from({ length: 3 }).map((_, index) => (
                <span
                    key={`${value}:${index}`}
                    aria-hidden={'true'}
                    style={
                        animation === undefined
                            ? undefined
                            : { animationDelay: `${index * 220}ms`, animationDuration: '900ms' }
                    }
                    className={cn(
                        'flex flex-1 items-center gap-2 rounded-md bg-card px-2',
                        animation,
                        animation !== undefined && '[animation-iteration-count:infinite]'
                    )}
                >
                    <Fill className={'h-4 w-4 shrink-0 rounded-sm bg-accent/40'} />
                    <Fill className={'h-1.5 w-1/2'} />
                </span>
            ))}
        </div>
    );
}

function AddonCardsPreview({ value }: { value: string }) {
    if (value === 'tiles') {
        return (
            <div className={cn(FRAME, 'grid grid-cols-3 gap-1.5 p-2')}>
                {Array.from({ length: 6 }).map((_, index) => (
                    <span
                        key={index}
                        aria-hidden={'true'}
                        className={'flex flex-col items-center justify-center gap-1 rounded-md bg-card p-1'}
                    >
                        <Fill className={'h-3 w-3 rounded-sm bg-accent/40'} />
                        <Fill className={'h-1 w-3/4'} />
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div className={cn(FRAME, 'flex flex-col gap-1.5 p-2')}>
            {Array.from({ length: 3 }).map((_, index) => (
                <span
                    key={index}
                    aria-hidden={'true'}
                    className={'flex flex-1 items-center gap-2 rounded-md bg-card px-2'}
                >
                    <Fill className={'h-4 w-4 shrink-0 rounded-sm bg-accent/40'} />
                    <span className={'flex min-w-0 flex-1 flex-col gap-1'}>
                        <Fill className={'h-1.5 w-1/2'} />
                        <Fill className={'h-1 w-3/4'} />
                    </span>
                    <Fill className={'h-2 w-5 shrink-0 rounded-sm'} />
                </span>
            ))}
        </div>
    );
}

function RowsPreview({ value }: { value: string }) {
    if (value === 'tile') {
        return (
            <div className={cn(FRAME, 'grid grid-cols-2 gap-1.5 p-2')}>
                {Array.from({ length: 4 }).map((_, index) => (
                    <span
                        key={index}
                        aria-hidden={'true'}
                        className={'flex flex-col justify-end gap-1 rounded-md bg-card p-1.5'}
                    >
                        <Fill className={'h-1.5 w-3/4 bg-accent/40'} />
                        <Fill className={'h-1.5 w-1/2'} />
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div className={cn(FRAME, 'flex flex-col gap-1.5 p-2')}>
            {Array.from({ length: 2 }).map((_, index) => (
                <span
                    key={index}
                    aria-hidden={'true'}
                    className={'flex flex-1 items-center gap-2 rounded-md bg-card px-2'}
                >
                    <Fill className={'h-5 w-8 shrink-0 rounded-sm bg-accent/40'} />
                    <span className={'flex min-w-0 flex-1 flex-col gap-1'}>
                        <Fill className={'h-1.5 w-1/2'} />
                        <Fill className={'h-1.5 w-3/4'} />
                    </span>
                </span>
            ))}
        </div>
    );
}

function ButtonPreview({ value }: { value: string }) {
    return (
        <div className={cn(FRAME, 'flex items-center justify-center')}>
            <span
                aria-hidden={'true'}
                className={cn(
                    'relative flex h-7 w-24 items-center justify-center overflow-hidden rounded-lg bg-accent',
                    value === 'lift' && '-translate-y-[4px] shadow-panel',
                    value === 'grow' && 'scale-110',
                    value === 'press' && 'translate-y-[3px]',
                    value === 'pulse' && 'ring-[6px] ring-accent/30'
                )}
            >
                <span className={'block h-1.5 w-10 rounded-[2px] bg-base/60'} />

                {value === 'glint' && <span className={'absolute inset-y-0 left-1/2 w-3 -skew-x-12 bg-base/40'} />}
                {value === 'slide' && <span className={'absolute inset-y-0 left-0 w-1/2 bg-base/25'} />}
            </span>
        </div>
    );
}

function TransitionPreview({ value }: { value: string }) {
    return (
        <div className={cn(FRAME, 'flex items-center gap-1 p-2')}>
            <span aria-hidden={'true'} className={'block h-6 w-1/3 shrink-0 rounded-sm bg-ink/10'} />
            <span
                aria-hidden={'true'}
                className={cn(
                    'block h-8 flex-1 rounded-sm bg-accent',
                    value === 'none' && 'opacity-90',
                    value === 'fade' && 'opacity-40',
                    value === 'rise' && 'translate-y-1.5 opacity-70',
                    value === 'slide' && 'translate-x-2 opacity-70',
                    value === 'scale' && 'scale-90 opacity-70',
                    value === 'blur' && 'opacity-70 blur-[3px]'
                )}
            />
        </div>
    );
}

function CornerPreview({ value }: { value: string }) {
    const [side, edge] = value.split('-');

    return (
        <div className={cn(FRAME, 'p-1.5')}>
            <Fill className={'h-full w-full'} />

            <span
                aria-hidden={'true'}
                className={cn(
                    'absolute h-3 w-6 rounded-sm bg-accent',
                    side === 'top' ? 'top-1.5' : 'bottom-1.5',
                    edge === 'left' && 'left-1.5',
                    edge === 'right' && 'right-1.5',
                    edge === 'center' && 'left-1/2 -translate-x-1/2'
                )}
            />
        </div>
    );
}

function AiCornerPreview({ value }: { value: string }) {
    return (
        <div className={cn(FRAME, 'p-1.5')}>
            <Fill className={'h-full w-full'} />

            {value !== 'off' && (
                <span
                    aria-hidden={'true'}
                    className={cn(
                        'absolute bottom-1.5 h-4 w-4 rounded-md bg-accent',
                        value === 'bottom-left' ? 'left-1.5' : 'right-1.5'
                    )}
                />
            )}
        </div>
    );
}

function RadiusPreview({ value }: { value: string }) {
    return (
        <div className={cn(FRAME, 'flex items-center justify-center')}>
            <span
                aria-hidden={'true'}
                style={{ borderRadius: `${Number(value) || 0}px` }}
                className={'block h-14 w-24 bg-accent/25 ring-1 ring-accent'}
            />
        </div>
    );
}

function AlphaPreview({ value }: { value: string }) {
    const alpha = Math.max(0, Math.min(100, Number(value) || 0)) / 100;

    return (
        <div className={cn(FRAME, 'flex items-center justify-center p-2')}>
            <Wallpaper className={'absolute inset-2 rounded-md'} />
            <span
                aria-hidden={'true'}
                style={{ opacity: alpha }}
                className={'relative block h-14 w-4/5 rounded-lg bg-card'}
            />
        </div>
    );
}

function BlurPreview({ value }: { value: string }) {
    const blur = Math.max(0, Math.min(24, Number(value) || 0));

    return (
        <div className={cn(FRAME, 'flex items-center justify-center p-2')}>
            <Wallpaper style={{ filter: `blur(${blur / 2}px)` }} className={'absolute inset-2 rounded-md'} />
            <span aria-hidden={'true'} className={'relative block h-14 w-4/5 rounded-lg bg-card/60'} />
        </div>
    );
}

function VeilPreview({ value }: { value: string }) {
    const veil = Math.max(0, Math.min(100, Number(value) || 0)) / 100;

    return (
        <div className={cn(FRAME, 'overflow-hidden')}>
            <Wallpaper className={'absolute inset-0'} />
            <span aria-hidden={'true'} style={{ opacity: veil }} className={'absolute inset-0 bg-base'} />
            <span aria-hidden={'true'} className={'absolute inset-2 rounded-md bg-card/70'} />
        </div>
    );
}

function WallBlurPreview({ value }: { value: string }) {
    const blur = Math.max(0, Math.min(24, Number(value) || 0));

    return (
        <div className={cn(FRAME, 'overflow-hidden')}>
            <Wallpaper
                style={{ filter: `blur(${blur / 1.6}px)`, transform: 'scale(1.2)' }}
                className={'absolute inset-0'}
            />
            <span aria-hidden={'true'} className={'absolute inset-2 rounded-md bg-card/70'} />
        </div>
    );
}

function WidthPreview({ value }: { value: string }) {
    return (
        <div className={cn(FRAME, 'flex gap-1 p-1')}>
            <div className={'flex w-6 shrink-0 flex-col gap-1.5 rounded-md bg-card p-1'}>
                <Rows count={3} />
            </div>

            <div className={'flex flex-1 justify-center'}>
                <span
                    aria-hidden={'true'}
                    className={cn(
                        'flex h-full flex-col gap-1 rounded-sm bg-card p-1',
                        value === 'contained' && 'w-1/2',
                        value === 'wide' && 'w-3/4',
                        value === 'full' && 'w-full'
                    )}
                >
                    <Fill className={'h-1.5 w-full'} />
                    <Fill className={'h-full w-full'} />
                </span>
            </div>
        </div>
    );
}

function ManagerModePreview({ value }: { value: string }) {
    if (value === 'navbar') {
        return (
            <div className={cn(FRAME, 'flex gap-1 p-1')}>
                <div className={'flex w-8 shrink-0 flex-col gap-1.5 bg-card p-1.5'}>
                    <Fill className={'h-1 w-full'} />
                    <Fill className={'h-1 w-full'} />
                </div>

                <div className={'flex flex-1 flex-col gap-1'}>
                    <span aria-hidden={'true'} className={'flex gap-1 rounded-sm bg-card p-1'}>
                        <Mark className={'h-1 flex-1'} />
                        <Fill className={'h-1 flex-1'} />
                        <Fill className={'h-1 flex-1'} />
                    </span>
                    <Fill className={'h-full w-full rounded-sm'} />
                </div>
            </div>
        );
    }

    if (value === 'merged') {
        return (
            <div className={cn(FRAME, 'flex gap-1 p-1')}>
                <div className={'flex w-11 shrink-0 flex-col gap-1.5 bg-card p-1.5'}>
                    <Mark className={'h-1 w-full'} />
                    <Rows count={4} />
                </div>

                <Fill className={'h-full flex-1 rounded-sm'} />
            </div>
        );
    }

    return (
        <div className={cn(FRAME, 'flex gap-1 p-1')}>
            <div className={'flex w-5 shrink-0 flex-col gap-1.5 bg-card p-1.5'}>
                <Rows count={3} />
            </div>

            <div className={'flex w-8 shrink-0 flex-col gap-1.5 bg-card p-1.5'}>
                <Mark className={'h-1 w-full'} />
                <Rows count={3} />
            </div>

            <Fill className={'h-full flex-1 rounded-sm'} />
        </div>
    );
}

function ShellPreview({ value }: { value: string }) {
    return (
        <div className={cn(FRAME, 'flex gap-1', value === 'flat' ? 'p-0' : 'p-1')}>
            <div
                className={cn(
                    'flex w-11 shrink-0 flex-col gap-1.5 bg-card p-1.5',
                    value === 'flat' && 'border-r border-ink/20'
                )}
            >
                <Mark className={'h-1 w-full'} />
                <Rows count={3} />
            </div>

            <div
                className={cn(
                    'flex flex-1 flex-col gap-1 bg-card p-1',
                    value === 'flat' ? 'rounded-none' : 'rounded-md'
                )}
            >
                <Fill className={'h-1.5 w-2/3'} />
                <Fill className={'h-full w-full'} />
            </div>
        </div>
    );
}

function ControlsPlacePreview({ value }: { value: string }) {
    const controls = (
        <span aria-hidden={'true'} className={'grid grid-cols-2 gap-0.5'}>
            <Mark className={'h-1.5 w-full'} />
            <Fill className={'h-1.5 w-full'} />
            <Fill className={'h-1.5 w-full'} />
            <Fill className={'h-1.5 w-full'} />
        </span>
    );

    return (
        <div className={cn(FRAME, 'flex gap-1 p-1')}>
            <div className={'flex w-8 shrink-0 flex-col gap-1 bg-card p-1'}>
                <Fill className={'h-1.5 w-full'} />
                {value === 'top' && controls}
                <Rows count={3} />
                {value === 'bottom' && (
                    <>
                        <span aria-hidden={'true'} className={'mt-auto block h-px w-full bg-ink/20'} />
                        {controls}
                    </>
                )}
            </div>

            <Fill className={'h-full flex-1 rounded-sm'} />
        </div>
    );
}

function MetricsPreview({ value }: { value: string }) {
    const tiles = (
        <span
            aria-hidden={'true'}
            className={cn(
                'grid gap-1',
                value === 'left' || value === 'right' ? 'w-8 shrink-0 grid-cols-1' : 'w-full grid-cols-4'
            )}
        >
            {Array.from({ length: 4 }).map((_, index) => (
                <Mark key={index} className={'h-2 w-full rounded-sm opacity-70'} />
            ))}
        </span>
    );

    const console = (
        <Fill className={cn('rounded-sm', value === 'left' || value === 'right' ? 'h-full flex-1' : 'h-8 w-full')} />
    );

    return (
        <div
            className={cn(FRAME, 'flex gap-1 p-1.5', value === 'above' || value === 'below' ? 'flex-col' : 'flex-row')}
        >
            {value === 'left' || value === 'above' ? (
                <>
                    {tiles}
                    {console}
                </>
            ) : (
                <>
                    {console}
                    {tiles}
                </>
            )}
        </div>
    );
}

function GraphPreview({ value }: { value: string }) {
    const spark = (
        <svg
            aria-hidden={'true'}
            viewBox={'0 0 100 40'}
            preserveAspectRatio={'none'}
            className={cn(
                'w-full text-accent',
                value === 'behind' ? 'absolute inset-x-0 bottom-0 h-full opacity-40' : 'mt-1 h-3'
            )}
        >
            <path
                d={'M 0,32 L 20,20 L 40,26 L 60,8 L 80,16 L 100,4'}
                fill={'none'}
                stroke={'currentColor'}
                strokeWidth={3}
                vectorEffect={'non-scaling-stroke'}
            />
        </svg>
    );

    return (
        <div className={cn(FRAME, 'flex items-center justify-center p-2')}>
            <span className={'relative block w-full overflow-hidden rounded-md bg-card p-1.5'}>
                {value === 'behind' && spark}

                <span className={'relative block'}>
                    <Fill className={'h-1 w-6'} />
                    <Mark className={'mt-1 h-2 w-10 opacity-80'} />
                    {value === 'under' && spark}
                </span>
            </span>
        </div>
    );
}

function ChartsPreview({ value }: { value: string }) {
    const charts = (
        <span aria-hidden={'true'} className={'grid w-full shrink-0 grid-cols-3 gap-1'}>
            {Array.from({ length: 3 }).map((_, index) => (
                <span key={index} className={'relative block h-4 overflow-hidden rounded-sm bg-card'}>
                    <svg
                        viewBox={'0 0 100 40'}
                        preserveAspectRatio={'none'}
                        className={'absolute inset-0 h-full w-full text-accent'}
                    >
                        <path
                            d={'M 0,30 L 25,14 L 50,24 L 75,6 L 100,18'}
                            fill={'none'}
                            stroke={'currentColor'}
                            strokeWidth={2}
                            vectorEffect={'non-scaling-stroke'}
                        />
                    </svg>
                </span>
            ))}
        </span>
    );

    if (value === 'off') {
        return (
            <div className={cn(FRAME, 'flex flex-col gap-1 p-1.5')}>
                <Fill className={'h-full w-full flex-1 rounded-sm'} />
                <span aria-hidden={'true'} className={'grid w-full shrink-0 grid-cols-4 gap-1'}>
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Mark key={index} className={'h-2.5 w-full rounded-sm opacity-70'} />
                    ))}
                </span>
            </div>
        );
    }

    return (
        <div className={cn(FRAME, 'flex flex-col gap-1 p-1.5')}>
            {value === 'above' ? (
                <>
                    {charts}
                    <Fill className={'h-full w-full flex-1 rounded-sm'} />
                </>
            ) : (
                <>
                    <Fill className={'h-full w-full flex-1 rounded-sm'} />
                    {charts}
                </>
            )}
        </div>
    );
}

function ChartStylePreview({ value }: { value: string }) {
    const heights = [40, 62, 30, 78, 52, 88, 46, 70];

    return (
        <div className={cn(FRAME, 'flex items-center justify-center p-2')}>
            <span className={'block w-full rounded-md bg-card p-1.5'}>
                <Fill className={'h-1 w-6'} />

                {value === 'bar' ? (
                    <span aria-hidden={'true'} className={'mt-1.5 flex h-6 items-end gap-[3px]'}>
                        {heights.map((height, index) => (
                            <span
                                key={index}
                                className={'block flex-1 rounded-sm bg-accent'}
                                style={{ height: `${height}%` }}
                            />
                        ))}
                    </span>
                ) : (
                    <svg
                        aria-hidden={'true'}
                        viewBox={'0 0 100 40'}
                        preserveAspectRatio={'none'}
                        className={'mt-1.5 h-6 w-full text-accent'}
                    >
                        <path
                            d={'M 0,32 L 20,20 L 40,26 L 60,8 L 80,16 L 100,4'}
                            fill={'none'}
                            stroke={'currentColor'}
                            strokeWidth={3}
                            vectorEffect={'non-scaling-stroke'}
                        />
                    </svg>
                )}
            </span>
        </div>
    );
}

function AvatarPreview({ value }: { value: string }) {
    const circle = 'h-8 w-8 shrink-0 overflow-hidden rounded-full bg-accent/20';
    const centred = `${circle} flex items-center justify-center`;
    const cells = `${circle} grid gap-[2px] p-1`;

    return (
        <div className={cn(FRAME, 'flex items-center gap-2.5 px-3')}>
            {value === 'initial' ? (
                <span aria-hidden={'true'} className={cn(centred, 'text-[13px] font-bold leading-none text-accent')}>
                    {'A'}
                </span>
            ) : value === 'identicon' ? (
                <span aria-hidden={'true'} className={cn(cells, 'grid-cols-3 grid-rows-3')}>
                    {[0, 1, 0, 1, 1, 1, 0, 1, 0].map((on, index) => (
                        <span key={index} className={cn('block rounded-[1px]', on ? 'bg-accent' : 'bg-transparent')} />
                    ))}
                </span>
            ) : value === 'retro' ? (
                <span aria-hidden={'true'} className={cn(cells, 'grid-cols-2 grid-rows-2')}>
                    {[1, 0, 0, 1].map((on, index) => (
                        <span key={index} className={cn('block', on ? 'bg-accent' : 'bg-accent/30')} />
                    ))}
                </span>
            ) : value === 'robohash' || value === 'dicebear' ? (
                <span aria-hidden={'true'} className={cn(centred, 'flex-col gap-[5px]')}>
                    <span className={'flex gap-1.5'}>
                        <span className={'block h-1.5 w-1.5 rounded-full bg-accent'} />
                        <span className={'block h-1.5 w-1.5 rounded-full bg-accent'} />
                    </span>
                    <span className={'block h-[3px] w-3 rounded-full bg-accent'} />
                </span>
            ) : (
                <span aria-hidden={'true'} className={cn(circle, 'relative block')}>
                    <span
                        className={'absolute left-1/2 top-[5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-accent'}
                    />
                    <span
                        className={'absolute -bottom-1 left-1/2 h-3.5 w-5 -translate-x-1/2 rounded-t-full bg-accent'}
                    />
                </span>
            )}

            <span className={'flex min-w-0 flex-1 flex-col gap-1.5'}>
                <Fill className={'h-1.5 w-2/3'} />
                <Fill className={'h-1.5 w-full'} />
            </span>
        </div>
    );
}

function MiniForm({ compact = false }: { compact?: boolean }) {
    return (
        <span className={'flex w-full flex-col gap-1'}>
            <Mark className={'h-1.5 w-5'} />
            {!compact && <Fill className={'h-1 w-8'} />}
            <Fill className={'h-2 w-full'} />
            <Fill className={'h-2 w-full'} />
            <Mark className={'h-2 w-full opacity-80'} />
        </span>
    );
}

function AuthLayoutPreview({ value }: { value: string }) {
    if (value === 'split' || value === 'split-reverse') {
        const flipped = value === 'split-reverse';

        return (
            <div className={cn(FRAME, 'flex', flipped && 'flex-row-reverse')}>
                <div className={'flex flex-1 items-center justify-center p-2.5'}>
                    <MiniForm />
                </div>

                <Wallpaper className={'h-full w-[46%]'} />
            </div>
        );
    }

    if (value === 'stacked') {
        return (
            <div className={cn(FRAME, 'flex flex-col')}>
                <Wallpaper className={'h-[38%] w-full'} />

                <div className={'flex flex-1 items-center justify-center px-6 py-2'}>
                    <MiniForm compact />
                </div>
            </div>
        );
    }

    if (value === 'hero') {
        return (
            <div className={cn(FRAME, 'flex items-center')}>
                <Wallpaper className={'absolute inset-0 h-full w-full opacity-40'} />

                <div className={'relative flex w-1/2 flex-col gap-1.5 p-2.5'}>
                    <Fill className={'h-2.5 w-full bg-ink/40'} />
                    <MiniForm compact />
                </div>
            </div>
        );
    }

    if (value === 'minimal') {
        return (
            <div className={cn(FRAME, 'flex items-center justify-center px-7')}>
                <MiniForm />
            </div>
        );
    }

    if (value === 'frame') {
        return (
            <div className={cn(FRAME, 'p-1.5')}>
                <div className={'flex h-full w-full overflow-hidden rounded-lg bg-card'}>
                    <div className={'flex flex-1 items-center justify-center p-2'}>
                        <MiniForm compact />
                    </div>

                    <Wallpaper className={'h-full w-[44%]'} />
                </div>
            </div>
        );
    }

    return (
        <div className={cn(FRAME, 'flex items-center justify-center')}>
            <Wallpaper className={'absolute inset-0 h-full w-full opacity-50'} />

            <div className={cn('relative w-[46%]', value === 'card' && 'rounded-lg bg-card p-2 shadow-panel')}>
                <MiniForm compact />
            </div>
        </div>
    );
}

const AUTH_SURFACES: Record<string, string> = {
    plain: '',
    card: 'rounded-lg bg-card p-2',
    glass: 'rounded-lg bg-card/50 p-2 ring-1 ring-ink/15',
    outline: 'rounded-lg p-2 ring-1 ring-ink/25',
    raised: 'rounded-lg bg-raised p-2 shadow-panel',
};

function AuthCardPreview({ value }: { value: string }) {
    return (
        <div className={cn(FRAME, 'flex items-center justify-center')}>
            <Wallpaper className={'absolute inset-0 h-full w-full opacity-35'} />

            <div className={cn('relative w-[52%]', AUTH_SURFACES[value] ?? '')}>
                <MiniForm compact />
            </div>
        </div>
    );
}

function WallColumn({ className }: { className?: string }) {
    return (
        <span className={cn('flex flex-col gap-1', className)}>
            <Fill className={'h-3 w-full bg-ink/30'} />
            <Fill className={'h-3 w-full bg-accent/40'} />
            <Fill className={'h-3 w-full bg-ink/20'} />
            <Fill className={'h-3 w-full bg-ink/35'} />
        </span>
    );
}

function AuthBackdropPreview({ value }: { value: string }) {
    if (value === 'games') {
        return (
            <div className={cn(FRAME, 'overflow-hidden')}>
                <span
                    className={'absolute inset-[-20%] flex gap-1 p-1'}
                    style={{ transform: 'perspective(300px) rotateX(10deg) rotateZ(-10deg) scale(1.15)' }}
                >
                    <WallColumn className={'flex-1'} />
                    <WallColumn className={'flex-1 -translate-y-1.5'} />
                    <WallColumn className={'flex-1 translate-y-1'} />
                    <WallColumn className={'flex-1 -translate-y-2'} />
                </span>
            </div>
        );
    }

    if (value === 'image' || value === 'wallpaper') {
        return (
            <div className={FRAME}>
                <Wallpaper className={'absolute inset-0 h-full w-full'} />
                {value === 'wallpaper' && <span className={'absolute inset-0 bg-base/40'} aria-hidden={'true'} />}
            </div>
        );
    }

    if (value === 'grid') {
        return <div className={cn(FRAME, 'bg-grid bg-grid opacity-90')} />;
    }

    if (value === 'solid') {
        return <div className={cn(FRAME, 'bg-card')} />;
    }

    if (value === 'beams') {
        return (
            <div className={FRAME}>
                <span
                    aria-hidden={'true'}
                    className={'absolute inset-[-30%]'}
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(102deg, transparent 0px, transparent 7px,' +
                            'rgb(from var(--accent) r g b / 0.4) 7px, rgb(from var(--accent) r g b / 0.4) 12px,' +
                            'transparent 12px, transparent 22px,' +
                            'rgb(from var(--accent-alt) r g b / 0.3) 22px, rgb(from var(--accent-alt) r g b / 0.3) 25px)',
                    }}
                />
            </div>
        );
    }

    if (value === 'gradient') {
        return (
            <div
                className={FRAME}
                style={{
                    backgroundImage:
                        'radial-gradient(110% 90% at 78% 6%, rgb(from var(--accent) r g b / 0.65) 0%, transparent 62%),' +
                        'radial-gradient(90% 80% at 8% 98%, rgb(from var(--accent-alt) r g b / 0.5) 0%, transparent 58%)',
                }}
            />
        );
    }

    const blobs =
        value === 'mesh'
            ? [
                  'left-[-14%] top-[-24%] h-10 w-10 bg-accent/60',
                  'right-[-12%] top-[10%] h-11 w-11 bg-accent-alt/50',
                  'bottom-[-22%] left-[24%] h-10 w-10 bg-chart-2/45',
                  'bottom-[6%] right-[28%] h-7 w-7 bg-accent-glow/45',
              ]
            : [
                  'left-[-16%] top-[-30%] h-14 w-14 bg-accent/55',
                  'bottom-[-34%] right-[-12%] h-12 w-12 bg-accent-alt/50',
              ];

    return (
        <div className={FRAME}>
            {blobs.map((blob) => (
                <span key={blob} aria-hidden={'true'} className={cn('absolute rounded-full blur-lg', blob)} />
            ))}
        </div>
    );
}

function IconSamples({ family, weight, tint }: { family: string; weight: number; tint: number }) {
    const style = iconStyle(family as IconFamily, weight, tint);

    return (
        <div className={cn(FRAME, 'flex items-center justify-center gap-3 text-ink')}>
            <Bell style={style} className={'h-6 w-6'} aria-hidden={'true'} />
            <FolderClosed style={style} className={'h-6 w-6'} aria-hidden={'true'} />
            <Rocket style={style} className={'h-6 w-6'} aria-hidden={'true'} />
        </div>
    );
}

function IconFamilyPreview({ value }: { value: string }) {
    return <IconSamples family={value} weight={100} tint={22} />;
}

function IconWeightPreview({ value }: { value: string }) {
    return <IconSamples family={'line'} weight={Number(value) || 100} tint={20} />;
}

const SET_SAMPLES = ['Server', 'FolderClosed', 'Settings'];

function IconSetPreview({ value }: { value: string }) {
    const glyphs = useIconSet(value as IconSet);

    return (
        <div className={cn(FRAME, 'flex items-center justify-center gap-3 text-ink')}>
            {SET_SAMPLES.map((name) => {
                const Glyph = glyphs?.[name] ?? LUCIDE_SAMPLES[name];

                return <Glyph key={name} className={'h-6 w-6'} aria-hidden={'true'} />;
            })}
        </div>
    );
}

const POWER_SWATCH: Record<string, [string, string, string, string]> = {
    default: [
        'bg-btn',
        'bg-overlay ring-1 ring-line',
        'bg-overlay ring-1 ring-line',
        'bg-transparent ring-1 ring-line',
    ],
    accent: ['bg-accent', 'bg-accent', 'bg-accent', 'bg-accent/20'],
    solid: ['bg-success', 'bg-warning', 'bg-danger', 'bg-ink/60'],
    soft: ['bg-success/25', 'bg-warning/25', 'bg-danger/25', 'bg-danger/15'],
    outline: [
        'bg-transparent ring-1 ring-success/60',
        'bg-transparent ring-1 ring-warning/60',
        'bg-transparent ring-1 ring-danger/60',
        'bg-transparent ring-1 ring-ink-faint/50',
    ],
};

function PowerActionsPreview({ value }: { value: string }) {
    const joined = value === 'true' || value === 'false';
    const fused = value === 'true';
    const swatch = POWER_SWATCH[joined ? 'solid' : value] ?? POWER_SWATCH.default;

    return (
        <div className={cn(FRAME, 'flex items-center justify-center p-3')}>
            <span className={cn('flex', fused ? 'gap-0 overflow-hidden rounded-md ring-1 ring-line-field' : 'gap-1.5')}>
                {swatch.map((tone, index) => (
                    <span
                        key={index}
                        aria-hidden={'true'}
                        className={cn('block h-4 w-9', tone, fused ? 'rounded-none' : 'rounded-md')}
                    />
                ))}
            </span>
        </div>
    );
}

function DialogPreview({ value }: { value: string }) {
    const classic = value === 'classic';
    const accent = value === 'accent';
    const sectioned = classic || accent;

    return (
        <div className={cn(FRAME, 'flex items-center justify-center p-2')}>
            <span
                aria-hidden={'true'}
                className={cn(
                    'flex w-4/5 flex-col overflow-hidden ring-1 ring-line-field',
                    classic ? 'rounded-md' : 'rounded-lg',
                    value === 'glass' ? 'bg-raised/60 backdrop-blur-sm' : 'bg-raised'
                )}
            >
                <span
                    className={cn(
                        'flex items-center px-2 py-1.5',
                        sectioned && 'border-b border-line-field',
                        accent && 'bg-accent/20'
                    )}
                >
                    <Fill className={cn('h-1.5 w-12', accent && 'bg-accent')} />
                </span>
                <span className={cn('flex flex-col gap-1 px-2', sectioned ? 'py-1.5' : 'pb-1')}>
                    <Fill className={'h-1 w-full'} />
                    <Fill className={'h-1 w-3/4'} />
                </span>
                <span
                    className={cn(
                        'flex justify-end gap-1 px-2 py-1.5',
                        sectioned && 'border-t border-line-field bg-card/60'
                    )}
                >
                    <Fill className={'h-2 w-6 rounded-sm'} />
                    <Mark className={'h-2 w-7 rounded-sm'} />
                </span>
            </span>
        </div>
    );
}

function DialogButtonsPreview({ value }: { value: string }) {
    const fused = value === 'true';

    return (
        <div className={cn(FRAME, 'flex items-center justify-center p-3')}>
            <span className={cn('flex', fused ? 'overflow-hidden rounded-md ring-1 ring-line-field' : 'gap-1.5')}>
                <span aria-hidden={'true'} className={cn('block h-4 w-12 bg-overlay', !fused && 'rounded-md')} />
                <Mark className={cn('h-4 w-14', fused ? 'rounded-none' : 'rounded-md')} />
            </span>
        </div>
    );
}

function NoticeDesignPreview({ value }: { value: string }) {
    const skin =
        value === 'edge'
            ? 'bg-card border-l-4 border-accent'
            : value === 'outline'
            ? 'bg-card ring-1 ring-accent/40'
            : value === 'plain'
            ? 'bg-card'
            : 'bg-accent/15';

    return (
        <div className={cn(FRAME, 'flex items-center p-3')}>
            <span className={cn('flex w-full items-start gap-2 rounded-md p-2.5', skin)}>
                <Mark className={'mt-0.5 h-2 w-2 shrink-0 rounded-full'} />

                <span className={'flex min-w-0 flex-1 flex-col gap-1.5'}>
                    <span className={'flex items-center justify-between gap-2'}>
                        <Fill className={'h-1.5 w-16'} />
                        <Mark className={'h-1.5 w-8 shrink-0'} />
                    </span>
                    <Fill className={'h-1 w-full'} />
                </span>
            </span>
        </div>
    );
}

const PREVIEWS: Record<string, ComponentType<{ value: string }>> = {
    powerActions: PowerActionsPreview,
    dialog: DialogPreview,
    dialogButtons: DialogButtonsPreview,
    noticeDesign: NoticeDesignPreview,
    iconSet: IconSetPreview,
    iconFamily: IconFamilyPreview,
    iconWeight: IconWeightPreview,
    authLayout: AuthLayoutPreview,
    authCard: AuthCardPreview,
    authBackdrop: AuthBackdropPreview,
    avatar: AvatarPreview,
    width: WidthPreview,
    veil: VeilPreview,
    wallBlur: WallBlurPreview,
    sidebar: SidebarPreview,
    active: ActivePreview,
    managerMode: ManagerModePreview,
    shell: ShellPreview,
    controlsPlace: ControlsPlacePreview,
    metrics: MetricsPreview,
    charts: ChartsPreview,
    chartStyle: ChartStylePreview,
    graph: GraphPreview,
    search: SearchPreview,
    rows: RowsPreview,
    addonCards: AddonCardsPreview,
    rowAnimation: RowAnimationPreview,
    button: ButtonPreview,
    transition: TransitionPreview,
    corner: CornerPreview,
    aiCorner: AiCornerPreview,
    radius: RadiusPreview,
    border: BorderPreview,
    shadow: ShadowPreview,
    logo: LogoPreview,
    alpha: AlphaPreview,
    blur: BlurPreview,
};

export function OptionPreview({ kind, value }: { kind: string; value: string }) {
    const Preview = PREVIEWS[kind];

    return Preview ? <Preview value={value} /> : null;
}

export function hasPreview(kind: string | undefined): boolean {
    return kind !== undefined && kind in PREVIEWS;
}

export function AuthPreviewContent() {
    return (
        <AuthLayout
            preview
            title={'Sign in'}
            subtitle={'Access your servers, consoles and files.'}
            pitch={{
                heading: 'Your servers. One panel.',
                body: 'Console, files, backups and player management - wrapped in an interface built for speed.',
            }}
            footer={<span className={'font-medium text-accent'}>{'Forgot your password?'}</span>}
        >
            <div className={'space-y-5'}>
                <Input label={'Username or email'} readOnly value={''} />
                <Input label={'Password'} type={'password'} readOnly value={''} />
                <Button fullWidth size={'lg'}>
                    {'Sign in'}
                </Button>
            </div>
        </AuthLayout>
    );
}

export function ToastSample({ glass, position }: { glass: boolean; position: string }) {
    const [side, edge] = position.split('-');

    return (
        <div className={'space-y-2'}>
            <div
                className={cn(
                    'relative flex items-center gap-3.5 overflow-hidden rounded-2xl px-4 py-3.5 shadow-panel',
                    toastSurface(glass)
                )}
            >
                <ToastGlow color={TOAST_TONE_COLOR.success} />

                <CheckCircle2
                    aria-hidden={'true'}
                    className={'relative h-6 w-6 shrink-0'}
                    style={{ color: TOAST_TONE_COLOR.success }}
                />

                <div className={'relative min-w-0 flex-1 pr-4'}>
                    <p className={'text-[12px] font-semibold text-ink'}>{'Saved'}</p>
                    <p className={'mt-0.5 text-[11px] text-ink-muted'}>{'This is how a toast will look.'}</p>
                </div>

                <X aria-hidden={'true'} className={'absolute right-2 top-2 h-3.5 w-3.5 shrink-0 text-ink-faint'} />

                <div
                    className={'absolute inset-x-0 bottom-0 h-1'}
                    style={{ backgroundColor: `rgb(from ${TOAST_TONE_COLOR.success} r g b / 0.15)` }}
                >
                    <div className={'h-full w-2/3 origin-left'} style={{ backgroundColor: TOAST_TONE_COLOR.success }} />
                </div>
            </div>

            <p className={'text-[11px] text-ink-faint'}>
                {`Appears ${side === 'top' ? 'at the top' : 'at the bottom'}${
                    edge === 'center' ? ', centred' : `, on the ${edge}`
                }.`}
            </p>
        </div>
    );
}
