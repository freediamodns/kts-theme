import React, { ReactNode, useEffect, useState } from 'react';
import { AlertTriangle, Info, LucideIcon, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

export type NoticeTone = 'info' | 'warning' | 'danger';

const TONES: Record<NoticeTone, { tint: string; edge: string; icon: string; Icon: LucideIcon }> = {
    info: { tint: 'bg-accent/[0.07]', edge: 'border-accent', icon: 'text-accent', Icon: Info },
    warning: { tint: 'bg-warning/[0.07]', edge: 'border-warning', icon: 'text-warning', Icon: AlertTriangle },
    danger: { tint: 'bg-danger/[0.08]', edge: 'border-danger', icon: 'text-danger', Icon: TriangleAlert },
};

export interface NoticeProps {
    title: string;
    children?: ReactNode;
    tone?: NoticeTone;
    action?: ReactNode;
    dismissId?: string;
    className?: string;
}

export function Notice({ title, children, tone = 'info', action, dismissId, className }: NoticeProps) {
    const t = useT();
    const storageKey = dismissId ? `notice.${dismissId}` : null;
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        if (!storageKey) {
            return;
        }

        try {
            setHidden(window.localStorage.getItem(storageKey) === '1');
        } catch {
            setHidden(false);
        }
    }, [storageKey]);

    if (hidden) {
        return null;
    }

    const { tint, edge, icon, Icon } = TONES[tone];

    const dismiss = () => {
        setHidden(true);

        if (!storageKey) {
            return;
        }

        try {
            window.localStorage.setItem(storageKey, '1');
        } catch {
        }
    };

    return (
        <div
            role={tone === 'danger' ? 'alert' : 'status'}
            className={cn('rounded-2xl flex flex-wrap items-start gap-3 p-4', tint, edge, className)}
        >
            <Icon aria-hidden={'true'} className={cn('mt-0.5 h-4 w-4 shrink-0', icon)} />

            <div className={'min-w-0 flex-1'}>
                <p className={'text-sm font-semibold text-ink'}>{title}</p>
                {children && <div className={'mt-0.5 text-sm text-ink-muted'}>{children}</div>}
            </div>

            {action && <div className={'shrink-0 max-sm:w-full'}>{action}</div>}

            {storageKey && (
                <button
                    type={'button'}
                    onClick={dismiss}
                    aria-label={t('common.dismiss')}
                    className={
                        '-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-overlay hover:text-ink'
                    }
                >
                    <X className={'h-4 w-4'} aria-hidden={'true'} />
                </button>
            )}
        </div>
    );
}
