import React, { CSSProperties, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
    AlertTriangle,
    Bot,
    Check,
    ChevronDown,
    KeyRound,
    Loader2,
    Rocket,
    Send,
    Server as ServerIcon,
    ShieldCheck,
    Square,
    Trash2,
    Wrench,
    X,
} from 'lucide-react';
import getServers from '@/api/getServers';
import { Button, Input, Select, useToast } from '@/dezerx/components/ui';
import { Markdown } from '@/dezerx/components/ai/Markdown';
import { MatrixRain } from '@/dezerx/components/ai/MatrixRain';
import { cn } from '@/dezerx/lib/cn';
import { useDemo } from '@/dezerx/lib/demo';
import { AiPlacement, aiPlacement, usePanelTheme } from '@/dezerx/lib/panelTheme';
import {
    AiAllowance,
    AiConfig,
    AiError,
    AiModelList,
    AiPending,
    AiStep,
    AiTurn,
    MAX_MESSAGE,
    MAX_TURNS,
    aiConfig,
    askAssistant,
    fetchModels,
    saveAiKey,
    setAskFirst,
    stopAssistant,
} from '@/dezerx/lib/ai';
import { TranslateFn, currentLocale, useT } from '@/i18n';

interface Turn {
    role: 'user' | 'assistant';
    content: string;
    steps?: AiStep[];
    failed?: boolean;
    stopped?: boolean;
    pending?: AiPending[];
    truncated?: boolean;
}

function settle(turn: Turn): Turn {
    const cards = (turn.pending ?? []).map((action) => action.summary).join('\n');

    return { ...turn, content: turn.content.trim() || cards, pending: undefined };
}

function toMessages(turns: Turn[]): AiTurn[] {
    const messages: AiTurn[] = [];

    for (const turn of turns) {
        if (turn.failed || turn.stopped) {
            continue;
        }

        const content = settle(turn).content.slice(0, MAX_MESSAGE);

        if (content !== '') {
            messages.push({ role: turn.role, content });
        }
    }

    return messages;
}

const THREAD_KEY = 'dezerx.ai.thread';
const OPEN_KEY = 'dezerx.ai.open';

const SUGGESTIONS = ['companion.suggestion1', 'companion.suggestion2', 'companion.suggestion3'];

export default function Companion() {
    const theme = usePanelTheme();
    const config = useMemo(aiConfig, []);

    if (config === null || theme['ai.position'] === 'off') {
        return null;
    }

    return <Widget config={config} placement={aiPlacement(theme['ai.position'])} />;
}

function Widget({ config, placement }: { config: AiConfig; placement: AiPlacement }) {
    const t = useT();
    const { toast } = useToast();
    const location = useLocation();

    const demo = useDemo();

    const [open, setOpen] = useState(() => sessionStorage.getItem(OPEN_KEY) === '1');
    const [turns, setTurns] = useState<Turn[]>(readThread);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState<AiStep[]>([]);
    const [allowance, setAllowance] = useState<AiAllowance | null>(null);
    const [askFirst, setMode] = useState(config.askFirst);
    const [keyOpen, setKeyOpen] = useState(false);

    const [account, setAccount] = useState({
        ready: config.ready,
        hasOwnKey: config.hasOwnKey,
        provider: config.ownProvider,
        model: config.ownModel,
        own: config.own,
    });

    const ready = account.ready;

    const usingOwn = account.hasOwnKey && (config.keyMode === 'user' || account.own);
    const model = usingOwn ? account.model || config.defaultModels[account.provider] || '' : config.model;
    const service = usingOwn ? account.provider : config.provider;

    const run = useRef<string | null>(null);
    const thread = useRef<HTMLDivElement | null>(null);
    const box = useRef<HTMLTextAreaElement | null>(null);

    const threaded = useRef(sessionStorage.getItem(THREAD_KEY) !== null);
    const sample = useRef<{ turns: Turn[]; locale: string } | null>(null);

    useEffect(() => {
        sessionStorage.setItem(THREAD_KEY, JSON.stringify(turns.slice(-MAX_TURNS)));
    }, [turns]);

    useEffect(() => {
        sessionStorage.setItem(OPEN_KEY, open ? '1' : '0');
    }, [open]);

    useEffect(() => {
        thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' });
    }, [turns, progress, open]);

    useEffect(() => {
        if (open) {
            box.current?.focus();
        }
    }, [open]);

    useEffect(() => {
        if (!demo || !open) {
            return;
        }

        const locale = currentLocale();

        if (sample.current !== null) {
            if (sample.current.locale === locale || sample.current.turns !== turns) {
                return;
            }
        } else if (threaded.current) {
            return;
        }

        const seeded = demoThread(t);

        threaded.current = true;
        sample.current = { turns: seeded, locale };
        setTurns(seeded);
    }, [demo, open, t, turns]);

    useEffect(() => {
        const element = box.current;

        if (element === null) {
            return;
        }

        element.style.height = '0px';
        element.style.height = `${element.scrollHeight}px`;
    }, [draft, open]);

    const currentServer = /^\/server\/([^/]+)/.exec(location.pathname)?.[1] ?? null;

    const progressRef = useRef<AiStep[]>([]);
    progressRef.current = progress;

    const send = async (history: Turn[], approve: string[] = []) => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        run.current = id;
        setBusy(true);
        setProgress([]);
        setTurns(history);

        try {
            const answer = await askAssistant({
                run: id,
                approve,
                server: currentServer,
                messages: toMessages(history),
                onStep: (step) => setProgress((steps) => [...steps, step]),
            });

            setAllowance(answer.allowance ?? null);

            if (answer.stopped) {
                setTurns([
                    ...history,
                    {
                        role: 'assistant',
                        content: t('companion.stopped'),
                        stopped: true,
                        steps: progressRef.current,
                    },
                ]);

                return;
            }

            setTurns([
                ...history,
                {
                    role: 'assistant',
                    content: answer.text || (answer.pending.length > 0 ? '' : t('companion.nothingToSay')),
                    steps: answer.steps,
                    pending: answer.pending.length > 0 ? answer.pending : undefined,
                    truncated: answer.truncated,
                },
            ]);
        } catch (error) {
            const message = error instanceof AiError ? error.message : t('companion.unreachable');

            if (error instanceof AiError && error.allowance) {
                setAllowance(error.allowance);
            }

            if (error instanceof AiError && error.needsKey) {
                setKeyOpen(true);
            }

            setTurns([...history, { role: 'assistant', content: message, failed: true }]);
        } finally {
            run.current = null;
            setBusy(false);
            setProgress([]);
        }
    };

    const ask = () => {
        const content = draft.trim().slice(0, MAX_MESSAGE);

        if (content === '' || busy) {
            return;
        }

        setDraft('');
        const asked: Turn = { role: 'user', content };

        void send([...turns, asked].slice(-MAX_TURNS));
    };

    const stop = async () => {
        if (run.current === null) {
            return;
        }

        try {
            await stopAssistant(run.current);
        } catch {
            toast(t('companion.stopFailed'), { tone: 'error' });
        }
    };

    const approve = (at: number, actions: AiPending[]) =>
        send(
            turns.slice(0, at),
            actions.map((action) => action.token)
        );

    const reply = (at: number, content: string) =>
        send([
            ...turns.slice(0, at + 1).map((turn, index) => (index === at ? settle(turn) : turn)),
            { role: 'user', content },
        ]);

    const toggleMode = async () => {
        const next = !askFirst;

        setMode(next);

        try {
            await setAskFirst(next);
        } catch {
            setMode(!next);
            toast(t('companion.saveFailed'), { tone: 'error' });
        }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            ask();
        }
    };

    const anchored: CSSProperties = {
        position: 'fixed',
        bottom: '1.25rem',
        [placement.side]: '1.25rem',
        zIndex: 60,
    };

    const floating: CSSProperties = {
        ...anchored,
        top: '0.75rem',
        bottom: '0.75rem',
        [placement.side]: '0.75rem',
    };

    return createPortal(
        <>
            <button
                type={'button'}
                style={anchored}
                onClick={() => setOpen((value) => !value)}
                aria-label={t(open ? 'companion.close' : 'companion.open')}
                aria-expanded={open}
                className={cn(
                    'dz-scope flex h-12 w-12 items-center justify-center rounded-2xl shadow-panel',
                    'bg-accent text-accent-ink transition-all duration-200 hover:scale-105',
                    open && 'pointer-events-none scale-90 opacity-0'
                )}
            >
                {busy ? (
                    <Loader2 className={'h-5 w-5 animate-spin'} aria-hidden={'true'} />
                ) : (
                    <Bot className={'h-5 w-5'} aria-hidden={'true'} />
                )}
            </button>

            <div
                role={'dialog'}
                aria-label={t('companion.title')}
                aria-hidden={!open}
                style={floating}
                className={cn(
                    'dz-scope flex w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden font-sans border border-gray-100/10',
                    'rounded-2xl bg-card/60 shadow-panel ring-1 ring-line-field',
                    'transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                    placement.origin,
                    open
                        ? 'pointer-events-auto scale-100 opacity-100 backdrop-blur-lg'
                        : 'pointer-events-none scale-95 opacity-0'
                )}
            >
                <span
                    aria-hidden={'true'}
                    className={
                        'pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl'
                    }
                />
                <header className={'relative flex shrink-0 items-center gap-2 px-3 pt-2.5'}>
                    <div className={'min-w-0 flex-1'}>
                        <p className={'truncate text-sm font-semibold leading-tight text-ink'}>
                            {t('companion.title')}
                        </p>
                        <button
                            type={'button'}
                            disabled={!config.canBringKey}
                            onClick={() => setKeyOpen(true)}
                            title={config.providerLabels[service] ?? service}
                            className={cn(
                                'block max-w-full truncate text-left text-[11px] leading-tight',
                                model === '' ? 'text-warning' : 'text-ink-faint',
                                config.canBringKey && 'hover:text-ink'
                            )}
                        >
                            {model === '' ? t('companion.selectModel') : model}
                            {allowance !== null && model !== '' && (
                                <span className={'text-ink-faint'}>
                                    {' '}
                                    ·{' '}
                                    {t('companion.allowance', {
                                        remaining: allowance.remaining,
                                        total: allowance.messages,
                                    })}
                                </span>
                            )}
                        </button>
                    </div>

                    {config.writes && (
                        <IconButton
                            label={t(askFirst ? 'companion.asksFirst' : 'companion.actsFreely')}
                            onClick={toggleMode}
                            tone={askFirst ? 'muted' : 'accent'}
                        >
                            {askFirst ? (
                                <ShieldCheck className={'h-4 w-4'} aria-hidden={'true'} />
                            ) : (
                                <Rocket className={'h-4 w-4'} aria-hidden={'true'} />
                            )}
                        </IconButton>
                    )}

                    {config.canBringKey && (
                        <IconButton label={t('companion.keyAndModel')} onClick={() => setKeyOpen(true)}>
                            <KeyRound className={'h-4 w-4'} aria-hidden={'true'} />
                        </IconButton>
                    )}

                    {turns.length > 0 && (
                        <IconButton label={t('companion.clearThread')} onClick={() => setTurns([])}>
                            <Trash2 className={'h-4 w-4'} aria-hidden={'true'} />
                        </IconButton>
                    )}

                    <IconButton label={t('common.close')} onClick={() => setOpen(false)}>
                        <X className={'h-4 w-4'} aria-hidden={'true'} />
                    </IconButton>
                </header>

                {keyOpen && (
                    <SettingsModal
                        config={config}
                        account={account}
                        onClose={() => setKeyOpen(false)}
                        onSaved={(saved) => {
                            setAccount({
                                ...saved,
                                ready: saved.hasOwnKey || config.hasPanelKey || config.ready,
                            });
                            setKeyOpen(false);
                            toast(t(saved.hasOwnKey ? 'companion.saved' : 'companion.keyRemoved'), { tone: 'success' });
                        }}
                    />
                )}

                <div ref={thread} className={'relative min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3'}>
                    {!ready && (
                        <p
                            className={
                                'flex items-start gap-2 rounded-xl bg-warning/10 p-2.5 text-xs leading-relaxed text-ink-muted'
                            }
                        >
                            <AlertTriangle
                                className={'mt-0.5 h-3.5 w-3.5 shrink-0 text-warning'}
                                aria-hidden={'true'}
                            />
                            {t(config.canBringKey ? 'companion.needYourKey' : 'companion.needPanelKey')}
                        </p>
                    )}

                    {turns.length === 0 && (
                        <div className={'relative flex min-h-full flex-col items-center justify-center'}>
                            <MatrixRain active={open} />

                            <div className={'relative z-10 w-full max-w-[17rem] space-y-2 text-center'}>
                                <p className={'text-sm font-medium text-ink'}>{t('companion.askAboutServer')}</p>
                                <div className={'space-y-1.5 pt-1'}>
                                    {SUGGESTIONS.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type={'button'}
                                            onClick={() => {
                                                setDraft(t(suggestion));
                                                box.current?.focus();
                                            }}
                                            className={
                                                'block w-full rounded-xl border border-line-field bg-card/70 px-2.5 py-2 text-left text-xs text-ink-muted backdrop-blur-sm transition-colors hover:bg-raised hover:text-ink'
                                            }
                                        >
                                            {t(suggestion)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {turns.map((turn, index) =>
                        turn.role === 'user' ? (
                            <p
                                key={index}
                                className={
                                    'ml-6 whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-accent/15 px-3 py-2 text-xs leading-relaxed text-ink'
                                }
                            >
                                {turn.content}
                            </p>
                        ) : (
                            <div key={index} className={'mr-4 space-y-2'}>
                                {turn.steps && turn.steps.length > 0 && <Steps steps={turn.steps} />}

                                {turn.content !== '' &&
                                    (turn.failed ? (
                                        <p
                                            className={
                                                'flex items-start gap-2 rounded-xl bg-danger/10 p-2.5 text-xs leading-relaxed text-ink-muted'
                                            }
                                        >
                                            <AlertTriangle
                                                className={'mt-0.5 h-3.5 w-3.5 shrink-0 text-danger'}
                                                aria-hidden={'true'}
                                            />
                                            {turn.content}
                                        </p>
                                    ) : (
                                        <Markdown text={turn.content} />
                                    ))}

                                {turn.truncated && !turn.failed && (
                                    <p className={'text-[11px] italic text-ink-faint'}>{t('companion.outOfSteps')}</p>
                                )}

                                {turn.pending?.map((action) => (
                                    <PendingCard
                                        key={action.token}
                                        action={action}
                                        busy={busy}
                                        onApprove={() => approve(index, turn.pending ?? [])}
                                        onReply={(answer) => reply(index, answer)}
                                    />
                                ))}
                            </div>
                        )
                    )}

                    {busy && (
                        <div className={'mr-4 space-y-2'}>
                            {progress.length > 0 && <Steps steps={progress} live />}

                            <p className={'flex items-center gap-2 text-xs text-ink-faint'}>
                                <Loader2 className={'h-3.5 w-3.5 animate-spin'} aria-hidden={'true'} />
                                {t(progress.length === 0 ? 'companion.thinking' : 'companion.working')}
                            </p>
                        </div>
                    )}
                </div>

                <form
                    onSubmit={(event: FormEvent) => {
                        event.preventDefault();
                        ask();
                    }}
                    className={'relative shrink-0  p-2.5'}
                >
                    {currentServer !== null && turns.length === 0 && (
                        <button
                            type={'button'}
                            onClick={() => setDraft((value) => `${value}@`.replace(/@@$/, '@'))}
                            className={
                                'mb-2 inline-flex items-center gap-1.5 rounded-lg bg-raised px-2 py-1 text-[11px] text-ink-muted hover:text-ink'
                            }
                        >
                            <ServerIcon className={'h-3 w-3'} aria-hidden={'true'} />
                            {t('companion.aboutThisServer')}
                        </button>
                    )}

                    <div
                        className={
                            'flex items-end gap-2 rounded-2xl border border-line-field bg-raised p-1.5 focus-within:border-accent/60'
                        }
                    >
                        <Mentions draft={draft} setDraft={setDraft}>
                            <textarea
                                ref={box}
                                rows={1}
                                value={draft}
                                disabled={!ready}
                                onChange={(event) => setDraft(event.target.value.slice(0, MAX_MESSAGE))}
                                onKeyDown={onKeyDown}
                                placeholder={t(ready ? 'companion.askAboutServer' : 'companion.notSetUp')}
                                className={
                                    'block max-h-28 w-full resize-none overflow-y-auto bg-transparent px-2 py-2 text-xs leading-5 text-ink outline-none placeholder:text-ink-faint focus-visible:shadow-none disabled:opacity-60'
                                }
                            />
                        </Mentions>

                        {busy ? (
                            <Button
                                size={'sm'}
                                variant={'secondary'}
                                onClick={stop}
                                className={'h-9 w-9 shrink-0 px-0'}
                            >
                                <Square className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                            </Button>
                        ) : (
                            <Button
                                type={'submit'}
                                size={'sm'}
                                disabled={!ready || draft.trim() === ''}
                                className={'h-9 w-9 shrink-0 px-0'}
                            >
                                <Send className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </>,
        document.body
    );
}

let serverCache: Array<{ id: string; name: string }> | null = null;

function Mentions({
    draft,
    setDraft,
    children,
}: {
    draft: string;
    setDraft: (value: string) => void;
    children: React.ReactNode;
}) {
    const [servers, setServers] = useState(serverCache ?? []);
    const query = /@([\w -]*)$/.exec(draft)?.[1] ?? null;

    useEffect(() => {
        if (query === null || serverCache !== null) {
            return;
        }

        let cancelled = false;

        getServers({ page: 1 })
            .then((data) => {
                serverCache = data.items.map((server) => ({ id: server.uuid, name: server.name }));

                if (!cancelled) {
                    setServers(serverCache);
                }
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [query]);

    const matches =
        query === null
            ? []
            : servers.filter((server) => server.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);

    return (
        <div className={'relative min-w-0 flex-1'}>
            {matches.length > 0 && (
                <ul
                    className={
                        'absolute bottom-full left-0 z-10 mb-2 w-full overflow-hidden rounded-xl border border-line bg-card shadow-panel'
                    }
                >
                    {matches.map((server) => (
                        <li key={server.id}>
                            <button
                                type={'button'}
                                onClick={() => setDraft(draft.replace(/@([\w -]*)$/, `@${server.name} `))}
                                className={
                                    'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-ink-muted hover:bg-raised hover:text-ink'
                                }
                            >
                                <ServerIcon className={'h-3 w-3 shrink-0'} aria-hidden={'true'} />
                                <span className={'truncate'}>{server.name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {children}
        </div>
    );
}

function Steps({ steps, live = false }: { steps: AiStep[]; live?: boolean }) {
    const t = useT();
    const [open, setOpen] = useState(live);

    return (
        <div className={'overflow-hidden rounded-xl bg-raised/60'}>
            <button
                type={'button'}
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className={'flex w-full items-center gap-2 px-2.5 py-1.5 text-[11px] text-ink-faint hover:text-ink'}
            >
                <Wrench className={'h-3 w-3 shrink-0'} aria-hidden={'true'} />
                <span className={'flex-1 text-left'}>{t('companion.steps', { count: steps.length })}</span>
                <ChevronDown
                    className={cn('h-3 w-3 shrink-0 transition-transform', !open && '-rotate-90')}
                    aria-hidden={'true'}
                />
            </button>

            {open && (
                <ul className={'space-y-1 px-2.5 pb-2'}>
                    {steps.map((step, index) => (
                        <li key={index} className={'flex items-start gap-2 text-[11px] leading-relaxed'}>
                            <span
                                aria-hidden={'true'}
                                className={cn(
                                    'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                                    step.ok ? 'bg-success' : 'bg-danger'
                                )}
                            />
                            <span className={'min-w-0'}>
                                <span className={'font-mono text-ink-muted'}>{step.tool}</span>{' '}
                                <span className={'text-ink-faint'}>{step.summary}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function PendingCard({
    action,
    busy,
    onApprove,
    onReply,
}: {
    action: AiPending;
    busy: boolean;
    onApprove: () => void;
    onReply: (answer: string) => void;
}) {
    const t = useT();
    const options = (action.input?.options as string[] | undefined) ?? [];

    if (action.kind === 'question') {
        return (
            <div className={'space-y-2 rounded-xl border border-line-field p-2.5'}>
                <p className={'text-xs leading-relaxed text-ink'}>{action.summary}</p>

                {options.length > 0 && (
                    <div className={'flex flex-wrap gap-1.5'}>
                        {options.map((option) => (
                            <button
                                key={option}
                                type={'button'}
                                disabled={busy}
                                onClick={() => onReply(option)}
                                className={
                                    'rounded-lg bg-raised px-2 py-1 text-[11px] text-ink-muted hover:bg-overlay hover:text-ink disabled:opacity-50'
                                }
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={'space-y-2 rounded-xl border border-warning/40 bg-warning/5 p-2.5'}>
            <p className={'text-xs leading-relaxed text-ink'}>{action.summary}</p>

            <div className={'flex gap-1.5'}>
                <Button size={'sm'} disabled={busy} onClick={onApprove} icon={<Check className={'h-3 w-3'} />}>
                    {t('companion.allow')}
                </Button>

                <Button
                    size={'sm'}
                    variant={'ghost'}
                    disabled={busy}
                    onClick={() => onReply(t('companion.declineReply'))}
                >
                    {t('companion.no')}
                </Button>
            </div>
        </div>
    );
}

interface AiAccount {
    ready: boolean;
    hasOwnKey: boolean;
    provider: string;
    model: string;
    own: boolean;
}

function SettingsModal({
    config,
    account,
    onClose,
    onSaved,
}: {
    config: AiConfig;
    account: AiAccount;
    onClose: () => void;
    onSaved: (account: Omit<AiAccount, 'ready'>) => void;
}) {
    const t = useT();
    const { toast } = useToast();

    const [key, setKey] = useState('');
    const [provider, setProvider] = useState(account.provider || config.provider);
    const [model, setModel] = useState(account.model);
    const [own, setOwn] = useState(account.own);
    const [saving, setSaving] = useState(false);

    const [models, setModels] = useState<AiModelList | null>(null);
    const [listing, setListing] = useState(false);
    const [typed, setTyped] = useState(false);

    useEffect(() => {
        const onKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const list = (fresh = false) => {
        setListing(true);

        fetchModels(provider, key, fresh)
            .then(setModels)
            .catch(() => setModels(null))
            .finally(() => setListing(false));
    };

    useEffect(list, [provider]);

    const save = async () => {
        setSaving(true);

        try {
            await saveAiKey({ key, provider, model, own: key !== '' ? own : account.own });

            onSaved({
                hasOwnKey: key !== '' || account.hasOwnKey,
                provider,
                model,
                own: key !== '' ? own : account.own,
            });
        } catch {
            toast(t('companion.saveFailed'), { tone: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        setSaving(true);

        try {
            await saveAiKey({ key: '', provider, model: '', own: false, remove: true });
            onSaved({ hasOwnKey: false, provider: config.provider, model: '', own: false });
        } catch {
            toast(t('companion.removeFailed'), { tone: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const available = models?.models ?? [];
    const options = model !== '' && !available.includes(model) ? [model, ...available] : available;

    return createPortal(
        <div
            role={'dialog'}
            aria-modal={'true'}
            aria-label={t('companion.keyAndModel')}
            className={'dz-scope fixed inset-0 z-[75] flex items-center justify-center p-4 font-sans'}
        >
            <button
                type={'button'}
                aria-label={t('common.close')}
                onClick={onClose}
                className={'absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm animate-backdrop-in'}
            />

            <div
                className={
                    'relative flex max-h-[calc(100vh-2rem)] w-[min(30rem,100%)] flex-col overflow-y-auto rounded-2xl border border-line bg-card p-5 shadow-panel animate-modal-in motion-reduce:animate-none'
                }
            >
                <div className={'mb-4 flex items-start gap-3'}>
                    <div className={'min-w-0 flex-1'}>
                        <p className={'text-base font-semibold leading-tight text-ink'}>{t('companion.keyAndModel')}</p>
                        <p className={'mt-1 text-xs leading-relaxed text-ink-faint'}>
                            {t(config.keyMode === 'user' ? 'companion.keyModeUser' : 'companion.keyModePanel')}
                        </p>
                    </div>

                    <IconButton label={t('common.close')} onClick={onClose}>
                        <X className={'h-4 w-4'} aria-hidden={'true'} />
                    </IconButton>
                </div>

                <div className={'space-y-3'}>
                    <Select
                        label={t('companion.service')}
                        value={provider}
                        onChange={(value) => {
                            setProvider(value);
                            setModel('');
                            setTyped(false);
                        }}
                        options={config.userProviders.map((name) => ({
                            value: name,
                            label: config.providerLabels[name] ?? name,
                        }))}
                    />

                    <Input
                        label={t('companion.apiKey')}
                        type={'password'}
                        value={key}
                        autoComplete={'new-password'}
                        onChange={(event) => setKey(event.target.value)}
                        onBlur={() => key !== '' && list(true)}
                        placeholder={t(account.hasOwnKey ? 'companion.keySaved' : 'companion.yourApiKey')}
                        hint={config.keylessProviders.includes(provider) ? t('companion.keyless') : undefined}
                    />

                    <div>
                        <div className={'mb-1.5 flex items-end justify-between gap-2'}>
                            <span className={'text-sm font-medium text-ink-muted'}>{t('companion.model')}</span>

                            <button
                                type={'button'}
                                onClick={() => (typed ? setTyped(false) : list(true))}
                                className={'text-xs text-ink-faint hover:text-ink'}
                            >
                                {t(
                                    typed
                                        ? 'companion.pickFromList'
                                        : listing
                                        ? 'companion.asking'
                                        : 'companion.refreshList'
                                )}
                            </button>
                        </div>

                        {typed || (options.length === 0 && !listing) ? (
                            <Input
                                value={model}
                                onChange={(event) => setModel(event.target.value)}
                                placeholder={config.defaultModels[provider] || t('companion.serviceDefault')}
                            />
                        ) : (
                            <Select
                                value={model}
                                onChange={setModel}
                                placeholder={t('companion.selectModel')}
                                options={[
                                    {
                                        value: '',
                                        label: `${t('companion.serviceDefault')}${
                                            config.defaultModels[provider] ? ` (${config.defaultModels[provider]})` : ''
                                        }`,
                                    },
                                    ...options.map((name) => ({ value: name, label: name })),
                                ]}
                            />
                        )}

                        <p className={'mt-1.5 text-xs leading-relaxed text-ink-faint'}>
                            {models?.error
                                ? models.error
                                : models?.live
                                ? t('companion.modelsListed', { count: available.length })
                                : t('companion.saveKeyToList')}{' '}
                            {!typed && (
                                <button
                                    type={'button'}
                                    onClick={() => setTyped(true)}
                                    className={'text-accent hover:underline'}
                                >
                                    {t('companion.typeAName')}
                                </button>
                            )}
                        </p>
                    </div>

                    {config.keyMode === 'choice' && (
                        <label className={'flex items-start gap-2 text-xs leading-relaxed text-ink-muted'}>
                            <input
                                type={'checkbox'}
                                checked={own}
                                onChange={(event) => setOwn(event.target.checked)}
                                className={'mt-0.5 h-3.5 w-3.5 accent-accent'}
                            />
                            {t('companion.spendMyKey')}
                        </label>
                    )}
                </div>

                <div className={'mt-5 flex items-center gap-2'}>
                    <Button loading={saving} onClick={save}>
                        {t('common.save')}
                    </Button>

                    <Button variant={'ghost'} onClick={onClose}>
                        {t('common.cancel')}
                    </Button>

                    {account.hasOwnKey && (
                        <Button variant={'ghost'} disabled={saving} onClick={remove} className={'ml-auto text-danger'}>
                            {t('companion.removeKey')}
                        </Button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function IconButton({
    label,
    onClick,
    tone = 'muted',
    children,
}: {
    label: string;
    onClick: () => void;
    tone?: 'muted' | 'accent';
    children: React.ReactNode;
}) {
    return (
        <button
            type={'button'}
            onClick={onClick}
            title={label}
            aria-label={label}
            className={cn(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-raised',
                tone === 'accent' ? 'text-accent' : 'text-ink-faint hover:text-ink'
            )}
        >
            {children}
        </button>
    );
}

function demoThread(t: TranslateFn): Turn[] {
    const server = 'a1b2c3d4';

    return [
        { role: 'user', content: t('demo.aiAsk') },
        {
            role: 'assistant',
            content: t('demo.aiReply'),
            steps: [
                { tool: 'list_servers', input: {}, ok: true, summary: t('demo.aiStep1') },
                { tool: 'server_status', input: { server }, ok: true, summary: t('demo.aiStep2') },
                { tool: 'create_backup', input: { server }, ok: true, summary: t('demo.aiStep3') },
                {
                    tool: 'write_file',
                    input: { server, path: '/plugins/EssentialsX-2.20.1.jar' },
                    ok: true,
                    summary: t('demo.aiStep4'),
                },
                { tool: 'power', input: { server, action: 'restart' }, ok: true, summary: t('demo.aiStep5') },
            ],
        },
    ];
}

function readThread(): Turn[] {
    try {
        const stored = JSON.parse(sessionStorage.getItem(THREAD_KEY) ?? '[]');

        return Array.isArray(stored) ? stored : [];
    } catch {
        return [];
    }
}

export { Companion };
