import React, { useEffect, useMemo, useState } from 'react';
import { Boxes, Check, Download, ExternalLink, Search, Terminal, Trash2 } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { Badge, Button, Input, Select, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { cn } from '@/dezerx/lib/cn';
import { clearCache, FiveMPayload, getFiveM, installArtifact, setGameBuild, setTxAdmin } from '@/api/server/fivem';
import { usePermissions } from '@/plugins/usePermissions';
import { useT } from '@/i18n';

const PAGE = 30;

const CARD = 'rounded-2xl bg-card p-4';

const LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-ink-faint';

type Filter = 'all' | 'recommended' | 'latest';

export default function FiveMContainer() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { toast } = useToast();

    const [payload, setPayload] = useState<FiveMPayload | null>(null);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [shown, setShown] = useState(PAGE);
    const [busy, setBusy] = useState<string | null>(null);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [gameBuild, setGameBuildValue] = useState('');
    const [savingGameBuild, setSavingGameBuild] = useState(false);
    const [savingTxAdmin, setSavingTxAdmin] = useState(false);
    const [clearing, setClearing] = useState(false);

    const status = ServerContext.useStoreState((state) => state.status.value);
    const [canDelete] = usePermissions(['file.delete']);

    const load = () =>
        getFiveM(uuid)
            .then((data) => {
                setPayload(data);
                setGameBuildValue(data.gameBuild ?? '');
            })
            .catch((error) => toast(apiMessage(error, t('fivem.readFailed')), { tone: 'error' }));

    useEffect(() => {
        void load();
    }, [uuid]);

    useEffect(() => {
        setShown(PAGE);
    }, [query, filter]);

    const channels = payload?.channels ?? {};

    const marks = useMemo(() => {
        const out: Record<string, string> = {};

        if (channels.recommended) out[channels.recommended] = 'recommended';
        if (channels.latest) out[channels.latest] = 'latest';
        if (channels.critical && !out[channels.critical]) out[channels.critical] = 'critical';

        return out;
    }, [channels.recommended, channels.latest, channels.critical]);

    const builds = useMemo(() => {
        const needle = query.trim();
        const list = payload?.builds ?? [];

        return list.filter((entry) => {
            if (needle !== '' && !entry.build.includes(needle)) {
                return false;
            }

            if (filter === 'recommended') {
                return entry.build === channels.recommended;
            }

            if (filter === 'latest') {
                return entry.build === channels.latest;
            }

            return true;
        });
    }, [payload?.builds, query, filter, channels.recommended, channels.latest]);

    const install = (build: string) =>
        setDialog({
            title: t('fivem.installTitle', { build }),
            body: t('fivem.installBody'),
            confirmLabel: t('modpacks.install'),
            destructive: true,
            onConfirm: async () => {
                setBusy(build);

                try {
                    const { message } = await installArtifact(uuid, build);

                    toast(message, { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('fivem.installFailed')), { tone: 'error' });
                } finally {
                    setBusy(null);
                }
            },
        });

    const toggleTxAdmin = async (enabled: boolean) => {
        setSavingTxAdmin(true);

        try {
            const { txAdmin } = await setTxAdmin(uuid, enabled);

            setPayload((current) => (current === null ? current : { ...current, txAdmin }));
            toast(t(enabled ? 'fivem.txEnabled' : 'fivem.txDisabled'), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('fivem.saveFailed')), { tone: 'error' });
        } finally {
            setSavingTxAdmin(false);
        }
    };

    const saveGameBuild = async () => {
        setSavingGameBuild(true);

        try {
            const { gameBuild: saved } = await setGameBuild(uuid, gameBuild.trim());

            setPayload((current) => (current === null ? current : { ...current, gameBuild: saved }));
            toast(saved === null ? t('fivem.gameBuildCleared') : t('fivem.gameBuildSet', { build: saved }), {
                tone: 'success',
            });
        } catch (error) {
            toast(apiMessage(error, t('fivem.saveFailed')), { tone: 'error' });
        } finally {
            setSavingGameBuild(false);
        }
    };

    const askClearCache = (folders: string[]) =>
        setDialog({
            title: t('fivem.cacheTitle'),
            body: t('fivem.cacheBody', { folders: folders.join(', ') }),
            confirmLabel: t('fivem.cacheClear'),
            destructive: true,
            onConfirm: async () => {
                setClearing(true);

                try {
                    const { cleared } = await clearCache(uuid);

                    setPayload((current) => (current === null ? current : { ...current, cache: [] }));
                    toast(cleared.length === 0 ? t('fivem.cacheAlreadyGone') : t('fivem.cacheCleared'), {
                        tone: 'success',
                    });
                } catch (error) {
                    toast(apiMessage(error, t('fivem.cacheFailed')), { tone: 'error' });

                    throw error;
                } finally {
                    setClearing(false);
                }
            },
        });

    if (payload === null) {
        return (
            <ServerContentBlock title={'FiveM'}>
                <SectionSkeleton label={t('fivem.loading')} />
            </ServerContentBlock>
        );
    }

    return (
        <ServerContentBlock title={'FiveM'}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <div className={'space-y-6'}>
                <div className={'grid gap-4 md:grid-cols-2 xl:grid-cols-4'}>
                    <div className={CARD}>
                        <p className={LABEL}>{t('fivem.installedBuild')}</p>
                        <p className={'mt-2 font-akira text-2xl tracking-tight text-ink'}>
                            {payload.installed ?? t('common.unknown')}
                        </p>
                        <p className={'mt-1 text-xs text-ink-faint'}>
                            {t(payload.installed === null ? 'fivem.installedNone' : 'fivem.installedFromPanel')}
                        </p>
                    </div>

                    <div className={CARD}>
                        <p className={LABEL}>{t('fivem.gameBuild')}</p>
                        <p className={'mt-2 text-xs text-ink-faint'}>
                            {payload.config === null
                                ? t('fivem.noConfig')
                                : t('fivem.configLocation', { file: payload.config })}
                        </p>

                        <div className={'mt-3 flex flex-wrap items-center gap-2'}>
                            <div className={'min-w-[8rem] flex-1'}>
                                <Select
                                    value={gameBuild}
                                    onChange={setGameBuildValue}
                                    options={[
                                        { value: '', label: t('fivem.notSet') },
                                        ...payload.gameBuilds.map((entry) => ({ value: entry, label: entry })),
                                        ...(gameBuild !== '' && !payload.gameBuilds.includes(gameBuild)
                                            ? [{ value: gameBuild, label: t('fivem.inTheFile', { build: gameBuild }) }]
                                            : []),
                                    ]}
                                />
                            </div>

                            <Button
                                size={'sm'}
                                variant={'primary'}
                                loading={savingGameBuild}
                                disabled={payload.config === null}
                                onClick={() => void saveGameBuild()}
                                icon={<Check className={'h-3.5 w-3.5'} />}
                            >
                                {t('common.save')}
                            </Button>
                        </div>

                        <p className={'mt-2 text-[11px] text-ink-faint'}>{t('fivem.restartRequired')}</p>
                    </div>

                    <div className={CARD}>
                        <p className={LABEL}>{'txAdmin'}</p>

                        {!payload.txAdmin.supported ? (
                            <>
                                <p className={'mt-2 text-sm text-ink'}>{t('fivem.txNotFiveM')}</p>
                                <p className={'mt-1 text-xs text-ink-faint'}>{t('fivem.txNotFiveMBody')}</p>
                            </>
                        ) : (
                            <>
                                <button
                                    type={'button'}
                                    role={'switch'}
                                    aria-checked={payload.txAdmin.enabled === true}
                                    disabled={!payload.txAdmin.editable || savingTxAdmin}
                                    onClick={() => void toggleTxAdmin(!payload.txAdmin.enabled)}
                                    className={cn(
                                        'mt-2 flex w-full items-center gap-2.5 rounded-xl bg-overlay/40 px-3 py-2 text-left transition-colors',
                                        'hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60'
                                    )}
                                >
                                    <span className={'min-w-0 flex-1'}>
                                        <span className={'block truncate text-xs font-medium text-ink'}>
                                            {t('fivem.txEnable')}
                                        </span>
                                        <span className={'block truncate text-[10px] text-ink-faint'}>
                                            {payload.txAdmin.variable}
                                        </span>
                                    </span>

                                    <span
                                        aria-hidden={'true'}
                                        className={cn(
                                            'flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
                                            payload.txAdmin.enabled ? 'bg-accent' : 'bg-raised'
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'block h-4 w-4 rounded-full transition-[transform,background-color]',
                                                payload.txAdmin.enabled
                                                    ? 'translate-x-4 bg-accent-ink'
                                                    : 'translate-x-0 bg-white'
                                            )}
                                        />
                                    </span>
                                </button>

                                <p className={'mt-2 truncate text-sm text-ink'}>
                                    {payload.txAdmin.url ?? t('fivem.noAllocation')}
                                </p>
                                <p className={'mt-1 text-xs text-ink-faint'}>
                                    {payload.txAdmin.url !== null
                                        ? t(
                                              payload.txAdmin.portSource === 'variable'
                                                  ? 'fivem.txPortVariable'
                                                  : payload.txAdmin.portSource === 'config'
                                                  ? 'fivem.txPortConfig'
                                                  : 'fivem.txPort',
                                              {
                                                  port: payload.txAdmin.port,
                                                  variable: payload.txAdmin.portVariable ?? '',
                                              }
                                          )
                                        : payload.txAdmin.configured
                                        ? t('fivem.txConfiguredMissing', { port: payload.txAdmin.port })
                                        : t('fivem.txNoAllocation', { port: payload.txAdmin.port })}
                                </p>

                                {!payload.txAdmin.editable && (
                                    <p className={'mt-1 text-[11px] text-warning'}>{t('fivem.txLocked')}</p>
                                )}

                                <div className={'mt-3'}>
                                    <Button
                                        size={'sm'}
                                        variant={'secondary'}
                                        disabled={payload.txAdmin.url === null}
                                        onClick={() => window.open(payload.txAdmin.url ?? '', '_blank', 'noopener')}
                                        icon={<Terminal className={'h-3.5 w-3.5'} />}
                                    >
                                        {t('fivem.openTxAdmin')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>

                    <CacheCard
                        folders={payload.cache ?? []}
                        running={status !== 'offline'}
                        allowed={canDelete}
                        clearing={clearing}
                        onClear={() => askClearCache(payload.cache ?? [])}
                    />
                </div>

                <div className={'space-y-3'}>
                    <SectionHeader title={t('fivem.artifacts')} description={t('fivem.artifactsDescription')} />

                    <div className={'flex flex-wrap items-end gap-3'}>
                        <div className={'flex h-11 shrink-0 items-center rounded-2xl bg-card p-1'}>
                            {(['all', 'recommended', 'latest'] as Filter[]).map((key) => (
                                <button
                                    key={key}
                                    type={'button'}
                                    onClick={() => setFilter(key)}
                                    aria-pressed={filter === key}
                                    className={cn(
                                        'flex h-9 items-center rounded-xl px-3 text-xs font-medium transition-colors',
                                        filter === key ? 'bg-accent/15 text-ink' : 'text-ink-muted hover:text-ink'
                                    )}
                                >
                                    {t(`fivem.filter.${key}`)}
                                </button>
                            ))}
                        </div>

                        <div className={'min-w-[12rem] flex-1'}>
                            <Input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={t('fivem.searchPlaceholder')}
                                icon={<Search className={'h-4 w-4'} />}
                            />
                        </div>
                    </div>

                    {payload.error !== null ? (
                        <SectionEmpty icon={Boxes} title={t('fivem.noBuilds')} body={payload.error} />
                    ) : builds.length === 0 ? (
                        <SectionEmpty icon={Search} title={t('modpacks.emptyTitle')} body={t('fivem.noMatch')} />
                    ) : (
                        <>
                            <div className={'grid grid-cols-[minmax(0,1fr)] gap-2'}>
                                {builds.slice(0, shown).map((entry) => (
                                    <div
                                        key={entry.ref}
                                        className={
                                            'flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4'
                                        }
                                    >
                                        <div className={'min-w-0 flex-1'}>
                                            <div className={'flex min-w-0 items-center gap-2'}>
                                                <p className={'truncate text-sm font-medium text-ink'}>{entry.build}</p>

                                                {marks[entry.build] && (
                                                    <span className={'shrink-0'}>
                                                        <Badge
                                                            tone={
                                                                marks[entry.build] === 'recommended'
                                                                    ? 'success'
                                                                    : marks[entry.build] === 'critical'
                                                                    ? 'warning'
                                                                    : 'neutral'
                                                            }
                                                        >
                                                            {t(`fivem.channel.${marks[entry.build]}`)}
                                                        </Badge>
                                                    </span>
                                                )}

                                                {payload.installed === entry.build && (
                                                    <span className={'shrink-0'}>
                                                        <Badge tone={'neutral'}>{t('fivem.installedBadge')}</Badge>
                                                    </span>
                                                )}
                                            </div>

                                            <p className={'mt-0.5 truncate text-xs text-ink-faint'}>
                                                {entry.published ?? t('fivem.noDate')}
                                            </p>
                                        </div>

                                        <div className={'flex shrink-0 items-center gap-1.5'}>
                                            <a
                                                href={entry.url}
                                                target={'_blank'}
                                                rel={'noreferrer noopener'}
                                                aria-label={t('fivem.downloadYourself', { build: entry.build })}
                                                className={
                                                    'rounded-lg p-2 text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                                                }
                                            >
                                                <ExternalLink className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                            </a>

                                            <Button
                                                size={'sm'}
                                                variant={'primary'}
                                                loading={busy === entry.build}
                                                onClick={() => install(entry.build)}
                                                icon={<Download className={'h-3.5 w-3.5'} />}
                                            >
                                                {t('modpacks.install')}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {shown < builds.length && (
                                <div className={'flex justify-center pt-1'}>
                                    <Button
                                        size={'sm'}
                                        variant={'ghost'}
                                        onClick={() => setShown((current) => current + PAGE)}
                                    >
                                        {t('fivem.showMore', { count: builds.length - shown })}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </ServerContentBlock>
    );
}

function CacheCard({
    folders,
    running,
    allowed,
    clearing,
    onClear,
}: {
    folders: string[];
    running: boolean;
    allowed: boolean;
    clearing: boolean;
    onClear: () => void;
}) {
    const t = useT();
    const empty = folders.length === 0;

    return (
        <div className={cn(CARD, 'flex flex-col')}>
            <p className={LABEL}>{t('fivem.cache')}</p>

            <p className={'mt-2 text-sm text-ink'}>
                {empty ? t('fivem.cacheNone') : t('fivem.cacheFound', { folders: folders.join(', ') })}
            </p>
            <p className={'mt-1 text-xs text-ink-faint'}>{t('fivem.cacheHint')}</p>

            <div className={'mt-auto pt-3'}>
                <Button
                    size={'sm'}
                    variant={'secondary'}
                    loading={clearing}
                    disabled={empty || running || !allowed}
                    onClick={onClear}
                    icon={<Trash2 className={'h-3.5 w-3.5'} />}
                >
                    {t('fivem.cacheClear')}
                </Button>

                {!empty && (running || !allowed) && (
                    <p className={'mt-2 text-[11px] text-warning'}>
                        {t(allowed ? 'fivem.cacheStopFirst' : 'fivem.cacheNoPermission')}
                    </p>
                )}
            </div>
        </div>
    );
}

export { FiveMContainer };
