import React from 'react';
import { Check, Copy, Play } from 'lucide-react';
import { Button } from '@/dezerx/components/ui';
import { useCopied } from '@/dezerx/lib/useCopied';
import { demoCredentials } from '@/dezerx/lib/demo';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';


export function DemoSignIn({ onUse, disabled }: { onUse: (username: string, password: string) => void; disabled?: boolean }) {
    const t = useT();
    const credentials = demoCredentials();

    if (credentials === null) {
        return null;
    }

    return (
        <div className={'rounded-2xl bg-raised/60 p-4 ring-1 ring-line-field'}>
            <div className={'flex items-start justify-between gap-3'}>
                <div className={'min-w-0'}>
                    <p className={'text-sm font-medium text-ink'}>{t('demo.signInTitle')}</p>
                    <p className={'mt-0.5 text-xs text-ink-faint'}>{t('demo.signInBody')}</p>
                </div>

                <Button
                    size={'sm'}
                    variant={'secondary'}
                    disabled={disabled}
                    onClick={() => onUse(credentials.username, credentials.password)}
                    icon={<Play className={'h-3.5 w-3.5'} />}
                    className={'shrink-0'}
                >
                    {t('demo.tryIt')}
                </Button>
            </div>
        </div>
    );
}

function Credential({ label, value }: { label: string; value: string }) {
    const [copied, copy] = useCopied();

    return (
        <div className={'flex min-w-0 items-center gap-2 rounded-xl bg-base/60 px-3 py-2'}>
            <dt className={'shrink-0 text-[11px] uppercase tracking-wide text-ink-faint'}>{label}</dt>
            <dd className={'min-w-0 flex-1 truncate font-mono text-xs text-ink'} title={value}>
                {value}
            </dd>
            <button
                type={'button'}
                onClick={() => copy(value)}
                aria-label={`Copy ${label.toLowerCase()}`}
                className={cn(
                    'shrink-0 rounded-lg p-1 transition-colors',
                    copied ? 'text-success' : 'text-ink-faint hover:bg-overlay hover:text-ink'
                )}
            >
                {copied ? (
                    <Check className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                ) : (
                    <Copy className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                )}
            </button>
        </div>
    );
}

export default DemoSignIn;
