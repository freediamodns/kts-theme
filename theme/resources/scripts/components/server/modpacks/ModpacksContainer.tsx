import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Boxes, Download, ExternalLink, Loader2, Search, TriangleAlert, X } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { Badge, Button, Checkbox, Input, Notice, Select, Skeleton, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { Pagination, choices, count, loaderLabel, matches, size } from '@/dezerx/components/addons/AddonManager';
import { cn } from '@/dezerx/lib/cn';
import { modpackSources } from '@/dezerx/lib/addons';
import {
    ModpackKind,
    ModpackResult,
    ModpackSearchPayload,
    ModpackSource,
    ModpackStatus,
    ModpackVersion,
    getModpackStatus,
    getModpackVersions,
    installModpack,
    searchModpacks,
} from '@/api/server/addons';
import { useT } from '@/i18n';

const SOURCE_META: Record<ModpackSource, { label: string; logo: string }> = {
    curseforge: { label: 'CurseForge', logo: 'https://www.curseforge.com/favicon.ico' },
    modrinth: { label: 'Modrinth', logo: 'https://modrinth.com/favicon.ico' },
    ftb: { label: 'Feed the Beast', logo: 'https://www.feed-the-beast.com/favicon.ico' },
    atlauncher: { label: 'ATLauncher', logo: 'https://atlauncher.com/favicon.ico' },
    technic: { label: 'Technic', logo: 'https://www.technicpack.net/favicon.ico' },
};

const KIND_NOTE: Record<ModpackKind, string | null> = {
    'server-zip': null,
    installer: 'modpacks.kindInstaller',
    mrpack: 'modpacks.kindManifest',
    none: 'modpacks.kindNone',
};

const PER_PAGE = 20;

const LOADERS = ['forge', 'neoforge', 'fabric', 'quilt'];

export default function ModpacksContainer() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { toast } = useToast();

    const sources = useMemo(() => modpackSources() as ModpackSource[], []);

    const [source, setSource] = useState<ModpackSource>(sources[0] ?? 'modrinth');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [payload, setPayload] = useState<ModpackSearchPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState<string | null>(null);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [versionsFor, setVersionsFor] = useState<ModpackResult | null>(null);
    const [progress, setProgress] = useState<ModpackStatus | null>(null);

    const run = useRef(0);
    const poller = useRef<number | null>(null);

    const poll = () => {
        const tick = async () => {
            try {
                const data = await getModpackStatus(uuid);

                if (data.state === 'done' || data.state === 'failed') {
                    setProgress(null);
                    toast(data.message, { tone: data.state === 'done' ? 'success' : 'error' });

                    return;
                }

                setProgress(data);
            } catch {}

            poller.current = window.setTimeout(() => void tick(), 3000);
        };

        poller.current = window.setTimeout(() => void tick(), 2000);
    };

    useEffect(() => {
        getModpackStatus(uuid)
            .then((status) => {
                if (['stopping', 'downloading', 'installing'].includes(status.state)) {
                    setProgress(status);
                    poll();
                }
            })
            .catch(() => undefined);

        return () => {
            if (poller.current !== null) {
                window.clearTimeout(poller.current);
            }
        };
    }, [uuid]);

    useEffect(() => {
        setPage(1);
    }, [source, query]);

    useEffect(() => {
        const id = ++run.current;

        const timer = window.setTimeout(() => {
            setLoading(true);

            searchModpacks(uuid, { source, query, page })
                .then((data) => {
                    if (run.current === id) {
                        setPayload(data);
                    }
                })
                .catch((error) => {
                    if (run.current === id) {
                        setPayload(null);
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
    }, [source, query, page, uuid]);

    const confirmInstall = (pack: ModpackResult, versionId?: string, wipe = false) =>
        setDialog({
            title: t(wipe ? 'modpacks.wipeInstallTitle' : 'modpacks.installTitle', { name: pack.name }),
            body: t(wipe ? 'modpacks.wipeInstallBody' : 'modpacks.installBody'),
            confirmLabel: t(wipe ? 'modpacks.wipeConfirm' : 'modpacks.install'),
            destructive: true,
            onConfirm: async () => {
                setInstalling(pack.id);

                try {
                    const data = await installModpack(uuid, pack.source, pack.id, versionId, wipe);
                    setVersionsFor(null);
                    toast(data.message ?? t('modpacks.installed', { name: pack.name }), { tone: 'success' });
                    setProgress({ state: 'stopping', message: t('modpacks.stopping') });
                    poll();
                } catch (error) {
                    toast(apiMessage(error, t('modpacks.installFailed')), { tone: 'error' });

                    throw error;
                } finally {
                    setInstalling(null);
                }
            },
        });

    const results = payload?.results ?? [];
    const maxPage = payload?.maxPage ?? Number.POSITIVE_INFINITY;
    const pages = payload?.total != null ? Math.min(Math.max(1, Math.ceil(payload.total / PER_PAGE)), maxPage) : null;
    const hasMore = (payload?.hasMore ?? false) && page < maxPage;

    return (
        <ServerContentBlock title={t('modpacks.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <VersionsModal
                uuid={uuid}
                pack={versionsFor}
                busy={installing !== null}
                onInstall={(versionId, wipe) => {
                    if (versionsFor) {
                        confirmInstall(versionsFor, versionId, wipe);
                    }
                }}
                onClose={() => setVersionsFor(null)}
            />

            <div className={'space-y-3'}>
                <SectionHeader title={t('modpacks.title')} description={t('modpacks.description')} />

                {progress === null ? (
                    <Notice tone={'warning'} title={t('modpacks.noticeTitle')}>
                        {t('modpacks.noticeBody')}
                    </Notice>
                ) : (
                    <div className={'flex items-center gap-3 rounded-2xl bg-card p-4'}>
                        <Loader2 aria-hidden={'true'} className={'h-4 w-4 shrink-0 animate-spin text-accent'} />
                        <div className={'min-w-0'}>
                            <p className={'text-sm font-medium text-ink'}>{t('modpacks.installing')}</p>
                            <p className={'mt-0.5 truncate text-xs text-ink-faint'}>{progress.message}</p>
                        </div>
                    </div>
                )}

                <div className={'flex flex-wrap items-end gap-3'}>
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

                    <div className={'min-w-[12rem] flex-1'}>
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t('modpacks.searchIn', { source: SOURCE_META[source].label })}
                            icon={<Search className={'h-4 w-4'} />}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className={'grid grid-cols-[minmax(0,1fr)] gap-2'}>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton key={index} className={'h-[74px] rounded-2xl'} />
                        ))}
                    </div>
                ) : results.length === 0 ? (
                    <SectionEmpty icon={Search} title={t('modpacks.emptyTitle')} body={t('modpacks.emptyBody')} />
                ) : (
                    <>
                        <div className={'grid grid-cols-[minmax(0,1fr)] gap-2'}>
                            {results.map((pack) => (
                                <div
                                    key={`${pack.source}:${pack.id}`}
                                    className={
                                        'flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4'
                                    }
                                >
                                    <div className={'flex min-w-0 flex-1 items-center gap-3'}>
                                        {pack.icon ? (
                                            <img
                                                src={pack.icon}
                                                alt={''}
                                                loading={'lazy'}
                                                className={'h-10 w-10 shrink-0 rounded-xl object-cover'}
                                                onError={(event) => {
                                                    event.currentTarget.style.visibility = 'hidden';
                                                }}
                                            />
                                        ) : (
                                            <span
                                                className={
                                                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-overlay/60 text-ink-faint'
                                                }
                                            >
                                                <Boxes className={'h-5 w-5'} aria-hidden={'true'} />
                                            </span>
                                        )}

                                        <div className={'min-w-0 flex-1'}>
                                            <div className={'flex min-w-0 items-center gap-2'}>
                                                <p className={'truncate text-sm font-medium text-ink'}>{pack.name}</p>
                                                {KIND_NOTE[pack.kind] && (
                                                    <span className={'shrink-0'}>
                                                        <Badge tone={'warning'}>{t(KIND_NOTE[pack.kind]!)}</Badge>
                                                    </span>
                                                )}
                                            </div>
                                            <p
                                                className={'mt-0.5 truncate text-xs text-ink-faint'}
                                                title={pack.description}
                                            >
                                                {pack.description}
                                            </p>
                                            <p className={'mt-0.5 text-[11px] text-ink-faint'}>
                                                {pack.downloads > 0 &&
                                                    t('modpacks.installs', { total: count(pack.downloads) })}
                                                {pack.author && `${pack.downloads > 0 ? ' · ' : ''}${pack.author}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={'flex shrink-0 items-center gap-1.5'}>
                                        <a
                                            href={pack.url}
                                            target={'_blank'}
                                            rel={'noreferrer noopener'}
                                            aria-label={t('common.openInNewTab', { name: pack.name })}
                                            className={
                                                'rounded-lg p-2 text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                                            }
                                        >
                                            <ExternalLink className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                        </a>

                                        {pack.installable && (
                                            <Button
                                                size={'sm'}
                                                variant={'primary'}
                                                loading={installing === pack.id}
                                                onClick={() => setVersionsFor(pack)}
                                                icon={<Download className={'h-3.5 w-3.5'} />}
                                            >
                                                {t('modpacks.install')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Pagination page={page} pages={pages} hasMore={hasMore} onPage={setPage} />
                    </>
                )}
            </div>
        </ServerContentBlock>
    );
}

function VersionsModal({
    uuid,
    pack,
    busy,
    onInstall,
    onClose,
}: {
    uuid: string;
    pack: ModpackResult | null;
    busy: boolean;
    onInstall: (versionId: string, wipe: boolean) => void;
    onClose: () => void;
}) {
    const t = useT();
    const { toast } = useToast();
    const [versions, setVersions] = useState<ModpackVersion[] | null>(null);
    const [wipe, setWipe] = useState(false);
    const [loader, setLoader] = useState('');
    const [game, setGame] = useState('');

    useEffect(() => {
        setLoader('');
        setGame('');

        if (!pack) {
            setVersions(null);
            setWipe(false);

            return;
        }

        let live = true;

        getModpackVersions(uuid, pack.source, pack.id)
            .then((data) => {
                if (live) {
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
    }, [pack, uuid]);

    const loaderChoices = useMemo(() => choices(versions ?? [], (entry) => entry.loaders, LOADERS), [versions]);
    const byLoader = useMemo(
        () => versions?.filter((entry) => matches(entry.loaders, loader)) ?? [],
        [versions, loader]
    );
    const gameChoices = useMemo(() => choices(byLoader, (entry) => entry.gameVersions), [byLoader]);
    const chosenGame = gameChoices.includes(game) ? game : '';
    const shown = byLoader.filter((entry) => matches(entry.gameVersions, chosenGame));

    return (
        <Dialog open={pack !== null} onClose={onClose} className={'relative z-[55]'}>
            <div className={'fixed inset-0 bg-black/50 backdrop-blur-sm'} aria-hidden={'true'} />

            <div className={'fixed inset-0 flex items-center justify-center p-4'}>
                <Dialog.Panel
                    className={
                        'flex h-[34rem] max-h-full w-[36rem] max-w-full flex-col overflow-hidden rounded-2xl dz-on-raised bg-raised shadow-panel ring-1 ring-line-field'
                    }
                >
                    <div className={'flex items-start justify-between gap-3 p-4'}>
                        <div className={'min-w-0'}>
                            <Dialog.Title className={'truncate text-sm font-medium text-ink'}>
                                {pack?.name}
                            </Dialog.Title>
                            <p className={'mt-0.5 text-xs text-ink-faint'}>{t('modpacks.pickVersion')}</p>
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

                    <div
                        className={cn(
                            'mx-4 mb-3 rounded-xl p-3 transition-colors',
                            wipe ? 'bg-danger/10' : 'bg-overlay/50'
                        )}
                    >
                        <Checkbox
                            checked={wipe}
                            onChange={(event) => setWipe(event.target.checked)}
                            label={
                                <>
                                    <span className={'flex items-center gap-1.5 text-xs font-medium text-ink'}>
                                        {wipe && (
                                            <TriangleAlert
                                                className={'h-3.5 w-3.5 shrink-0 text-danger'}
                                                aria-hidden={'true'}
                                            />
                                        )}
                                        {t('modpacks.wipeLabel')}
                                    </span>
                                    <span className={'mt-0.5 block text-[11px] text-ink-faint'}>
                                        {t('modpacks.wipeHint')}
                                    </span>
                                </>
                            }
                        />
                    </div>

                    {(loaderChoices.length > 1 || gameChoices.length > 1) && (
                        <div className={'mx-4 mb-3 flex gap-2'}>
                            {loaderChoices.length > 1 && (
                                <div className={'min-w-0 flex-1'}>
                                    <Select
                                        value={loader}
                                        onChange={setLoader}
                                        options={[
                                            { value: '', label: t('addons.anyLoader') },
                                            ...loaderChoices.map((entry) => ({
                                                value: entry,
                                                label: loaderLabel(entry),
                                            })),
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
                        </div>
                    )}

                    <div className={'min-h-0 flex-1 overflow-y-auto px-4 pb-4'}>
                        {versions === null ? (
                            <div className={'space-y-2'}>
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <Skeleton key={index} className={'h-14 rounded-xl'} />
                                ))}
                            </div>
                        ) : versions.length === 0 ? (
                            <p className={'py-6 text-center text-xs text-ink-faint'}>{t('modpacks.noVersions')}</p>
                        ) : shown.length === 0 ? (
                            <p className={'py-6 text-center text-xs text-ink-faint'}>{t('addons.noMatchFiltered')}</p>
                        ) : (
                            <div className={'space-y-2'}>
                                {shown.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className={
                                            'flex items-center justify-between gap-3 rounded-xl bg-overlay/50 p-3'
                                        }
                                    >
                                        <div className={'min-w-0 flex-1'}>
                                            <p className={'truncate text-xs font-medium text-ink'}>{entry.name}</p>
                                            <p className={'mt-0.5 truncate text-[11px] text-ink-faint'}>
                                                {[
                                                    entry.loaders.map(loaderLabel).join(', '),
                                                    entry.gameVersions.join(', '),
                                                    entry.size > 0 ? size(entry.size) : '',
                                                    entry.publishedAt
                                                        ? new Date(entry.publishedAt).toLocaleDateString()
                                                        : '',
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </p>
                                        </div>

                                        <Button
                                            size={'sm'}
                                            variant={wipe ? 'danger' : 'ghost'}
                                            disabled={busy}
                                            onClick={() => onInstall(entry.id, wipe)}
                                            icon={<Download className={'h-3.5 w-3.5'} />}
                                            className={'shrink-0'}
                                        >
                                            {t(wipe ? 'modpacks.wipeInstall' : 'modpacks.install')}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
