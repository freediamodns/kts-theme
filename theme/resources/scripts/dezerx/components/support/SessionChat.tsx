import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, Loader2, Send } from 'lucide-react';
import { ChatCursor, StaffChatPage, StaffMessageEntry } from '@/api/server/support';
import { useToast } from '@/dezerx/components/ui';
import { apiMessage } from '@/dezerx/components/console/Section';
import { cn } from '@/dezerx/lib/cn';
import { PersonAvatar } from '@/dezerx/components/PersonAvatar';
import { useT } from '@/i18n';

const POLL = 5000;

const CLAMP = 400;

export interface ChatBridge {
    load: (cursor: ChatCursor) => Promise<StaffChatPage>;
    post: (body: string) => Promise<StaffMessageEntry>;
}

function Body({ text }: { text: string }) {
    const t = useT();
    const [open, setOpen] = useState(false);

    const long = text.length > CLAMP;

    return (
        <p className={'mt-0.5 whitespace-pre-wrap break-words text-xs text-ink-muted'}>
            {long && !open ? `${text.slice(0, CLAMP).trimEnd()}…` : text}

            {long && (
                <button
                    type={'button'}
                    onClick={() => setOpen((value) => !value)}
                    className={'ml-1.5 text-[11px] font-semibold text-accent hover:underline'}
                >
                    {t(open ? 'support.readLess' : 'support.readMore')}
                </button>
            )}
        </p>
    );
}

export function SessionChat({
    bridge,
    thread: threadKey,
    canPost,
    closed,
    maxLength,
    className,
}: {
    bridge: ChatBridge;
    thread: string;
    canPost: boolean;
    closed?: boolean;
    maxLength: number;
    className?: string;
}) {
    const t = useT();
    const { toast } = useToast();

    const [messages, setMessages] = useState<StaffMessageEntry[]>([]);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [ready, setReady] = useState(false);
    const [more, setMore] = useState(false);
    const [older, setOlder] = useState(false);

    const thread = useRef<HTMLDivElement | null>(null);
    const latest = useRef(0);
    const first = useRef(0);
    const bottom = useRef(0);
    const live = useRef(bridge);

    live.current = bridge;

    useEffect(() => {
        let alive = true;

        setMessages([]);
        setReady(false);
        setMore(false);
        latest.current = 0;
        first.current = 0;
        bottom.current = 0;

        const merge = (incoming: StaffMessageEntry[]) => {
            if (!alive || incoming.length === 0) {
                return;
            }

            setMessages((current) => {
                const seen = new Set(current.map((message) => message.id));
                const added = incoming.filter((message) => !seen.has(message.id));

                return added.length === 0 ? current : [...current, ...added];
            });

            latest.current = Math.max(latest.current, ...incoming.map((message) => message.id));
            first.current =
                first.current === 0
                    ? Math.min(...incoming.map((message) => message.id))
                    : Math.min(first.current, ...incoming.map((message) => message.id));
        };

        const pull = async () => {
            if (document.hidden || latest.current === 0) {
                return;
            }

            try {
                merge((await live.current.load({ after: latest.current })).messages);
            } catch {
                return;
            }
        };

        void live.current
            .load({})
            .then((page) => {
                merge(page.messages);
                setMore(page.more === true);
                setReady(true);
            })
            .catch(() => alive && setReady(true));

        const timer = window.setInterval(() => void pull(), POLL);

        return () => {
            alive = false;
            window.clearInterval(timer);
        };
    }, [threadKey]);

    useEffect(() => {
        const last = messages[messages.length - 1]?.id ?? 0;

        if (last === bottom.current) {
            return;
        }

        bottom.current = last;
        thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const earlier = async () => {
        if (first.current === 0) {
            return;
        }

        setOlder(true);

        try {
            const page = await live.current.load({ before: first.current });

            if (page.messages.length > 0) {
                setMessages((current) => {
                    const seen = new Set(current.map((message) => message.id));

                    return [...page.messages.filter((message) => !seen.has(message.id)), ...current];
                });

                first.current = Math.min(first.current, ...page.messages.map((message) => message.id));
            }

            setMore(page.more === true);
        } catch (error) {
            toast(apiMessage(error, t('support.actionFailed')), { tone: 'error' });
        } finally {
            setOlder(false);
        }
    };

    const send = async () => {
        const body = draft.trim();

        if (body === '') {
            return;
        }

        setBusy(true);

        try {
            const message = await live.current.post(body);

            setMessages((current) =>
                current.some((entry) => entry.id === message.id) ? current : [...current, message]
            );
            latest.current = Math.max(latest.current, message.id);
            first.current = first.current === 0 ? message.id : first.current;
            setDraft('');
        } catch (error) {
            toast(apiMessage(error, t('support.messageFailed')), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={cn('rounded-2xl bg-base p-4', className)}>
            <p className={'mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>
                {t('support.chatTitle')}
            </p>

            <div ref={thread} className={'max-h-72 space-y-2 overflow-y-auto pb-1 pr-1'}>
                {more && (
                    <div className={'flex justify-center pb-1'}>
                        <button
                            type={'button'}
                            disabled={older}
                            onClick={() => void earlier()}
                            className={'text-[11px] font-semibold text-ink-faint hover:text-ink disabled:opacity-50'}
                        >
                            {t(older ? 'support.chatLoading' : 'support.chatEarlier')}
                        </button>
                    </div>
                )}

                {messages.length === 0 ? (
                    ready ? (
                        <div className={'flex justify-center py-4'}>
                            <img
                                src={'/dezerx/tumbleweed.webp'}
                                alt={t('support.chatEmpty')}
                                width={72}
                                height={72}
                                loading={'lazy'}
                                decoding={'async'}
                                draggable={false}
                                className={'h-16 w-16 select-none opacity-30 grayscale'}
                            />
                        </div>
                    ) : (
                        <p className={'py-6 text-center text-xs text-ink-faint'}>{t('support.chatLoading')}</p>
                    )
                ) : (
                    messages.map((message) => (
                        <div key={message.id} className={cn('flex items-end gap-2', message.own && 'flex-row-reverse')}>
                            <PersonAvatar
                                hash={message.avatar}
                                url={message.avatarUrl}
                                name={message.author}
                                size={28}
                                className={'h-7 w-7 text-[11px]'}
                            />

                            <div
                                className={cn(
                                    'max-w-[78%] rounded-2xl px-3 py-2 text-ink',
                                    message.own ? 'bg-accent/15' : 'bg-raised'
                                )}
                            >
                                <div className={cn('flex items-baseline gap-2', message.own && 'flex-row-reverse')}>
                                    <span className={'text-[11px] font-semibold text-ink'}>
                                        {message.own ? t('support.you') : message.author ?? t('support.someone')}
                                    </span>
                                    <span className={'inline-flex items-center gap-1 text-[10px] text-ink-faint'}>
                                        {message.at === null
                                            ? ''
                                            : new Date(message.at).toLocaleTimeString([], {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                              })}

                                        {message.own &&
                                            (message.read ? (
                                                <CheckCheck
                                                    className={'h-3 w-3 text-accent'}
                                                    aria-label={t('support.messageRead')}
                                                />
                                            ) : (
                                                <Check className={'h-3 w-3'} aria-label={t('support.messageSent')} />
                                            ))}
                                    </span>
                                </div>

                                <Body text={message.body} />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {canPost ? (
                <div className={'relative mt-4'}>
                    <textarea
                        value={draft}
                        rows={2}
                        maxLength={maxLength}
                        placeholder={t('support.chatPlaceholder')}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                void send();
                            }
                        }}
                        className={cn(
                            'dz-field dz-field-line min-h-[44px] w-full resize-none rounded-2xl border py-2 pl-3 pr-12',
                            'text-xs text-ink placeholder:text-ink-faint transition-colors duration-150',
                            'focus:border-accent/60 focus:outline-none'
                        )}
                    />

                    <button
                        type={'button'}
                        title={t('support.send')}
                        aria-label={t('support.send')}
                        disabled={busy || draft.trim() === ''}
                        onClick={() => void send()}
                        className={cn(
                            'absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-xl',
                            'bg-accent text-ink-inverse transition-opacity',
                            busy || draft.trim() === '' ? 'cursor-default opacity-40' : 'hover:opacity-90'
                        )}
                    >
                        {busy ? (
                            <Loader2 className={'h-4 w-4 animate-spin'} aria-hidden={'true'} />
                        ) : (
                            <Send className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        )}
                    </button>
                </div>
            ) : (
                closed === true && <p className={'mt-3 text-[11px] text-ink-faint'}>{t('support.chatClosed')}</p>
            )}
        </div>
    );
}

export default SessionChat;
