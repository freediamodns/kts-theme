import React from 'react';
import { cn } from '@/dezerx/lib/cn';
import nodeCountry from '@/dezerx/lib/nodeCountry';

export default function NodeFlag({ node, className }: { node: string | null | undefined; className?: string }) {
    const code = nodeCountry(node);

    if (code === null) {
        return null;
    }

    return (
        <span
            role={'img'}
            title={node ?? undefined}
            aria-label={code.toUpperCase()}
            className={cn('fi shrink-0 rounded-[2px] text-[0.9em] leading-none', `fi-${code}`, className)}
        />
    );
}

export { NodeFlag };
