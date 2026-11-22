import React, { useEffect, useState } from 'react';
import { cn } from '@/dezerx/lib/cn';

interface Props {
    shortname: string;
    alt?: string;
    className?: string;
    fallbackClassName?: string;
}

const SHORTNAME_ALIASES: Record<string, string> = {
    'wall.external.high.wood': 'wall.external.high',
    'backpack.small': 'smallbackpack',
    'backpack.large': 'largebackpack',
    'wooden.ladder': 'ladder.wooden.wall',
    crossbox: 'crossbow',
    medkit: 'largemedkit',
    m249: 'lmg.m249',
    landmine: 'trap.landmine',
    flashlight: 'flashlight.held',
};

export default function RustItemImage({ shortname, alt, className, fallbackClassName }: Props) {
    const [sourceIndex, setSourceIndex] = useState<number>(0);
    const [hasError, setHasError] = useState<boolean>(false);

    const normalized = SHORTNAME_ALIASES[shortname] || shortname;

    useEffect(() => {
        setSourceIndex(0);
        setHasError(false);
    }, [normalized]);

    const sources = [
        `https://wiki.rustclash.com/img/items180/${encodeURIComponent(normalized)}.png`,
        `https://rustlabs.com/img/items180/${encodeURIComponent(normalized)}.png`,
        `https://files.facepunch.com/rust/item/${encodeURIComponent(normalized)}_512.png`,
    ];

    const handleError = () => {
        if (sourceIndex < sources.length - 1) {
            setSourceIndex((prev) => prev + 1);
        } else {
            setHasError(true);
        }
    };

    if (hasError || !normalized) {
        return (
            <span
                className={cn(
                    'flex select-none items-center justify-center text-ink-faint',
                    fallbackClassName || className || 'h-8 w-8'
                )}
                title={alt || shortname}
            >
                <svg viewBox={'0 0 100 100'} className={'h-full w-full'} aria-hidden={'true'}>
                    <text
                        x={'50'}
                        y={'50'}
                        textAnchor={'middle'}
                        dominantBaseline={'central'}
                        fontSize={'52'}
                        fontWeight={'600'}
                        fill={'currentColor'}
                    >
                        ?
                    </text>
                </svg>
            </span>
        );
    }

    return (
        <img
            src={sources[sourceIndex]}
            alt={alt || shortname}
            className={cn('pointer-events-none select-none object-contain drop-shadow', className)}
            onError={handleError}
            loading={'lazy'}
        />
    );
}
