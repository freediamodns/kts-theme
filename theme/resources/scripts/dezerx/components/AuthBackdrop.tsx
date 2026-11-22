import React, { CSSProperties } from 'react';
import { cn } from '@/dezerx/lib/cn';
import { useTheme } from '@/dezerx/lib/theme';
import GameShowcase from '@/dezerx/components/GameShowcase';
import {
    authFocus,
    authMask,
    authVeil,
    authWallArt,
    usePanelTheme,
    type AuthArt,
    type ThemeConfig,
} from '@/dezerx/lib/panelTheme';

function Blob({ className, style }: { className?: string; style?: CSSProperties }) {
    return <span aria-hidden={'true'} style={style} className={cn('absolute rounded-full blur-[80px]', className)} />;
}

function Gradient() {
    return (
        <div className={'absolute inset-0'}>
            <div
                className={'absolute inset-0'}
                style={{
                    backgroundImage:
                        'radial-gradient(120% 90% at 78% 8%, rgb(from var(--accent) r g b / 0.42) 0%, transparent 62%),' +
                        'radial-gradient(90% 80% at 10% 96%, rgb(from var(--accent-alt) r g b / 0.34) 0%, transparent 58%)',
                }}
            />
        </div>
    );
}

function Aurora() {
    return (
        <div className={'absolute inset-0'}>
            <Blob
                className={'dz-aurora left-[-10%] top-[-18%] h-[38rem] w-[38rem] opacity-60'}
                style={{ backgroundColor: 'rgb(from var(--accent) r g b / 0.55)' }}
            />
            <Blob
                className={'dz-aurora dz-aurora-slow bottom-[-22%] right-[-8%] h-[34rem] w-[34rem] opacity-50'}
                style={{ backgroundColor: 'rgb(from var(--accent-alt) r g b / 0.5)' }}
            />
            <Blob
                className={'dz-aurora dz-aurora-delayed left-[38%] top-[42%] h-[26rem] w-[26rem] opacity-40'}
                style={{ backgroundColor: 'rgb(from var(--accent-glow) r g b / 0.45)' }}
            />
        </div>
    );
}

function Mesh() {
    return (
        <div className={'absolute inset-0'}>
            <Blob
                className={'left-[-6%] top-[-12%] h-[26rem] w-[26rem]'}
                style={{ backgroundColor: 'rgb(from var(--accent) r g b / 0.5)' }}
            />
            <Blob
                className={'right-[-10%] top-[18%] h-[30rem] w-[30rem]'}
                style={{ backgroundColor: 'rgb(from var(--accent-alt) r g b / 0.42)' }}
            />
            <Blob
                className={'bottom-[-14%] left-[22%] h-[28rem] w-[28rem]'}
                style={{ backgroundColor: 'rgb(from var(--chart-2) r g b / 0.38)' }}
            />
            <Blob
                className={'bottom-[6%] right-[26%] h-[20rem] w-[20rem]'}
                style={{ backgroundColor: 'rgb(from var(--accent-glow) r g b / 0.34)' }}
            />
        </div>
    );
}

function Beams() {
    return (
        <div className={'absolute inset-0 overflow-hidden'}>
            <div
                className={'dz-beams absolute inset-[-40%]'}
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(102deg,' +
                        'transparent 0px, transparent 58px,' +
                        'rgb(from var(--accent) r g b / 0.16) 58px, rgb(from var(--accent) r g b / 0.16) 96px,' +
                        'transparent 96px, transparent 190px,' +
                        'rgb(from var(--accent-alt) r g b / 0.1) 190px, rgb(from var(--accent-alt) r g b / 0.1) 214px)',
                }}
            />

            <div
                className={'absolute inset-0'}
                style={{
                    backgroundImage:
                        'radial-gradient(90% 70% at 62% 6%, rgb(from var(--accent) r g b / 0.28) 0%, transparent 68%)',
                }}
            />
        </div>
    );
}

function Grid() {
    return <div className={'absolute inset-0 bg-grid bg-grid opacity-50'} />;
}

function Picture({ theme }: { theme: ThemeConfig }) {
    const palette = useTheme();
    const src = (palette === 'light' && theme['auth.imageLight']) || theme['auth.image'];

    if (src === '') {
        return null;
    }

    const blur = theme['auth.blur'];

    return (
        <div
            className={'absolute inset-0'}
            style={{
                backgroundImage: `url("${src}")`,
                backgroundSize: 'cover',
                backgroundPosition: authFocus(theme['auth.focus']),
                backgroundRepeat: 'no-repeat',
                ...(blur > 0 ? { filter: `blur(${blur}px)`, transform: 'scale(1.06)' } : {}),
            }}
        />
    );
}

function Wallpaper({ theme }: { theme: ThemeConfig }) {
    const blur = theme['auth.blur'];

    return (
        <div
            className={'wallpaper-base absolute inset-0'}
            style={blur > 0 ? { filter: `blur(${blur}px)`, transform: 'scale(1.06)' } : undefined}
        />
    );
}

export default function AuthBackdrop({
    placement,
    className,
    flip = false,
}: {
    placement: AuthArt;
    className?: string;
    flip?: boolean;
}) {
    const theme = usePanelTheme();
    const kind = theme['auth.backdrop'];

    if (placement === 'none' || kind === 'solid') {
        return null;
    }

    const mask = authMask(theme['auth.mask'], placement);

    const veiled = kind === 'image' || kind === 'wallpaper';

    return (
        <div
            aria-hidden={'true'}
            className={cn(
                'pointer-events-none absolute -inset-px overflow-hidden',
                flip && '-scale-x-100',
                className
            )}
            style={
                mask
                    ? {
                          maskImage: mask.image,
                          WebkitMaskImage: mask.image,
                          ...(mask.composite
                              ? { maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }
                              : {}),
                      }
                    : undefined
            }
        >
            <div className={cn('absolute -inset-px', flip && '-scale-x-100')}>
                {kind === 'games' && (
                    <GameShowcase
                        columns={theme['auth.wallColumns']}
                        speed={theme['auth.wallSpeed']}
                        tilt={theme['auth.wallTilt']}
                        art={authWallArt(theme['auth.wallArt'])}
                        mask={''}
                    />
                )}

                {kind === 'image' && <Picture theme={theme} />}
                {kind === 'wallpaper' && <Wallpaper theme={theme} />}
                {kind === 'gradient' && <Gradient />}
                {kind === 'aurora' && <Aurora />}
                {kind === 'mesh' && <Mesh />}
                {kind === 'beams' && <Beams />}
                {kind === 'grid' && <Grid />}

                {veiled && theme['auth.dim'] > 0 && (
                    <div className={'absolute inset-0'} style={{ backgroundColor: authVeil(theme['auth.dim']) }} />
                )}
            </div>
        </div>
    );
}

export { AuthBackdrop };
