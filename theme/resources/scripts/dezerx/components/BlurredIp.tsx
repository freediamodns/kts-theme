import React from 'react';
import { cn } from '@/dezerx/lib/cn';

export default function BlurredIp({
    children,
    reveal = false,
    permanent = false,
    className,
}: {
    children: React.ReactNode;
    reveal?: boolean;
    permanent?: boolean;
    className?: string;
}) {
    return (
        <span
            aria-hidden={permanent ? undefined : false}
            className={cn(
                'inline-block transition-[filter,opacity] duration-150',
                permanent
                    ? 'select-none blur-[3px] opacity-70'
                    : reveal
                    ? 'blur-[3px] hover:blur-none focus-visible:blur-none'
                    : null,
                className
            )}
        >
            {children}
        </span>
    );
}
