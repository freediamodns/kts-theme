import React, { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div aria-hidden={'true'} className={cn('relative overflow-hidden rounded-md bg-overlay/60', className)} {...props}>
            <div className={'absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.07] to-transparent'} />
        </div>
    );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className={cn('h-3.5', i === lines - 1 && 'w-2/3')} />
            ))}
        </div>
    );
}

export function SkeletonRegion({
    label,
    className,
    children,
}: {
    label?: string;
    className?: string;
    children: ReactNode;
}) {
    const t = useT();
    const text = label ?? t('common.loadingLabel');

    return (
        <div role={'status'} aria-busy={'true'} aria-label={text} className={className}>
            {children}
            <span className={'sr-only'}>{text}…</span>
        </div>
    );
}
