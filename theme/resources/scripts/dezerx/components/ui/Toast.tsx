import React, { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { toastPosition, toastSurface, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { useT } from '@/i18n';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

interface ToastOptions {
    tone?: ToastTone;
    duration?: number;
}

interface ToastEntry {
    id: number;
    message: string;
    tone: ToastTone;
    duration: number;
}

const ToastContext = createContext<{ toast: (message: string, options?: ToastOptions) => void }>({
    toast: () => undefined,
});

export function useToast(): { toast: (message: string, options?: ToastOptions) => void } {
    return useContext(ToastContext);
}

export const TOAST_TONE_COLOR: Record<ToastTone, string> = {
    info: 'var(--accent)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    error: 'var(--danger)',
};

const TONE_ICONS: Record<ToastTone, typeof Info> = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: XCircle,
};

let glowSequence = 0;

export function ToastGlow({ color }: { color: string }) {
    const id = useRef(`toast-glow-${++glowSequence}`).current;

    return (
        <svg
            aria-hidden={'true'}
            viewBox={'0 0 200 200'}
            className={'pointer-events-none absolute -bottom-16 -right-12 h-52 w-52 animate-toast-glow'}
        >
            <defs>
                <filter id={id} x={'-50%'} y={'-50%'} width={'200%'} height={'200%'}>
                    <feGaussianBlur stdDeviation={'34'} />
                </filter>
            </defs>
            <circle cx={'110'} cy={'110'} r={'56'} fill={color} opacity={'0.32'} filter={`url(#${id})`} />
            <circle cx={'150'} cy={'70'} r={'30'} fill={color} opacity={'0.18'} filter={`url(#${id})`} />
        </svg>
    );
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [entries, setEntries] = useState<ToastEntry[]>([]);
    const next = useRef(0);

    const dismiss = useCallback((id: number) => {
        setEntries((current) => current.filter((entry) => entry.id !== id));
    }, []);

    const toast = useCallback((message: string, options: ToastOptions = {}) => {
        const id = ++next.current;

        setEntries((current) => [
            ...current.slice(-3),
            { id, message, tone: options.tone ?? 'info', duration: options.duration ?? 5000 },
        ]);
    }, []);

    const value = useMemo(() => ({ toast }), [toast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastViewport entries={entries} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

function ToastViewport({ entries, onDismiss }: { entries: ToastEntry[]; onDismiss: (id: number) => void }) {
    const theme = usePanelTheme();

    if (entries.length === 0) {
        return null;
    }

    return (
        <div
            aria-live={'polite'}
            className={cn(
                'dz-scope pointer-events-none fixed z-[80] flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-3',
                toastPosition(theme['toast.position'])
            )}
        >
            {entries.map((entry) => (
                <Toast key={entry.id} entry={entry} glass={theme['toast.glass']} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

function Toast({
    entry,
    glass,
    onDismiss,
}: {
    entry: ToastEntry;
    glass: boolean;
    onDismiss: (id: number) => void;
}) {
    const t = useT();
    const [paused, setPaused] = useState(false);

    const Icon = TONE_ICONS[entry.tone];
    const color = TOAST_TONE_COLOR[entry.tone];

    return (
        <div
            role={'status'}
            className={cn(
                'pointer-events-auto relative flex items-center gap-3.5 overflow-hidden rounded-2xl px-4 py-3.5 shadow-panel animate-toast-in',
                toastSurface(glass)
            )}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <ToastGlow color={color} />

            <Icon aria-hidden={'true'} className={'relative h-6 w-6 shrink-0'} style={{ color }} />

            <p className={'relative min-w-0 flex-1 pr-4 text-sm leading-snug text-ink'}>{entry.message}</p>

            <button
                type={'button'}
                onClick={() => onDismiss(entry.id)}
                aria-label={t('common.dismiss')}
                className={'absolute right-2 top-2 shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:text-ink'}
            >
                <X className={'h-3.5 w-3.5'} aria-hidden={'true'} />
            </button>

            {entry.duration > 0 && (
                <div
                    className={'absolute inset-x-0 bottom-0 h-1'}
                    style={{ backgroundColor: `rgb(from ${color} r g b / 0.15)` }}
                >
                    <div
                        className={'h-full w-full origin-left animate-flash-life'}
                        style={{
                            backgroundColor: color,
                            animationDuration: `${entry.duration}ms`,
                            animationPlayState: paused ? 'paused' : 'running',
                        }}
                        onAnimationEnd={() => onDismiss(entry.id)}
                    />
                </div>
            )}
        </div>
    );
}

export default ToastProvider;
