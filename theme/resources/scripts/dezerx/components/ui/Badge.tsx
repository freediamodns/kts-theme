import React, { ReactNode } from 'react';
import { cn } from '@/dezerx/lib/cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<BadgeTone, string> = {
    neutral: 'bg-overlay text-ink-muted',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-danger/15 text-danger',
    info: 'bg-accent/15 text-accent',
};

export interface BadgeProps {
    tone?: BadgeTone;
    dot?: boolean;
    className?: string;
    children: ReactNode;
}

export function Badge({ tone = 'neutral', dot = false, className, children }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5',
                'font-display text-[10px] font-semibold uppercase tracking-wider',
                TONES[tone],
                className
            )}
        >
            {dot && <span aria-hidden={'true'} className={'h-1.5 w-1.5 rounded-full bg-current'} />}
            {children}
        </span>
    );
}
