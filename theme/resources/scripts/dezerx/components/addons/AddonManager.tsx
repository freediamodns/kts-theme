import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import {
    Blocks,
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    History,
    Power,
    Search,
    Star,
    Trash2,
    X,
    LucideIcon,
} from 'lucide-react';
import { Badge, Button, Input, Select, Skeleton, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { cn } from '@/dezerx/lib/cn';
import { formatRelative } from '@/dezerx/lib/format';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import {
    AddonKind,
    AddonPayload,
    AddonSource,
    AddonVersion,
    InstalledAddon,
    SearchPayload,
    SearchResult,
    deleteAddon,
    getAddonVersions,
    getGameVersions,
    installAddon,
    searchAddons,
    toggleAddon,
} from '@/api/server/addons';
import { useT, type TranslateFn } from '@/i18n';

export function compareVersions(a: string, b: string): number {
    const left = a.split('.').map((part) => parseInt(part, 10) || 0);
    const right = b.split('.').map((part) => parseInt(part, 10) || 0);

    for (let index = 0; index < Math.max(left.length, right.length); index++) {
        const difference = (right[index] ?? 0) - (left[index] ?? 0);

        if (difference !== 0) {
            return difference;
        }
    }

    return 0;
}

const SOURCE_META: Record<AddonSource, { label: string; logo: string }> = {
    modrinth: { label: 'Modrinth', logo: 'https://modrinth.com/favicon.ico' },
    curseforge: { label: 'CurseForge', logo: 'https://www.curseforge.com/favicon.ico' },
    spigot: { label: 'SpigotMC', logo: 'https://static.spigotmc.org/img/spigot.png' },
};

const LOADER_LABELS: Record<string, string> = {
    fabric: 'Fabric',
    forge: 'Forge',
    neoforge: 'NeoForge',
    quilt: 'Quilt',
    babric: 'Babric',
    'bta-babric': 'BTA (Babric)',
    'java-agent': 'Java Agent',
    'legacy-fabric': 'Legacy Fabric',
    liteloader: 'LiteLoader',
    modloader: "Risugami's ModLoader",
    nilloader: 'NilLoader',
    ornithe: 'Ornithe',
    rift: 'Rift',
    bukkit: 'Bukkit',
    spigot: 'Spigot',
    paper: 'Paper',
    purpur: 'Purpur',
    folia: 'Folia',
    sponge: 'Sponge',
    bungeecord: 'BungeeCord',
    velocity: 'Velocity',
    waterfall: 'Waterfall',
    geyser: 'Geyser',
};

export function loaderLabel(loader: string): string {
    return LOADER_LABELS[loader] ?? loader.charAt(0).toUpperCase() + loader.slice(1);
}

const CURSEFORGE_LOADERS = ['forge', 'neoforge', 'fabric', 'quilt', 'liteloader'];

const PER_PAGE = 20;

const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)] gap-2';

const TILE_GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3';

const INSTALLED_GRID = 'grid grid-cols-1 gap-3 lg:grid-cols-2';

const INSTALLED_PER_PAGE = 4;

function nouns(t: TranslateFn, kind: AddonKind): { one: string; many: string; requires: string } {
    return {
        one: t(`addons.noun.${kind}.one`),
        many: t(`addons.noun.${kind}.many`),
        requires: t(`addons.noun.${kind}.requires`),
    };
}

export interface AddonManagerProps {
    uuid: string;
    kind: AddonKind;
    directory: string;
    payload: AddonPayload;
    onChanged: () => void;
}

export function AddonManager(props: AddonManagerProps) {
    const t = useT();
    const noun = nouns(t, props.kind);

    if (!props.payload.available) {
        return (
            <SectionEmpty
                icon={Blocks}
                title={t('addons.noFolder', { directory: props.directory })}
                body={t('addons.noFolderBody', { directory: props.directory, requires: noun.requires })}
            />
        );
    }

    return <Browse {...props} />;
}

function Installed({ uuid, kind, payload, onChanged }: AddonManagerProps) {
    const t = useT();
    const noun = nouns(t, kind);
    const { toast } = useToast();
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    const addons = payload.addons;
    const pages = Math.max(1, Math.ceil(addons.length / INSTALLED_PER_PAGE));
    const current = Math.min(page, pages);
    const shown = addons.slice((current - 1) * INSTALLED_PER_PAGE, current * INSTALLED_PER_PAGE);

    const toggle = async (addon: InstalledAddon) => {
        setBusy(addon.file);

        try {
            await toggleAddon(uuid, kind, addon.file);
            onChanged();
            toast(t(addon.disabled ? 'addons.enabled' : 'addons.disabled', { name: addon.name }), {
                tone: 'success',
            });
        } catch (error) {
            toast(apiMessage(error, t('addons.toggleFailed', { noun: noun.one })), { tone: 'error' });
        } finally {
            setBusy(null);
        }
    };

    const remove = (addon: InstalledAddon) =>
        setDialog({
            title: t('addons.deleteTitle', { name: addon.name }),
            body: t('addons.deleteBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteAddon(uuid, kind, addon.file);
                    onChanged();
                    toast(t('addons.deleted', { name: addon.name }), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('addons.removeFailed', { noun: noun.one })), { tone: 'error' });

                    throw error;
                }
            },
        });

    return (
        <div className={'space-y-3'}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <SectionHeader
                title={t('addons.installedCount', { count: addons.length })}
                description={t('addons.installedDescription')}
            />

            {addons.length === 0 ? (
                <SectionEmpty
                    icon={Blocks}
                    title={t('addons.emptyTitle', { noun: noun.many })}
                    body={t('addons.emptyBody')}
                />
            ) : (
                <>
                    <div className={INSTALLED_GRID}>
                        {shown.map((addon) => (
                            <div key={addon.file} className={'flex items-center gap-3 rounded-2xl bg-card p-4'}>
                                {addon.icon ? (
                                    <img
                                        src={addon.icon}
                                        alt={''}
                                        loading={'lazy'}
                                        className={cn(
                                            'h-11 w-11 shrink-0 rounded-xl object-cover',
                                            addon.disabled && 'opacity-40 grayscale'
                                        )}
                                    />
                                ) : (
                                    <span
                                        className={
                                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-overlay/60 text-ink-faint'
                                        }
                                    >
                                        <Blocks className={'h-5 w-5'} aria-hidden={'true'} />
                                    </span>
                                )}

                                <div className={'min-w-0 flex-1'}>
                                    <div className={'flex min-w-0 items-center gap-1.5'}>
                                        <p
                                            className={cn(
                                                'truncate text-sm font-medium',
                                                addon.disabled ? 'text-ink-faint' : 'text-ink'
                                            )}
                                        >
                                            {addon.name}
                                        </p>

                                        {addon.url && (
                                            <a
                                                href={addon.url}
                                                target={'_blank'}
                                                rel={'noreferrer noopener'}
                                                aria-label={t('common.openInNewTab', { name: addon.name })}
                                                className={
                                                    'shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                                                }
                                            >
                                                <ExternalLink className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                            </a>
                                        )}

                                        {addon.disabled && (
                                            <span className={'shrink-0'}>
                                                <Badge tone={'warning'}>{t('addons.badgeDisabled')}</Badge>
                                            </span>
                                        )}
                                    </div>

                                    <p className={'mt-0.5 truncate text-xs text-ink-faint'} title={addon.file}>
                                        {addon.file} · {size(addon.size)}
                                    </p>
                                </div>

                                <div className={'flex shrink-0 items-center gap-1.5'}>
                                    <Button
                                        size={'sm'}
                                        variant={'ghost'}
                                        loading={busy === addon.file}
                                        onClick={() => void toggle(addon)}
                                        icon={<Power className={'h-3.5 w-3.5'} />}
                                    >
                                        {t(addon.disabled ? 'addons.enable' : 'addons.disable')}
                                    </Button>

                                    <button
                                        type={'button'}
                                        onClick={() => remove(addon)}
                                        aria-label={t('addons.deleteTitle', { name: addon.name })}
                                        className={
                                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-faint ring-1 ring-line-field transition-colors hover:bg-danger/10 hover:text-danger hover:ring-danger/40'
                                        }
                                    >
                                        <Trash2 className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                    </button>
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

export function ListDialog({
    open,
    onClose,
    title,
    subtitle,
    children,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    const t = useT();

    return (
        <Dialog open={open} onClose={onClose} className={'relative z-[55]'}>
            <div className={'fixed inset-0 bg-black/50 backdrop-blur-sm animate-backdrop-in'} aria-hidden={'true'} />

            <div className={'fixed inset-0 flex items-center justify-center p-4'}>
                <Dialog.Panel
                    className={
                        'flex h-[36rem] max-h-full w-[46rem] max-w-full flex-col overflow-hidden rounded-2xl dz-on-raised bg-raised shadow-panel ring-1 ring-line-field animate-modal-in motion-reduce:animate-none'
                    }
                >
                    <div className={'flex items-start justify-between gap-3 p-4'}>
                        <div className={'min-w-0'}>
                            <Dialog.Title className={'truncate text-sm font-medium text-ink'}>{title}</Dialog.Title>
                            <p className={'mt-0.5 text-xs text-ink-faint'}>{subtitle}</p>
                        </div>

                        <button
                            type={'button'}
                            onClick={onClose}
                            aria-label={t('common.close')}
                            className={
                                'shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-overlay hover:text-ink'
                            }
                        >
                            <X className={'h-4 w-4'} aria-hidden={'true'} />
                        </button>
                    </div>

                    <div className={'min-h-0 flex-1 overflow-y-auto px-4 pb-4'}>{children}</div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

function Browse({ uuid, kind, directory, payload, onChanged }: AddonManagerProps) {
    const t = useT();
    const noun = nouns(t, kind);
    const tiles = usePanelTheme()['addons.cards'] === 'tiles';
    const { toast } = useToast();
    const { sources, loaders } = payload;

    const [source, setSource] = useState<AddonSource>(sources[0] ?? 'modrinth');
    const [query, setQuery] = useState('');
    const [version, setVersion] = useState('');
    const [loader, setLoader] = useState('');
    const [page, setPage] = useState(1);
    const [results, setResults] = useState<SearchPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState<string | null>(null);
    const [versionsFor, setVersionsFor] = useState<SearchResult | null>(null);
    const [gameVersions, setGameVersions] = useState<string[]>([]);

    const run = useRef(0);

    useEffect(() => {
        let live = true;

        void getGameVersions(uuid, kind)
            .catch(() => [] as string[])
            .then((list) => {
                if (live) {
                    setGameVersions([...list].sort(compareVersions));
                }
            });

        return () => {
            live = false;
        };
    }, [uuid, kind]);

    useEffect(() => {
        setPage(1);
    }, [source, query, version, loader]);

    useEffect(() => {
        const id = ++run.current;

        const timer = window.setTimeout(() => {
            setLoading(true);

            searchAddons(uuid, kind, {
                source,
                query,
                version: version || undefined,
                loader: loader || undefined,
                page,
            })
                .then((data) => {
                    if (run.current === id) {
                        setResults(data);
                    }
                })
                .catch((error) => {
                    if (run.current === id) {
                        setResults(null);
                        toast(apiMessage(error, t('modpacks.searchFailed')), { tone: 'error' });
                    }
                })
                .finally(() => {
                    if (run.current === id) {
                        setLoading(false);
                    }
                });
        }, 350);

        return () => window.clearTimeout(timer);
    }, [source, query, version, loader, page, uuid, kind]);

    const install = async (result: SearchResult, versionId: string, filters: { loader: string; version: string }) => {
        setInstalling(result.id);

        try {
            await installAddon(uuid, kind, result.source, result.id, versionId, filters, {
                title: result.name,
                icon: result.icon,
                url: result.url,
            });
            onChanged();
            setVersionsFor(null);
            toast(t('addons.installedToast', { name: result.name }), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('addons.installFailed', { noun: noun.one })), { tone: 'error' });
        } finally {
            setInstalling(null);
        }
    };

    const hits = results?.results ?? [];

    const maxPage = results?.maxPage ?? Number.POSITIVE_INFINITY;
    const pages = results?.total != null ? Math.min(Math.max(1, Math.ceil(results.total / PER_PAGE)), maxPage) : null;
    const hasMore = (results?.hasMore ?? false) && page < maxPage;

    const filterableLoaders = source === 'modrinth' || (source === 'curseforge' && kind === 'mods');
    const showLoaders = filterableLoaders && loaders.length > 1;

    return (
        <div className={'space-y-3'}>
            <VersionsModal
                uuid={uuid}
                kind={kind}
                addon={versionsFor}
                loaders={loaders}
                installing={installing !== null}
                onInstall={(versionId, filters) => {
                    if (versionsFor) {
                        void install(versionsFor, versionId, filters);
                    }
                }}
                onClose={() => setVersionsFor(null)}
            />

            <Installed uuid={uuid} kind={kind} directory={directory} payload={payload} onChanged={onChanged} />

            <SectionHeader title={t('addons.browse')} description={t('addons.browseDescription')} />

            <div className={'flex flex-wrap items-end gap-3'}>
                {sources.length > 1 && (
                    <div className={'flex h-11 shrink-0 items-center rounded-2xl bg-card p-1'}>
                        {sources.map((key) => (
                            <button
                                key={key}
                                type={'button'}
                                onClick={() => setSource(key)}
                                aria-pressed={source === key}
                                className={cn(
                                    'flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium transition-colors',
                                    source === key ? 'bg-accent/15 text-ink' : 'text-ink-muted hover:text-ink'
                                )}
                            >
                                <img
                                    src={SOURCE_META[key].logo}
                                    alt={''}
                                    aria-hidden={'true'}
                                    className={cn(
                                        'h-4 w-4 shrink-0 rounded-sm object-contain transition-opacity',
                                        source === key ? 'opacity-100' : 'opacity-60'
                                    )}
                                    onError={(event) => {
                                        event.currentTarget.style.display = 'none';
                                    }}
                                />
                                {SOURCE_META[key].label}
                            </button>
                        ))}
                    </div>
                )}

                <div className={'min-w-[12rem] flex-1'}>
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('modpacks.searchIn', { source: SOURCE_META[source].label })}
                        icon={<Search className={'h-4 w-4'} />}
                    />
                </div>

                {showLoaders && (
                    <div className={'w-full sm:w-52'}>
                        <Select
                            value={loader}
                            onChange={setLoader}
                            options={[
                                { value: '', label: t('addons.anyLoader') },
                                ...loaders.map((entry) => ({
                                    value: entry,
                                    label:
                                        source === 'curseforge' && !CURSEFORGE_LOADERS.includes(entry)
                                            ? t('addons.modrinthOnly', { loader: loaderLabel(entry) })
                                            : loaderLabel(entry),
                                })),
                            ]}
                        />
                    </div>
                )}

                <div className={'w-full sm:w-40'}>
                    <Select
                        value={version}
                        onChange={setVersion}
                        options={[
                            { value: '', label: t('addons.anyVersion') },
                            ...gameVersions.map((entry) => ({ value: entry, label: entry })),
                        ]}
                    />
                </div>
            </div>

            {loading ? (
                <div className={tiles ? TILE_GRID : ROW_GRID}>
                    {Array.from({ length: tiles ? 6 : 5 }).map((_, index) => (
                        <Skeleton key={index} className={cn('rounded-2xl', tiles ? 'h-[132px]' : 'h-[74px]')} />
                    ))}
                </div>
            ) : hits.length === 0 ? (
                <SectionEmpty
                    icon={Search}
                    title={t('modpacks.emptyTitle')}
                    body={results?.error ?? (version || loader ? t('addons.noMatchFiltered') : t('modpacks.emptyBody'))}
                />
            ) : (
                <>
                    <div className={tiles ? TILE_GRID : ROW_GRID}>
                        {hits.map((result) => (
                            <ResultCard
                                key={`${result.source}:${result.id}`}
                                result={result}
                                tiles={tiles}
                                installing={installing === result.id}
                                onVersions={() => setVersionsFor(result)}
                            />
                        ))}
                    </div>

                    <Pagination page={page} pages={pages} hasMore={hasMore} onPage={setPage} />
                </>
            )}
        </div>
    );
}

export function resultGrid(tiles: boolean): string {
    return tiles ? TILE_GRID : ROW_GRID;
}

export function ResultCard({
    result,
    tiles,
    installing,
    onVersions,
    badge,
    fallbackIcon: Fallback = Blocks,
}: {
    result: Omit<SearchResult, 'source'>;
    tiles: boolean;
    installing: boolean;
    onVersions: () => void;
    badge?: string;
    fallbackIcon?: LucideIcon;
}) {
    const t = useT();

    const icon = result.icon ? (
        <img
            src={result.icon}
            alt={''}
            loading={'lazy'}
            className={cn('shrink-0 rounded-xl object-cover', tiles ? 'h-12 w-12' : 'h-10 w-10')}
        />
    ) : (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-xl bg-overlay/60 text-ink-faint',
                tiles ? 'h-12 w-12' : 'h-10 w-10'
            )}
        >
            <Fallback className={tiles ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden={'true'} />
        </span>
    );

    const title = (
        <div className={'flex min-w-0 items-center gap-1.5'}>
            <p className={cn('truncate font-medium text-ink', tiles ? 'text-[15px]' : 'text-sm')}>{result.name}</p>

            <a
                href={result.url}
                target={'_blank'}
                rel={'noreferrer noopener'}
                aria-label={t('common.openInNewTab', { name: result.name })}
                className={'shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-raised hover:text-ink'}
            >
                <ExternalLink className={'h-3.5 w-3.5'} aria-hidden={'true'} />
            </a>

            {badge && (
                <span className={'shrink-0'}>
                    <Badge tone={'neutral'}>{badge}</Badge>
                </span>
            )}

            {result.reason && (
                <span className={'shrink-0'}>
                    <Badge tone={'warning'}>{result.reason}</Badge>
                </span>
            )}
        </div>
    );

    const author = result.author ? (
        <p className={cn('mt-0.5 truncate text-ink-faint', tiles ? 'text-xs' : 'text-[11px]')}>
            {t('addons.author')}{' '}
            {result.authorUrl ? (
                <a
                    href={result.authorUrl}
                    target={'_blank'}
                    rel={'noreferrer noopener'}
                    className={'text-ink-muted underline underline-offset-2 transition-colors hover:text-ink'}
                >
                    {result.author}
                </a>
            ) : (
                <span className={'text-ink-muted underline underline-offset-2'}>{result.author}</span>
            )}
        </p>
    ) : null;

    const description = (
        <p
            className={cn(
                'text-ink-faint',
                tiles ? 'mt-3 line-clamp-3 text-[13px] leading-relaxed' : 'mt-0.5 truncate text-xs'
            )}
            title={result.description}
        >
            {result.description}
        </p>
    );

    const stats = (
        <p
            className={cn(
                'flex flex-wrap items-center gap-x-1.5 text-ink-faint',
                tiles ? 'text-xs' : 'mt-0.5 text-[11px]'
            )}
        >
            <span
                className={'inline-flex items-center gap-1'}
                title={t('addons.downloads', { total: count(result.downloads) })}
            >
                <Download className={'h-3 w-3 shrink-0'} aria-hidden={'true'} />
                {count(result.downloads)}
            </span>

            {typeof result.stars === 'number' && result.stars > 0 && (
                <>
                    <span aria-hidden={'true'}>{'·'}</span>
                    <span
                        className={'inline-flex items-center gap-1'}
                        title={t('addons.stars', { total: count(result.stars) })}
                    >
                        <Star className={'h-3 w-3 shrink-0'} aria-hidden={'true'} />
                        {count(result.stars)}
                    </span>
                </>
            )}

            {result.updatedAt && (
                <>
                    <span aria-hidden={'true'}>{'·'}</span>
                    <span>{t('addons.updated', { when: formatRelative(result.updatedAt) })}</span>
                </>
            )}
        </p>
    );

    const actions = result.installable ? (
        <Button
            size={'sm'}
            variant={'primary'}
            loading={installing}
            onClick={onVersions}
            icon={<History className={'h-3.5 w-3.5'} />}
            className={'ml-auto shrink-0'}
        >
            {t('addons.versions')}
        </Button>
    ) : null;

    if (tiles) {
        return (
            <div className={'flex h-full flex-col rounded-2xl bg-card p-4'}>
                <div className={'flex min-w-0 items-start gap-3'}>
                    {icon}
                    <div className={'min-w-0 flex-1'}>
                        {title}
                        {author}
                    </div>
                </div>

                {description}

                <div className={'mt-auto flex flex-wrap items-center justify-between gap-2 pt-4'}>
                    {stats}
                    {actions}
                </div>
            </div>
        );
    }

    return (
        <div className={'flex items-center justify-between gap-3 rounded-2xl bg-card p-4'}>
            <div className={'flex min-w-0 flex-1 items-center gap-3'}>
                {icon}
                <div className={'min-w-0 flex-1'}>
                    {title}
                    {author}
                    {description}
                    {stats}
                </div>
            </div>

            {actions}
        </div>
    );
}

export function Pagination({
    page,
    pages,
    hasMore,
    onPage,
}: {
    page: number;
    pages: number | null;
    hasMore: boolean;
    onPage: (page: number) => void;
}) {
    const t = useT();

    if (page === 1 && !hasMore) {
        return null;
    }

    const shown: number[] = [];

    if (pages) {
        const window = new Set<number>([1, pages]);

        for (let entry = page - 1; entry <= page + 1; entry++) {
            if (entry >= 1 && entry <= pages) {
                window.add(entry);
            }
        }

        shown.push(...[...window].sort((first, second) => first - second));
    }

    return (
        <nav aria-label={t('addons.pages')} className={'flex items-center justify-center gap-1 pt-1'}>
            <Button
                size={'sm'}
                variant={'ghost'}
                disabled={page <= 1}
                onClick={() => onPage(page - 1)}
                icon={<ChevronLeft className={'h-3.5 w-3.5'} />}
            >
                {t('common.previousPage')}
            </Button>

            {shown.map((entry, index) => (
                <span key={entry} className={'flex items-center'}>
                    {index > 0 && entry - (shown[index - 1] ?? 0) > 1 && (
                        <span className={'px-1 text-xs text-ink-faint'}>…</span>
                    )}
                    <button
                        type={'button'}
                        onClick={() => onPage(entry)}
                        aria-current={entry === page ? 'page' : undefined}
                        className={cn(
                            'min-w-8 rounded-lg px-2 py-1.5 text-xs transition-colors',
                            entry === page
                                ? 'bg-accent/15 font-semibold text-ink'
                                : 'text-ink-muted hover:bg-raised hover:text-ink'
                        )}
                    >
                        {entry}
                    </button>
                </span>
            ))}

            {!pages && <span className={'px-2 text-xs text-ink-faint'}>{t('addons.page', { page })}</span>}

            <Button
                size={'sm'}
                variant={'ghost'}
                disabled={!hasMore}
                onClick={() => onPage(page + 1)}
                icon={<ChevronRight className={'h-3.5 w-3.5'} />}
            >
                {t('common.next')}
            </Button>
        </nav>
    );
}

export interface PickerVersion {
    id: string;
    label: string;
    detail?: string;
    meta: string;
}

export function VersionPicker({
    addon,
    versions,
    empty,
    installing,
    fallbackIcon: Fallback = Blocks,
    badge,
    filters,
    onInstall,
    onClose,
}: {
    addon: Omit<SearchResult, 'source'> | null;
    versions: PickerVersion[] | null;
    empty: string;
    installing: boolean;
    fallbackIcon?: LucideIcon;
    badge?: string;
    filters?: React.ReactNode;
    onInstall: (versionId: string) => void;
    onClose: () => void;
}) {
    const t = useT();
    const [picked, setPicked] = useState('');

    const ids = versions?.map((entry) => entry.id).join('\n') ?? null;

    useEffect(() => setPicked(versions?.[0]?.id ?? ''), [ids]);

    const chosen = versions?.find((entry) => entry.id === picked) ?? null;

    const title = addon && (
        <span className={'flex min-w-0 items-center gap-3'}>
            {addon.icon ? (
                <img src={addon.icon} alt={''} className={'h-11 w-11 shrink-0 rounded-xl object-cover'} />
            ) : (
                <span
                    className={
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-overlay/60 text-ink-faint'
                    }
                >
                    <Fallback className={'h-5 w-5'} aria-hidden={'true'} />
                </span>
            )}

            <span className={'min-w-0 flex-1'}>
                <span className={'flex min-w-0 items-center gap-1.5'}>
                    <span className={'truncate'}>{addon.name}</span>
                    <a
                        href={addon.url}
                        target={'_blank'}
                        rel={'noreferrer noopener'}
                        aria-label={t('common.openInNewTab', { name: addon.name })}
                        className={
                            'shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-overlay hover:text-ink'
                        }
                    >
                        <ExternalLink className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                    </a>
                    {badge && (
                        <span className={'shrink-0'}>
                            <Badge tone={'neutral'}>{badge}</Badge>
                        </span>
                    )}
                </span>

                {addon.author && (
                    <span className={'mt-0.5 block truncate text-xs font-normal text-ink-faint'}>
                        {t('addons.author')}{' '}
                        {addon.authorUrl ? (
                            <a
                                href={addon.authorUrl}
                                target={'_blank'}
                                rel={'noreferrer noopener'}
                                className={
                                    'text-ink-muted underline underline-offset-2 transition-colors hover:text-ink'
                                }
                            >
                                {addon.author}
                            </a>
                        ) : (
                            <span className={'text-ink-muted'}>{addon.author}</span>
                        )}
                    </span>
                )}
            </span>
        </span>
    );

    return (
        <DialogShell open={addon !== null} onClose={() => !installing && onClose()} title={title} width={'lg'}>
            {addon?.description && (
                <p className={'mt-3 line-clamp-4 text-[13px] leading-relaxed text-ink-faint'}>{addon.description}</p>
            )}

            {addon && (
                <p className={'mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-faint'}>
                    <span
                        className={'inline-flex items-center gap-1'}
                        title={t('addons.downloads', { total: count(addon.downloads) })}
                    >
                        <Download className={'h-3 w-3 shrink-0'} aria-hidden={'true'} />
                        {count(addon.downloads)}
                    </span>

                    {typeof addon.stars === 'number' && addon.stars > 0 && (
                        <>
                            <span aria-hidden={'true'}>{'·'}</span>
                            <span
                                className={'inline-flex items-center gap-1'}
                                title={t('addons.stars', { total: count(addon.stars) })}
                            >
                                <Star className={'h-3 w-3 shrink-0'} aria-hidden={'true'} />
                                {count(addon.stars)}
                            </span>
                        </>
                    )}

                    {addon.updatedAt && (
                        <>
                            <span aria-hidden={'true'}>{'·'}</span>
                            <span>{t('addons.updated', { when: formatRelative(addon.updatedAt) })}</span>
                        </>
                    )}
                </p>
            )}

            {filters && versions !== null && <div className={'mt-4 flex gap-2'}>{filters}</div>}

            <div className={'mt-4'}>
                {versions === null ? (
                    <Skeleton className={'h-11 rounded-2xl'} />
                ) : versions.length === 0 ? (
                    <p className={'py-6 text-center text-xs text-ink-faint'}>{empty}</p>
                ) : (
                    <Select
                        label={t('modpacks.pickVersion')}
                        value={picked}
                        onChange={setPicked}
                        options={versions.map((entry) => ({ value: entry.id, label: entry.label }))}
                    />
                )}
            </div>

            {chosen && (
                <div className={'mt-3 rounded-xl bg-overlay/50 p-3'}>
                    {chosen.detail && <p className={'break-words text-[11px] text-ink-faint'}>{chosen.detail}</p>}
                    <p className={cn('text-[11px] text-ink-faint', chosen.detail && 'mt-0.5')}>{chosen.meta}</p>
                </div>
            )}

            <DialogFooter>
                <Button size={'sm'} variant={'ghost'} onClick={onClose} disabled={installing}>
                    {t('common.cancel')}
                </Button>
                <Button
                    size={'sm'}
                    variant={'primary'}
                    loading={installing}
                    disabled={!chosen}
                    onClick={() => chosen && onInstall(chosen.id)}
                    icon={<Download className={'h-3.5 w-3.5'} />}
                >
                    {t('modpacks.install')}
                </Button>
            </DialogFooter>
        </DialogShell>
    );
}

function VersionsModal({
    uuid,
    kind,
    addon,
    loaders,
    installing,
    onInstall,
    onClose,
}: {
    uuid: string;
    kind: AddonKind;
    addon: SearchResult | null;
    loaders: string[];
    installing: boolean;
    onInstall: (versionId: string, filters: { loader: string; version: string }) => void;
    onClose: () => void;
}) {
    const t = useT();
    const { toast } = useToast();
    const [versions, setVersions] = useState<AddonVersion[] | null>(null);
    const [loader, setLoader] = useState('');
    const [game, setGame] = useState('');

    useEffect(() => {
        if (!addon) {
            setVersions(null);

            return;
        }

        let live = true;

        setVersions(null);

        getAddonVersions(uuid, kind, addon.source, addon.id)
            .then((data) => {
                if (live) {
                    setLoader('');
                    setGame('');
                    setVersions(data);
                }
            })
            .catch((error) => {
                if (live) {
                    setVersions([]);
                    toast(apiMessage(error, t('modpacks.versionsFailed')), { tone: 'error' });
                }
            });

        return () => {
            live = false;
        };
    }, [addon, uuid, kind]);

    const usable = useMemo(() => versions?.filter((entry) => entry.installable) ?? null, [versions]);
    const loaderChoices = useMemo(() => choices(usable ?? [], (entry) => entry.loaders, loaders), [usable, loaders]);
    const byLoader = useMemo(() => usable?.filter((entry) => matches(entry.loaders, loader)) ?? null, [usable, loader]);
    const gameChoices = useMemo(() => choices(byLoader ?? [], (entry) => entry.gameVersions), [byLoader]);
    const chosenGame = gameChoices.includes(game) ? game : '';

    const offered = useMemo(
        () =>
            byLoader
                ?.filter((entry) => matches(entry.gameVersions, chosenGame))
                .map((entry) => {
                    const builtFor = entry.loaders.filter((name) => loaders.includes(name)).map(loaderLabel);

                    return {
                        id: entry.id,
                        label: [entry.name, entry.channel === 'release' ? '' : entry.channel, builtFor.join(', ')]
                            .filter(Boolean)
                            .join(' · '),
                        detail: entry.gameVersions.join(', ') || undefined,
                        meta: [
                            t('addons.downloads', { total: count(entry.downloads) }),
                            entry.size > 0 ? size(entry.size) : '',
                            entry.publishedAt ? new Date(entry.publishedAt).toLocaleDateString() : '',
                        ]
                            .filter(Boolean)
                            .join(' · '),
                    };
                }) ?? null,
        [byLoader, chosenGame, loaders, t]
    );

    const filters =
        loaderChoices.length > 1 || gameChoices.length > 1 ? (
            <>
                {loaderChoices.length > 1 && (
                    <div className={'min-w-0 flex-1'}>
                        <Select
                            value={loader}
                            onChange={setLoader}
                            options={[
                                { value: '', label: t('addons.anyLoader') },
                                ...loaderChoices.map((entry) => ({ value: entry, label: loaderLabel(entry) })),
                            ]}
                        />
                    </div>
                )}

                {gameChoices.length > 1 && (
                    <div className={'min-w-0 flex-1'}>
                        <Select
                            value={chosenGame}
                            onChange={setGame}
                            options={[
                                { value: '', label: t('addons.anyVersion') },
                                ...gameChoices.map((entry) => ({ value: entry, label: entry })),
                            ]}
                        />
                    </div>
                )}
            </>
        ) : undefined;

    return (
        <VersionPicker
            addon={addon}
            versions={offered}
            empty={t(versions?.length === 0 ? 'addons.noVersions' : 'addons.noVersionsFit')}
            installing={installing}
            filters={filters}
            onInstall={(versionId) => onInstall(versionId, { loader, version: chosenGame })}
            onClose={onClose}
        />
    );
}

export function matches(tags: string[], wanted: string): boolean {
    return wanted === '' || tags.length === 0 || tags.includes(wanted);
}

export function choices<T>(entries: T[], tags: (entry: T) => string[], allowed?: string[]): string[] {
    const found = new Set<string>();

    entries.forEach((entry) =>
        tags(entry).forEach((tag) => {
            if (!allowed || allowed.includes(tag)) {
                found.add(tag);
            }
        })
    );

    return [...found].sort(allowed ? (a, b) => loaderLabel(a).localeCompare(loaderLabel(b)) : compareVersions);
}

export function size(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    return `${value.toFixed(1)} ${units[unit]}`;
}

export function count(value: number): string {
    return value >= 1_000_000
        ? `${(value / 1_000_000).toFixed(1)}M`
        : value >= 1000
        ? `${(value / 1000).toFixed(0)}K`
        : value.toLocaleString();
}
