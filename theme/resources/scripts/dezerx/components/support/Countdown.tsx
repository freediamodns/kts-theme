import React, { useEffect, useState } from 'react';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

function secondsFrom(expiresAt: string | null): number | null {
    if (expiresAt === null) {
        return null;
    }

    const target = new Date(expiresAt).getTime();

    if (Number.isNaN(target)) {
        return null;
    }

    return Math.max(0, Math.round((target - Date.now()) / 1000));
}

export function formatLeft(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
    }

    return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function useCountdown(expiresAt: string | null, running: boolean): number | null {
    const [left, setLeft] = useState<number | null>(() => secondsFrom(expiresAt));

    useEffect(() => {
        setLeft(secondsFrom(expiresAt));

        if (expiresAt === null || !running) {
            return;
        }

        const timer = window.setInterval(() => setLeft(secondsFrom(expiresAt)), 1000);

        return () => window.clearInterval(timer);
    }, [expiresAt, running]);

    return left;
}

export function Countdown({
    expiresAt,
    running,
    warnBelow,
    className,
}: {
    expiresAt: string | null;
    running: boolean;
    warnBelow: number;
    className?: string;
}) {
    const t = useT();
    const left = useCountdown(expiresAt, running);

    if (expiresAt === null) {
        return (
            <span className={cn('font-display text-sm font-semibold tabular-nums text-ink', className)}>
                {t('support.noLimit')}
            </span>
        );
    }

    if (left === null) {
        return null;
    }

    const warning = left <= warnBelow * 60;

    return (
        <span
            className={cn(
                'font-display text-sm font-semibold tabular-nums',
                left === 0 ? 'text-danger' : warning ? 'text-warning' : 'text-ink',
                className
            )}
            title={new Date(expiresAt).toLocaleString()}
        >
            {left === 0 ? t('support.timeUp') : formatLeft(left)}
        </span>
    );
}

export default Countdown;
