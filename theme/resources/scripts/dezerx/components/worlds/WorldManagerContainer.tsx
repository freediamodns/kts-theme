import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Download, RefreshCw, Search } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { usePermissions } from '@/plugins/usePermissions';
import { bytesToString } from '@/lib/formatters';
import { Button, Checkbox, Input, Notice, Select, Skeleton, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { cn } from '@/dezerx/lib/cn';
import { formatRelative } from '@/dezerx/lib/format';
import {
    CatalogueFile,
    CatalogueInfo,
    CataloguePayload,
    CatalogueWorld,
    InstallStatus,
    getCatalogue,
    getInstallStatus,
    getWorldFiles,
    installWorld,
    searchWorlds,
} from '@/api/server/worlds';
import { useT, type TranslateFn } from '@/i18n';

const RUNNING: InstallStatus['state'][] = ['downloading', 'unpacking', 'placing'];

export default function WorldManagerContainer() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { toast } = useToast();

    const [status, setStatus] = useState<InstallStatus>({ state: 'idle' });

    const [canCreate] = usePermissions(['file.create']);

    useEffect(() => {
        let alive = true;
        let timer: number | null = null;

        const tick = () =>
            void getInstallStatus(uuid)
                .then((next) => {
                    if (!alive) {
                        return;
                    }

                    setStatus((current) => {
                        if (current.state !== next.state && next.state === 'done') {
                            toast(next.message ?? t('worlds.installed'), { tone: 'success' });
                        }

                        if (current.state !== next.state && next.state === 'failed') {
                            toast(next.message ?? t('worlds.installFailed'), { tone: 'error' });
                        }

                        return next;
                    });

                    if (RUNNING.includes(next.state)) {
                        timer = window.setTimeout(tick, 3000);
                    }
                })
                .catch(() => undefined);

        tick();

        return () => {
            alive = false;

            if (timer !== null) {
                window.clearTimeout(timer);
            }
        };
    }, [uuid]);

    const busy = RUNNING.includes(status.state);

    return (
        <ServerContentBlock title={t('worlds.title')}>
            <div className={'space-y-4'}>
                <SectionHeader title={t('worlds.title')} description={t('worlds.description')} />

                {(busy || status.state === 'failed') && (
                    <Notice
                        tone={status.state === 'failed' ? 'danger' : 'info'}
                        title={t(
                            status.state === 'failed'
                                ? 'worlds.installUnfinished'
                                : status.state === 'downloading'
                                ? 'worlds.downloading'
                                : 'worlds.installing'
                        )}
                    >
                        <span className={'flex items-center gap-2'}>
                            {busy && <RefreshCw className={'h-3.5 w-3.5 shrink-0 animate-spin'} aria-hidden={'true'} />}
                            {status.message ?? t('worlds.installingShort')}
                        </span>
                    </Notice>
                )}

                <Browse uuid={uuid} canInstall={canCreate} installing={busy} onQueued={setStatus} />
            </div>
        </ServerContentBlock>
    );
}

const sortOptions = (t: TranslateFn) => [
    { value: 'popular', label: t('worlds.sortPopular') },
    { value: 'downloads', label: t('worlds.sortDownloads') },
    { value: 'updated', label: t('worlds.sortUpdated') },
    { value: 'name', label: t('worlds.sortName') },
];

function Browse({
    uuid,
    canInstall,
    installing,
    onQueued,
}: {
    uuid: string;
    canInstall: boolean;
    installing: boolean;
    onQueued: (status: InstallStatus) => void;
}) {
    const t = useT();
    const [info, setInfo] = useState<CatalogueInfo | null>(null);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [sort, setSort] = useState('popular');
    const [page, setPage] = useState(1);
    const [payload, setPayload] = useState<CataloguePayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [picked, setPicked] = useState<CatalogueWorld | null>(null);

    useEffect(() => {
        void getCatalogue(uuid)
            .then(setInfo)
            .catch(() => setInfo({ available: false, categories: [] }));
    }, [uuid]);

    useEffect(() => setPage(1), [query, category, sort]);

    useEffect(() => {
        const cancel = new AbortController();
        let alive = true;
        setLoading(true);

        const timer = window.setTimeout(
            () => {
                void searchWorlds(
                    uuid,
                    query,
                    page,
                    category === '' ? undefined : Number(category),
                    sort,
                    cancel.signal
                )
                    .then((data) => alive && setPayload(data))
                    .catch((error) => {
                        if (alive && !axios.isCancel(error)) {
                            setPayload({
                                results: [],
                                page,
                                total: 0,
                                hasMore: false,
                                error: apiMessage(error, t('worlds.searchFailed')),
                            });
                        }
                    })
                    .finally(() => alive && setLoading(false));
            },
            query === '' ? 0 : 350
        );

        return () => {
            alive = false;
            window.clearTimeout(timer);
            cancel.abort();
        };
    }, [uuid, query, category, sort, page]);

    if (info !== null && !info.available) {
        return <SectionEmpty icon={Search} title={t('worlds.noCatalogueTitle')} body={t('worlds.noCatalogueBody')} />;
    }

    return (
        <div className={'space-y-3'}>
            <InstallDialog
                uuid={uuid}
                world={picked}
                onClose={() => setPicked(null)}
                onQueued={(status) => {
                    setPicked(null);
                    onQueued(status);
                }}
            />

            <div className={'flex flex-wrap items-center gap-3'}>
                <div className={'min-w-[14rem] flex-1'}>
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('worlds.searchPlaceholder')}
                        icon={<Search className={'h-4 w-4'} />}
                    />
                </div>

                <div className={'w-full sm:w-44'}>
                    <Select
                        value={category}
                        onChange={setCategory}
                        options={[
                            { value: '', label: t('worlds.everyCategory') },
                            ...(info?.categories ?? []).map((entry) => ({
                                value: String(entry.id),
                                label: entry.name,
                            })),
                        ]}
                    />
                </div>

                <div className={'w-full sm:w-48'}>
                    <Select value={sort} onChange={setSort} options={sortOptions(t)} />
                </div>
            </div>

            {payload?.error && (
                <Notice tone={'warning'} title={t('worlds.catalogueProblem')}>
                    {payload.error}
                </Notice>
            )}

            {loading && payload === null ? (
                <div className={'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className={'h-64 rounded-2xl'} />
                    ))}
                </div>
            ) : (payload?.results.length ?? 0) === 0 ? (
                <SectionEmpty
                    icon={Search}
                    title={t('modpacks.emptyTitle')}
                    body={query === '' ? t('worlds.emptyCatalogue') : t('worlds.noMatch', { query })}
                />
            ) : (
                <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', loading && 'opacity-60')}>
                    {payload?.results.map((world) => (
                        <CatalogueCard
                            key={world.id}
                            world={world}
                            canInstall={canInstall}
                            installing={installing}
                            onInstall={() => setPicked(world)}
                        />
                    ))}
                </div>
            )}

            {payload !== null && payload.total > 0 && (
                <div className={'flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3'}>
                    <p className={'text-xs text-ink-faint'}>
                        {t('worlds.pageOf', { page: payload.page, total: payload.total.toLocaleString() })}
                    </p>

                    <div className={'flex gap-2'}>
                        <Button
                            size={'sm'}
                            variant={'ghost'}
                            disabled={page <= 1 || loading}
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                        >
                            {t('common.back')}
                        </Button>
                        <Button
                            size={'sm'}
                            variant={'ghost'}
                            disabled={!payload.hasMore || loading}
                            onClick={() => setPage((current) => current + 1)}
                        >
                            {t('common.next')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function CatalogueCard({
    world,
    canInstall,
    installing,
    onInstall,
}: {
    world: CatalogueWorld;
    canInstall: boolean;
    installing: boolean;
    onInstall: () => void;
}) {
    const t = useT();
    const art = world.screenshot ?? world.icon;

    return (
        <div
            className={
                'group relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-transparent transition-colors hover:ring-line-field'
            }
        >
            {art && (
                <img
                    src={art}
                    alt={''}
                    aria-hidden={'true'}
                    loading={'lazy'}
                    decoding={'async'}
                    className={cn(
                        'absolute inset-0 h-full w-full scale-105 object-cover opacity-20',
                        'transition-transform duration-500 group-hover:scale-110',
                        '[mask-image:linear-gradient(to_bottom_right,#000_0%,#000_26%,rgb(0_0_0/0.45)_52%,transparent_84%)]',
                        '[.light_&]:hidden'
                    )}
                />
            )}

            <div className={'relative flex-1 space-y-2 px-4 pt-4'}>
                <div className={'flex items-start gap-2.5'}>
                    {world.icon && (
                        <img
                            src={world.icon}
                            alt={''}
                            aria-hidden={'true'}
                            loading={'lazy'}
                            decoding={'async'}
                            className={'hidden h-9 w-9 shrink-0 rounded-lg object-cover [.light_&]:block'}
                        />
                    )}

                    <div className={'min-w-0 flex-1'}>
                        <a
                            href={world.url}
                            target={'_blank'}
                            rel={'noreferrer noopener'}
                            className={'block truncate text-sm font-bold text-ink hover:text-accent'}
                            title={world.name}
                        >
                            {world.name}
                        </a>
                        <p className={'mt-0.5 truncate text-[11px] text-ink-faint'}>
                            {[world.author, t('worlds.downloads', { total: world.downloads.toLocaleString() })]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                    </div>
                </div>

                <p className={'line-clamp-2 text-xs leading-relaxed text-ink-muted'}>{world.summary}</p>

                <div className={'flex flex-wrap gap-1.5'}>
                    {world.categories.slice(0, 2).map((name) => (
                        <span key={name} className={'rounded-full px-1 py-0.5 text-[10px] font-medium text-ink-faint'}>
                            {name}
                        </span>
                    ))}

                    {world.gameVersions.slice(0, 2).map((version) => (
                        <span
                            key={version}
                            className={'rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent'}
                        >
                            {version}
                        </span>
                    ))}
                </div>
            </div>

            <div className={'relative flex items-center justify-between gap-2 px-4 pb-3'}>
                <span className={'truncate text-[10px] text-ink-faint'}>
                    {world.updatedAt ? t('worlds.updated', { when: formatRelative(world.updatedAt) }) : ''}
                </span>

                {canInstall && (
                    <Button
                        size={'sm'}
                        variant={'secondary'}
                        disabled={installing}
                        title={installing ? t('worlds.anotherInstalling') : undefined}
                        onClick={onInstall}
                        icon={<Download className={'h-3.5 w-3.5'} />}
                    >
                        {t('modpacks.install')}
                    </Button>
                )}
            </div>
        </div>
    );
}

function InstallDialog({
    uuid,
    world,
    onClose,
    onQueued,
}: {
    uuid: string;
    world: CatalogueWorld | null;
    onClose: () => void;
    onQueued: (status: InstallStatus) => void;
}) {
    const t = useT();
    const { toast } = useToast();
    const offline = ServerContext.useStoreState((state) => state.status.value) === 'offline';

    const [files, setFiles] = useState<CatalogueFile[] | null>(null);
    const [file, setFile] = useState('');
    const [name, setName] = useState('');
    const [activate, setActivate] = useState(false);
    const [busy, setBusy] = useState(false);
    const touched = useRef(false);

    useEffect(() => {
        if (!world) {
            return;
        }

        setFiles(null);
        setFile('');
        setActivate(false);
        touched.current = false;
        setName(suggestName(world.name));

        let alive = true;

        void getWorldFiles(uuid, world.id)
            .then((data) => {
                if (alive) {
                    setFiles(data);
                    setFile(data[0]?.id ?? '');
                }
            })
            .catch(() => alive && setFiles([]));

        return () => {
            alive = false;
        };
    }, [uuid, world]);

    const install = async () => {
        if (!world) {
            return;
        }

        setBusy(true);

        try {
            const status = await installWorld(uuid, world.id, file || undefined, name || undefined, activate);
            onQueued(status);
            toast(status.message ?? t('worlds.downloadStarted'), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('worlds.installFailed')), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <DialogShell
            open={world !== null}
            onClose={onClose}
            title={world?.name ?? ''}
            body={t('worlds.installDialogBody')}
            width={'md'}
        >
            <div className={'mt-4 space-y-3'}>
                <div>
                    <p className={'mb-1.5 text-xs font-medium text-ink-muted'}>{t('worlds.version')}</p>

                    {files === null ? (
                        <Skeleton className={'h-11 rounded-2xl'} />
                    ) : files.length === 0 ? (
                        <p className={'text-xs text-ink-faint'}>{t('worlds.noDownload')}</p>
                    ) : (
                        <Select
                            value={file}
                            onChange={setFile}
                            options={files.map((entry) => ({
                                value: entry.id,
                                label: `${entry.name}${
                                    entry.gameVersions.length > 0 ? ` · ${entry.gameVersions[0]}` : ''
                                } · ${bytesToString(entry.size)}`,
                            }))}
                        />
                    )}
                </div>

                <Input
                    label={t('worlds.folderName')}
                    value={name}
                    onChange={(event) => {
                        touched.current = true;
                        setName(event.target.value);
                    }}
                    hint={t('worlds.folderHint')}
                />

                <div>
                    <Checkbox
                        checked={activate}
                        onChange={() => setActivate((current) => !current)}
                        disabled={!offline}
                        label={t('worlds.makeActive')}
                    />

                    <p className={'mt-1 pl-7 text-[11px] text-ink-faint'}>
                        {t(offline ? 'worlds.activateHint' : 'worlds.activateOffline')}
                    </p>
                </div>

                <DialogFooter>
                    <Button size={'sm'} variant={'ghost'} onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        size={'sm'}
                        variant={'primary'}
                        loading={busy}
                        disabled={files === null || files.length === 0}
                        onClick={() => void install()}
                        icon={<Download className={'h-3.5 w-3.5'} />}
                    >
                        {t('modpacks.install')}
                    </Button>
                </DialogFooter>
            </div>
        </DialogShell>
    );
}

function suggestName(name: string): string {
    return (
        name
            .replace(/\(.*?\)/g, '')
            .replace(/[^A-Za-z0-9._-]+/g, '-')
            .replace(/^[-._]+|[-._]+$/g, '')
            .slice(0, 32) || 'world'
    );
}
