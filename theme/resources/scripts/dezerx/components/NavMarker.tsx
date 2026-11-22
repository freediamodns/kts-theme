import React from 'react';
import { activeStyle, ActiveDesign } from '@/dezerx/lib/panelTheme';
import { cn } from '@/dezerx/lib/cn';

export function ActiveMarker({ design, horizontal = false }: { design: ActiveDesign; horizontal?: boolean }) {
    const marker = activeStyle(design).marker;

    if (marker === 'bar') {
        if (horizontal) {
            return null;
        }

        return (
            <span
                aria-hidden={'true'}
                className={'absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent'}
            />
        );
    }

    if (marker === 'underline') {
        return (
            <span
                aria-hidden={'true'}
                className={cn(
                    'absolute inset-x-3 h-0.5 rounded-full bg-accent',
                    horizontal ? '-bottom-1.5' : 'bottom-1'
                )}
            />
        );
    }

    return null;
}

export function LeadingDot({ design, rail = false }: { design: ActiveDesign; rail?: boolean }) {
    if (rail || activeStyle(design).marker !== 'dot') {
        return null;
    }

    return <span aria-hidden={'true'} className={'h-1.5 w-1.5 shrink-0 rounded-full bg-accent'} />;
}
