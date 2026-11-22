import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { CreateDiscord } from '@/api/dezerx/serverCreate';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

export function DiscordMark({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox={'0 0 127 96'} fill={'currentColor'} aria-hidden={'true'}>
            <path
                d={
                    'M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z'
                }
            />
        </svg>
    );
}

type Phase = 'idle' | 'waiting' | 'done' | 'error';

const KNOWN = ['taken', 'cancelled', 'mismatch', 'blocked', 'failed'];

interface Result {
    source?: string;
    status?: string;
    username?: string | null;
}

export default function DiscordGate({ discord, onLinked }: { discord: CreateDiscord; onLinked: () => void }) {
    const t = useT();

    const [phase, setPhase] = useState<Phase>(discord.linked ? 'done' : 'idle');
    const [problem, setProblem] = useState<string | null>(null);

    const popup = useRef<Window | null>(null);
    const watch = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopWatching = useCallback(() => {
        if (watch.current !== null) {
            clearInterval(watch.current);
            watch.current = null;
        }
    }, []);

    useEffect(() => stopWatching, [stopWatching]);

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) {
                return;
            }

            const result = event.data as Result;

            if (result === null || typeof result !== 'object' || result.source !== 'dezerx-discord') {
                return;
            }

            stopWatching();
            popup.current?.close();
            popup.current = null;

            if (result.status === 'connected' || result.status === 'linked') {
                setPhase('done');

                window.setTimeout(onLinked, 900);

                return;
            }

            setProblem(result.status ?? 'failed');
            setPhase('error');
        };

        window.addEventListener('message', onMessage);

        return () => window.removeEventListener('message', onMessage);
    }, [onLinked, stopWatching]);

    const authorise = () => {
        if (phase === 'waiting') {
            popup.current?.focus();

            return;
        }

        setProblem(null);
        setPhase('waiting');

        const width = 520;
        const height = 720;
        const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
        const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

        const opened = window.open(
            '/dezerx/discord/connect',
            'dezerx-discord',
            `popup=1,width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)}`
        );

        if (opened === null) {
            setProblem('blocked');
            setPhase('error');

            return;
        }

        popup.current = opened;

        watch.current = setInterval(() => {
            if (popup.current?.closed !== true) {
                return;
            }

            stopWatching();
            popup.current = null;
            setPhase((current) => (current === 'waiting' ? 'idle' : current));
        }, 500);
    };

    if (phase === 'done') {
        return (
            <div className={'flex items-center justify-center rounded-2xl bg-card p-10 ring-1 ring-line-field'}>
                <Loader2 className={'h-6 w-6 animate-spin text-ink-faint'} aria-hidden={'true'} />
                <span className={'sr-only'}>{t('create.loading')}</span>
            </div>
        );
    }

    const waiting = phase === 'waiting';

    return (
        <div className={'space-y-3'}>
            <div className={'rounded-2xl bg-card p-5 text-center ring-1 ring-line-field'}>
                <span
                    className={cn(
                        'mx-auto flex h-14 w-14 items-center justify-center text-[#5865f2]',
                        waiting && 'animate-pulse'
                    )}
                >
                    <DiscordMark className={'h-9 w-9'} />
                </span>

                <h3 className={'mt-3 text-base font-semibold text-ink'}>{t('create.discord.title')}</h3>
                <p className={'mx-auto mt-1 max-w-md text-sm text-ink-faint'}>
                    {discord.joinsGuild ? t('create.discord.bodyJoin') : t('create.discord.body')}
                </p>

                <button
                    type={'button'}
                    onClick={authorise}
                    aria-busy={waiting}
                    className={cn(
                        'group relative mt-4 inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl',
                        'bg-[#5865f2] px-5 py-2.5 text-sm font-semibold text-white',
                        'transition-all duration-200 hover:bg-[#4752c4]',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5865f2] focus-visible:ring-offset-2',
                        'focus-visible:ring-offset-card active:scale-[.98]',
                        waiting ? 'cursor-progress' : 'hover:-translate-y-0.5'
                    )}
                >
                    <span
                        aria-hidden={'true'}
                        className={cn(
                            'pointer-events-none absolute inset-y-0 -left-full w-1/2 skew-x-12 bg-white/25',
                            waiting && 'animate-shimmer'
                        )}
                    />

                    {waiting ? (
                        <span
                            aria-hidden={'true'}
                            className={'h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white'}
                        />
                    ) : (
                        <DiscordMark className={'h-4 w-4 transition-transform group-hover:scale-110'} />
                    )}

                    {waiting ? t('create.discord.waiting') : t('create.discord.button')}
                </button>

                {waiting && <p className={'mt-2.5 text-xs text-ink-faint'}>{t('create.discord.popupHint')}</p>}
            </div>

            {problem !== null && (
                <div
                    className={
                        'flex animate-rise items-start gap-2.5 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger '
                    }
                >
                    <X className={'mt-0.5 h-4 w-4 shrink-0'} />
                    <span>{t(`create.discord.error.${KNOWN.includes(problem) ? problem : 'failed'}`)}</span>
                </div>
            )}
        </div>
    );
}
