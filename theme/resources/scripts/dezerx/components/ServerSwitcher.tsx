import React, { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Search, Server as ServerIcon } from 'lucide-react';
import getServers from '@/api/getServers';
import { Server } from '@/api/server/getServer';
import { cn } from '@/dezerx/lib/cn';
import { matchesServer } from '@/dezerx/lib/serverSearch';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { resolveArt } from '@/dezerx/lib/serverArtwork';
import useAutoId from '@/dezerx/lib/useAutoId';
import { Input, Skeleton } from '@/dezerx/components/ui';
import { useT } from '@/i18n';

const STATUS_DOT: Record<string, string> = {
    running: 'bg-success',
    offline: 'bg-offline',
    starting: 'bg-warning',
    installing: 'bg-warning',
    suspended: 'bg-danger',
};

const STATUS_UNKNOWN = 'bg-ink-faint';

const cache: { at: number; servers: Server[] } = { at: 0, servers: [] };

const CACHE_TTL = 30_000;

export function forgetServerList(): void {
    cache.at = 0;
    cache.servers = [];
}

function ServerMark({ logo }: { logo: string | null }) {
    const [broken, setBroken] = useState(false);

    useEffect(() => setBroken(false), [logo]);

    if (logo === null || broken) {
        return <ServerIcon className={'h-8 w-8 shrink-0 text-ink-faint'} aria-hidden={'true'} />;
    }

    return (
        <img
            src={logo}
            alt={''}
            aria-hidden={'true'}
            width={32}
            height={32}
            loading={'lazy'}
            decoding={'async'}
            draggable={false}
            onError={() => setBroken(true)}
            className={'h-8 w-8 shrink-0 select-none rounded-lg object-contain'}
        />
    );
}

export default function ServerSwitcher({
    query,
    onQueryChange,
}: {
    query: string;
    onQueryChange: (value: string) => void;
}) {
    const t = useT();
    const theme = usePanelTheme();
    const listId = useAutoId();
    const optionId = (index: number) => `${listId}-option-${index}`;

    const history = useHistory();
    const path = useLocation().pathname;

    const [open, setOpen] = useState(false);
    const [servers, setServers] = useState<Server[]>(cache.servers);
    const [loading, setLoading] = useState(false);
    const [highlighted, setHighlighted] = useState(0);

    const container = useRef<HTMLDivElement>(null);
    const field = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        if (cache.servers.length > 0 && Date.now() - cache.at < CACHE_TTL) {
            setServers(cache.servers);

            return;
        }

        setLoading(true);

        try {
            const data = await getServers({ page: 1 });

            cache.at = Date.now();
            cache.servers = data.items;
            setServers(data.items);
        } catch {
            setServers(cache.servers);
        } finally {
            setLoading(false);
        }
    }, []);

    const reveal = () => {
        setOpen(true);
        void load();
    };

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (event: MouseEvent) => {
            if (!container.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onPointerDown);

        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    const matches = useMemo(() => {
        const needle = query.trim().toLowerCase();

        if (!needle) {
            return servers;
        }

        return servers.filter((server) => matchesServer(server, needle));
    }, [servers, query]);

    const active = Math.min(highlighted, Math.max(0, matches.length - 1));

    const visit = (server: Server) => {
        setOpen(false);
        onQueryChange('');
        field.current?.blur();
        history.push(`/server/${server.id}`);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            setOpen(false);
            field.current?.blur();

            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            reveal();
            setHighlighted(
                event.key === 'ArrowDown' ? Math.min(matches.length - 1, active + 1) : Math.max(0, active - 1)
            );

            return;
        }

        if (event.key === 'Enter') {
            const server = matches[active];

            if (open && server) {
                event.preventDefault();
                visit(server);
            }
        }
    };

    return (
        <div ref={container} className={'relative'}>
            <Input
                ref={field}
                type={'search'}
                value={query}
                onChange={(event) => {
                    onQueryChange(event.target.value);
                    reveal();
                }}
                onFocus={reveal}
                onKeyDown={onKeyDown}
                placeholder={t('switcher.search')}
                icon={<Search className={'h-4 w-4'} />}
                aria-label={t('switcher.search')}
                role={'combobox'}
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete={'list'}
                aria-activedescendant={open && matches[active] ? optionId(active) : undefined}
                autoComplete={'off'}
            />

            {open && (
                <div
                    id={listId}
                    role={'listbox'}
                    aria-label={t('switcher.allServers')}
                    className={
                        'absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-line-field bg-raised/60 backdrop-blur-xl p-1.5 shadow-panel'
                    }
                >
                    {loading && servers.length === 0 ? (
                        <div className={'space-y-1'} aria-hidden={'true'}>
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div key={index} className={'flex items-center gap-3 px-2.5 py-2'}>
                                    <Skeleton className={'h-8 w-8 shrink-0 rounded-lg'} />
                                    <div className={'flex-1'}>
                                        <Skeleton className={'h-3.5 w-28'} />
                                        <Skeleton className={'mt-1.5 h-3 w-20'} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : matches.length === 0 ? (
                        <p className={'flex items-center gap-2 px-3 py-4 text-xs text-ink-faint'}>
                            <ServerIcon className={'h-4 w-4 shrink-0'} aria-hidden={'true'} />
                            {servers.length === 0
                                ? t('switcher.empty')
                                : t('dashboard.noMatches', { query: query.trim() })}
                        </p>
                    ) : (
                        matches.map((server, index) => {
                            const here = path === `/server/${server.id}`;

                            return (
                                <button
                                    key={server.uuid}
                                    id={optionId(index)}
                                    type={'button'}
                                    role={'option'}
                                    aria-selected={index === active}
                                    onClick={() => visit(server)}
                                    onMouseEnter={() => setHighlighted(index)}
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
                                        index === active ? 'bg-overlay' : 'hover:bg-overlay/60'
                                    )}
                                >
                                    <ServerMark logo={resolveArt(server, theme).logo} />

                                    <span className={'min-w-0 flex-1'}>
                                        <span className={'flex items-center gap-1.5'}>
                                            <span
                                                aria-hidden={'true'}
                                                className={cn(
                                                    'h-1.5 w-1.5 shrink-0 rounded-full',
                                                    STATUS_DOT[server.status ?? ''] ?? STATUS_UNKNOWN
                                                )}
                                            />
                                            <span className={'truncate text-sm font-medium text-ink'}>
                                                {server.name}
                                            </span>
                                        </span>
                                        <span className={'mt-0.5 block truncate text-xs text-ink-faint'}>
                                            {server.node}
                                        </span>
                                    </span>

                                    {here && (
                                        <span
                                            className={
                                                'shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent'
                                            }
                                        >
                                            Open
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

export { ServerSwitcher };
