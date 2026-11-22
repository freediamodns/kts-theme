import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Boxes, Check, ChevronRight, Loader2, Search, TriangleAlert } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { Badge, Button, Checkbox, Input, Skeleton, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import { InstallOptions } from '@/dezerx/components/console/InstallOptions';
import { cn } from '@/dezerx/lib/cn';
import {
    Entry,
    InstalledPayload,
    Platform,
    applyVersion,
    getApplyStatus,
    getBuilds,
    getInstalled,
    getPlatforms,
    getVersions,
} from '@/api/server/version';
import { useT } from '@/i18n';

const LIST = 'max-h-[26rem] space-y-2 overflow-y-auto pr-1';

export default function VersionContainer() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { toast } = useToast();

    const [platforms, setPlatforms] = useState<Platform[] | null>(null);
    const [platform, setPlatform] = useState<string | null>(null);
    const [versions, setVersions] = useState<Entry[] | null>(null);
    const [version, setVersion] = useState<string | null>(null);
    const [builds, setBuilds] = useState<Entry[] | null>(null);
    const [chosen, setChosen] = useState<Entry | null>(null);

    const [stableOnly, setStableOnly] = useState(true);
    const [versionQuery, setVersionQuery] = useState('');
    const [buildQuery, setBuildQuery] = useState('');

    const [applying, setApplying] = useState(false);
    const [wipe, setWipe] = useState(false);
    const [eula, setEula] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);
    const [current, setCurrent] = useState<InstalledPayload | null>(null);

    const inFlight = useRef(new AbortController());
    const poller = useRef<number | null>(null);

    const active = useMemo(() => platforms?.find((entry) => entry.id === platform), [platforms, platform]);

    const grouped = useMemo(() => {
        const groups: { label: string; items: Platform[] }[] = [];

        for (const entry of platforms ?? []) {
            const last = groups[groups.length - 1];

            if (last && last.label === entry.groupLabel) {
                last.items.push(entry);
            } else {
                groups.push({ label: entry.groupLabel, items: [entry] });
            }
        }

        return groups;
    }, [platforms]);

    useEffect(
        () => () => {
            inFlight.current.abort();

            if (poller.current !== null) {
                window.clearTimeout(poller.current);
            }
        },
        []
    );

    useEffect(() => {
        getPlatforms(uuid)
            .then(setPlatforms)
            .catch((error) => {
                setPlatforms([]);
                toast(apiMessage(error, t('version.catalogueFailed')), { tone: 'error' });
            });
    }, [uuid]);

    const loadCurrent = () =>
        getInstalled(uuid)
            .then(setCurrent)
            .catch(() => setCurrent(null));

    useEffect(() => {
        void loadCurrent();
    }, [uuid]);

    useEffect(() => {
        getApplyStatus(uuid)
            .then((status) => {
                if (status.state === 'queued' || status.state === 'stopping' || status.state === 'applying') {
                    setApplying(true);
                    setProgress(status.message);
                    poll();
                }
            })
            .catch(() => undefined);
    }, [uuid]);

    const poll = () => {
        const tick = async () => {
            try {
                const data = await getApplyStatus(uuid);

                if (data.state === 'done' || data.state === 'failed') {
                    setProgress(null);
                    setApplying(false);
                    toast(data.message, { tone: data.state === 'done' ? 'success' : 'error' });

                    if (data.state === 'done') {
                        void loadCurrent();
                    }

                    return;
                }

                setProgress(data.message);
            } catch {
                setProgress((message) => message);
            }

            poller.current = window.setTimeout(() => void tick(), 2500);
        };

        poller.current = window.setTimeout(() => void tick(), 2000);
    };

    useEffect(() => {
        if (platform === null) {
            return;
        }

        const controller = new AbortController();

        setVersions(null);
        setVersionQuery('');

        getVersions(uuid, platform, controller.signal)
            .then(setVersions)
            .catch((error) => {
                if (!axios.isCancel(error)) {
                    setVersions([]);
                    toast(apiMessage(error, t('version.listFailed')), { tone: 'error' });
                }
            });

        return () => controller.abort();
    }, [platform, uuid]);

    useEffect(() => {
        if (platform === null || version === null) {
            return;
        }

        const controller = new AbortController();

        setBuilds(null);
        setBuildQuery('');

        getBuilds(uuid, platform, version, controller.signal)
            .then(setBuilds)
            .catch((error) => {
                if (!axios.isCancel(error)) {
                    setBuilds([]);
                    toast(apiMessage(error, t('version.buildsFailed')), { tone: 'error' });
                }
            });

        return () => controller.abort();
    }, [platform, version, uuid]);

    const step = platform === null ? 'platforms' : version === null ? 'versions' : 'builds';

    const pickPlatform = (id: string) => {
        setPlatform(id);
        setVersion(null);
        setBuilds(null);
    };

    const back = () => (step === 'builds' ? setVersion(null) : setPlatform(null));

    const visibleVersions = useMemo(() => {
        const needle = versionQuery.trim().toLowerCase();

        return (versions ?? []).filter(
            (entry) => (!stableOnly || entry.stable) && (needle === '' || entry.label.toLowerCase().includes(needle))
        );
    }, [versions, stableOnly, versionQuery]);

    const visibleBuilds = useMemo(() => {
        const needle = buildQuery.trim().toLowerCase();

        return (builds ?? []).filter((entry) => needle === '' || entry.label.toLowerCase().includes(needle));
    }, [builds, buildQuery]);

    const installed = current?.installed ?? null;

    const runningIcon = useMemo(
        () => platforms?.find((entry) => entry.id === installed?.platform)?.icon ?? null,
        [platforms, installed?.platform]
    );

    const apply = async () => {
        if (platform === null || version === null || applying) {
            return;
        }

        inFlight.current.abort();

        const controller = new AbortController();

        inFlight.current = controller;
        setApplying(true);

        try {
            const build = chosen?.id || null;

            await applyVersion(uuid, { platform, version, build, wipe, eula }, controller.signal);

            setChosen(null);
            setProgress(t('version.stopping'));
            poll();

            return;
        } catch (error) {
            if (!axios.isCancel(error)) {
                toast(apiMessage(error, t('version.installFailed')), { tone: 'error' });
            }
        }

        if (!controller.signal.aborted) {
            setApplying(false);
        }
    };

    return (
        <ServerContentBlock title={t('version.title')}>
            <div className={'space-y-4'}>
                {installed !== null && <Running payload={current} icon={runningIcon} />}

                {progress !== null && (
                    <div className={'flex items-center gap-3 rounded-2xl bg-card p-4'}>
                        <Loader2 aria-hidden={'true'} className={'h-4 w-4 shrink-0 animate-spin text-accent'} />
                        <p className={'min-w-0 truncate text-sm text-ink'}>{progress}</p>
                    </div>
                )}

                <div className={'space-y-3'}>
                    <Trail
                        platform={active ?? null}
                        version={version}
                        onSoftware={() => setPlatform(null)}
                        onVersions={() => setVersion(null)}
                    />

                    <SectionHeader
                        title={
                            step === 'platforms'
                                ? t('version.software')
                                : step === 'versions'
                                ? t('version.versionsTitle')
                                : t('version.buildsTitle')
                        }
                        description={
                            step === 'platforms'
                                ? t('version.softwareBody')
                                : step === 'versions'
                                ? t('version.versionsBody', { platform: active?.label ?? '' })
                                : t('version.buildsBody', {
                                      platform: active?.label ?? '',
                                      version: version ?? '',
                                  })
                        }
                        action={
                            step === 'platforms' ? undefined : (
                                <Button
                                    size={'sm'}
                                    variant={'ghost'}
                                    onClick={back}
                                    icon={<ArrowLeft className={'h-3.5 w-3.5'} />}
                                >
                                    {t('common.back')}
                                </Button>
                            )
                        }
                    />

                    {step === 'platforms' && (
                        <div className={'space-y-5'}>
                            {platforms === null
                                ? Array.from({ length: 6 }).map((_, index) => (
                                      <Skeleton key={index} className={'h-[76px] rounded-2xl'} />
                                  ))
                                : grouped.map((group) => (
                                      <div key={group.label}>
                                          <p
                                              className={
                                                  'mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint'
                                              }
                                          >
                                              {group.label}
                                          </p>

                                          <div className={'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'}>
                                              {group.items.map((entry) => (
                                                  <PlatformCard
                                                      key={entry.id}
                                                      platform={entry}
                                                      selected={entry.id === platform}
                                                      onSelect={() => pickPlatform(entry.id)}
                                                  />
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                        </div>
                    )}

                    {step === 'versions' && active && (
                        <>
                            <div className={'flex flex-wrap items-center gap-3'}>
                                <div className={'min-w-[12rem] flex-1'}>
                                    <Input
                                        value={versionQuery}
                                        onChange={(event) => setVersionQuery(event.target.value)}
                                        placeholder={t('version.searchVersion')}
                                        icon={<Search className={'h-4 w-4'} />}
                                    />
                                </div>

                                <Checkbox
                                    checked={stableOnly}
                                    onChange={(event) => setStableOnly(event.target.checked)}
                                    label={t('version.stableOnly')}
                                />
                            </div>

                            {versions === null ? (
                                <Loading rows={5} />
                            ) : visibleVersions.length === 0 ? (
                                <SectionEmpty
                                    icon={TriangleAlert}
                                    title={t('version.emptyTitle')}
                                    body={versionQuery === '' ? t('version.emptyBody') : t('version.noMatch')}
                                />
                            ) : (
                                <div className={LIST}>
                                    {visibleVersions.map((entry) => (
                                        <Row
                                            key={entry.id}
                                            icon={active.icon}
                                            label={entry.label}
                                            note={entry.java ? t('version.needsJava', { java: entry.java }) : undefined}
                                            selected={entry.id === version}
                                            installed={
                                                installed?.platform === active.id && installed.version === entry.id
                                            }
                                            experimental={!entry.stable}
                                            onSelect={() => setVersion(entry.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {step === 'builds' && active && version !== null && (
                        <>
                            {builds !== null && builds.length > 0 && (
                                <Input
                                    value={buildQuery}
                                    onChange={(event) => setBuildQuery(event.target.value)}
                                    placeholder={t('version.searchBuild')}
                                    icon={<Search className={'h-4 w-4'} />}
                                />
                            )}

                            {builds === null ? (
                                <Loading rows={4} />
                            ) : builds.length === 0 ? (
                                <div className={'space-y-3'}>
                                    <SectionEmpty
                                        icon={TriangleAlert}
                                        title={t('version.noBuildsTitle')}
                                        body={t('version.noBuildsBody')}
                                    />

                                    <div className={'flex justify-center'}>
                                        <Button
                                            size={'sm'}
                                            loading={applying}
                                            onClick={() =>
                                                setChosen({ id: '', label: t('version.latest'), stable: true })
                                            }
                                        >
                                            {t('version.installLatest')}
                                        </Button>
                                    </div>
                                </div>
                            ) : visibleBuilds.length === 0 ? (
                                <SectionEmpty
                                    icon={Search}
                                    title={t('version.emptyTitle')}
                                    body={t('version.noMatch')}
                                />
                            ) : (
                                <div className={LIST}>
                                    {visibleBuilds.map((entry) => (
                                        <Row
                                            key={entry.id}
                                            icon={active.icon}
                                            label={entry.label}
                                            note={entry.id === builds[0]?.id ? t('version.latest') : undefined}
                                            selected={false}
                                            installed={
                                                installed?.platform === active.id &&
                                                installed.version === version &&
                                                installed.build === entry.id
                                            }
                                            experimental={!entry.stable}
                                            onSelect={() => setChosen(entry)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <InstallOptions
                open={chosen !== null}
                platform={active?.label ?? ''}
                version={version ?? ''}
                build={chosen?.label ?? null}
                busy={applying}
                wipe={wipe}
                eula={eula}
                onWipe={setWipe}
                onEula={setEula}
                onConfirm={() => void apply()}
                onClose={() => setChosen(null)}
            />
        </ServerContentBlock>
    );
}

function Trail({
    platform,
    version,
    onSoftware,
    onVersions,
}: {
    platform: Platform | null;
    version: string | null;
    onSoftware: () => void;
    onVersions: () => void;
}) {
    const t = useT();

    if (platform === null) {
        return null;
    }

    return (
        <nav aria-label={t('version.title')} className={'flex flex-wrap items-center gap-1 text-xs'}>
            <Crumb label={t('version.software')} onClick={onSoftware} />

            <ChevronRight aria-hidden={'true'} className={'h-3.5 w-3.5 shrink-0 text-ink-faint'} />

            {version === null ? (
                <span className={'font-medium text-ink'}>{platform.label}</span>
            ) : (
                <>
                    <Crumb label={platform.label} onClick={onVersions} />
                    <ChevronRight aria-hidden={'true'} className={'h-3.5 w-3.5 shrink-0 text-ink-faint'} />
                    <span className={'font-medium text-ink'}>{version}</span>
                </>
            )}
        </nav>
    );
}

function Crumb({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type={'button'}
            onClick={onClick}
            className={'rounded-md px-1 py-0.5 text-ink-muted transition-colors hover:bg-raised hover:text-ink'}
        >
            {label}
        </button>
    );
}

function Loading({ rows }: { rows: number }) {
    return (
        <div className={'space-y-2'}>
            {Array.from({ length: rows }).map((_, index) => (
                <Skeleton key={index} className={'h-[62px] rounded-2xl'} />
            ))}
        </div>
    );
}

function Running({ payload, icon }: { payload: InstalledPayload | null; icon: string | null }) {
    const t = useT();

    if (payload === null || payload.installed === null) {
        return null;
    }

    const { installed, launch } = payload;
    const build = installed.buildLabel ?? installed.build;

    return (
        <div className={'flex flex-wrap items-center gap-4 rounded-2xl bg-card p-4'}>
            {icon === null ? (
                <span
                    aria-hidden={'true'}
                    className={
                        'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-overlay/60 text-ink-faint'
                    }
                >
                    <Boxes className={'h-8 w-8'} />
                </span>
            ) : (
                <Logo src={icon} className={'h-16 w-16 rounded-2xl'} />
            )}

            <div className={'min-w-0 flex-1'}>
                <p className={'truncate text-base font-semibold tracking-tight text-ink'}>
                    {installed.label === null
                        ? t('version.currentlyRunningPlain')
                        : t('version.currentlyRunning', { platform: installed.label })}
                </p>

                {installed.version !== null && (
                    <p className={'mt-1 truncate text-xs text-ink-muted'}>
                        {t('version.installedVersion', { version: installed.version })}
                    </p>
                )}

                {build !== null && (
                    <p className={'mt-0.5 truncate text-xs text-ink-muted'}>{t('version.installedBuild', { build })}</p>
                )}

                <p className={'mt-1 truncate text-[10px] text-ink-faint'}>
                    {installed.source === 'panel' ? t('version.panelSource') : t('version.filesSource')}
                </p>
            </div>

            <Stat
                label={t('version.startsFrom')}
                value={launch.argfile === null ? launch.jar : '@unix_args.txt'}
                hint={launch.image ?? undefined}
            />
        </div>
    );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className={'min-w-[7rem] rounded-2xl bg-overlay/40 px-3 py-2'}>
            <p className={'text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>{label}</p>
            <p className={'mt-0.5 truncate text-sm font-medium text-ink'} title={value}>
                {value}
            </p>
            {hint && <p className={'mt-0.5 truncate text-[10px] text-ink-faint'}>{hint}</p>}
        </div>
    );
}

const PlatformCard = memo(function PlatformCard({
    platform,
    selected,
    onSelect,
}: {
    platform: Platform;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type={'button'}
            onClick={onSelect}
            aria-pressed={selected}
            title={platform.description}
            className={cn(
                'group relative flex items-center gap-3 rounded-2xl p-3 text-left transition-colors',
                selected ? 'bg-accent' : 'bg-card hover:bg-raised'
            )}
        >
            <Logo src={platform.icon} className={'h-11 w-11 rounded-xl'} />

            <span className={'min-w-0 flex-1'}>
                <span className={'flex items-center gap-1.5'}>
                    <span
                        className={cn('truncate text-sm font-medium', selected ? 'text-ink-inverse' : 'text-ink-muted')}
                    >
                        {platform.label}
                    </span>
                    {platform.deprecated && (
                        <span
                            className={cn(
                                'shrink-0 text-[9px] font-semibold uppercase tracking-wider',
                                selected ? 'text-ink-inverse/80' : 'text-danger'
                            )}
                        >
                            EOL
                        </span>
                    )}
                    {platform.experimental && !platform.deprecated && (
                        <TriangleAlert
                            aria-hidden={'true'}
                            className={cn('h-3 w-3 shrink-0', selected ? 'text-ink-inverse/80' : 'text-warning')}
                        />
                    )}
                </span>
                <span className={cn('block truncate text-[10px]', selected ? 'text-ink-inverse/70' : 'text-ink-faint')}>
                    {platform.versionCount.toLocaleString()} versions · {platform.builds.toLocaleString()} builds
                </span>
            </span>

            {selected && <Check aria-hidden={'true'} className={'h-4 w-4 shrink-0 text-ink-inverse'} />}
        </button>
    );
});

const Row = memo(function Row({
    icon,
    label,
    note,
    selected,
    installed,
    experimental,
    onSelect,
}: {
    icon: string;
    label: string;
    note?: string;
    selected: boolean;
    installed: boolean;
    experimental: boolean;
    onSelect: () => void;
}) {
    const t = useT();

    return (
        <button
            type={'button'}
            onClick={onSelect}
            aria-pressed={selected}
            className={cn(
                'flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors',
                selected ? 'bg-accent' : 'bg-card hover:bg-raised'
            )}
        >
            <Logo src={icon} className={'h-9 w-9 rounded-lg'} />

            <span className={'min-w-0 flex-1'}>
                <span className={cn('block truncate text-sm font-medium', selected ? 'text-ink-inverse' : 'text-ink')}>
                    {label}
                </span>
                {note && (
                    <span
                        className={cn(
                            'block truncate text-[10px]',
                            selected ? 'text-ink-inverse/70' : 'text-ink-faint'
                        )}
                    >
                        {note}
                    </span>
                )}
            </span>

            {installed && (
                <span className={'shrink-0'}>
                    <Badge tone={selected ? 'neutral' : 'success'}>{t('version.installedBadge')}</Badge>
                </span>
            )}

            {experimental && (
                <TriangleAlert
                    aria-label={t('version.experimental')}
                    className={cn('h-3.5 w-3.5 shrink-0', selected ? 'text-ink-inverse/80' : 'text-warning')}
                />
            )}

            {selected && <Check aria-hidden={'true'} className={'h-4 w-4 shrink-0 text-ink-inverse'} />}
        </button>
    );
});

function Logo({ src, className }: { src: string; className: string }) {
    return (
        <img
            src={src}
            alt={''}
            aria-hidden={'true'}
            loading={'lazy'}
            draggable={false}
            className={cn('shrink-0 select-none object-contain', className)}
        />
    );
}
