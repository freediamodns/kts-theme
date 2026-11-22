import * as React from 'react';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { ToastGlow } from '@/dezerx/components/ui/Toast';
import { useT } from '@/i18n';

export type FlashMessageType = 'success' | 'info' | 'warning' | 'error';

export const MESSAGE_BOX_LIFETIME = 8000;

interface Props {
    title?: string;
    children: string;
    type?: FlashMessageType;
    onDismiss?: () => void;
    lifetime?: number;
}

interface Tone {
    icon: typeof Info;
    color: string;
}

const TONES: Record<FlashMessageType, Tone> = {
    success: { icon: CheckCircle2, color: 'var(--success)' },
    info: { icon: Info, color: 'var(--accent)' },
    warning: { icon: AlertTriangle, color: 'var(--warning)' },
    error: { icon: XCircle, color: 'var(--danger)' },
};

const MessageBox = ({ title, children, type, onDismiss, lifetime = MESSAGE_BOX_LIFETIME }: Props) => {
    const t = useT();
    const [paused, setPaused] = useState(false);

    const { icon: Icon, color } = TONES[type ?? 'info'];

    return (
        <div
            role={'alert'}
            className={
                'relative flex w-full items-center gap-4 overflow-hidden rounded-xl bg-card/30 px-5 py-4 text-left shadow-panel backdrop-blur-xl animate-pop'
            }
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <ToastGlow color={color} />

            <Icon aria-hidden={'true'} className={'relative h-6 w-6 shrink-0'} style={{ color }} />

            <div className={cn('relative flex-auto', onDismiss && 'pr-6')}>
                {title && (
                    <p className={'text-xs font-semibold uppercase tracking-wide'} style={{ color }}>
                        {title}
                    </p>
                )}
                <p className={'text-sm leading-relaxed text-ink'}>{children}</p>
            </div>

            {onDismiss && (
                <>
                    <button
                        type={'button'}
                        onClick={onDismiss}
                        aria-label={t('common.dismissMessage')}
                        className={'absolute right-2 top-2 rounded-md p-1.5 text-ink-faint transition hover:text-ink'}
                    >
                        <X className={'h-4 w-4'} />
                    </button>

                    <div
                        className={'absolute inset-x-0 bottom-0 h-1'}
                        style={{ backgroundColor: `rgb(from ${color} r g b / 0.15)` }}
                    >
                        <div
                            className={'h-full w-full origin-left animate-flash-life'}
                            style={{
                                backgroundColor: color,
                                animationDuration: `${lifetime}ms`,
                                animationPlayState: paused ? 'paused' : 'running',
                            }}
                            onAnimationEnd={onDismiss}
                        />
                    </div>
                </>
            )}
        </div>
    );
};
MessageBox.displayName = 'MessageBox';

export default MessageBox;
