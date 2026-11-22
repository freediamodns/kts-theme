import React, { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/dezerx/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    glow?: boolean;
}

export function Card({ glow = false, className, children, ...props }: CardProps) {
    return (
        <div className={cn('rounded-2xl relative bg-card', glow && 'shadow-glow-alt', className)} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({
    title,
    description,
    action,
    className,
}: {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex items-start justify-between gap-4 px-5 py-4', className)}>
            <div className={'min-w-0'}>
                <h2 className={'text-sm font-semibold tracking-tight text-ink'}>{title}</h2>
                {description && <p className={'mt-1 text-xs text-ink-muted'}>{description}</p>}
            </div>
            {action && <div className={'shrink-0'}>{action}</div>}
        </div>
    );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('p-5', className)} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex items-center justify-end gap-3 px-5 pb-4', className)} {...props}>
            {children}
        </div>
    );
}
