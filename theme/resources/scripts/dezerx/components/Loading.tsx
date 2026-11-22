import React, { ReactNode, Suspense } from 'react';
import ErrorBoundary from '@/components/elements/ErrorBoundary';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

interface Props {
    full?: boolean;
    className?: string;
    label?: string;
}

export function Loading({ full = false, className, label }: Props) {
    const t = useT();

    return (
        <div
            role={'status'}
            aria-busy={'true'}
            aria-label={label ?? t('common.loadingLabel')}
            className={cn('dz-loading', full ? 'dz-loading-full' : 'py-24', className)}
        >
            <span aria-hidden={'true'} className={'dz-loading-ring'} />
        </div>
    );
}

export function LoadingSuspense({ children, full = false }: { children: ReactNode; full?: boolean }) {
    return (
        <Suspense fallback={<Loading full={full} />}>
            <ErrorBoundary>{children}</ErrorBoundary>
        </Suspense>
    );
}

export default Loading;
