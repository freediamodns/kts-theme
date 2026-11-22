import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, Map as MapIcon, Search, UserRound, Users } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import {
    deletePlayerData,
    getPlayer,
    getPlayers,
    getPlayerStats,
    Player,
    playerAvatarUrl,
    RosterEntry,
    runPlayerAction,
} from '@/api/server/players';
import { Button, Input, Skeleton, SkeletonRegion, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { cn } from '@/dezerx/lib/cn';
import { ActionPayload, DangerZone, PlayerControls, PlayerPlaces } from '@/dezerx/components/mc/PlayerControls';
import { PlayerStats, Stats } from '@/dezerx/components/mc/PlayerStats';
import { Inventory } from '@/dezerx/components/mc/Inventory';
import { PlayerModel } from '@/dezerx/components/mc/PlayerModel';
import { Vitals } from '@/dezerx/components/mc/Vitals';
import { MapBackdrop, PlayerMapDialog } from '@/dezerx/components/mc/PlayerMap';
import { useT } from '@/i18n';

const GAME_MODE_IDS = ['survival', 'creative', 'adventure', 'spectator'];

const SLOW = ['kill', 'heal', 'feed', 'starve', 'gamemode', 'teleport'];

const OWNS_ARROWS = [
    'input',
    'textarea',
    'select',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    '[role="combobox"]',
    '[role="grid"]',
    '[role="listbox"]',
    '[role="menu"]',
    '[role="menubar"]',
    '[role="radiogroup"]',
    '[role="slider"]',
    '[role="spinbutton"]',
    '[role="tablist"]',
    '[role="treegrid"]',
].join(',');

function scrollsSideways(element: Element): boolean {
    if (element.scrollWidth <= element.clientWidth + 1) {
        return false;
    }

    const overflow = window.getComputedStyle(element).overflowX;

    return overflow === 'auto' || overflow === 'scroll';
}

function useTameArrowKeys(root: React.RefObject<HTMLElement>): void {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                return;
            }

            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
                return;
            }

            const page = root.current;
            const target = event.target instanceof Element ? event.target : null;

            if (page === null) {
                return;
            }

            if (target !== null && target.closest(OWNS_ARROWS) !== null) {
                return;
            }

            for (let node = target; node !== null && node !== page; node = node.parentElement) {
                if (scrollsSideways(node)) {
                    return;
                }
            }

            event.preventDefault();
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [root]);
}

export default function PlayersContainer() {
    const t = useT();
    const { toast } = useToast();

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const [roster, setRoster] = useState<RosterEntry[] | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [player, setPlayer] = useState<Player | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [acting, setActing] = useState(false);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    const requests = useRef(new AbortController());
    const page = useRef<HTMLDivElement>(null);

    useTameArrowKeys(page);

    useEffect(() => {
        const controller = new AbortController();

        getPlayers(uuid, controller.signal)
            .then(setRoster)
            .catch((error) => {
                if (!axios.isCancel(error)) {
                    setRoster([]);
                    toast(apiMessage(error, t('players.listFailed')), { tone: 'error' });
                }
            });

        return () => controller.abort();
    }, [uuid]);

    useEffect(() => () => requests.current.abort(), []);

    const open = async (player: string) => {
        requests.current.abort();

        const controller = new AbortController();

        requests.current = controller;

        setSelected(player);
        setPlayer(null);
        setStats(null);
        setLoading(true);

        try {
            setPlayer(await getPlayer(uuid, player, controller.signal));

            void getPlayerStats(uuid, player, controller.signal)
                .then(setStats)
                .catch(() => undefined);
        } catch (error) {
            if (!axios.isCancel(error)) {
                toast(apiMessage(error, t('players.readFailed')), { tone: 'error' });
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    };

    const entry = useMemo(() => roster?.find((row) => row.uuid === selected) ?? null, [roster, selected]);

    const refresh = async (player: string) => {
        try {
            const [read, list] = await Promise.all([getPlayer(uuid, player), getPlayers(uuid)]);

            setRoster(list);
            setPlayer((current) => (current?.uuid === player ? read : current));
        } catch {}
    };

    const expect = (payload: ActionPayload) => {
        if (payload.action === 'op' || payload.action === 'ban' || payload.action === 'whitelist') {
            const field = payload.action === 'op' ? 'op' : payload.action === 'ban' ? 'banned' : 'whitelisted';

            setRoster(
                (current) =>
                    current?.map((row) => (row.uuid === selected ? { ...row, [field]: payload.on ?? true } : row)) ??
                    current
            );
        }

        setPlayer((current) => {
            if (!current) {
                return current;
            }

            switch (payload.action) {
                case 'heal':
                    return { ...current, health: current.maxHealth || 20 };
                case 'kill':
                    return { ...current, health: 0, absorption: 0 };
                case 'feed':
                    return { ...current, food: 20 };
                case 'starve':
                    return { ...current, food: 0 };
                case 'xp': {
                    const by = payload.levels ?? 0;
                    const next =
                        payload.operation === 'add'
                            ? current.xpLevel + by
                            : payload.operation === 'remove'
                            ? Math.max(0, current.xpLevel - by)
                            : by;

                    return { ...current, xpLevel: next, xpProgress: 0 };
                }
                case 'gamemode':
                    return { ...current, gameMode: Math.max(0, GAME_MODE_IDS.indexOf(payload.mode ?? '')) };
                default:
                    return current;
            }
        });
    };

    const act = async (payload: ActionPayload) => {
        if (selected === null || acting) {
            return;
        }

        setActing(true);

        try {
            const result = await runPlayerAction(uuid, selected, payload);

            expect(payload);
            toast(result?.offline ? t('players.savedForNextJoin') : t('common.done'), { tone: 'success' });

            window.setTimeout(() => void refresh(selected), SLOW.indexOf(payload.action) >= 0 ? 1500 : 400);
        } catch (error) {
            toast(apiMessage(error, t('players.actionFailed')), { tone: 'error' });
        } finally {
            setActing(false);
        }
    };

    const remove = () => {
        if (selected === null || acting) {
            return;
        }

        setDialog({
            title: t('players.deleteTitle', { name: player?.name ?? t('players.thisPlayer') }),
            body: t('players.deleteBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            onConfirm: async () => {
                setActing(true);

                try {
                    await deletePlayerData(uuid, selected);

                    toast(t('players.deleted'), { tone: 'success' });

                    setRoster(await getPlayers(uuid));
                    setPlayer(null);
                    setSelected(null);
                } catch (error) {
                    toast(apiMessage(error, t('players.deleteFailed')), { tone: 'error' });

                    throw error;
                } finally {
                    setActing(false);
                }
            },
        });
    };

    const visible = useMemo(() => {
        const term = query.trim().toLowerCase();

        if (!roster || term === '') {
            return roster ?? [];
        }

        return roster.filter((entry) => entry.name?.toLowerCase().includes(term) || entry.uuid.includes(term));
    }, [roster, query]);

    return (
        <ServerContentBlock title={t('players.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <div
                ref={page}
                className={cn(
                    'grid gap-4 sm:gap-6 xl:items-start',
                    selected === null && 'xl:grid-cols-[18rem_minmax(0,1fr)]'
                )}
            >
                <div className={cn('space-y-3', selected !== null && 'hidden')}>
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('players.search')}
                        aria-label={t('players.search')}
                        icon={<Search className={'h-4 w-4'} />}
                    />

                    <div className={'space-y-1 rounded-2xl bg-card p-2'}>
                        {roster === null ? (
                            <SkeletonRegion label={t('players.loadingList')}>
                                {[0, 1, 2, 3].map((row) => (
                                    <Skeleton key={row} className={'mb-1 h-12 w-full'} />
                                ))}
                            </SkeletonRegion>
                        ) : visible.length === 0 ? (
                            <SectionEmpty
                                icon={Users}
                                title={t(roster.length === 0 ? 'players.emptyTitle' : 'players.noMatchTitle')}
                                body={t(roster.length === 0 ? 'players.emptyBody' : 'players.noMatchBody')}
                            />
                        ) : (
                            visible.map((entry) => (
                                <button
                                    key={entry.uuid}
                                    type={'button'}
                                    onClick={() => void open(entry.uuid)}
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors',
                                        selected === entry.uuid ? 'bg-raised' : 'hover:bg-raised/60'
                                    )}
                                >
                                    <Avatar server={uuid} uuid={entry.uuid} className={'h-8 w-8'} />

                                    <span className={'min-w-0 flex-1'}>
                                        <span className={'flex items-center gap-1.5'}>
                                            <span className={'truncate text-sm font-medium text-ink'}>
                                                {entry.name ?? t('common.unknown')}
                                            </span>
                                            {entry.online && (
                                                <span
                                                    aria-label={t('players.online')}
                                                    title={t('players.online')}
                                                    className={'h-1.5 w-1.5 shrink-0 rounded-full bg-success'}
                                                />
                                            )}
                                        </span>
                                        <span className={'block truncate text-[10px] text-ink-faint'}>
                                            {entry.online
                                                ? t('players.onlineNow')
                                                : entry.hasData
                                                ? entry.uuid.slice(0, 8)
                                                : t('players.noSavedData')}
                                        </span>
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className={'min-w-0'}>
                    {selected !== null && (
                        <button
                            type={'button'}
                            onClick={() => {
                                requests.current.abort();
                                setSelected(null);
                                setPlayer(null);
                                setStats(null);
                            }}
                            className={
                                'mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink'
                            }
                        >
                            <ChevronLeft className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                            {t('players.allPlayers')}
                        </button>
                    )}

                    {loading ? (
                        <SkeletonRegion label={t('players.loadingPlayer')}>
                            <Skeleton className={'h-24 w-full'} />
                            <Skeleton className={'mt-3 h-[22rem] w-full'} />
                        </SkeletonRegion>
                    ) : player === null ? (
                        <div className={'rounded-2xl bg-card'}>
                            <SectionEmpty
                                icon={UserRound}
                                title={t('players.noneSelectedTitle')}
                                body={t('players.noneSelectedBody')}
                            />
                        </div>
                    ) : !player.hasData ? (
                        <div className={'rounded-2xl bg-card'}>
                            <SectionEmpty
                                icon={UserRound}
                                title={t('players.noDataTitle', { name: player.name ?? t('players.thatPlayer') })}
                                body={t('players.noDataBody')}
                            />
                        </div>
                    ) : (
                        <PlayerDetail
                            server={uuid}
                            player={player}
                            entry={entry}
                            stats={stats}
                            acting={acting}
                            onAction={(payload) => void act(payload)}
                            onDelete={remove}
                        />
                    )}
                </div>
            </div>

            <p className={'mt-6 text-[10px] leading-relaxed text-ink-faint'}>{t('players.footnote')}</p>
        </ServerContentBlock>
    );
}

function PlayerDetail({
    server,
    player,
    entry,
    stats,
    acting,
    onAction,
    onDelete,
}: {
    server: string;
    player: Player;
    entry: RosterEntry | null;
    stats: Stats | null;
    acting: boolean;
    onAction: (payload: ActionPayload) => void;
    onDelete: () => void;
}) {
    const t = useT();
    const online = entry?.online ?? false;
    const [mapOpen, setMapOpen] = useState(false);

    return (
        <div className={'grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start'}>
            <div className={'min-w-0 space-y-4'}>
                <div className={'relative isolate overflow-hidden rounded-2xl bg-card'}>
                    {player.position && (
                        <MapBackdrop
                            key={player.uuid}
                            server={server}
                            position={player.position}
                            dimension={player.dimension}
                            className={'absolute inset-y-0 right-0 w-full sm:w-2/3'}
                        />
                    )}

                    <div className={'relative flex flex-wrap items-center gap-4 p-4'}>
                        <Avatar server={server} uuid={player.uuid} className={'h-16 w-16 rounded-xl'} />

                        <div className={'min-w-0 flex-1'}>
                            <p
                                className={
                                    'flex items-center gap-2 truncate text-lg font-semibold tracking-tight text-ink'
                                }
                            >
                                {player.name ?? t('common.unknown')}
                                {online && (
                                    <span
                                        className={
                                            'shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success'
                                        }
                                    >
                                        {t('players.online')}
                                    </span>
                                )}
                            </p>
                            <p className={'truncate font-mono text-[11px] text-ink-faint'}>{player.uuid}</p>
                        </div>

                        <dl className={'flex flex-wrap gap-x-6 gap-y-2 text-xs [.light_&]:hidden'}>
                            <Fact
                                label={t('players.mode')}
                                value={
                                    GAME_MODE_IDS[player.gameMode]
                                        ? t(`properties.options.${GAME_MODE_IDS[player.gameMode]}`)
                                        : '-'
                                }
                            />
                            <Fact label={t('players.dimension')} value={player.dimension.replace('minecraft:', '')} />
                            <Fact label={t('players.totalXp')} value={player.xpTotal.toLocaleString()} />
                        </dl>

                        {player.position && (
                            <Button
                                size={'sm'}
                                variant={'secondary'}
                                className={'bg-overlay/40 backdrop-blur-sm hover:bg-overlay/60'}
                                onClick={() => setMapOpen(true)}
                                icon={<MapIcon className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                            >
                                {t('players.map.open')}
                            </Button>
                        )}
                    </div>
                </div>

                {player.position && (
                    <PlayerMapDialog
                        open={mapOpen}
                        onClose={() => setMapOpen(false)}
                        server={server}
                        player={player.uuid}
                        name={player.name}
                        position={player.position}
                        dimension={player.dimension}
                        respawn={player.respawn ?? null}
                        lastDeath={player.lastDeath ?? null}
                    />
                )}

                <Vitals
                    health={player.health}
                    maxHealth={player.maxHealth}
                    absorption={player.absorption}
                    food={player.food}
                    armorPoints={player.armorPoints}
                    xpLevel={player.xpLevel}
                    xpProgress={player.xpProgress}
                />

                <div className={'min-w-0'}>
                    <Inventory
                        items={player.inventory}
                        selectedSlot={player.selectedSlot}
                        enderChest={player.enderChest}
                        preview={
                            <PlayerModel
                                server={server}
                                player={player.uuid}
                                name={player.name}
                                items={player.inventory}
                                className={'w-36'}
                            />
                        }
                    />
                </div>

                <PlayerStats stats={stats} />
            </div>

            <div className={'min-w-0 space-y-4'}>
                <PlayerControls
                    gameMode={player.gameMode}
                    xpLevel={player.xpLevel}
                    op={entry?.op ?? false}
                    banned={entry?.banned ?? false}
                    whitelisted={entry?.whitelisted ?? false}
                    busy={acting}
                    onAction={onAction}
                />

                <PlayerPlaces
                    position={player.position}
                    respawn={player.respawn ?? null}
                    lastDeath={player.lastDeath ?? null}
                    dimension={player.dimension}
                    busy={acting}
                    onAction={onAction}
                />

                <DangerZone online={online} busy={acting} onDelete={onDelete} />
            </div>
        </div>
    );
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div className={'min-w-0'}>
            <dt className={'text-[10px] uppercase tracking-wider text-ink-faint'}>{label}</dt>
            <dd className={'truncate text-xs text-ink'}>{value}</dd>
        </div>
    );
}

function Avatar({ server, uuid, className }: { server: string; uuid: string; className?: string }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => setFailed(false), [uuid]);

    if (failed) {
        return (
            <span
                className={cn(
                    'flex shrink-0 items-center justify-center rounded-lg bg-overlay text-ink-faint',
                    className
                )}
            >
                <UserRound className={'h-1/2 w-1/2'} aria-hidden={'true'} />
            </span>
        );
    }

    return (
        <img
            src={playerAvatarUrl(server, uuid)}
            alt={''}
            aria-hidden={'true'}
            loading={'lazy'}
            draggable={false}
            onError={() => setFailed(true)}
            style={{ imageRendering: 'pixelated' }}
            className={cn('shrink-0 select-none rounded-lg bg-overlay', className)}
        />
    );
}
