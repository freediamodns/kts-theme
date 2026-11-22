import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import {
    Check,
    Clock,
    Copy,
    Cpu,
    CreditCard,
    ExternalLink,
    HardDrive,
    MemoryStick,
    Network,
    ServerCog,
} from 'lucide-react';
import { ServerContext } from '@/state/server';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ip } from '@/lib/formatters';
import { billingAvailable, billingLink, billingNotices, readBillingInfo, type BillingInfo } from '@/api/server/billing';
import { DUE_ACTION, DUE_LABEL, dueNotice } from '@/dezerx/lib/billingNotice';
import { Badge, Button, Notice, Skeleton } from '@/dezerx/components/ui';
import { PowerControls, ServerAddress, StatusBadge } from '@/dezerx/components/console/ServerHeader';
import { NetworkTile, ResourceChart, StatTile } from '@/dezerx/components/console/Metrics';
import NodeFlag from '@/dezerx/components/NodeFlag';
import { useServerStats } from '@/dezerx/components/console/stats';
import { cn } from '@/dezerx/lib/cn';
import { formatCores, formatRate, formatSize } from '@/dezerx/lib/format';
import { resolveArt } from '@/dezerx/lib/serverArtwork';
import { useCopied } from '@/dezerx/lib/useCopied';
import { usePanelTheme, type OverviewBlock, type OverviewWidth } from '@/dezerx/lib/panelTheme';
import { useT, type TranslateFn } from '@/i18n';

interface InfoRow {
    label: string;
    value: ReactNode;
}

const DUE_FORMAT_KEY = 'dezerx.overview.dueRelative';

function usage(megabytes: number): string {
    return megabytes >= 1024 ? `${(megabytes / 1024).toFixed(2)} GB` : `${Math.round(megabytes)} MB`;
}

function uptimeLabel(milliseconds: number, t: TranslateFn): string {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
        return t('overview.notRunning');
    }

    const total = Math.floor(milliseconds / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    if (days > 0) {
        return `${days}${t('format.days')} ${hours}${t('format.hours')} ${minutes}${t('format.minutes')}`;
    }

    if (hours > 0) {
        return `${hours}${t('format.hours')} ${minutes}${t('format.minutes')}`;
    }

    return `${minutes}${t('format.minutes')} ${total % 60}${t('format.seconds')}`;
}

function money(amount: string, currency: string | null): string {
    if (currency === null || currency === '') {
        return amount;
    }

    return /^[A-Za-z]{2,}$/.test(currency) ? `${amount} ${currency}` : `${currency}${amount}`;
}

function dueLabel(date: Date, relative: boolean, t: TranslateFn): string {
    if (!relative) {
        return date.toLocaleDateString();
    }

    const days = Math.round((date.getTime() - Date.now()) / 86400000);

    if (days === 0) {
        return t('overview.dueToday');
    }

    return days > 0 ? t('overview.dueIn', { count: days }) : t('overview.overdueBy', { count: Math.abs(days) });
}

const SPANS: Record<OverviewWidth, string> = {
    full: 'lg:col-span-12',
    half: 'lg:col-span-6',
    third: 'lg:col-span-6 xl:col-span-4',
};

export default function OverviewContainer() {
    const t = useT();
    const theme = usePanelTheme();

    const blocks = theme['overview.blocks'].filter(
        (block) => block.enabled && (block.kind !== 'billing' || billingAvailable())
    );

    const billingBlock = blocks.find((block) => block.kind === 'billing');

    return (
        <ServerContentBlock title={t('overview.title')} className={'space-y-4 sm:space-y-6'}>
            {billingBlock && !billingBlock.hidden.includes('notices') && <BillingNotices />}

            <div className={'grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12'}>
                {blocks.map((block) => (
                    <div key={block.id} className={cn('flex min-w-0 flex-col [&>*]:flex-1', SPANS[block.width])}>
                        <Block block={block} />
                    </div>
                ))}
            </div>
        </ServerContentBlock>
    );
}

function Block({ block }: { block: OverviewBlock }) {
    switch (block.kind) {
        case 'banner':
            return <Hero hidden={block.hidden} />;
        case 'metrics':
            return <Metrics wide={block.width === 'full'} hidden={block.hidden} />;
        case 'info':
            return <ServerInfo hidden={block.hidden} />;
        case 'billing':
            return <Billing hidden={block.hidden} />;
        case 'chart':
            return <ChartBlock block={block} />;
        case 'doughnut':
            return <DoughnutBlock block={block} />;
        default:
            return null;
    }
}

function ChartBlock({ block }: { block: OverviewBlock }) {
    const t = useT();
    const { samples } = useServerStats();
    const limits = ServerContext.useStoreState((state) => state.server.data!.limits);

    const series = useMemo(() => {
        if (block.metric === 'network') {
            return [
                { label: t('metrics.inbound'), values: samples.map((sample) => sample.rxBps), color: 'var(--chart-1)' },
                {
                    label: t('metrics.outbound'),
                    values: samples.map((sample) => sample.txBps),
                    color: 'var(--chart-2)',
                },
            ];
        }

        const label = t(`metrics.${block.metric}`);
        const values = samples.map((sample) => (block.metric === 'memory' ? sample.memoryMb : sample.cpu));

        return [{ label, values, color: 'var(--chart-1)' }];
    }, [samples, block.metric, t]);

    if (block.metric === 'network') {
        return (
            <ResourceChart
                icon={Network}
                label={t('metrics.network')}
                series={series}
                format={formatRate}
                variant={block.style}
            />
        );
    }

    const memory = block.metric === 'memory';

    return (
        <ResourceChart
            icon={memory ? MemoryStick : Cpu}
            label={t(memory ? 'metrics.memory' : 'metrics.cpu')}
            series={series}
            ceiling={(memory ? limits.memory : limits.cpu) || undefined}
            format={memory ? usage : (value) => `${value.toFixed(1)}%`}
            footnote={t('metrics.ofLimit', {
                limit: memory ? formatSize(limits.memory) : formatCores(limits.cpu),
            })}
            variant={block.style}
        />
    );
}

const RING = 2 * Math.PI * 50;

function DoughnutBlock({ block }: { block: OverviewBlock }) {
    const t = useT();
    const { latest } = useServerStats();
    const limits = ServerContext.useStoreState((state) => state.server.data!.limits);

    const metric = block.metric === 'memory' || block.metric === 'cpu' ? block.metric : 'disk';

    const used =
        latest === null ? null : metric === 'disk' ? latest.diskMb : metric === 'memory' ? latest.memoryMb : latest.cpu;
    const limit = metric === 'disk' ? limits.disk : metric === 'memory' ? limits.memory : limits.cpu;

    const format = (value: number) => (metric === 'cpu' ? `${value.toFixed(1)}%` : usage(value));
    const limitLabel =
        limit > 0 ? (metric === 'cpu' ? formatCores(limit) : formatSize(limit)) : t('overview.unlimited');

    const ratio = used !== null && limit > 0 ? Math.min(used / limit, 1) : null;
    const level = ratio === null ? 'ok' : ratio >= 0.9 ? 'full' : ratio >= 0.75 ? 'filling' : 'ok';
    const tone = level === 'full' ? 'text-danger' : level === 'filling' ? '' : 'text-accent';
    const toneStyle = level === 'filling' ? { color: 'rgb(249 115 22)' } : undefined;

    const Icon = metric === 'disk' ? HardDrive : metric === 'memory' ? MemoryStick : Cpu;

    const rows: InfoRow[] = [
        { label: t('overview.used'), value: used === null ? '—' : format(used) },
        ...(limit > 0 && used !== null
            ? [{ label: t('overview.remaining'), value: format(Math.max(limit - used, 0)) }]
            : []),
        { label: t('overview.limit'), value: limitLabel },
    ];

    return (
        <div className={'flex flex-col rounded-2xl bg-card p-4'}>
            <div className={'flex items-center gap-1.5 text-ink-faint'}>
                <Icon className={'h-3.5 w-3.5 shrink-0'} aria-hidden={'true'} />
                <p className={'truncate text-[11px] font-medium tracking-tight'}>
                    {t('overview.usageOf', { metric: t(`metrics.${metric}`) })}
                </p>
            </div>

            <div className={'flex flex-1 flex-wrap items-center justify-center gap-x-8 gap-y-4 pt-4'}>
                <div className={cn('relative shrink-0', block.width === 'full' ? 'h-40 w-40' : 'h-28 w-28')}>
                    <svg viewBox={'0 0 120 120'} className={'h-full w-full -rotate-90'} aria-hidden={'true'}>
                        <circle
                            cx={'60'}
                            cy={'60'}
                            r={'50'}
                            fill={'none'}
                            strokeWidth={'11'}
                            className={'stroke-current text-overlay'}
                        />
                        {ratio !== null && ratio > 0 && (
                            <circle
                                cx={'60'}
                                cy={'60'}
                                r={'50'}
                                fill={'none'}
                                strokeWidth={'11'}
                                strokeLinecap={'round'}
                                strokeDasharray={RING}
                                strokeDashoffset={RING * (1 - ratio)}
                                style={toneStyle}
                                className={cn('stroke-current transition-[stroke-dashoffset] duration-500', tone)}
                            />
                        )}
                    </svg>

                    <div className={'absolute inset-0 flex flex-col items-center justify-center text-center'}>
                        <span
                            style={toneStyle}
                            className={cn(
                                'font-semibold tabular-nums tracking-tight',
                                block.width === 'full' ? 'text-2xl' : 'text-xl',
                                level === 'ok' ? 'text-ink' : tone
                            )}
                        >
                            {ratio !== null ? `${Math.round(ratio * 100)}%` : '∞'}
                        </span>
                        <span className={'mt-0.5 text-[10px] text-ink-faint'}>
                            {used === null
                                ? t('overview.noReading')
                                : ratio !== null
                                ? t('overview.used')
                                : t('overview.unlimited')}
                        </span>
                    </div>
                </div>

                <dl className={'min-w-[8rem] flex-1 space-y-2 text-sm'}>
                    {rows.map((row) => (
                        <div key={row.label} className={'flex items-baseline justify-between gap-4'}>
                            <dt className={'text-ink-faint'}>{row.label}</dt>
                            <dd className={'font-medium tabular-nums text-ink'}>{row.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </div>
    );
}

function BillingNotices() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const [info, setInfo] = useState<BillingInfo | null>(null);

    useEffect(() => {
        let active = true;

        readBillingInfo(uuid)
            .then((response) => {
                if (active) {
                    setInfo(response);
                }
            })
            .catch(() => undefined);

        return () => {
            active = false;
        };
    }, [uuid]);

    if (info === null) {
        return null;
    }

    const notice = billingNotices().global ? null : dueNotice(info.renewsAt, t);
    const invoice = info.invoice;

    if (notice === null && invoice === null) {
        return null;
    }

    const dueLink = billingLink(invoice?.url, info.manageUrl);
    const invoiceLink = billingLink(invoice?.url);

    return (
        <>
            {notice && (
                <Notice
                    tone={notice.tone}
                    title={notice.title}
                    action={
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            disabled={dueLink === ''}
                            onClick={() => dueLink !== '' && window.open(dueLink, '_blank', 'noopener')}
                            icon={<ExternalLink className={'h-3.5 w-3.5'} />}
                            className={cn(DUE_ACTION[notice.tone], 'border-0 max-sm:w-full')}
                        >
                            {t(DUE_LABEL[notice.tone])}
                        </Button>
                    }
                >
                    {notice.body}
                </Notice>
            )}

            {invoice && (
                <Notice
                    tone={'warning'}
                    title={t('overview.invoiceDue', { id: invoice.id })}
                    action={
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            disabled={invoiceLink === ''}
                            onClick={() => invoiceLink !== '' && window.open(invoiceLink, '_blank', 'noopener')}
                            icon={<ExternalLink className={'h-3.5 w-3.5'} />}
                            className={cn(DUE_ACTION.warning, 'border-0 max-sm:w-full')}
                        >
                            {t('overview.payInvoice')}
                        </Button>
                    }
                >
                    {[
                        invoice.dueAt ? invoice.dueAt.toLocaleDateString() : null,
                        invoice.amount ? money(invoice.amount, info.price.currency) : null,
                    ]
                        .filter(Boolean)
                        .join(' · ')}
                </Notice>
            )}
        </>
    );
}

function Hero({ hidden }: { hidden: string[] }) {
    const t = useT();
    const theme = usePanelTheme();
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const isInstalling = ServerContext.useStoreState((state) => state.server.isInstalling);

    const suspended = server.status === 'suspended';
    const art = resolveArt(server, theme);
    const show = (part: string) => !hidden.includes(part);

    return (
        <article className={'relative overflow-hidden rounded-2xl bg-card ring-1 ring-line-field'}>
            {show('art') && (
                <>
                    <img
                        src={art.image}
                        alt={''}
                        aria-hidden={'true'}
                        className={'absolute inset-0 h-full w-full object-cover opacity-25 [.light_&]:hidden'}
                    />
                    <img
                        src={art.imageLight}
                        alt={''}
                        aria-hidden={'true'}
                        className={'absolute inset-0 hidden h-full w-full object-cover opacity-70 [.light_&]:block'}
                    />
                    <span
                        aria-hidden={'true'}
                        className={
                            'absolute -inset-px bg-gradient-to-tr from-card via-card/90 to-card/50 [.light_&]:from-card/80 [.light_&]:via-card/50 [.light_&]:to-transparent'
                        }
                    />
                </>
            )}

            <div className={'relative flex flex-col gap-6 p-6 lg:flex-row lg:items-center'}>
                <div className={'flex min-w-0 flex-1 items-center gap-4'}>
                    {art.logo && show('logo') && (
                        <img
                            src={art.logo}
                            alt={''}
                            aria-hidden={'true'}
                            width={56}
                            height={56}
                            className={'h-14 w-14 shrink-0 rounded-2xl object-contain'}
                        />
                    )}

                    <div className={'min-w-0'}>
                        <div className={'flex flex-wrap items-center gap-2.5'}>
                            <h1
                                className={'truncate font-akira text-xl font-black tracking-tight text-ink sm:text-2xl'}
                            >
                                {server.name}
                            </h1>

                            <StatusBadge
                                status={status}
                                suspended={suspended}
                                statusLabel={isInstalling ? t('serverLayout.installing') : undefined}
                            />
                        </div>

                        {server.description !== '' && show('description') && (
                            <p className={'mt-1.5 line-clamp-2 text-sm text-ink-muted'}>{server.description}</p>
                        )}

                        {show('node') && (
                            <p className={'mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-faint'}>
                                <NodeFlag node={server.node} />
                                <span className={'truncate'}>{server.node}</span>
                            </p>
                        )}
                    </div>
                </div>

                {(show('address') || show('power')) && (
                    <div className={'flex flex-wrap items-center gap-3 lg:justify-end'}>
                        {show('address') && <ServerAddress />}
                        {show('power') && <PowerControls disabled={suspended || isInstalling} />}
                    </div>
                )}
            </div>
        </article>
    );
}

const WIDE_TILES: Record<number, string> = { 1: '', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4' };

function Metrics({ wide, hidden }: { wide: boolean; hidden: string[] }) {
    const t = useT();
    const { samples, latest } = useServerStats();
    const limits = ServerContext.useStoreState((state) => state.server.data!.limits);
    const status = ServerContext.useStoreState((state) => state.status.value);

    const live = status !== null && status !== 'offline';
    const graph = hidden.includes('graphs') ? 'none' : 'behind';
    const show = (tile: string) => !hidden.includes(tile);
    const count = ['cpu', 'memory', 'disk', 'network'].filter(show).length;

    if (count === 0) {
        return null;
    }

    const cpuHistory = useMemo(() => samples.map((sample) => sample.cpu), [samples]);
    const memoryHistory = useMemo(() => samples.map((sample) => sample.memoryMb), [samples]);

    return (
        <div className={cn('grid gap-4', count > 1 && 'sm:grid-cols-2', wide && WIDE_TILES[count])}>
            {show('cpu') && (
                <StatTile
                    icon={Cpu}
                    label={t('metrics.cpu')}
                    value={latest ? `${latest.cpu.toFixed(1)}%` : null}
                    limit={t('metrics.ofLimit', { limit: formatCores(limits.cpu) })}
                    history={live ? cpuHistory : undefined}
                    ceiling={limits.cpu}
                    graph={graph}
                />
            )}
            {show('memory') && (
                <StatTile
                    icon={MemoryStick}
                    label={t('metrics.memory')}
                    value={latest ? usage(latest.memoryMb) : null}
                    limit={t('metrics.ofLimit', { limit: formatSize(limits.memory) })}
                    history={live ? memoryHistory : undefined}
                    ceiling={limits.memory}
                    graph={graph}
                />
            )}
            {show('disk') && (
                <StatTile
                    icon={HardDrive}
                    label={t('metrics.disk')}
                    value={latest ? usage(latest.diskMb) : null}
                    limit={t('metrics.ofLimit', { limit: formatSize(limits.disk) })}
                    graph={graph}
                />
            )}
            {show('network') && <NetworkTile samples={live ? samples : []} latest={latest} graph={graph} />}
        </div>
    );
}

function ServerInfo({ hidden }: { hidden: string[] }) {
    const t = useT();
    const { latest } = useServerStats();

    const server = ServerContext.useStoreState((state) => state.server.data!);
    const status = ServerContext.useStoreState((state) => state.status.value);

    const allocation = server.allocations.find((candidate) => candidate.isDefault);
    const suspended = server.status === 'suspended';

    const show = (part: string) => !hidden.includes(part);
    const rows: InfoRow[] = [];

    if (show('status')) {
        rows.push({ label: t('overview.status'), value: <StatusBadge status={status} suspended={suspended} /> });
    }

    if (show('uptime')) {
        rows.push({ label: t('overview.uptime'), value: uptimeLabel(latest?.uptimeMs ?? 0, t) });
    }

    if (allocation && show('hostname')) {
        const address = `${ip(allocation.ip)}:${allocation.port}`;
        const hostname = allocation.alias ? `${allocation.alias}:${allocation.port}` : address;

        rows.push({ label: t('overview.hostname'), value: <Chip mask copyable value={hostname} /> });
    }

    if (show('node')) {
        rows.push({
            label: t('overview.node'),
            value: (
                <span className={'inline-flex items-center gap-1.5'}>
                    <NodeFlag node={server.node} />
                    {server.node}
                </span>
            ),
        });
    }

    if (show('serverId')) {
        rows.push({
            label: t('overview.serverId'),
            value: <Chip mask copyable value={server.uuid.split('-')[0]} />,
        });
    }

    if (rows.length === 0) {
        return null;
    }

    return (
        <Panel icon={ServerCog} title={t('overview.serverInfo')}>
            <Rows rows={rows} />
        </Panel>
    );
}

function Billing({ hidden }: { hidden: string[] }) {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const [info, setInfo] = useState<BillingInfo | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

    const [relative, setRelative] = useState(() => {
        try {
            return window.localStorage.getItem(DUE_FORMAT_KEY) === '1';
        } catch {
            return false;
        }
    });

    const toggleDue = () => {
        setRelative((current) => {
            try {
                window.localStorage.setItem(DUE_FORMAT_KEY, current ? '0' : '1');
            } catch {}

            return !current;
        });
    };

    useEffect(() => {
        let active = true;

        readBillingInfo(uuid)
            .then((response) => {
                if (!active) {
                    return;
                }

                setInfo(response);
                setState('ready');
            })
            .catch((error) => {
                console.error(error);

                if (active) {
                    setState('error');
                }
            });

        return () => {
            active = false;
        };
    }, [uuid]);

    if (state === 'loading') {
        return (
            <Panel icon={CreditCard} title={t('overview.billing')}>
                <div className={'space-y-3 px-5 pb-5'}>
                    <Skeleton className={'h-4 w-1/2'} />
                    <Skeleton className={'h-4 w-2/3'} />
                    <Skeleton className={'h-4 w-1/3'} />
                </div>
            </Panel>
        );
    }

    if (state === 'error') {
        return (
            <Panel icon={CreditCard} title={t('overview.billing')}>
                <Notice tone={'warning'} className={'mx-5 mb-5'} title={t('overview.billingUnavailable')} />
            </Panel>
        );
    }

    if (info === null) {
        return (
            <Panel icon={CreditCard} title={t('overview.billing')}>
                <p className={'px-5 pb-5 text-sm text-ink-muted'}>{t('overview.billingUnlinked')}</p>
            </Panel>
        );
    }

    const price =
        info.price.amount === null
            ? null
            : Number(info.price.amount.replace(',', '.')) === 0
            ? t('overview.free')
            : money(info.price.amount, info.price.currency);

    const show = (part: string) => !hidden.includes(part);
    const rows: InfoRow[] = [];

    if (info.status && show('status')) {
        rows.push({
            label: t('overview.status'),
            value: <Badge tone={info.invoice ? 'warning' : 'success'}>{info.status}</Badge>,
        });
    }

    if (info.product && show('plan')) {
        rows.push({
            label: t('overview.plan'),
            value: (
                <span className={'inline-flex min-w-0 items-center gap-2'}>
                    {info.logo && (
                        <img
                            src={info.logo}
                            alt={''}
                            aria-hidden={'true'}
                            width={20}
                            height={20}
                            onError={(event) => {
                                event.currentTarget.style.display = 'none';
                            }}
                            className={'h-5 w-5 shrink-0 rounded object-contain'}
                        />
                    )}
                    <span className={'truncate'}>{info.product}</span>
                </span>
            ),
        });
    }

    if (price && show('price')) {
        rows.push({
            label: t('overview.price'),
            value: (
                <>
                    {price}
                    {info.interval && <span className={'text-ink-faint'}> / {info.interval}</span>}
                </>
            ),
        });
    }

    if (info.renewsAt && show('dueDate')) {
        const due = info.renewsAt;

        rows.push({
            label: t('overview.dueDate'),
            value: (
                <button
                    type={'button'}
                    onClick={toggleDue}
                    title={t('overview.toggleDueFormat')}
                    aria-label={t('overview.toggleDueFormat')}
                    className={
                        'inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-ink transition-colors hover:bg-overlay'
                    }
                >
                    {dueLabel(due, relative, t)}
                    <Clock className={'h-3.5 w-3.5 shrink-0 text-ink-faint'} aria-hidden={'true'} />
                </button>
            ),
        });
    }

    const manageLink = billingLink(info.manageUrl);

    return (
        <Panel icon={CreditCard} title={t('overview.billing')}>
            <Rows rows={rows} />

            {show('manage') && (
                <div className={'flex justify-end px-5 pb-5 pt-4'}>
                    <Button
                        size={'sm'}
                        variant={'secondary'}
                        disabled={manageLink === ''}
                        onClick={() => manageLink !== '' && window.open(manageLink, '_blank', 'noopener')}
                        icon={<ExternalLink className={'h-3.5 w-3.5'} />}
                    >
                        {t('overview.manageService')}
                    </Button>
                </div>
            )}
        </Panel>
    );
}

function Panel({
    icon: Icon,
    title,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    children: ReactNode;
}) {
    return (
        <section className={'overflow-hidden rounded-2xl bg-card ring-1 ring-line-field'}>
            <h2 className={'flex items-center gap-2 px-5 py-4 text-sm font-semibold text-ink'}>
                <Icon className={'h-4 w-4 text-ink-faint'} aria-hidden={'true'} />
                {title}
            </h2>

            {children}
        </section>
    );
}

function Chip({
    label,
    value,
    mask = false,
    copyable = false,
}: {
    label?: string;
    value: string;
    mask?: boolean;
    copyable?: boolean;
}) {
    const t = useT();
    const masks = usePanelTheme()['manager.addressBlur'] && mask;
    const [shown, setShown] = useState(false);
    const [copied, copy] = useCopied();

    return (
        <span
            onMouseEnter={() => setShown(true)}
            onMouseLeave={() => setShown(false)}
            onFocus={() => setShown(true)}
            onBlur={() => setShown(false)}
            tabIndex={masks ? 0 : undefined}
            className={
                'inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-overlay/70 px-2 py-1 ring-1 ring-line-field'
            }
        >
            {label !== undefined && label !== '' && (
                <span className={'text-[10px] font-medium uppercase tracking-wider text-ink-faint'}>{label}</span>
            )}
            <span
                className={cn(
                    'truncate font-mono text-xs text-ink transition-[filter] duration-200',
                    masks && !shown && 'select-none blur-[4px]'
                )}
            >
                {value}
            </span>

            {copyable && (
                <button
                    type={'button'}
                    onClick={() => copy(value)}
                    title={t(copied ? 'common.copied' : 'common.copy')}
                    aria-label={t(copied ? 'common.copied' : 'common.copy')}
                    className={'shrink-0 text-ink-faint transition-colors hover:text-ink'}
                >
                    {copied ? (
                        <Check className={'h-3.5 w-3.5 text-success'} aria-hidden={'true'} />
                    ) : (
                        <Copy className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                    )}
                </button>
            )}
        </span>
    );
}

function Rows({ rows }: { rows: InfoRow[] }) {
    return (
        <dl className={'overflow-hidden rounded-t-xl'}>
            {rows.map((row, index) => (
                <div
                    key={row.label}
                    className={cn('flex items-center justify-between gap-4 px-5 py-3', index % 2 === 1 && 'bg-raised')}
                >
                    <dt className={'shrink-0 text-sm text-ink-muted'}>{row.label}</dt>
                    <dd className={'min-w-0 truncate text-right text-sm text-ink'}>{row.value}</dd>
                </div>
            ))}
        </dl>
    );
}
