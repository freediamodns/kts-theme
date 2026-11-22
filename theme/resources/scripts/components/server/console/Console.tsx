import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ITerminalOptions, Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Unicode11Addon } from 'xterm-addon-unicode11';
import { ScrollDownHelperAddon } from '@/plugins/XtermScrollDownHelperAddon';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import { ServerContext } from '@/state/server';
import { usePermissions } from '@/plugins/usePermissions';
import useEventListener from '@/plugins/useEventListener';
import { debounce } from 'debounce';
import { SocketEvent, SocketRequest } from '@/components/server/events';
import classNames from 'classnames';
import { ChevronsRight, History, Minus, Plus, Power, Regex, Search, Trash2, X } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { THEME_CSS_EVENT, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { ConsoleLine, LineFilter, Matcher, applyRules, buildMatcher, makeLine } from '@/dezerx/lib/consoleLines';
import { useCommandHistory } from '@/dezerx/components/console/useCommandHistory';
import ShareLog from '@/dezerx/components/console/ShareLog';

import 'xterm/css/xterm.css';
import styles from './style.module.css';
import { useT } from '@/i18n';

const token = (name: string, fallback: string, host?: Element | null): string => {
    if (typeof window === 'undefined') {
        return fallback;
    }

    const value = getComputedStyle(host ?? document.documentElement)
        .getPropertyValue(name)
        .trim();

    return value === '' ? fallback : value;
};

const EMPTY_PAINT = /^(transparent|rgba?\(\s*0,\s*0,\s*0\s*(,\s*[01](\.0+)?)?\s*\))$/;

const surface = (host: Element | null): string | null => {
    let current: Element | null = host;

    while (current !== null && current !== document.documentElement) {
        const value = getComputedStyle(current).backgroundColor.trim();

        if (value !== '' && !EMPTY_PAINT.test(value)) {
            return value;
        }

        current = current.parentElement;
    }

    return null;
};

const terminalTheme = (host?: Element | null) => ({
    background: surface(host ?? null) ?? token('--surface-card', '#0f1219', host),
    foreground: token('--terminal-ink', '#cbd5e1', host),
    cursor: 'transparent',
    selection: token('--terminal-accent', '#FAF089', host),
    black: '#000000',
    red: '#E54B4B',
    green: '#9ECE58',
    yellow: '#FAED70',
    blue: '#396FE2',
    magenta: '#BB80B3',
    cyan: '#2DDAFD',
    white: '#d0d0d0',
    brightBlack: token('--terminal-muted', 'rgba(255, 255, 255, 0.2)', host),
    brightRed: '#FF5370',
    brightGreen: '#C3E88D',
    brightYellow: '#FFCB6B',
    brightBlue: '#82AAFF',
    brightMagenta: '#C792EA',
    brightCyan: '#89DDFF',
    brightWhite: '#ffffff',
});

const MONO_FALLBACK =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const monoStack = (): string => {
    const stack = token('--font-mono', '');

    if (stack === '' || stack.includes('var(')) {
        return MONO_FALLBACK;
    }

    return `${stack}, ${MONO_FALLBACK}`;
};

const terminalProps: ITerminalOptions = {
    disableStdin: true,
    cursorStyle: 'underline',
    allowTransparency: false,
    rows: 30,
};

const DEFAULT_FONT_SIZE = 12;

const MIN_FONT_SIZE = 9;
const MAX_FONT_SIZE = 22;

const FONT_SIZE_KEY = 'dezerx.console.font-size';

const readFontSize = (): number => {
    try {
        const stored = Number(window.localStorage.getItem(FONT_SIZE_KEY));

        if (Number.isFinite(stored) && stored >= MIN_FONT_SIZE && stored <= MAX_FONT_SIZE) {
            return stored;
        }
    } catch {}

    return DEFAULT_FONT_SIZE;
};

const MAX_LINES = 2000;

const COUNT_INTERVAL = 250;

const FILTERS: LineFilter[] = ['all', 'warn', 'error'];

const STOCK_PROMPT = 'container@pterodactyl~';

const STOCK_DAEMON = 'KTS Host';

export default () => {
    const t = useT();
    const theme = usePanelTheme();

    const prompt = theme['console.prompt'].trim() || STOCK_PROMPT;
    const daemon = theme['console.daemon'].trim() || STOCK_DAEMON;
    const rules = theme['console.rules'];

    const prelude = `\u001b[1m\u001b[33m${prompt} \u001b[0m`;

    const restamp = useCallback(
        (line: string): string => {
            const named = daemon === STOCK_DAEMON ? line : line.split(STOCK_DAEMON).join(daemon);

            return prompt === STOCK_PROMPT ? named : named.split(STOCK_PROMPT).join(prompt);
        },
        [daemon, prompt]
    );

    const rewrite = useCallback((line: string): string[] => applyRules(line, rules), [rules]);
    const ref = useRef<HTMLDivElement>(null);
    const terminal = useMemo(
        () =>
            new Terminal({
                ...terminalProps,
                fontSize: readFontSize(),
                fontFamily: monoStack(),
                theme: terminalTheme(),
            }),
        []
    );
    const fitAddon = useMemo(() => new FitAddon(), []);
    const webLinksAddon = useMemo(() => new WebLinksAddon(), []);
    const unicode11Addon = useMemo(() => new Unicode11Addon(), []);
    const scrollDownHelperAddon = useMemo(() => new ScrollDownHelperAddon(), []);

    const { connected, instance } = ServerContext.useStoreState((state) => state.socket);
    const [canSendCommands] = usePermissions(['control.console']);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const isTransferring = ServerContext.useStoreState((state) => state.server.data!.isTransferring);
    const status = ServerContext.useStoreState((state) => state.status.value);

    const [arrivedOffline, setArrivedOffline] = useState(false);
    const firstStatus = useRef(true);

    useEffect(() => {
        if (status === null) {
            return;
        }

        if (firstStatus.current) {
            firstStatus.current = false;
            setArrivedOffline(status === 'offline');

            return;
        }

        if (status !== 'offline') {
            setArrivedOffline(false);
        }
    }, [status]);

    const history = useCommandHistory(uuid, canSendCommands);

    const [filter, setFilter] = useState<LineFilter>('all');
    const [searching, setSearching] = useState(false);
    const [search, setSearch] = useState('');
    const [regex, setRegex] = useState(false);
    const [browsing, setBrowsing] = useState(false);
    const [counts, setCounts] = useState({ all: 0, warn: 0, error: 0 });
    const [draft, setDraft] = useState('');
    const [recalled, setRecalled] = useState(-1);
    const [clearing, setClearing] = useState(false);
    const [fontSize, setFontSize] = useState(readFontSize);

    const finder = useRef<HTMLInputElement>(null);
    const command = useRef<HTMLInputElement>(null);
    const historyPanel = useRef<HTMLDivElement>(null);

    const buffer = useRef<ConsoleLine[]>([]);
    const nextId = useRef(0);
    const dirty = useRef(false);

    const matcher: Matcher = useMemo(() => buildMatcher(search, regex), [search, regex]);

    const view = useRef({ filter, matcher });
    view.current = { filter, matcher };

    const passes = useCallback((line: ConsoleLine, at: { filter: LineFilter; matcher: Matcher }) => {
        if (at.filter !== 'all' && line.level !== at.filter) {
            return false;
        }

        return at.matcher.test(line.plain);
    }, []);

    const repaint = useCallback(() => {
        const at = view.current;

        terminal.reset();

        for (const line of buffer.current) {
            if (passes(line, at)) {
                terminal.writeln(line.text);
            }
        }
    }, [terminal, passes]);

    const push = useCallback(
        (raw: string) => {
            const written = rewrite(raw);

            if (written.length === 0) {
                return;
            }

            for (const text of written) {
                const line = makeLine(nextId.current, text);

                nextId.current += 1;
                buffer.current.push(line);

                if (passes(line, view.current)) {
                    terminal.writeln(text);
                }
            }

            if (buffer.current.length > MAX_LINES) {
                buffer.current.splice(0, buffer.current.length - MAX_LINES);
            }

            dirty.current = true;
        },
        [terminal, passes, rewrite]
    );

    useEffect(() => {
        const tally = () => {
            const at = view.current;
            const next = { all: 0, warn: 0, error: 0 };

            for (const line of buffer.current) {
                if (!at.matcher.test(line.plain)) {
                    continue;
                }

                next.all += 1;

                if (line.level === 'warn') {
                    next.warn += 1;
                } else if (line.level === 'error') {
                    next.error += 1;
                }
            }

            setCounts(next);
        };

        tally();

        const timer = window.setInterval(() => {
            if (dirty.current) {
                dirty.current = false;
                tally();
            }
        }, COUNT_INTERVAL);

        return () => window.clearInterval(timer);
    }, [filter, matcher]);

    const scheduleRepaint = useMemo(() => debounce(() => repaint(), 120), [repaint]);

    const firstView = useRef(true);

    useEffect(() => {
        if (firstView.current) {
            firstView.current = false;

            return;
        }

        scheduleRepaint();
    }, [filter, matcher, scheduleRepaint]);

    const handleConsoleOutput = (line: string, withPrompt = false) =>
        push((withPrompt ? prelude : '') + restamp(line.replace(/(?:\r\n|\r|\n)$/im, '')) + '[0m');

    const handleTransferStatus = (status: string) => {
        switch (status) {
            case 'failure':
                push(prelude + t('console.transferFailed') + '[0m');
                return;
        }
    };

    const handleDaemonErrorOutput = (line: string) =>
        push(prelude + '[1m[41m' + restamp(line.replace(/(?:\r\n|\r|\n)$/im, '')) + '[0m');

    const handlePowerChangeEvent = (state: string) => push(prelude + t('console.markedAs', { state }) + '[0m');

    const submit = () => {
        const typed = draft.trim();

        if (typed === '' || !instance || !connected) {
            return;
        }

        history.record(typed);
        setRecalled(-1);
        setDraft('');
        instance.send('send command', typed);
    };

    const handleCommandKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            submit();

            return;
        }

        if (event.key === 'Escape' && browsing) {
            event.preventDefault();
            setBrowsing(false);

            return;
        }

        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
            return;
        }

        event.preventDefault();

        const next =
            event.key === 'ArrowUp' ? Math.min(history.items.length - 1, recalled + 1) : Math.max(-1, recalled - 1);

        setRecalled(next);
        setDraft(next === -1 ? '' : history.items[next]?.command ?? '');
    };

    const closeSearch = () => {
        setSearching(false);
        setSearch('');
    };

    useEffect(() => {
        if (searching) {
            finder.current?.focus();
        }
    }, [searching]);

    useEffect(() => {
        if (!browsing) {
            return;
        }

        const onMouseDown = (event: MouseEvent) => {
            if (!historyPanel.current?.contains(event.target as Node)) {
                setBrowsing(false);
            }
        };

        document.addEventListener('mousedown', onMouseDown);

        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [browsing]);

    useEffect(() => {
        if (connected && ref.current && !terminal.element) {
            terminal.loadAddon(fitAddon);
            terminal.loadAddon(webLinksAddon);
            terminal.loadAddon(unicode11Addon);
            terminal.loadAddon(scrollDownHelperAddon);

            terminal.open(ref.current);

            terminal.unicode.activeVersion = '11';

            fitAddon.fit();

            terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
                    document.execCommand('copy');

                    return false;
                }

                if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                    event.preventDefault();
                    setSearching(true);

                    return false;
                }

                if (event.key === 'Escape') {
                    closeSearch();
                }

                return true;
            });
        }
    }, [terminal, connected]);

    useEventListener(
        'resize',
        debounce(() => {
            if (terminal.element) {
                fitAddon.fit();
            }
        }, 100)
    );

    useEffect(() => {
        const apply = () => {
            terminal.setOption('theme', terminalTheme(terminal.element ?? ref.current));

            const stack = monoStack();

            if (terminal.getOption('fontFamily') !== stack) {
                terminal.setOption('fontFamily', stack);
                fitAddon.fit();
            }
        };

        apply();

        const observer = new MutationObserver(apply);

        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });

        window.addEventListener(THEME_CSS_EVENT, apply);

        return () => {
            observer.disconnect();
            window.removeEventListener(THEME_CSS_EVENT, apply);
        };
    }, [terminal, fitAddon, connected]);

    useEffect(() => {
        terminal.setOption('fontSize', fontSize);

        if (terminal.element) {
            fitAddon.fit();
        }

        try {
            window.localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
        } catch {}
    }, [fontSize, terminal, fitAddon]);

    useEffect(() => {
        const listeners: Record<string, (s: string) => void> = {
            [SocketEvent.STATUS]: handlePowerChangeEvent,
            [SocketEvent.CONSOLE_OUTPUT]: handleConsoleOutput,
            [SocketEvent.INSTALL_OUTPUT]: handleConsoleOutput,
            [SocketEvent.TRANSFER_LOGS]: handleConsoleOutput,
            [SocketEvent.TRANSFER_STATUS]: handleTransferStatus,
            [SocketEvent.DAEMON_MESSAGE]: (line) => handleConsoleOutput(line, true),
            [SocketEvent.DAEMON_ERROR]: handleDaemonErrorOutput,
        };

        if (connected && instance) {
            if (!isTransferring) {
                terminal.clear();
                buffer.current = [];
                dirty.current = true;
            }

            Object.keys(listeners).forEach((key: string) => {
                instance.addListener(key, listeners[key]);
            });
            instance.send(SocketRequest.SEND_LOGS);
        }

        return () => {
            if (instance) {
                Object.keys(listeners).forEach((key: string) => {
                    instance.removeListener(key, listeners[key]);
                });
            }
        };
    }, [connected, instance]);

    const clearHistory = async () => {
        setClearing(true);

        try {
            await history.clear();
        } finally {
            setClearing(false);
        }
    };

    const visibleText = () => {
        const at = view.current;

        return buffer.current
            .filter((line) => passes(line, at))
            .map((line) => line.plain)
            .join('\n');
    };

    return (
        <div className={classNames(styles.terminal, 'relative space-y-3')}>
            <div className={'flex flex-wrap items-center justify-between gap-3'}>
                <div
                    role={'tablist'}
                    aria-label={t('console.filterLabel')}
                    className={'flex items-center gap-1 rounded-2xl bg-card p-1'}
                >
                    {FILTERS.map((tab) => (
                        <button
                            key={tab}
                            type={'button'}
                            role={'tab'}
                            aria-selected={filter === tab}
                            onClick={() => setFilter(tab)}
                            className={cn(
                                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                                filter === tab ? 'bg-overlay text-ink' : 'text-ink-muted hover:text-ink'
                            )}
                        >
                            {t(`console.filter.${tab}`)}
                            <span
                                className={cn(
                                    'tabular-nums text-[10px]',
                                    tab === 'error' && counts.error > 0
                                        ? 'text-danger'
                                        : tab === 'warn' && counts.warn > 0
                                        ? 'text-warning'
                                        : 'text-ink-faint'
                                )}
                            >
                                {counts[tab].toLocaleString()}
                            </span>
                        </button>
                    ))}
                </div>

                <ShareLog uuid={uuid} collect={visibleText} empty={counts.all === 0} />
            </div>

            {searching && (
                <div
                    className={'flex shrink-0 items-center gap-2 rounded-2xl bg-card px-3 py-2 ring-1 ring-line-field'}
                >
                    <Search aria-hidden={'true'} className={'h-4 w-4 shrink-0 text-ink-faint'} />

                    <input
                        ref={finder}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                event.preventDefault();
                                closeSearch();
                            }
                        }}
                        spellCheck={false}
                        autoComplete={'off'}
                        aria-label={t('console.filterLabel')}
                        placeholder={t(regex ? 'console.searchRegex' : 'console.searchWord')}
                        className={
                            'w-full border-0 bg-transparent p-0 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-0'
                        }
                    />

                    {matcher.error !== null && (
                        <span className={'shrink-0 truncate text-[11px] text-danger'} title={matcher.error}>
                            {t('console.incompletePattern')}
                        </span>
                    )}

                    {matcher.error === null && matcher.active && (
                        <span className={'shrink-0 tabular-nums text-[11px] text-ink-faint'}>
                            {t('console.matching', { count: counts.all })}
                        </span>
                    )}

                    <button
                        type={'button'}
                        onClick={() => setRegex((on) => !on)}
                        aria-pressed={regex}
                        title={t(regex ? 'console.regexOn' : 'console.regexOff')}
                        className={cn(
                            'shrink-0 rounded-lg p-1 transition-colors',
                            regex ? 'bg-overlay text-accent' : 'text-ink-faint hover:text-ink'
                        )}
                    >
                        <Regex aria-hidden={'true'} className={'h-3.5 w-3.5'} />
                    </button>

                    <button
                        type={'button'}
                        onClick={closeSearch}
                        aria-label={t('console.closeFilter')}
                        className={'shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:text-ink'}
                    >
                        <X aria-hidden={'true'} className={'h-3.5 w-3.5'} />
                    </button>
                </div>
            )}

            <div className={'relative overflow-hidden rounded-2xl bg-card ring-1 ring-line-field'}>
                <SpinnerOverlay visible={!connected} size={'large'} />

                {theme['console.offline'] && connected && status === 'offline' && arrivedOffline && (
                    <div
                        aria-hidden={'true'}
                        className={
                            'pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/70 backdrop-blur-[2px]'
                        }
                    >
                        <span
                            className={
                                'flex h-14 w-14 items-center justify-center rounded-2xl bg-overlay/80 text-ink-faint ring-1 ring-line-field'
                            }
                        >
                            <Power className={'h-7 w-7'} />
                        </span>

                        <div className={'text-center'}>
                            <p className={'text-sm font-semibold tracking-tight text-ink-muted'}>
                                {t('console.offlineTitle')}
                            </p>
                            <p className={'mt-0.5 text-xs text-ink-faint'}>{t('console.offlineBody')}</p>
                        </div>
                    </div>
                )}

                <div
                    className={
                        'absolute right-3 top-2 z-10 flex items-center gap-0.5 rounded-xl bg-card p-0.5 opacity-40 ring-1 ring-line-field backdrop-blur transition-opacity hover:opacity-100 focus-within:opacity-100'
                    }
                >
                    <SizeButton
                        label={t('console.textSmaller')}
                        disabled={fontSize <= MIN_FONT_SIZE}
                        onClick={() => setFontSize((size) => Math.max(MIN_FONT_SIZE, size - 1))}
                    >
                        <Minus aria-hidden={'true'} className={'h-3 w-3'} />
                    </SizeButton>

                    <button
                        type={'button'}
                        onClick={() => setFontSize(DEFAULT_FONT_SIZE)}
                        title={t('console.textSize', { size: fontSize, reset: DEFAULT_FONT_SIZE })}
                        aria-label={t('console.textSizeLabel', { size: fontSize, reset: DEFAULT_FONT_SIZE })}
                        className={
                            'min-w-[1.75rem] rounded-lg px-1 py-0.5 text-center text-[11px] tabular-nums text-ink-muted transition-colors hover:bg-overlay hover:text-ink'
                        }
                    >
                        {fontSize}
                    </button>

                    <SizeButton
                        label={t('console.textLarger')}
                        disabled={fontSize >= MAX_FONT_SIZE}
                        onClick={() => setFontSize((size) => Math.min(MAX_FONT_SIZE, size + 1))}
                    >
                        <Plus aria-hidden={'true'} className={'h-3 w-3'} />
                    </SizeButton>
                </div>

                <div className={styles.container}>
                    <div className={'h-full'}>
                        <div id={styles.terminal} ref={ref} />
                    </div>
                </div>
            </div>

            <div ref={historyPanel} className={'relative'}>
                {browsing && (
                    <CommandHistoryPanel
                        history={history}
                        clearing={clearing}
                        onClear={() => void clearHistory()}
                        onRecall={(entry) => {
                            setBrowsing(false);
                            setDraft(entry);
                            command.current?.focus();
                        }}
                    />
                )}

                <div className={'flex items-center gap-2 rounded-2xl bg-card px-4 py-3 ring-1 ring-line-field'}>
                    <ChevronsRight className={'h-4 w-4 shrink-0 text-terminal-ink'} aria-hidden={'true'} />

                    <input
                        ref={command}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={handleCommandKeyDown}
                        className={classNames(styles.command_input)}
                        type={'text'}
                        placeholder={t(canSendCommands ? 'console.commandPlaceholder' : 'console.commandDenied')}
                        aria-label={t('console.commandLabel')}
                        disabled={!canSendCommands || !instance || !connected}
                        autoCorrect={'off'}
                        autoCapitalize={'none'}
                        spellCheck={false}
                    />

                    <Toggle
                        active={searching}
                        label={t('console.filterOutput')}
                        onClick={() => (searching ? closeSearch() : setSearching(true))}
                    >
                        <Search aria-hidden={'true'} className={'h-4 w-4'} />
                    </Toggle>

                    {canSendCommands && (
                        <Toggle
                            active={browsing}
                            label={t('console.history')}
                            onClick={() => setBrowsing((open) => !open)}
                        >
                            <History aria-hidden={'true'} className={'h-4 w-4'} />
                        </Toggle>
                    )}
                </div>
            </div>
        </div>
    );
};

function SizeButton({
    label,
    disabled,
    onClick,
    children,
}: {
    label: string;
    disabled: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type={'button'}
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            className={
                'rounded-lg p-1 text-ink-muted transition-colors hover:bg-overlay hover:text-ink disabled:pointer-events-none disabled:opacity-40'
            }
        >
            {children}
        </button>
    );
}

function Toggle({
    active,
    label,
    onClick,
    children,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type={'button'}
            onClick={onClick}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={cn(
                'shrink-0 rounded-lg p-1 transition-colors',
                active ? 'text-terminal-accent' : 'text-terminal-muted hover:text-terminal-ink'
            )}
        >
            {children}
        </button>
    );
}

function CommandHistoryPanel({
    history,
    clearing,
    onClear,
    onRecall,
}: {
    history: ReturnType<typeof useCommandHistory>;
    clearing: boolean;
    onClear: () => void;
    onRecall: (command: string) => void;
}) {
    const t = useT();

    return (
        <div
            className={
                'absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-2xl bg-card shadow-panel ring-1 ring-line-field'
            }
        >
            <div className={'flex items-center justify-between gap-3 border-b border-line-field px-3 py-2'}>
                <span className={'text-xs font-medium text-ink'}>{t('console.history')}</span>

                {history.items.length > 0 && (
                    <button
                        type={'button'}
                        onClick={onClear}
                        disabled={clearing}
                        className={
                            'flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] text-ink-faint transition-colors hover:text-danger disabled:opacity-50'
                        }
                    >
                        <Trash2 aria-hidden={'true'} className={'h-3 w-3'} />
                        {t('common.clear')}
                    </button>
                )}
            </div>

            <div className={'max-h-64 overflow-y-auto p-1'}>
                {history.loading ? (
                    <p className={'px-2 py-3 text-center text-xs text-ink-faint'}>{t('common.loading')}</p>
                ) : history.items.length === 0 ? (
                    <p className={'px-2 py-3 text-center text-xs text-ink-faint'}>
                        {t('console.historyEmpty', { count: history.keepDays })}
                    </p>
                ) : (
                    history.items.map((entry) => (
                        <button
                            key={entry.id}
                            type={'button'}
                            onClick={() => onRecall(entry.command)}
                            className={
                                'block w-full truncate rounded-xl px-2.5 py-1.5 text-left font-mono text-[12px] text-ink-muted transition-colors hover:bg-overlay hover:text-ink'
                            }
                        >
                            {entry.command}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
