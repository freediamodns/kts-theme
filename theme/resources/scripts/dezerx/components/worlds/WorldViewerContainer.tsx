import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Download, FileCog, Globe2, Grid3x3, Info, Map as MapIcon, Save, Trash2 } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { usePermissions } from '@/plugins/usePermissions';
import { Button, Select, Skeleton, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { NbtNode, NbtTree, replaceAt } from '@/dezerx/components/worlds/NbtTree';
import { cn } from '@/dezerx/lib/cn';
import {
    BlueMapStatus,
    ChunkEntry,
    Dimension,
    RegionEntry,
    World,
    blueMapUrl,
    deleteChunks,
    getBlueMapStatus,
    getChunk,
    getChunks,
    getDimensions,
    getNbt,
    getRegionMap,
    getRegions,
    getViewerWorlds,
    installBlueMap,
    saveNbt,
} from '@/api/server/worlds';
import { useT } from '@/i18n';

type Tab = 'map' | 'level' | 'chunks';

export default function WorldViewerContainer() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const [worlds, setWorlds] = useState<World[] | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [world, setWorld] = useState('');
    const [tab, setTab] = useState<Tab>('map');
    const [opened, setOpened] = useState<Set<Tab>>(() => new Set<Tab>(['map']));

    useEffect(() => {
        void getViewerWorlds(uuid)
            .then((data) => {
                setWorlds(data.worlds);
                setWorld(data.worlds[0]?.path ?? '');
            })
            .catch(setError);
    }, [uuid]);

    const show = (next: Tab) => {
        setTab(next);
        setOpened((current) => new Set(current).add(next));
    };

    if (error) {
        return (
            <ServerContentBlock title={t('worldViewer.title')}>
                <SectionEmpty
                    icon={Globe2}
                    title={t('worlds.readFailed')}
                    body={apiMessage(error, t('worlds.nodeSilent'))}
                />
            </ServerContentBlock>
        );
    }

    if (worlds === null) {
        return (
            <ServerContentBlock title={t('worldViewer.title')}>
                <SectionSkeleton label={t('worlds.loading')} />
            </ServerContentBlock>
        );
    }

    if (worlds.length === 0) {
        return (
            <ServerContentBlock title={t('worldViewer.title')}>
                <SectionEmpty icon={Globe2} title={t('worldViewer.emptyTitle')} body={t('worldViewer.emptyBody')} />
            </ServerContentBlock>
        );
    }

    const tabs: { key: Tab; label: string; icon: typeof Globe2 }[] = [
        { key: 'map', label: t('worldViewer.tabMap'), icon: MapIcon },
        { key: 'level', label: 'level.dat', icon: FileCog },
        { key: 'chunks', label: t('worldViewer.tabChunks'), icon: Grid3x3 },
    ];

    return (
        <ServerContentBlock title={t('worldViewer.title')}>
            <div className={'space-y-4'}>
                <SectionHeader title={t('worldViewer.title')} description={t('worldViewer.description')} />

                <div className={'flex flex-wrap items-end gap-3'}>
                    <div className={'w-full sm:w-56'}>
                        <Select
                            value={world}
                            onChange={setWorld}
                            options={worlds.map((entry) => ({ value: entry.path, label: entry.name }))}
                        />
                    </div>

                    <div className={'flex h-11 shrink-0 items-center rounded-2xl bg-card p-1'}>
                        {tabs.map((entry) => (
                            <button
                                key={entry.key}
                                type={'button'}
                                onClick={() => show(entry.key)}
                                aria-pressed={tab === entry.key}
                                className={cn(
                                    'flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium transition-colors',
                                    tab === entry.key ? 'bg-accent/15 text-ink' : 'text-ink-muted hover:text-ink'
                                )}
                            >
                                <entry.icon className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                {entry.label}
                            </button>
                        ))}
                    </div>
                </div>

                {opened.has('map') && (
                    <div className={cn(tab !== 'map' && 'hidden')}>
                        <BlueMapCard uuid={uuid} />
                    </div>
                )}

                {opened.has('level') && (
                    <div className={cn(tab !== 'level' && 'hidden')}>
                        <NbtEditor key={`${world}/level.dat`} uuid={uuid} file={`${world}/level.dat`} />
                    </div>
                )}

                {opened.has('chunks') && (
                    <div className={cn(tab !== 'chunks' && 'hidden')}>
                        <Chunks key={world} uuid={uuid} world={world} />
                    </div>
                )}
            </div>
        </ServerContentBlock>
    );
}

function NbtEditor({ uuid, file }: { uuid: string; file: string }) {
    const t = useT();
    const { toast } = useToast();
    const [canUpdate] = usePermissions(['file.update']);

    const [tree, setTree] = useState<NbtNode | null>(null);
    const [compression, setCompression] = useState('gzip');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        let live = true;
        setLoading(true);
        setDirty(false);

        void getNbt(uuid, file)
            .then((data) => {
                if (live) {
                    setTree(data.tree as NbtNode);
                    setCompression(data.compression);
                }
            })
            .catch((error) => {
                if (live) {
                    setTree(null);
                    toast(apiMessage(error, t('worldViewer.openFailed')), { tone: 'error' });
                }
            })
            .finally(() => live && setLoading(false));

        return () => {
            live = false;
        };
    }, [uuid, file]);

    const save = async () => {
        if (!tree) {
            return;
        }

        setSaving(true);

        try {
            await saveNbt(uuid, file, compression, tree);
            setDirty(false);
            toast(t('worldViewer.nbtSaved', { file }), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('worldViewer.saveFailed')), { tone: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={'space-y-1.5 rounded-2xl bg-card p-4'}>
                {Array.from({ length: 10 }).map((_, index) => (
                    <Skeleton key={index} className={'h-4'} style={{ width: `${30 + ((index * 13) % 50)}%` }} />
                ))}
            </div>
        );
    }

    if (!tree) {
        return (
            <SectionEmpty icon={FileCog} title={t('worldViewer.noLevelTitle')} body={t('worldViewer.noLevelBody')} />
        );
    }

    return (
        <div className={'space-y-2'}>
            <div className={'flex items-center justify-between gap-3'}>
                <p className={'min-w-0 truncate font-mono text-[11px] text-ink-faint'}>{file}</p>

                {canUpdate && (
                    <Button
                        size={'sm'}
                        variant={'primary'}
                        loading={saving}
                        disabled={!dirty}
                        onClick={() => void save()}
                        icon={<Save className={'h-3.5 w-3.5'} />}
                    >
                        {t('common.save')}
                    </Button>
                )}
            </div>

            <div className={'max-h-[34rem] overflow-auto rounded-2xl bg-card p-2'}>
                <NbtTree
                    node={tree}
                    onChange={(path, value) => {
                        if (!canUpdate) {
                            return;
                        }

                        setTree((current) => (current ? replaceAt(current, path, value) : current));
                        setDirty(true);
                    }}
                />
            </div>
        </div>
    );
}

function BlueMapCard({ uuid }: { uuid: string }) {
    const t = useT();
    const { toast } = useToast();
    const [canInstall] = usePermissions(['file.update']);

    const [status, setStatus] = useState<BlueMapStatus | null>(null);
    const [installing, setInstalling] = useState(false);
    const alive = useRef(true);
    const recheck = useRef<number | null>(null);

    const load = () =>
        getBlueMapStatus(uuid)
            .then((data) => alive.current && setStatus(data))
            .catch(
                (error) =>
                    alive.current &&
                    setStatus({ supported: false, message: apiMessage(error, t('worldViewer.blueMapStateFailed')) })
            );

    useEffect(() => {
        alive.current = true;

        void load();

        return () => {
            alive.current = false;

            if (recheck.current !== null) {
                window.clearTimeout(recheck.current);
            }
        };
    }, [uuid]);

    if (!status) {
        return <Skeleton className={'h-[38rem] rounded-2xl'} />;
    }

    if (!status.supported) {
        return (
            <SectionEmpty
                icon={MapIcon}
                title={t('worldViewer.noBlueMapTitle')}
                body={status.message ?? t('worldViewer.noBlueMapBody')}
            />
        );
    }

    const install = async () => {
        setInstalling(true);

        try {
            const data = await installBlueMap(uuid);
            toast(data.message ?? t('worldViewer.blueMapInstalling'), { tone: 'success' });
            recheck.current = window.setTimeout(() => void load(), 4000);
        } catch (error) {
            toast(apiMessage(error, t('worldViewer.blueMapInstallFailed')), { tone: 'error' });
        } finally {
            if (alive.current) {
                setInstalling(false);
            }
        }
    };

    if (!status.installed || !status.port || !status.token) {
        return (
            <div className={'flex flex-col items-center justify-center gap-3 rounded-2xl bg-card p-10 text-center'}>
                <span className={'flex h-12 w-12 items-center justify-center rounded-2xl bg-overlay/60 text-ink-faint'}>
                    <MapIcon className={'h-6 w-6'} aria-hidden={'true'} />
                </span>

                <div>
                    <p className={'text-sm font-medium text-ink'}>{t('worldViewer.noMapYet')}</p>
                    <p className={'mt-1 max-w-sm text-xs text-ink-faint'}>
                        {status.installed
                            ? t('worldViewer.blueMapNoPort')
                            : t('worldViewer.blueMapInstallBody', {
                                  filename: status.filename ?? 'BlueMap',
                                  directory: status.directory ?? t('worldViewer.addonFolder'),
                              })}
                    </p>
                </div>

                {canInstall && (
                    <Button
                        size={'sm'}
                        variant={'primary'}
                        loading={installing}
                        onClick={() => void install()}
                        icon={<Download className={'h-3.5 w-3.5'} />}
                    >
                        {t('worldViewer.installVersion', { version: status.version ?? '' }).trim()}
                    </Button>
                )}
            </div>
        );
    }

    if (!status.owner) {
        return <BlueMapWindow uuid={uuid} token={status.token} />;
    }

    return (
        <div className={'relative'}>
            <BlueMapFrame token={status.token} />

            {canInstall && (
                <button
                    type={'button'}
                    onClick={() => void install()}
                    disabled={installing}
                    title={`${status.installed} · ${status.platform} · ${t('worldViewer.port', {
                        port: status.port,
                    })}\n${t('worldViewer.reinstallHint')}`}
                    aria-label={t('worldViewer.reinstallLabel', {
                        version: status.installed,
                        port: status.port,
                    })}
                    className={
                        'absolute right-3 top-3 rounded-lg bg-overlay/90 p-1.5 text-ink-faint shadow-panel transition-colors hover:text-ink disabled:opacity-50'
                    }
                >
                    <Info className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                </button>
            )}
        </div>
    );
}

function BlueMapWindow({ uuid, token }: { uuid: string; token: string }) {
    const t = useT();
    const { toast } = useToast();

    const open = () => {
        if (!window.open(blueMapUrl(token), `world-viewer-${uuid}`, 'width=1440,height=900')) {
            toast(t('worldViewer.windowBlocked'), { tone: 'error' });
        }
    };

    return (
        <div className={'flex flex-col items-center justify-center gap-3 rounded-2xl bg-card p-10 text-center'}>
            <span className={'flex h-12 w-12 items-center justify-center rounded-2xl bg-overlay/60 text-ink-faint'}>
                <MapIcon className={'h-6 w-6'} aria-hidden={'true'} />
            </span>

            <div>
                <p className={'text-sm font-medium text-ink'}>{t('worldViewer.windowTitle')}</p>
                <p className={'mt-1 max-w-sm text-xs text-ink-faint'}>{t('worldViewer.windowBody')}</p>
            </div>

            <Button size={'sm'} variant={'primary'} onClick={open} icon={<MapIcon className={'h-3.5 w-3.5'} />}>
                {t('worldViewer.windowOpen')}
            </Button>
        </div>
    );
}

function BlueMapFrame({ token }: { token: string }) {
    const t = useT();
    const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        setState('loading');

        const timer = window.setTimeout(() => setState((current) => (current === 'ready' ? current : 'failed')), 20000);

        return () => window.clearTimeout(timer);
    }, [attempt, token]);

    if (state === 'failed') {
        return (
            <div
                className={
                    'flex h-[38rem] flex-col items-center justify-center gap-3 rounded-2xl bg-card p-10 text-center'
                }
            >
                <span className={'flex h-12 w-12 items-center justify-center rounded-2xl bg-overlay/60 text-ink-faint'}>
                    <MapIcon className={'h-6 w-6'} aria-hidden={'true'} />
                </span>

                <div>
                    <p className={'text-sm font-medium text-ink'}>{t('worldViewer.blueMapUnreachableTitle')}</p>
                    <p className={'mt-1 max-w-sm text-xs text-ink-faint'}>{t('worldViewer.blueMapUnreachableBody')}</p>
                </div>

                <Button size={'sm'} variant={'secondary'} onClick={() => setAttempt((count) => count + 1)}>
                    {t('worldViewer.blueMapRetry')}
                </Button>
            </div>
        );
    }

    return (
        <>
            <iframe
                key={attempt}
                src={blueMapUrl(token)}
                title={'BlueMap'}
                sandbox={'allow-scripts allow-pointer-lock'}
                onLoad={() => setState('ready')}
                onError={() => setState('failed')}
                className={cn(
                    'h-[38rem] w-full rounded-2xl bg-card ring-1 ring-line-field',
                    state === 'ready' ? 'opacity-100' : 'opacity-0'
                )}
            />

            {state === 'loading' && (
                <div
                    className={
                        'absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card text-center'
                    }
                >
                    <span
                        className={
                            'flex h-12 w-12 items-center justify-center rounded-2xl bg-overlay/60 text-ink-faint'
                        }
                    >
                        <MapIcon className={'h-6 w-6 animate-pulse'} aria-hidden={'true'} />
                    </span>

                    <p className={'text-xs text-ink-faint'}>{t('worldViewer.blueMapLoading')}</p>
                </div>
            )}
        </>
    );
}

function Chunks({ uuid, world }: { uuid: string; world: string }) {
    const t = useT();
    const { toast } = useToast();
    const [canDelete] = usePermissions(['file.delete']);

    const [dimensions, setDimensions] = useState<Dimension[] | null>(null);
    const [dimension, setDimension] = useState('');
    const [regions, setRegions] = useState<RegionEntry[] | null>(null);
    const [region, setRegion] = useState('');
    const [chunks, setChunks] = useState<ChunkEntry[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [inspect, setInspect] = useState<ChunkEntry | null>(null);
    const [tree, setTree] = useState<NbtNode | null>(null);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [map, setMap] = useState<string | null>(null);
    const [mapping, setMapping] = useState(false);

    useEffect(() => {
        let alive = true;

        void getDimensions(uuid, world)
            .then((data) => {
                if (alive) {
                    setDimensions(data);
                    setDimension(data[0]?.path ?? '');
                }
            })
            .catch(() => alive && setDimensions([]));

        return () => {
            alive = false;
        };
    }, [uuid, world]);

    useEffect(() => {
        if (!dimension) {
            return;
        }

        let live = true;
        setRegions(null);

        void getRegions(uuid, dimension)
            .then((data) => {
                if (live) {
                    setRegions(data);
                    setRegion(data[0]?.file ?? '');
                }
            })
            .catch(() => live && setRegions([]));

        return () => {
            live = false;
        };
    }, [uuid, dimension]);

    useEffect(() => {
        if (!region) {
            return;
        }

        let alive = true;
        setLoading(true);
        setSelected(new Set());
        setInspect(null);
        setTree(null);
        setMap(null);
        setMapping(true);

        let attempts = 0;
        let next: number | null = null;
        const cancel = new AbortController();

        const poll = () => {
            void getRegionMap(uuid, region, cancel.signal)
                .then((data) => {
                    if (!alive) {
                        return;
                    }

                    if (data.ready && data.image) {
                        setMap(data.image);
                        setMapping(false);

                        return;
                    }

                    if (++attempts < 30) {
                        next = window.setTimeout(poll, 2000);
                    } else {
                        setMapping(false);
                    }
                })
                .catch(() => alive && setMapping(false));
        };

        poll();

        void getChunks(uuid, region, cancel.signal)
            .then((data) => alive && setChunks(data))
            .catch((error) => {
                if (alive && !axios.isCancel(error)) {
                    setChunks([]);
                    toast(apiMessage(error, t('worldViewer.regionFailed')), { tone: 'error' });
                }
            })
            .finally(() => alive && setLoading(false));

        return () => {
            alive = false;

            if (next !== null) {
                window.clearTimeout(next);
            }

            cancel.abort();
        };
    }, [uuid, region]);

    const openChunk = (chunk: ChunkEntry) => {
        setInspect(chunk);
        setTree(null);

        void getChunk(uuid, region, chunk.offset, chunk.sectors)
            .then((data) => setTree(data.tree as NbtNode))
            .catch((error) => toast(apiMessage(error, t('worldViewer.chunkFailed')), { tone: 'error' }));
    };

    const remove = () =>
        setDialog({
            title: t('worldViewer.deleteChunksTitle', { count: selected.size }),
            body: t('worldViewer.deleteChunksBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteChunks(uuid, region, [...selected]);
                    setSelected(new Set());
                    toast(t('worldViewer.chunksDeleted'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('worldViewer.chunksDeleteFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    const grid = new Map((chunks ?? []).map((chunk) => [chunk.index, chunk] as const));

    if (dimensions === null) {
        return <Skeleton className={'h-64 rounded-2xl'} />;
    }

    if (dimensions.length === 0) {
        return (
            <SectionEmpty
                icon={Grid3x3}
                title={t('worldViewer.noRegionsTitle')}
                body={t('worldViewer.noRegionsBody')}
            />
        );
    }

    return (
        <div className={'space-y-3'}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <div className={'flex flex-wrap items-end gap-3'}>
                {dimensions.length > 1 && (
                    <div className={'w-full sm:w-44'}>
                        <Select
                            value={dimension}
                            onChange={setDimension}
                            options={dimensions.map((entry) => ({ value: entry.path, label: entry.name }))}
                        />
                    </div>
                )}

                <div className={'w-full sm:w-64'}>
                    <Select
                        value={region}
                        onChange={setRegion}
                        options={(regions ?? []).map((entry) => ({
                            value: entry.file,
                            label: `${entry.name} · ${(entry.size / 1048576).toFixed(1)} MB`,
                        }))}
                    />
                </div>

                {selected.size > 0 && canDelete && (
                    <Button
                        size={'md'}
                        variant={'ghost'}
                        onClick={remove}
                        className={'text-danger hover:bg-danger/10 hover:text-danger'}
                        icon={<Trash2 className={'h-4 w-4'} />}
                    >
                        {t('worldViewer.deleteSelected', { count: selected.size })}
                    </Button>
                )}
            </div>

            {loading ? (
                <Skeleton className={'h-64 rounded-2xl'} />
            ) : (
                <div className={'rounded-2xl bg-card p-4'}>
                    <div className={'mb-3 flex flex-wrap items-center justify-between gap-2'}>
                        <p className={'text-xs text-ink-faint'}>
                            {t('worldViewer.chunksGenerated', { count: chunks?.length ?? 0 })}
                            {canDelete && ` · ${t('worldViewer.chunkHint')}`}
                        </p>

                        {map && (
                            <span className={'text-[10px] text-ink-faint'}>{t('worldViewer.renderedFromRegion')}</span>
                        )}
                    </div>

                    <div className={'relative'}>
                        {map && (
                            <img
                                src={map}
                                alt={t('worldViewer.regionMapAlt')}
                                className={'pointer-events-none absolute inset-0 h-full w-full rounded'}
                                style={{ imageRendering: 'pixelated' }}
                            />
                        )}

                        {mapping && !map && (
                            <div className={'pointer-events-none absolute inset-0 flex items-center justify-center'}>
                                <span className={'rounded-lg bg-overlay px-2 py-1 text-[11px] text-ink-faint'}>
                                    {t('worldViewer.rendering')}
                                </span>
                            </div>
                        )}

                        <div
                            className={'relative grid'}
                            style={{ gridTemplateColumns: 'repeat(32, minmax(8px, 1fr))' }}
                        >
                            {Array.from({ length: 1024 }).map((_, index) => {
                                const chunk = grid.get(index);
                                const isSelected = selected.has(index);

                                return (
                                    <button
                                        key={index}
                                        type={'button'}
                                        disabled={!chunk}
                                        title={
                                            chunk
                                                ? t('worldViewer.chunkAt', {
                                                      x: chunk.x,
                                                      z: chunk.z,
                                                      size: (chunk.bytes / 1024).toFixed(0),
                                                  })
                                                : undefined
                                        }
                                        onClick={(event) => {
                                            if (!chunk) {
                                                return;
                                            }

                                            if (event.shiftKey) {
                                                if (!canDelete) {
                                                    return;
                                                }

                                                setSelected((current) => {
                                                    const next = new Set(current);
                                                    next.has(index) ? next.delete(index) : next.add(index);

                                                    return next;
                                                });

                                                return;
                                            }

                                            openChunk(chunk);
                                        }}
                                        className={cn(
                                            'aspect-square transition-colors',
                                            !chunk && !map && 'bg-overlay/40',
                                            chunk && 'hover:bg-ink/20',
                                            isSelected && 'bg-danger/70',
                                            inspect?.index === index && 'ring-1 ring-inset ring-ink'
                                        )}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {inspect && (
                <div className={'space-y-2'}>
                    <p className={'text-xs text-ink-faint'}>
                        {t('worldViewer.chunkAt', {
                            x: inspect.x,
                            z: inspect.z,
                            size: (inspect.bytes / 1024).toFixed(0),
                        })}
                    </p>

                    <div className={'max-h-[26rem] overflow-auto rounded-2xl bg-card p-2'}>
                        {tree === null ? (
                            <Skeleton className={'h-32'} />
                        ) : (
                            <NbtTree node={tree} onChange={() => undefined} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
