import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';

const CRUMB = 'truncate rounded-lg px-1.5 py-0.5';

const LINK = 'text-ink-muted hover:bg-surface-hover hover:text-ink';

const HERE = 'font-medium text-ink';

function Separator() {
    return (
        <ChevronRight
            aria-hidden={'true'}
            className={'mx-0.5 h-3.5 w-3.5 shrink-0 select-none text-ink-faint/50'}
        />
    );
}

export default function Breadcrumbs({
    directory,
    onNavigate,
    trailing,
}: {
    directory: string;
    onNavigate: (path: string) => void;
    trailing?: string;
}) {
    const parts = directory.split('/').filter((part) => part !== '');
    const lastIsFolder = trailing === undefined;
    const atRoot = lastIsFolder && parts.length === 0;

    return (
        <nav className={'flex min-w-0 flex-wrap items-center text-sm'}>
            <span className={cn(CRUMB, 'select-none text-ink-faint')}>{'home'}</span>

            <Separator />

            <button
                type={'button'}
                onClick={() => onNavigate('/')}
                disabled={atRoot}
                className={cn(CRUMB, atRoot ? HERE : LINK)}
            >
                {'container'}
            </button>

            {parts.map((part, index) => {
                const path = `/${parts.slice(0, index + 1).join('/')}`;
                const last = lastIsFolder && index === parts.length - 1;

                return (
                    <React.Fragment key={path}>
                        <Separator />
                        <button
                            type={'button'}
                            disabled={last}
                            onClick={() => onNavigate(path)}
                            className={cn(CRUMB, last ? HERE : LINK)}
                        >
                            {part}
                        </button>
                    </React.Fragment>
                );
            })}

            {trailing !== undefined && (
                <>
                    <Separator />
                    <span className={cn(CRUMB, HERE)}>{trailing}</span>
                </>
            )}
        </nav>
    );
}
