import React from 'react';
import { cn } from '@/dezerx/lib/cn';
import { HoverTip } from '@/dezerx/components/ui/HoverTip';
import type { BadgeTone, TabRestriction } from '@/dezerx/lib/panelTheme';

const TONES: Record<BadgeTone, string> = {
    muted: 'bg-overlay text-ink-faint',
    accent: 'bg-accent/20 text-accent',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-danger/20 text-danger',
    success: 'bg-success/20 text-success',
};

export const LOCKED_ROW = 'cursor-not-allowed text-ink-faint opacity-60 hover:bg-transparent hover:text-ink-faint';

export function NavBadge({
    restriction,
    side = 'right',
    className,
}: {
    restriction: TabRestriction;
    side?: 'right' | 'left' | 'top' | 'bottom';
    className?: string;
}) {
    const label = restriction.badge.trim() === '' ? 'Locked' : restriction.badge;

    const chip = (
        <span
            className={cn(
                'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                TONES[restriction.tone] ?? TONES.muted,
                className
            )}
        >
            {label}
        </span>
    );

    if (restriction.note.trim() === '') {
        return chip;
    }

    return (
        <HoverTip label={restriction.note} side={side}>
            {chip}
        </HoverTip>
    );
}

export default NavBadge;
