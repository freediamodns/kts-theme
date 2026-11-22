import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Copy, Server as ServerIcon, SlidersHorizontal } from 'lucide-react';
import { Server } from '@/api/server/getServer';
import { ServerStats } from '@/api/server/getServerResourceUsage';
import { cn } from '@/dezerx/lib/cn';
import { bytesToMb, formatCores, formatSize, formatUsage } from '@/dezerx/lib/format';
import { resolveArt } from '@/dezerx/lib/serverArtwork';
import BlurredIp from '@/dezerx/components/BlurredIp';
import NodeFlag from '@/dezerx/components/NodeFlag';
import { ROW_STAGGER_MAX, ROW_STAGGER_MS, RowDesign, rowAnimation, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { serverHome } from '@/dezerx/lib/serverNav';
import { useCopied } from '@/dezerx/lib/useCopied';
import { useT } from '@/i18n';

export type CardStatus = 'running' | 'offline' | 'starting' | 'installing' | 'suspended' | 'unknown';

const STATUS_DOT: Record<CardStatus, string> = {
    running: 'bg-success',
    offline: 'bg-offline',
    starting: 'bg-warning',
    installing: 'bg-warning',
    suspended: 'bg-danger',
    unknown: 'bg-ink-faint/50 animate-pulse',
};

const STATUS_EDGE: Record<CardStatus, string> = {
    running: '[--edge-color:var(--success)]',
    offline: '[--edge-color:var(--status-offline)]',
    starting: '[--edge-color:var(--warning)]',
    installing: '[--edge-color:var(--warning)]',
    suspended: '[--edge-color:var(--danger)]',
    unknown: '',
};

const STATUS_KEY: Record<CardStatus, string> = {
    running: 'serverCard.running',
    offline: 'serverCard.offline',
    starting: 'serverCard.starting',
    installing: 'serverLayout.installing',
    suspended: 'serverCard.suspended',
    unknown: 'serverCard.checking',
};

const ROW_DESIGNS: Record<RowDesign, { shell: string; body: string; artwork: boolean; stacked: boolean }> = {
    banner: {
        shell: 'edge-fade overflow-hidden rounded-2xl bg-card',
        body: 'flex flex-wrap items-center gap-x-6 gap-y-4 p-4',
        artwork: true,
        stacked: false,
    },
    tile: {
        shell: 'edge-fade overflow-hidden rounded-2xl bg-card',
        body: 'flex flex-col gap-3 p-4',
        artwork: true,
        stacked: true,
    },
};

const CONTAINERS: Record<RowDesign, string> = {
    banner: 'grid gap-4',
    tile: 'grid gap-4 sm:grid-cols-2',
};

export function rowContainer(design: RowDesign): string {
    return CONTAINERS[design] ?? CONTAINERS.banner;
}

export const ROW_CONTAINERS = CONTAINERS;

export function cardStatus(server: Server, live?: ServerStats | null, unreachable = false): CardStatus {
    if (server.status === 'suspended' || live?.isSuspended) {
        return 'suspended';
    }

    if (server.status === 'installing' || server.status === 'restoring_backup' || server.isTransferring) {
        return 'installing';
    }

    switch (live?.status) {
        case 'running':
            return 'running';
        case 'starting':
        case 'stopping':
            return 'starting';
        case 'offline':
            return 'offline';
        default:
            return unreachable ? 'offline' : 'unknown';
    }
}

function Metric({ label, used, limit }: { label: string; used: string; limit: string }) {
    return (
        <div className={'min-w-0'}>
            <dt className={'text-ink-faint'}>{label}</dt>
            <dd className={'mt-0.5 font-medium tabular-nums text-ink'}>
                {used}
                <span className={'text-ink-faint'}>
                    {' / '}
                    {limit}
                </span>
            </dd>
        </div>
    );
}

export default function ServerCard({
    server,
    live,
    unreachable = false,
    design = 'banner',
    index = 0,
}: {
    server: Server;
    live?: ServerStats | null;
    unreachable?: boolean;
    design?: RowDesign;
    index?: number;
}) {
    const t = useT();
    const status = cardStatus(server, live, unreachable);
    const shape = ROW_DESIGNS[design] ?? ROW_DESIGNS.banner;
    const theme = usePanelTheme();
    const [copied, copy] = useCopied();

    const address = useMemo(() => {
        const allocation = server.allocations.find((entry) => entry.isDefault) ?? server.allocations[0];

        return allocation ? `${allocation.alias || allocation.ip}:${allocation.port}` : null;
    }, [server.allocations]);

    const art = shape.artwork && theme['servers.artwork'] ? resolveArt(server, theme) : null;

    const blocked = status === 'suspended' || status === 'installing' || server.isNodeUnderMaintenance;

    const entry = rowAnimation(theme['servers.animation'], design);

    return (
        <article
            style={
                entry === '' ? undefined : { animationDelay: `${Math.min(index, ROW_STAGGER_MAX) * ROW_STAGGER_MS}ms` }
            }
            className={cn('group relative', shape.shell, entry, art !== null && STATUS_EDGE[status])}
        >
            {art && (
                <>
                    <img
                        src={art.image}
                        alt={''}
                        aria-hidden={'true'}
                        loading={'lazy'}
                        decoding={'async'}
                        className={
                            'absolute inset-0 h-full w-full scale-[1.03] object-cover opacity-20 transition-transform duration-500 group-hover:scale-[1.08] [.light_&]:hidden'
                        }
                    />
                    <img
                        src={art.imageLight}
                        alt={''}
                        aria-hidden={'true'}
                        loading={'lazy'}
                        decoding={'async'}
                        className={
                            'absolute inset-0 hidden h-full w-full scale-[1.03] object-cover opacity-70 transition-transform duration-500 group-hover:scale-[1.08] [.light_&]:block'
                        }
                    />
                    <span
                        aria-hidden={'true'}
                        className={
                            'absolute inset-0 bg-gradient-to-t from-card via-card/85 to-card/40 [.light_&]:from-card/70 [.light_&]:via-card/40 [.light_&]:to-transparent'
                        }
                    />
                </>
            )}

            <div className={cn('relative', shape.body)}>
                <div className={'flex min-w-0 flex-1 items-center gap-3'}>
                    <span
                        role={'img'}
                        title={t(STATUS_KEY[status])}
                        aria-label={t('serverCard.statusLabel', { status: t(STATUS_KEY[status]) })}
                        className={cn('h-2.5 w-2.5 shrink-0 rounded-full', STATUS_DOT[status])}
                    />

                    {art?.logo ? (
                        <img
                            src={art.logo}
                            alt={''}
                            aria-hidden={'true'}
                            width={32}
                            height={32}
                            loading={'lazy'}
                            decoding={'async'}
                            className={'h-8 w-8 shrink-0 rounded-lg object-contain'}
                        />
                    ) : (
                        <ServerIcon className={'h-8 w-8 shrink-0 text-ink-faint'} aria-hidden={'true'} />
                    )}

                    <div className={'min-w-0 flex-1'}>
                        <p className={'flex min-w-0 items-center gap-2'}>
                            <span className={'truncate text-sm font-semibold text-ink'}>{server.name}</span>

                            {server.isNodeUnderMaintenance && (
                                <span
                                    className={
                                        'inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-warning'
                                    }
                                >
                                    <AlertTriangle className={'h-2.5 w-2.5'} />
                                    {t('common.maintenance')}
                                </span>
                            )}

                            <NodeFlag node={server.node} className={'ml-auto'} />
                        </p>
                        {address !== null && (
                            <button
                                type={'button'}
                                title={copied ? t('common.copied') : t('serverCard.copyAddress')}
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    copy(address);
                                }}
                                className={
                                    'relative z-10 flex max-w-full items-center gap-1.5  text-xs text-ink-muted transition-colors hover:text-ink'
                                }
                            >
                                <BlurredIp reveal={theme['manager.addressBlur']} className={'truncate'}>
                                    {address}
                                </BlurredIp>
                                {copied ? (
                                    <Check className={'h-3 w-3 shrink-0 text-success'} aria-hidden={'true'} />
                                ) : (
                                    <Copy
                                        className={
                                            'h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60'
                                        }
                                        aria-hidden={'true'}
                                    />
                                )}
                            </button>
                        )}

                        <p className={'truncate text-xs text-ink-faint'}>
                            {server.description ? `${server.description} · ` : ''}
                        </p>
                    </div>
                </div>

                {blocked ? (
                    <p
                        className={cn(
                            'shrink-0 text-xs font-medium',
                            status === 'suspended' ? 'text-danger' : 'text-warning'
                        )}
                    >
                        {server.isNodeUnderMaintenance ? t('conflict.maintenance') : t(STATUS_KEY[status])}
                    </p>
                ) : (
                    <dl
                        className={cn(
                            'grid w-full grid-cols-3 gap-x-4 gap-y-2 text-xs sm:flex sm:shrink-0 sm:items-center sm:gap-6',
                            design !== 'tile' && 'sm:w-auto'
                        )}
                    >
                        <Metric
                            label={t('metrics.memory')}
                            used={live ? formatUsage(bytesToMb(live.memoryUsageInBytes)) : '-'}
                            limit={formatSize(server.limits.memory)}
                        />
                        <Metric
                            label={t('metrics.disk')}
                            used={live ? formatUsage(bytesToMb(live.diskUsageInBytes)) : '-'}
                            limit={formatSize(server.limits.disk)}
                        />
                        <Metric
                            label={t('metrics.cpu')}
                            used={live ? `${live.cpuUsagePercent.toFixed(1)}%` : '-'}
                            limit={formatCores(server.limits.cpu)}
                        />
                    </dl>
                )}

                <Link
                    to={serverHome(server.id, theme['overview.enabled'])}
                    className={cn(
                        'inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-btn px-3.5 text-xs font-semibold tracking-tight text-btn-ink transition-all duration-150 hover:bg-btn/90 active:translate-y-px',
                        shape.stacked ? 'mt-2' : 'sm:w-auto'
                    )}
                >
                    Manage
                    <SlidersHorizontal className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                </Link>
            </div>
        </article>
    );
}

export { ServerCard };
