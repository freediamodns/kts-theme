import React from 'react';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

export function NavCount({ total, rail = false, className }: { total: number; rail?: boolean; className?: string }) {
    const t = useT();

    if (total < 1) {
        return null;
    }

    const label = t('support.waitingBadge', { total });

    if (rail) {
        return (
            <span
                role={'status'}
                aria-label={label}
                className={'absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent'}
            />
        );
    }

    return (
        <span
            role={'status'}
            aria-label={label}
            className={cn(
                'shrink-0 rounded-md bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-accent',
                className
            )}
        >
            {total > 99 ? '99+' : total}
        </span>
    );
}

export default NavCount;
