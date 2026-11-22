import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ExternalLink, FileCog, Plug, Power, RotateCw, Search, Trash2 } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { usePermissions } from '@/plugins/usePermissions';
import { Badge, Button, Input, Notice, Select, Skeleton, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import {
    Pagination,
    ResultCard,
    VersionPicker,
    count,
    resultGrid,
    size,
} from '@/dezerx/components/addons/AddonManager';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { formatRelative } from '@/dezerx/lib/format';
import { cn } from '@/dezerx/lib/cn';
import {
    InstalledRustPlugin,
    RustPluginSort,
    RustPluginsIndex,
    UModHit,
    UModSearch,
    deleteRustPlugin,
    getRustPlugins,
    installRustPlugin,
    reloadRustPlugin,
    searchUMod,
    toggleRustPlugin,
} from '@/api/server/rustPlugins';

const INSTALLED_PER_PAGE = 6;

const SORTS: { value: RustPluginSort; label: string }[] = [
    { value: 'downloads', label: 'Most downloaded' },
    { value: 'latest_release_at', label: 'Recently updated' },
    { value: 'created_at', label: 'Newest' },
    { value: 'watchers', label: 'Most watched' },
    { value: 'title', label: 'Name' },
];

const ICON_BUTTON =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-faint ring-1 ring-line-field transition-colors hover:bg-raised hover:text-ink disabled:pointer-events-none disabled:opacity-50';

export default function RustPluginsContainer() {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const id = ServerContext.useStoreState((state) => state.server.data!.id);
    const { toast } = useToast();

    const [index, setIndex] = useState<RustPluginsIndex | null>(null);
    const [failed, setFailed] = useState<unknown>(null);

    const load = useCallback(
        () =>
            getRustPlugins(uuid)
                .then((data) => {
                    setIndex(data);
                    setFailed(null);
                })
                .catch((error) => {
                    setFailed(error);
                    toast(apiMessage(error, 'The plugin folder could not be read.'), { tone: 'error' });
                }),
        [uuid]
    );

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <ServerContentBlock title={'Rust Plugins'}>
            {index === null ? (
                failed === null ? (
                    <SectionSkeleton label={'Loading plugins'} />
                ) : (
                    <Notice
                        tone={'danger'}
                        title={'The plugin folder could not be read'}
                        action={
                            <Button size={'sm'} variant={'secondary'} onClick={() => void load()}>
                                Try again
                            </Button>
                        }
                    >
                        {apiMessage(failed, 'The node did not answer.')}
                    </Notice>
                )
            ) : !index.available ? (
                <SectionEmpty
                    icon={Plug}
                    title={`There is no ${index.directory} folder yet`}
                    body={
                        index.configured === 'vanilla'
                            ? 'This server runs vanilla Rust. Pick Oxide or Carbon as the modding framework on the Startup page, then restart it once so the framework installs.'
                            : `The ${
                                  index.framework === 'carbon' ? 'Carbon' : 'Oxide'
                              } folder appears after the server has started once with the framework installed.`
                    }
                />
            ) : (
                <div className={'space-y-6'}>
                    <Installed uuid={uuid} serverId={id} index={index} onChanged={load} />
                    <Browse uuid={uuid} index={index} onChanged={load} />
                </div>
            )}
        </ServerContentBlock>
    );
}

function Installed({
    uuid,
    serverId,
    index,
    onChanged,
}: {
    uuid: string;
    serverId: string;
    index: RustPluginsIndex;
    onChanged: () => Promise<void>;
}) {
    const { toast } = useToast();
    const [canInstall, canToggle, canDelete, canConsole] = usePermissions([
        'file.create',
        'file.update',
        'file.delete',
        'control.console',
    ]);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [updatingAll, setUpdatingAll] = useState(false);
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(1);

    const plugins = index.installed;
    const updates = plugins.filter((plugin) => plugin.updatable);

    const visible = useMemo(() => {
        const term = filter.trim().toLowerCase();
        return term
            ? plugins.filter(
                  (plugin) =>
                      plugin.title.toLowerCase().includes(term) ||
                      plugin.name.toLowerCase().includes(term) ||
                      (plugin.author ?? '').toLowerCase().includes(term)
              )
            : plugins;
    }, [plugins, filter]);

    useEffect(() => setPage(1), [filter]);

    const pages = Math.max(1, Math.ceil(visible.length / INSTALLED_PER_PAGE));
    const current = Math.min(page, pages);
    const shown = visible.slice((current - 1) * INSTALLED_PER_PAGE, current * INSTALLED_PER_PAGE);

    const run = async (plugin: InstalledRustPlugin, work: () => Promise<unknown>, done: string, failed: string) => {
        setBusy(plugin.file);
        try {
            await work();
            await onChanged();
            toast(done, { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, failed), { tone: 'error' });
        } finally {
            setBusy(null);
        }
    };

    const update = (plugin: InstalledRustPlugin) =>
        run(
            plugin,
            () => installRustPlugin(uuid, plugin.name),
            `${plugin.title} updated to ${plugin.latest}.`,
            `${plugin.title} could not be updated.`
        );

    const updateAll = async () => {
        setUpdatingAll(true);
        let done = 0;
        for (const plugin of updates) {
            try {
                await installRustPlugin(uuid, plugin.name);
                done++;
            } catch (error) {
                toast(apiMessage(error, `${plugin.title} could not be updated.`), { tone: 'error' });
            }
        }
        await onChanged();
        setUpdatingAll(false);
        if (done > 0) toast(`${done} plugin${done === 1 ? '' : 's'} updated.`, { tone: 'success' });
    };

    const remove = (plugin: InstalledRustPlugin) =>
        setDialog({
            title: `Delete ${plugin.title}?`,
            body: `${plugin.file} is removed and unloaded. Its config and data files are left where they are.`,
            confirmLabel: 'Delete',
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteRustPlugin(uuid, plugin.file);
                    await onChanged();
                    toast(`${plugin.title} deleted.`, { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, `${plugin.title} could not be removed.`), { tone: 'error' });
                    throw error;
                }
            },
        });

    return (
        <div className={'space-y-3'}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <SectionHeader
                title={`${plugins.length} installed`}
                description={
                    <>
                        Plugins in <span className={'font-mono'}>{index.directory}</span>.{' '}
                        {index.framework === 'carbon' ? 'Carbon' : 'Oxide'} loads and unloads them as the files change.
                    </>
                }
                action={
                    <div className={'flex flex-wrap items-center gap-2'}>
                        {plugins.length > INSTALLED_PER_PAGE && (
                            <div className={'w-full sm:w-56'}>
                                <Input
                                    value={filter}
                                    onChange={(event) => setFilter(event.target.value)}
                                    placeholder={'Filter installed'}
                                    aria-label={'Filter installed plugins'}
                                    icon={<Search className={'h-4 w-4'} />}
                                />
                            </div>
                        )}
                        {canInstall && updates.length > 0 && (
                            <Button
                                size={'sm'}
                                loading={updatingAll}
                                disabled={busy !== null}
                                onClick={() => void updateAll()}
                                icon={<ArrowUpRight className={'h-3.5 w-3.5'} />}
                            >
                                Update all ({updates.length})
                            </Button>
                        )}
                    </div>
                }
            />

            {plugins.length === 0 ? (
                <SectionEmpty
                    icon={Plug}
                    title={'No plugins yet'}
                    body={'Find one below and install it, and it loads within a few seconds.'}
                />
            ) : visible.length === 0 ? (
                <SectionEmpty icon={Search} title={'Nothing matches'} body={'Try another name or author.'} />
            ) : (
                <>
                    <div className={'grid grid-cols-1 gap-3 2xl:grid-cols-2'}>
                        {shown.map((plugin) => (
                            <div key={plugin.file} className={'flex items-center gap-3 rounded-2xl bg-card p-4'}>
                                <PluginIcon src={plugin.icon} dim={plugin.disabled} />

                                <div className={'min-w-0 flex-1'}>
                                    <div className={'flex min-w-0 items-center gap-1.5'}>
                                        <p
                                            className={cn(
                                                'truncate text-sm font-medium',
                                                plugin.disabled ? 'text-ink-faint' : 'text-ink'
                                            )}
                                            title={plugin.description || undefined}
                                        >
                                            {plugin.title}
                                        </p>
                                        {plugin.url && (
                                            <a
                                                href={plugin.url}
                                                target={'_blank'}
                                                rel={'noreferrer noopener'}
                                                aria-label={`Open ${plugin.title} on uMod`}
                                                className={
                                                    'shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                                                }
                                            >
                                                <ExternalLink className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                            </a>
                                        )}
                                        {plugin.disabled && (
                                            <span className={'shrink-0'}>
                                                <Badge tone={'warning'}>Disabled</Badge>
                                            </span>
                                        )}
                                        {plugin.updatable && (
                                            <span className={'shrink-0'}>
                                                <Badge tone={'info'}>{plugin.latest} available</Badge>
                                            </span>
                                        )}
                                    </div>

                                    <p className={'mt-0.5 truncate text-xs text-ink-faint'} title={plugin.file}>
                                        {[
                                            plugin.version ? `v${plugin.version}` : null,
                                            plugin.author ? `by ${plugin.author}` : null,
                                            size(plugin.size),
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                </div>

                                <div className={'flex shrink-0 items-center gap-1.5'}>
                                    {canInstall && plugin.updatable && (
                                        <Button
                                            size={'sm'}
                                            loading={busy === plugin.file}
                                            disabled={updatingAll}
                                            onClick={() => void update(plugin)}
                                        >
                                            Update
                                        </Button>
                                    )}

                                    {canConsole && index.running && !plugin.disabled && (
                                        <button
                                            type={'button'}
                                            title={'Reload'}
                                            aria-label={`Reload ${plugin.title}`}
                                            disabled={busy !== null}
                                            onClick={() =>
                                                void run(
                                                    plugin,
                                                    () => reloadRustPlugin(uuid, plugin.name),
                                                    `${plugin.title} reloaded.`,
                                                    `${plugin.title} could not be reloaded.`
                                                )
                                            }
                                            className={ICON_BUTTON}
                                        >
                                            <RotateCw className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                        </button>
                                    )}

                                    {plugin.config && (
                                        <Link
                                            to={`/server/${serverId}/files/edit#${encodeURIComponent(plugin.config)}`}
                                            title={'Edit config'}
                                            aria-label={`Edit the ${plugin.title} config`}
                                            className={ICON_BUTTON}
                                        >
                                            <FileCog className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                        </Link>
                                    )}

                                    {canToggle && (
                                        <Button
                                            size={'sm'}
                                            variant={'ghost'}
                                            loading={busy === plugin.file && !plugin.updatable}
                                            disabled={busy !== null && busy !== plugin.file}
                                            onClick={() =>
                                                void run(
                                                    plugin,
                                                    () => toggleRustPlugin(uuid, plugin.file),
                                                    plugin.disabled
                                                        ? `${plugin.title} is on.`
                                                        : `${plugin.title} is off.`,
                                                    `${plugin.title} could not be changed.`
                                                )
                                            }
                                            icon={<Power className={'h-3.5 w-3.5'} />}
                                        >
                                            {plugin.disabled ? 'Enable' : 'Disable'}
                                        </Button>
                                    )}

                                    {canDelete && (
                                        <button
                                            type={'button'}
                                            onClick={() => remove(plugin)}
                                            aria-label={`Delete ${plugin.title}`}
                                            className={cn(
                                                ICON_BUTTON,
                                                'hover:bg-danger/10 hover:text-danger hover:ring-danger/40'
                                            )}
                                        >
                                            <Trash2 className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {pages > 1 && (
                        <Pagination page={current} pages={pages} hasMore={current < pages} onPage={setPage} />
                    )}
                </>
            )}
        </div>
    );
}

function PluginIcon({ src, dim }: { src: string | null; dim?: boolean }) {
    const [broken, setBroken] = useState(false);

    useEffect(() => setBroken(false), [src]);

    if (src && !broken) {
        return (
            <img
                src={src}
                alt={''}
                loading={'lazy'}
                onError={() => setBroken(true)}
                className={cn('h-11 w-11 shrink-0 rounded-xl object-cover', dim && 'opacity-40 grayscale')}
            />
        );
    }

    return (
        <span className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-overlay/60 text-ink-faint'}>
            <Plug className={'h-5 w-5'} aria-hidden={'true'} />
        </span>
    );
}

function Browse({ uuid, index, onChanged }: { uuid: string; index: RustPluginsIndex; onChanged: () => Promise<void> }) {
    const { toast } = useToast();
    const tiles = usePanelTheme()['addons.cards'] === 'tiles';
    const [canInstall] = usePermissions(['file.create']);

    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<RustPluginSort>('downloads');
    const [page, setPage] = useState(1);
    const [results, setResults] = useState<UModSearch | null>(null);
    const [loading, setLoading] = useState(true);
    const [picked, setPicked] = useState<UModHit | null>(null);
    const [installing, setInstalling] = useState(false);
    const run = useRef(0);

    const installed = useMemo(() => new Map(index.installed.map((plugin) => [plugin.name, plugin])), [index]);

    useEffect(() => setPage(1), [query, sort]);

    useEffect(() => {
        const id = ++run.current;
        const timer = window.setTimeout(
            () => {
                setLoading(true);
                searchUMod(uuid, { query: query.trim(), page, sort })
                    .then((data) => run.current === id && setResults(data))
                    .catch((error) => {
                        if (run.current !== id) return;
                        setResults(null);
                        toast(apiMessage(error, 'uMod could not be searched.'), { tone: 'error' });
                    })
                    .finally(() => run.current === id && setLoading(false));
            },
            query === '' ? 0 : 350
        );

        return () => window.clearTimeout(timer);
    }, [uuid, query, page, sort]);

    const install = async (hit: UModHit) => {
        setInstalling(true);
        try {
            const result = await installRustPlugin(uuid, hit.id);
            await onChanged();
            setPicked(null);
            toast(
                result.disabled
                    ? `${hit.name} updated. It stays disabled until you enable it.`
                    : index.running
                    ? `${hit.name} installed. It loads within a few seconds.`
                    : `${hit.name} installed. It loads when the server starts.`,
                { tone: 'success' }
            );
        } catch (error) {
            toast(apiMessage(error, `${hit.name} could not be installed.`), { tone: 'error' });
        } finally {
            setInstalling(false);
        }
    };

    const card = (hit: UModHit) => {
        const mine = installed.get(hit.id);

        return {
            ...hit,
            authorUrl: null,
            installable: canInstall,
            reason: mine?.updatable ? 'Update available' : null,
        };
    };

    const hits = results?.results ?? [];
    const pickedInstalled = picked ? installed.get(picked.id) : undefined;

    return (
        <div className={'space-y-3'}>
            <SectionHeader
                title={'Browse uMod'}
                description={
                    results
                        ? `${results.total.toLocaleString()} plugins for Rust. uMod publishes the newest release of each.`
                        : 'Plugins for Rust from umod.org.'
                }
            />

            <div className={'flex flex-wrap items-end gap-3'}>
                <div className={'min-w-[12rem] flex-1'}>
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={'Search uMod'}
                        aria-label={'Search uMod'}
                        icon={<Search className={'h-4 w-4'} />}
                    />
                </div>
                <div className={'w-full sm:w-48'}>
                    <Select value={sort} onChange={(value) => setSort(value as RustPluginSort)} options={SORTS} />
                </div>
            </div>

            {loading && hits.length === 0 ? (
                <div className={resultGrid(tiles)}>
                    {Array.from({ length: tiles ? 6 : 5 }).map((_, i) => (
                        <Skeleton key={i} className={cn('rounded-2xl', tiles ? 'h-[132px]' : 'h-[74px]')} />
                    ))}
                </div>
            ) : hits.length === 0 ? (
                <SectionEmpty
                    icon={Search}
                    title={'Nothing found'}
                    body={query ? 'uMod has no Rust plugin by that name.' : 'uMod did not answer. Try again shortly.'}
                />
            ) : (
                <>
                    <div className={cn(resultGrid(tiles), loading && 'opacity-60 transition-opacity')}>
                        {hits.map((hit) => (
                            <ResultCard
                                key={hit.id}
                                result={card(hit)}
                                tiles={tiles}
                                installing={installing && picked?.id === hit.id}
                                onVersions={() => setPicked(hit)}
                                fallbackIcon={Plug}
                                badge={
                                    installed.has(hit.id) && !installed.get(hit.id)?.updatable ? 'Installed' : undefined
                                }
                            />
                        ))}
                    </div>

                    <Pagination
                        page={page}
                        pages={results?.pages ?? null}
                        hasMore={page < (results?.pages ?? 1)}
                        onPage={setPage}
                    />
                </>
            )}

            <VersionPicker
                addon={picked && card(picked)}
                versions={
                    picked && picked.version
                        ? [
                              {
                                  id: 'latest',
                                  label: pickedInstalled?.version
                                      ? `${picked.version} (you have ${pickedInstalled.version})`
                                      : `${picked.version} (latest)`,
                                  detail: `${picked.id}.cs into ${index.directory}`,
                                  meta: [
                                      `${count(picked.downloads)} downloads`,
                                      picked.updatedAt ? `released ${formatRelative(picked.updatedAt)}` : '',
                                  ]
                                      .filter(Boolean)
                                      .join(' · '),
                              },
                          ]
                        : picked
                        ? []
                        : null
                }
                empty={'uMod has no release of this plugin to download.'}
                installing={installing}
                fallbackIcon={Plug}
                badge={
                    picked && installed.has(picked.id) && !installed.get(picked.id)?.updatable ? 'Installed' : undefined
                }
                onInstall={() => picked && void install(picked)}
                onClose={() => setPicked(null)}
            />
        </div>
    );
}
