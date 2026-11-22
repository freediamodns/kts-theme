import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { ChevronRight, Search, Users } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import {
    RustAutoModConfig,
    RustMetrics,
    RustPlayerSummary,
    executeGodToolsAction,
    getAutoModConfig,
    getRustPlayers,
    installBridgePlugin,
    saveAutoModConfig,
} from '@/api/server/rustPlayers';
import {
    Badge,
    Button,
    Input,
    Notice,
    Select,
    Skeleton,
    SkeletonRegion,
    Toggle,
    useToast,
} from '@/dezerx/components/ui';
import { SectionEmpty } from '@/dezerx/components/console/Section';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import FileDialog, { FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { cn } from '@/dezerx/lib/cn';
import { usePermissions } from '@/plugins/usePermissions';
import {
    Hidden,
    Label,
    OnlineDot,
    OwnerCrown,
    PingBars,
    Segmented,
    SoftButton,
    SteamAvatar,
    Tag,
    errorMessage,
    hasAvatar,
    formatSeconds,
    statusOf,
} from './common';
import RustPlayerPage from './RustPlayerPage';
import RustBansContainer from './RustBansContainer';
import RustServerRatesContainer from './RustServerRatesContainer';
import RustServerConvarsContainer from './RustServerConvarsContainer';
import RustDemosContainer from './RustDemosContainer';

type MainTab = 'players' | 'bans' | 'rates' | 'convars' | 'demos';
type Filter = 'all' | 'online' | 'sleeping' | 'staff' | 'banned' | 'wounded';

function rank(player: RustPlayerSummary): number {
    if (player.isConnected) return 0;
    if (player.isSleeping) return 1;
    if (player.isBanned) return 3;
    return 2;
}

export default function RustPlayersContainer() {
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const { toast } = useToast();
    const location = useLocation();
    const history = useHistory();

    const selected = new URLSearchParams(location.search).get('player');

    const [tab, setTab] = useState<MainTab>('players');
    const [players, setPlayers] = useState<RustPlayerSummary[] | null>(null);
    const [metrics, setMetrics] = useState<RustMetrics | null>(null);
    const [serverState, setServerState] = useState('offline');
    const [hasBridge, setHasBridge] = useState<boolean | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const [installing, setInstalling] = useState(false);

    const [godOpen, setGodOpen] = useState(false);
    const [autoModOpen, setAutoModOpen] = useState(false);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    const load = (silent = true) => {
        if (!uuid) return;
        getRustPlayers(uuid, silent)
            .then((res) => {
                setPlayers(res.players);
                setMetrics(res.metrics);
                setServerState(res.state);
                setHasBridge(res.hasBridge);
            })
            .catch((err) => {
                setPlayers((current) => current ?? []);
                if (!silent) toast(errorMessage(err, 'Could not load the roster.'), { tone: 'error' });
            });
    };

    useEffect(() => {
        load(false);
        const interval = window.setInterval(() => load(true), 3000);
        return () => window.clearInterval(interval);
    }, [uuid]);

    const open = (steamId: string) => history.push({ search: `?player=${steamId}` });
    const close = () => history.push({ search: '' });

    const install = async () => {
        if (!uuid) return;
        setInstalling(true);
        try {
            const res = await installBridgePlugin(uuid);
            toast(res.message || 'Companion plugin installed.', { tone: 'success' });
            setHasBridge(true);
            load(true);
        } catch (err) {
            toast(errorMessage(err, 'Could not install the companion plugin.'), { tone: 'error' });
        } finally {
            setInstalling(false);
        }
    };

    const counts = useMemo(() => {
        const list = players ?? [];
        return {
            all: list.length,
            online: list.filter((p) => p.isConnected).length,
            sleeping: list.filter((p) => !p.isConnected && p.isSleeping).length,
            staff: list.filter((p) => p.isOwner || p.isModerator).length,
            banned: list.filter((p) => p.isBanned).length,
            wounded: list.filter((p) => p.isWounded).length,
        };
    }, [players]);

    const visible = useMemo(() => {
        const term = query.trim().toLowerCase();
        return (players ?? [])
            .filter((p) => {
                switch (filter) {
                    case 'online':
                        return p.isConnected;
                    case 'sleeping':
                        return !p.isConnected && p.isSleeping;
                    case 'staff':
                        return p.isOwner || p.isModerator;
                    case 'banned':
                        return p.isBanned;
                    case 'wounded':
                        return p.isWounded;
                    default:
                        return true;
                }
            })
            .filter(
                (p) =>
                    !term ||
                    p.name.toLowerCase().includes(term) ||
                    p.steamId.includes(term) ||
                    p.grid.toLowerCase() === term
            )
            .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    }, [players, filter, query]);

    const summary = useMemo(() => players?.find((p) => p.steamId === selected) ?? null, [players, selected]);
    const withAvatars = useMemo(() => visible.some((p) => hasAvatar(p.avatar)), [visible]);

    const [canControl, canInstall] = usePermissions(['control.console', 'file.create']);

    const tools = (canControl || canInstall) && (
        <div className={'flex flex-wrap gap-2'}>
            {canControl && (
                <>
                    <Button size={'sm'} variant={'secondary'} className={'flex-1'} onClick={() => setGodOpen(true)}>
                        God tools
                    </Button>
                    <Button size={'sm'} variant={'secondary'} className={'flex-1'} onClick={() => setAutoModOpen(true)}>
                        Auto-mod
                    </Button>
                </>
            )}
            {canInstall && (
                <Button
                    size={'sm'}
                    variant={'secondary'}
                    className={'flex-1 whitespace-nowrap'}
                    loading={installing}
                    onClick={() => void install()}
                >
                    {hasBridge === false ? 'Install plugin' : 'Reinstall plugin'}
                </Button>
            )}
        </div>
    );

    return (
        <ServerContentBlock title={'Rust Player Manager'}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <div className={'space-y-4 sm:space-y-6'}>
                {hasBridge === false && (
                    <Notice
                        tone={'warning'}
                        title={'The companion plugin is not installed'}
                        action={
                            canInstall && (
                                <Button size={'sm'} loading={installing} onClick={() => void install()}>
                                    Install plugin
                                </Button>
                            )
                        }
                    >
                        RustPlayerBridge.cs exports live inventories, vitals and tool cupboards, and carries out the
                        actions on this page. Without it the roster only shows staff and bans from the server's config
                        files.
                    </Notice>
                )}

                {selected !== null && uuid ? (
                    <RustPlayerPage
                        uuid={uuid}
                        steamId={selected}
                        summary={summary}
                        onBack={close}
                        onChanged={() => load(true)}
                        toolbar={tools}
                        canControl={canControl}
                    />
                ) : (
                    <div className={'grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start'}>
                        <div className={'min-w-0 space-y-4'}>
                            <div className={'flex flex-wrap items-center gap-2'}>
                                <Segmented<MainTab>
                                    label={'Rust manager sections'}
                                    value={tab}
                                    onChange={setTab}
                                    className={'w-fit'}
                                    options={[
                                        {
                                            value: 'players',
                                            label: (
                                                <>
                                                    Players{' '}
                                                    <span className={'ml-1 tabular-nums text-ink-faint'}>
                                                        {counts.all}
                                                    </span>
                                                </>
                                            ),
                                        },
                                        { value: 'bans', label: 'Bans' },
                                        { value: 'rates', label: 'Rates' },
                                        { value: 'convars', label: 'Convars' },
                                        { value: 'demos', label: 'Demos' },
                                    ]}
                                />
                                {tools}
                            </div>

                            {tab === 'players' ? (
                                <div className={'space-y-3'}>
                                    <div className={'flex flex-wrap items-center gap-3'}>
                                        <div className={'min-w-[11rem] flex-1'}>
                                            <Input
                                                value={query}
                                                onChange={(event) => setQuery(event.target.value)}
                                                placeholder={'Search name, SteamID or grid'}
                                                aria-label={'Search players'}
                                                icon={<Search className={'h-4 w-4'} />}
                                            />
                                        </div>
                                        <Segmented<Filter>
                                            tall
                                            label={'Filter players'}
                                            value={filter}
                                            onChange={setFilter}
                                            options={(
                                                ['all', 'online', 'sleeping', 'staff', 'banned', 'wounded'] as Filter[]
                                            ).map((id) => ({
                                                value: id,
                                                label: (
                                                    <>
                                                        {id[0].toUpperCase() + id.slice(1)}
                                                        <span className={'ml-1 tabular-nums text-ink-faint'}>
                                                            {counts[id]}
                                                        </span>
                                                    </>
                                                ),
                                            }))}
                                        />
                                    </div>

                                    {players === null ? (
                                        <SkeletonRegion label={'Loading players'}>
                                            <div className={'space-y-1 rounded-2xl bg-card p-2'}>
                                                {[0, 1, 2, 3, 4].map((row) => (
                                                    <Skeleton key={row} className={'h-12 w-full'} />
                                                ))}
                                            </div>
                                        </SkeletonRegion>
                                    ) : visible.length === 0 ? (
                                        <SectionEmpty
                                            icon={Users}
                                            title={players.length === 0 ? 'No players yet' : 'Nobody matches'}
                                            body={
                                                players.length === 0
                                                    ? 'Players show up here once the companion plugin has exported the server.'
                                                    : 'Try another filter or search.'
                                            }
                                        />
                                    ) : (
                                        <div className={'rounded-2xl bg-card p-2'}>
                                            <div className={'hidden items-center gap-3 px-2 pb-1.5 pt-1 sm:flex'}>
                                                {withAvatars && <span className={'w-8'} />}
                                                <span className={'flex-1'}>
                                                    <Label>Player</Label>
                                                </span>
                                                <span className={'w-14 text-right'}>
                                                    <Label>Grid</Label>
                                                </span>
                                                <span className={'w-16 text-right'}>
                                                    <Label>Health</Label>
                                                </span>
                                                <span className={'hidden w-20 text-right md:block'}>
                                                    <Label>Ping</Label>
                                                </span>
                                                <span className={'w-4'} />
                                            </div>

                                            <div className={'space-y-0.5'}>
                                                {visible.map((player) => (
                                                    <PlayerRow
                                                        key={player.steamId}
                                                        player={player}
                                                        withAvatars={withAvatars}
                                                        onOpen={() => open(player.steamId)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : tab === 'bans' ? (
                                <RustBansContainer onChanged={() => load(true)} />
                            ) : tab === 'rates' ? (
                                <RustServerRatesContainer />
                            ) : tab === 'convars' ? (
                                <RustServerConvarsContainer />
                            ) : (
                                <RustDemosContainer />
                            )}
                        </div>

                        <Stats metrics={metrics} hasBridge={hasBridge} state={serverState} />
                    </div>
                )}
            </div>

            {uuid && (
                <>
                    <GodToolsDialog
                        open={godOpen}
                        onClose={() => setGodOpen(false)}
                        uuid={uuid}
                        serverGod={metrics?.serverGodmode ?? false}
                        sleepers={counts.sleeping}
                        confirm={setDialog}
                        onDone={() => load(true)}
                    />
                    <AutoModDialog open={autoModOpen} onClose={() => setAutoModOpen(false)} uuid={uuid} />
                </>
            )}
        </ServerContentBlock>
    );
}

const STATES: Record<string, string> = {
    running: 'Running',
    starting: 'Starting',
    stopping: 'Stopping',
    offline: 'Offline',
};

function Stats({
    metrics,
    hasBridge,
    state,
}: {
    metrics: RustMetrics | null;
    hasBridge: boolean | null;
    state: string;
}) {
    const rows: { label: string; value: React.ReactNode }[] = [
        {
            label: 'Status',
            value: (
                <Badge tone={state === 'running' ? 'success' : 'neutral'} className={'rounded-md'}>
                    {STATES[state] ?? state}
                </Badge>
            ),
        },
        {
            label: 'Players',
            value: (
                <>
                    {metrics?.players ?? 0}
                    <span className={'text-ink-faint'}> / {metrics?.maxPlayers ?? 0}</span>
                </>
            ),
        },
        { label: 'Sleepers', value: metrics?.sleeping ?? 0 },
        { label: 'Server FPS', value: metrics?.fps ?? 0 },
        { label: 'Entities', value: (metrics?.ents ?? 0).toLocaleString() },
        { label: 'Uptime', value: metrics?.uptime ? formatSeconds(metrics.uptime) : '-' },
        {
            label: 'Plugin',
            value:
                hasBridge === null ? (
                    '-'
                ) : (
                    <Badge tone={hasBridge ? 'success' : 'warning'} className={'rounded-md'}>
                        {hasBridge ? 'Linked' : 'Missing'}
                    </Badge>
                ),
        },
    ];

    if (metrics?.serverGodmode) {
        rows.push({ label: 'God mode', value: 'On for everyone' });
    }

    return (
        <section className={'order-first overflow-hidden rounded-2xl bg-card ring-1 ring-line-field xl:order-none'}>
            <h2 className={'px-5 py-4 text-sm font-semibold text-ink'}>Server</h2>
            <dl className={'overflow-hidden rounded-t-xl'}>
                {rows.map((row, index) => (
                    <div
                        key={row.label}
                        className={cn(
                            'flex items-center justify-between gap-4 px-5 py-3',
                            index % 2 === 1 && 'bg-raised'
                        )}
                    >
                        <dt className={'shrink-0 text-sm text-ink-muted'}>{row.label}</dt>
                        <dd className={'min-w-0 truncate text-right text-sm tabular-nums text-ink'}>{row.value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function PlayerRow({
    player,
    withAvatars,
    onOpen,
}: {
    player: RustPlayerSummary;
    withAvatars: boolean;
    onOpen: () => void;
}) {
    const status = statusOf(player);

    return (
        <button
            type={'button'}
            onClick={onOpen}
            className={'flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-raised/60'}
        >
            <SteamAvatar src={player.avatar} placeholder={withAvatars} className={'h-8 w-8'} />

            <span className={'min-w-0 flex-1'}>
                <span className={'flex items-center gap-1.5'}>
                    {player.isConnected && <OnlineDot />}
                    <span className={'truncate text-sm font-medium text-ink'}>{player.name}</span>
                    {player.isOwner && <OwnerCrown />}
                    {player.isModerator && <Tag>Mod</Tag>}
                    {player.isGod && <Tag>God</Tag>}
                    {player.isFrozen && <Tag>Frozen</Tag>}
                </span>
                <span className={'block truncate text-[10px] text-ink-faint'}>
                    {status} · <Hidden>{player.steamId}</Hidden>
                </span>
            </span>

            <span className={'hidden w-14 text-right text-xs tabular-nums text-ink-muted sm:block'}>
                {player.grid && player.grid !== '-' ? player.grid : '-'}
            </span>
            <span className={'hidden w-16 text-right text-xs tabular-nums text-ink-muted sm:block'}>
                {player.isBanned && !player.isConnected && !player.isSleeping ? '-' : `${Math.round(player.health)} hp`}
            </span>
            <span className={'hidden w-20 items-center justify-end gap-2 text-xs tabular-nums text-ink-muted md:flex'}>
                {player.isConnected ? (
                    <>
                        {player.ping} ms
                        <PingBars ping={player.ping} />
                    </>
                ) : (
                    '-'
                )}
            </span>
            <ChevronRight className={'h-4 w-4 shrink-0 text-ink-faint'} aria-hidden={'true'} />
        </button>
    );
}

const WEATHER = [
    { value: 'weather_clear', label: 'Clear' },
    { value: 'weather_rain', label: 'Rain' },
    { value: 'weather_fog', label: 'Fog' },
    { value: 'weather_storm', label: 'Storm' },
];

function GodToolsDialog({
    open,
    onClose,
    uuid,
    serverGod,
    sleepers,
    confirm,
    onDone,
}: {
    open: boolean;
    onClose: () => void;
    uuid: string;
    serverGod: boolean;
    sleepers: number;
    confirm: (request: FileDialogRequest) => void;
    onDone: () => void;
}) {
    const { toast } = useToast();
    const [busy, setBusy] = useState<string | null>(null);
    const [hour, setHour] = useState('12');
    const [weather, setWeather] = useState('weather_clear');

    const run = async (action: string, payload: Record<string, any> = {}, done = 'Done.') => {
        setBusy(action);
        try {
            await executeGodToolsAction(uuid, action, payload);
            toast(done, { tone: 'success' });
            onDone();
        } catch (err) {
            toast(errorMessage(err, 'That did not go through.'), { tone: 'error' });
            throw err;
        } finally {
            setBusy(null);
        }
    };

    const validHour = hour !== '' && !isNaN(Number(hour)) && Number(hour) >= 0 && Number(hour) < 24;

    return (
        <DialogShell
            open={open}
            onClose={() => busy === null && onClose()}
            title={'God tools'}
            body={'Server-wide actions. They apply to everyone at once.'}
            width={'md'}
        >
            <div className={'mt-5 space-y-5'}>
                <div className={'space-y-2'}>
                    <Label>Players</Label>
                    <div className={'grid grid-cols-2 gap-2 sm:grid-cols-3'}>
                        <SoftButton
                            disabled={busy !== null}
                            onClick={() => void run('healall', {}, 'Healed everyone online.')}
                        >
                            Heal all
                        </SoftButton>
                        <SoftButton
                            disabled={busy !== null}
                            onClick={() => void run('feedall', {}, 'Fed everyone online.')}
                        >
                            Feed all
                        </SoftButton>
                        <SoftButton
                            disabled={busy !== null}
                            onClick={() =>
                                void run('godall', {}, serverGod ? 'Server god mode off.' : 'Server god mode on.')
                            }
                        >
                            {serverGod ? 'God mode off' : 'God mode on'}
                        </SoftButton>
                    </div>
                </div>

                <div className={'space-y-2'}>
                    <Label>World</Label>
                    <div className={'grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2'}>
                        <Input
                            label={'Time of day (0-23)'}
                            inputMode={'decimal'}
                            value={hour}
                            onChange={(event) => setHour(event.target.value)}
                        />
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            className={'h-11'}
                            disabled={!validHour || busy !== null}
                            loading={busy === 'time'}
                            onClick={() => void run('time', { hour: Number(hour) }, `Time set to ${hour}:00.`)}
                        >
                            Set time
                        </Button>
                    </div>
                    <div className={'grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2'}>
                        <Select label={'Weather'} value={weather} onChange={setWeather} options={WEATHER} />
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            className={'h-11'}
                            disabled={busy !== null}
                            loading={busy === weather}
                            onClick={() => void run(weather, {}, 'Weather changed.')}
                        >
                            Apply
                        </Button>
                    </div>
                </div>

                <div className={'space-y-2'}>
                    <Label>Events</Label>
                    <div className={'grid grid-cols-2 gap-2 sm:grid-cols-3'}>
                        <SoftButton disabled={busy !== null} onClick={() => void run('airdrop', {}, 'Airdrop called.')}>
                            Call airdrop
                        </SoftButton>
                        <SoftButton
                            disabled={busy !== null}
                            onClick={() => void run('heli', {}, 'Patrol helicopter called.')}
                        >
                            Call patrol heli
                        </SoftButton>
                        <SoftButton
                            disabled={busy !== null}
                            onClick={() => void run('cargoship', {}, 'Cargo ship called.')}
                        >
                            Call cargo ship
                        </SoftButton>
                    </div>
                </div>

                <div className={'flex items-center justify-between gap-3 rounded-xl bg-overlay/40 px-3 py-2.5'}>
                    <div className={'min-w-0'}>
                        <p className={'text-xs font-medium text-ink'}>Kill all sleepers</p>
                        <p className={'text-[11px] text-ink-faint'}>
                            {sleepers} asleep right now. Their loot stays on their bodies.
                        </p>
                    </div>
                    <Button
                        size={'sm'}
                        variant={'danger'}
                        className={'shrink-0 whitespace-nowrap'}
                        disabled={busy !== null || sleepers === 0}
                        onClick={() =>
                            confirm({
                                title: 'Kill every sleeper?',
                                body: `This kills ${sleepers} sleeping players where they lie. It cannot be undone.`,
                                confirmLabel: 'Kill sleepers',
                                destructive: true,
                                onConfirm: () => run('killsleepers', {}, 'Sleepers killed.'),
                            })
                        }
                    >
                        Kill sleepers
                    </Button>
                </div>
            </div>

            <DialogFooter>
                <Button size={'sm'} variant={'ghost'} onClick={onClose} disabled={busy !== null}>
                    Close
                </Button>
            </DialogFooter>
        </DialogShell>
    );
}

const AUTOMOD_ACTIONS = [
    { value: 'warn', label: 'Warn the player' },
    { value: 'mute', label: 'Mute the player' },
    { value: 'kick', label: 'Kick the player' },
];

function AutoModDialog({ open, onClose, uuid }: { open: boolean; onClose: () => void; uuid: string }) {
    const { toast } = useToast();
    const [config, setConfig] = useState<RustAutoModConfig>({ enabled: false, action: 'warn', bannedWords: [] });
    const [word, setWord] = useState('');
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoaded(false);
        getAutoModConfig(uuid)
            .then((res) => setConfig(res.config))
            .catch((err) => toast(errorMessage(err, 'Could not load the auto-mod rules.'), { tone: 'error' }))
            .finally(() => setLoaded(true));
    }, [open, uuid]);

    const addWord = () => {
        const next = word.trim().toLowerCase();
        if (!next || config.bannedWords.includes(next)) return setWord('');
        setConfig({ ...config, bannedWords: [...config.bannedWords, next] });
        setWord('');
    };

    const save = async () => {
        setSaving(true);
        try {
            await saveAutoModConfig(uuid, config);
            toast('Auto-mod rules saved.', { tone: 'success' });
            onClose();
        } catch (err) {
            toast(errorMessage(err, 'Could not save the auto-mod rules.'), { tone: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <DialogShell
            open={open}
            onClose={() => !saving && onClose()}
            title={'Auto-mod'}
            body={'Watches chat and acts on banned words.'}
            width={'md'}
        >
            <div className={cn('mt-5 space-y-4', !loaded && 'pointer-events-none opacity-60')}>
                <div className={'flex items-center justify-between gap-3 rounded-xl bg-overlay/40 px-3 py-2.5'}>
                    <span className={'text-xs font-medium text-ink'}>Enabled</span>
                    <Toggle
                        checked={config.enabled}
                        onChange={(enabled) => setConfig({ ...config, enabled })}
                        label={'Enable auto-mod'}
                    />
                </div>

                <Select
                    label={'When someone says a banned word'}
                    value={config.action}
                    onChange={(action) => setConfig({ ...config, action })}
                    options={AUTOMOD_ACTIONS}
                />

                <div>
                    <Input
                        label={'Banned words'}
                        value={word}
                        placeholder={'Add a word and press Enter'}
                        onChange={(event) => setWord(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                addWord();
                            }
                        }}
                    />
                    <div className={'mt-2 flex flex-wrap gap-1.5'}>
                        {config.bannedWords.length === 0 ? (
                            <p className={'text-xs text-ink-faint'}>No words yet.</p>
                        ) : (
                            config.bannedWords.map((entry) => (
                                <button
                                    key={entry}
                                    type={'button'}
                                    title={'Remove'}
                                    onClick={() =>
                                        setConfig({
                                            ...config,
                                            bannedWords: config.bannedWords.filter((w) => w !== entry),
                                        })
                                    }
                                    className={
                                        'rounded-lg bg-overlay/60 px-2 py-1 font-mono text-[11px] text-ink-muted transition-colors hover:bg-raised hover:text-ink'
                                    }
                                >
                                    {entry} ×
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button size={'sm'} variant={'ghost'} onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button size={'sm'} loading={saving} disabled={!loaded} onClick={() => void save()}>
                    Save rules
                </Button>
            </DialogFooter>
        </DialogShell>
    );
}
