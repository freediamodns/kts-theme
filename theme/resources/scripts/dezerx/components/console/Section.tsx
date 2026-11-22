import React, { ComponentType, ReactNode } from 'react';
import { Skeleton, SkeletonRegion } from '@/dezerx/components/ui';

export function SectionHeader({
    title,
    description,
    action,
}: {
    title: string;
    description?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className={'flex flex-wrap items-center justify-between gap-3'}>
            <div className={'min-w-0'}>
                <h2 className={'text-sm font-semibold tracking-tight text-ink'}>{title}</h2>
                {description && <p className={'mt-1 text-xs text-ink-faint'}>{description}</p>}
            </div>

            {action && <div className={'shrink-0'}>{action}</div>}
        </div>
    );
}

export function SectionEmpty({
    icon: Icon,
    title,
    body,
}: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    body: ReactNode;
}) {
    return (
        <div className={'flex flex-col items-center rounded-2xl bg-card px-6 py-14 text-center'}>
            <span className={'flex h-12 w-12 items-center justify-center rounded-2xl bg-overlay/60 text-ink-faint'}>
                <Icon className={'h-6 w-6'} aria-hidden={'true'} />
            </span>
            <p className={'mt-4 text-sm font-medium text-ink'}>{title}</p>
            <p className={'mt-1 max-w-xs text-xs text-ink-faint'}>{body}</p>
        </div>
    );
}

export function SectionSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
    return (
        <SkeletonRegion label={label}>
            <div className={'space-y-4'}>
                <div className={'flex items-center justify-between gap-3'}>
                    <div>
                        <Skeleton className={'h-3.5 w-24'} />
                        <Skeleton className={'mt-2 h-3 w-32'} />
                    </div>
                    <Skeleton className={'h-9 w-28 rounded-2xl'} />
                </div>

                {Array.from({ length: rows }).map((_, index) => (
                    <div key={index} className={'flex items-center gap-2.5 rounded-2xl bg-card p-4'}>
                        <Skeleton className={'h-9 w-9 shrink-0 rounded-xl'} />
                        <div className={'flex-1'}>
                            <Skeleton className={'h-3.5 w-40'} />
                            <Skeleton className={'mt-1.5 h-3 w-56'} />
                        </div>
                        <Skeleton className={'h-8 w-20 rounded-2xl'} />
                    </div>
                ))}
            </div>
        </SkeletonRegion>
    );
}

export function apiMessage(error: unknown, fallback: string): string {
    const data = (
        error as {
            response?: { data?: { errors?: { detail?: string }[]; message?: string } };
        }
    )?.response?.data;

    return data?.errors?.[0]?.detail ?? data?.message ?? fallback;
}
