import React, { useState } from 'react';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { useCopied } from '@/dezerx/lib/useCopied';

export function DetailRow({
    label,
    value,
    copyable = false,
    secret = false,
    mono = false,
    blurred = false,
}: {
    label: string;
    value: string;
    copyable?: boolean;
    secret?: boolean;
    mono?: boolean;
    blurred?: boolean;
}) {
    const [copied, copy] = useCopied();
    const [revealed, setRevealed] = useState(false);

    const hidden = secret && !revealed;
    const readable = !blurred;

    return (
        <div className={'flex items-center justify-between gap-3'}>
            <dt className={'shrink-0 text-xs text-ink-faint'}>{label}</dt>

            <dd className={'flex min-w-0 items-center gap-1'}>
                <span
                    aria-hidden={blurred ? true : undefined}
                    className={cn(
                        'truncate text-xs text-ink',
                        mono && !hidden && 'font-mono',
                        hidden && 'select-none',
                        blurred && 'select-none blur-[5px]'
                    )}
                >
                    {hidden ? '•'.repeat(16) : value}
                </span>

                {secret && readable && (
                    <button
                        type={'button'}
                        onClick={() => setRevealed((on) => !on)}
                        aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                        className={
                            'shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                        }
                    >
                        {revealed ? <EyeOff className={'h-3 w-3'} /> : <Eye className={'h-3 w-3'} />}
                    </button>
                )}

                {(copyable || secret) && readable && (
                    <button
                        type={'button'}
                        onClick={() => copy(value)}
                        aria-label={`Copy ${label.toLowerCase()}`}
                        className={
                            'shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                        }
                    >
                        {copied ? <Check className={'h-3 w-3 text-success'} /> : <Copy className={'h-3 w-3'} />}
                    </button>
                )}
            </dd>
        </div>
    );
}
