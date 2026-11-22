import React, { ReactNode, useEffect } from 'react';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import FlashMessageRender from '@/components/FlashMessageRender';
import { cn } from '@/dezerx/lib/cn';

export default function PageBlock({
    title,
    showFlashKey,
    className,
    children,
}: {
    title: string;
    showFlashKey?: string;
    className?: string;
    children: ReactNode;
}) {
    const name = useStoreState((state: ApplicationStore) => state.settings.data?.name);

    useEffect(() => {
        document.title = name ? `${name} | ${title}` : title;
    }, [name, title]);

    return (
        <div className={cn('w-full', className)}>
            {showFlashKey && <FlashMessageRender byKey={showFlashKey} className={'mb-4'} />}
            {children}
        </div>
    );
}
