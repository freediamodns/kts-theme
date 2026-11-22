import React from 'react';
import { cn } from '@/dezerx/lib/cn';
import { linkIcon } from '@/dezerx/lib/linkIcons';
import type { QuickLinkArt } from '@/dezerx/lib/panelTheme';

const FRAME = 'pointer-events-none absolute -bottom-10 -right-8 h-36 w-36 text-promo-ink/70';

const DISCORD_MARK =
    'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z';

const FLAME =
    'M12 2.2c.9 2.6 2.5 4 4 5.6 1.7 1.7 3 3.6 3 6.4a7 7 0 0 1-14 0c0-2.2.9-3.9 2.2-5.4.3.7.8 1.3 1.5 1.6.5-2.9 1.9-5.7 3.3-8.2Z';

const FLAME_CORE = 'M12 11.2c.8 1.4 1.5 2 2.1 2.9.5.7.8 1.5.8 2.4a2.9 2.9 0 0 1-5.8 0c0-1.6 1.2-3 2.9-5.3Z';

const SPARKS: Array<{ x: number; y: number; r: number; d: string }> = [
    { x: 5.6, y: 7.4, r: 0.5, d: '0s' },
    { x: 18.4, y: 6.2, r: 0.42, d: '.7s' },
    { x: 7.2, y: 3.4, r: 0.34, d: '1.4s' },
    { x: 16.6, y: 10.4, r: 0.3, d: '2.1s' },
    { x: 3.8, y: 12.2, r: 0.36, d: '2.8s' },
];

export function Globe({ className, dark }: { className?: string; dark?: boolean }) {
    return (
        <span aria-hidden={'true'} className={cn('globe relative block', className)}>
            <span className={cn('globe-map block', dark && '[filter:brightness(0)]')} />
        </span>
    );
}

function OutlineArt({ icon }: { icon: string }) {
    const Icon = linkIcon(icon);

    return (
        <Icon
            aria-hidden={'true'}
            className={cn(
                FRAME,
                'stroke-promo-ink/70 [stroke-dasharray:0.6_2.6] [stroke-linecap:round] [stroke-width:1.4]'
            )}
        />
    );
}

function DiscordArt() {
    return (
        <svg viewBox={'0 0 24 24'} aria-hidden={'true'} className={cn(FRAME, 'card-art-bob fill-promo-ink/70')}>
            <path d={DISCORD_MARK} />
        </svg>
    );
}

function FireArt() {
    return (
        <svg viewBox={'0 0 24 24'} aria-hidden={'true'} className={cn(FRAME, 'card-art-fire')}>
            <defs>
                <pattern id={'dz-fire-dots'} width={'1.5'} height={'1.5'} patternUnits={'userSpaceOnUse'}>
                    <circle cx={'0.75'} cy={'0.75'} r={'0.34'} fill={'currentColor'} />
                </pattern>
            </defs>

            <g className={'card-art-flicker'} style={{ transformOrigin: '50% 78%' }}>
                <path d={FLAME} fill={'url(#dz-fire-dots)'} />
                <path
                    d={FLAME}
                    fill={'none'}
                    stroke={'currentColor'}
                    strokeWidth={0.9}
                    strokeLinecap={'round'}
                    strokeLinejoin={'round'}
                    strokeDasharray={'0.5 2.2'}
                />
                <path d={FLAME_CORE} fill={'url(#dz-fire-dots)'} opacity={0.9} />
            </g>

            {SPARKS.map((spark) => (
                <circle
                    key={`${spark.x}-${spark.y}`}
                    cx={spark.x}
                    cy={spark.y}
                    r={spark.r}
                    fill={'currentColor'}
                    className={'card-art-spark'}
                    style={{ animationDelay: spark.d }}
                />
            ))}
        </svg>
    );
}

export default function CardArt({ art, icon, dark = false }: { art: QuickLinkArt; icon: string; dark?: boolean }) {
    switch (art) {
        case 'globe':
            return (
                <Globe
                    dark={dark}
                    className={'pointer-events-none absolute -bottom-12 -right-12 h-36 w-36 opacity-80'}
                />
            );
        case 'outline':
            return <OutlineArt icon={icon} />;
        case 'discord':
            return <DiscordArt />;
        case 'fire':
            return <FireArt />;
        default:
            return null;
    }
}
