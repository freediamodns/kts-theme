import React, { memo, useMemo, useRef, useState } from 'react';
import isEqual from 'react-fast-compare';
import { Check, Copy, Cpu, HardDrive, MemoryStick, Network } from 'lucide-react';
import { ServerContext } from '@/state/server';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import Spinner from '@/components/elements/Spinner';
import Features from '@feature/Features';
import Console from '@/components/server/console/Console';
import { ip } from '@/lib/formatters';
import { Globe } from '@/dezerx/components/QuickLinks';
import BlurredIp from '@/dezerx/components/BlurredIp';
import { NetworkTile, ResourceChart, StatTile } from '@/dezerx/components/console/Metrics';
import { useNarrow } from '@/dezerx/lib/useNarrow';
import { useShellWidth } from '@/dezerx/lib/useShellWidth';
import { useServerStats } from '@/dezerx/components/console/stats';
import { cn } from '@/dezerx/lib/cn';
import { formatCores, formatRate, formatSize } from '@/dezerx/lib/format';
import { consoleLayout, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { useT } from '@/i18n';

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

const METRICS_BESIDE_MIN = 860;

const ServerConsoleContainer = () => {
    const theme = usePanelTheme();
    const { samples, latest } = useServerStats();

    const limits = ServerContext.useStoreState((state) => state.server.data!.limits);
    const eggFeatures = ServerContext.useStoreState((state) => state.server.data!.eggFeatures, isEqual);

    const [frame, narrow] = useNarrow<HTMLDivElement>(METRICS_BESIDE_MIN);
    const width = useShellWidth();

    const position = theme['console.metrics'];
    const beside = position === 'left' || position === 'right';
    const layout = consoleLayout(narrow && beside ? 'below' : position);
    const charts = theme['console.charts'];

    const graph = charts === 'off' ? theme['console.graph'] : 'none';
    const chartStyle = theme['console.chartStyle'];

    const cpuHistory = useMemo(() => samples.map((sample) => sample.cpu), [samples]);
    const memoryHistory = useMemo(() => samples.map((sample) => sample.memoryMb), [samples]);
    const inbound = useMemo(() => samples.map((sample) => sample.rxBps), [samples]);
    const outbound = useMemo(() => samples.map((sample) => sample.txBps), [samples]);

    const terminal = (
        <div className={'min-w-0'}>
            <Spinner.Suspense>
                <Console />
            </Spinner.Suspense>
        </div>
    );

    const tiles = (
        <div className={layout.aside}>
            {theme['console.address'] && <AddressCard />}

            <div className={layout.tiles}>
                <StatTile
                    icon={Cpu}
                    label={'CPU'}
                    value={latest ? `${latest.cpu.toFixed(1)}%` : null}
                    limit={`of ${formatCores(limits.cpu)}`}
                    history={cpuHistory}
                    ceiling={limits.cpu}
                    graph={graph}
                />
                <StatTile
                    icon={MemoryStick}
                    label={'Memory'}
                    value={latest ? formatUsageValue(latest.memoryMb) : null}
                    limit={`of ${formatSize(limits.memory)}`}
                    history={memoryHistory}
                    ceiling={limits.memory}
                    graph={graph}
                />
                <StatTile
                    icon={HardDrive}
                    label={'Disk'}
                    value={latest ? formatUsageValue(latest.diskMb) : null}
                    limit={`of ${formatSize(limits.disk)}`}
                    graph={graph}
                />
                <NetworkTile samples={samples} latest={latest} graph={graph} />
            </div>
        </div>
    );

    const chartRow =
        charts === 'off' ? null : (
            <div className={cn('grid gap-4', width >= 860 ? 'grid-cols-3' : width >= 560 ? 'grid-cols-2' : 'grid-cols-1')}>
                <ResourceChart
                    icon={Cpu}
                    label={'CPU'}
                    series={[{ label: 'CPU', values: cpuHistory, color: 'var(--chart-1)' }]}
                    ceiling={limits.cpu || undefined}
                    format={(value) => `${value.toFixed(1)}%`}
                    footnote={`of ${formatCores(limits.cpu)}`}
                    variant={chartStyle}
                />
                <ResourceChart
                    icon={MemoryStick}
                    label={'Memory'}
                    series={[{ label: 'Memory', values: memoryHistory, color: 'var(--chart-1)' }]}
                    ceiling={limits.memory || undefined}
                    format={formatUsageValue}
                    footnote={`of ${formatSize(limits.memory)}`}
                    variant={chartStyle}
                />
                <ResourceChart
                    icon={Network}
                    label={'Network'}
                    series={[
                        { label: 'In', values: inbound, color: 'var(--chart-1)' },
                        { label: 'Out', values: outbound, color: 'var(--chart-2)' },
                    ]}
                    format={formatRate}
                    variant={chartStyle}
                />
            </div>
        );

    return (
        <ServerContentBlock title={'Console'}>
            {charts === 'above' && <div className={'mb-4 sm:mb-6'}>{chartRow}</div>}

            <div ref={frame} className={cn('grid gap-4 sm:gap-6', layout.grid)}>
                {layout.tilesFirst ? (
                    <>
                        {tiles}
                        {terminal}
                    </>
                ) : (
                    <>
                        {terminal}
                        {tiles}
                    </>
                )}
            </div>

            {charts === 'below' && <div className={'mt-4 sm:mt-6'}>{chartRow}</div>}

            <Features enabled={eggFeatures} />
        </ServerContentBlock>
    );
};

function formatUsageValue(megabytes: number): string {
    return megabytes >= 1024 ? `${(megabytes / 1024).toFixed(2)} GB` : `${Math.round(megabytes)} MB`;
}

function AddressCard() {
    const t = useT();
    const masks = usePanelTheme()['manager.addressBlur'];
    const allocation = ServerContext.useStoreState((state) =>
        state.server.data!.allocations.find((candidate) => candidate.isDefault)
    );

    const [copied, setCopied] = useState(false);
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(
        () => () => {
            if (resetTimer.current !== null) {
                clearTimeout(resetTimer.current);
            }
        },
        []
    );

    if (!allocation) {
        return <div className={'rounded-2xl bg-card p-4 text-xs text-ink-faint'}>{t('consolePage.noAddress')}</div>;
    }

    const address = `${allocation.alias || ip(allocation.ip)}:${allocation.port}`;

    const copy = () => {
        void navigator.clipboard?.writeText(address).then(() => {
            setCopied(true);

            if (resetTimer.current !== null) {
                clearTimeout(resetTimer.current);
            }

            resetTimer.current = setTimeout(() => {
                resetTimer.current = null;
                setCopied(false);
            }, 1500);
        });
    };

    return (
        <button
            type={'button'}
            onClick={copy}
            aria-label={`Copy ${address}`}
            className={
                'running-border relative isolate flex w-full flex-col overflow-hidden rounded-2xl bg-promo p-4 text-left'
            }
        >
            <span
                aria-hidden={'true'}
                className={'pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 to-black/10'}
            />

            <Globe className={'pointer-events-none absolute -bottom-12 -right-12 h-36 w-36 opacity-80'} />

            <div className={'relative'}>
                <p
                    className={
                        'truncate text-xs font-medium tracking-tight text-promo-ink/80 underline underline-offset-4'
                    }
                >
                    {copied ? 'Copied' : t('consolePage.copyAddress')}
                    {copied ? (
                        <Check aria-hidden={'true'} className={'ml-1 inline-block h-3.5 w-3.5 align-middle'} />
                    ) : (
                        <Copy aria-hidden={'true'} className={'ml-1 inline-block h-3.5 w-3.5 align-middle'} />
                    )}
                </p>

                <p className={'mt-1 truncate text-lg font-semibold tracking-tight text-promo-ink'}>
                    <BlurredIp reveal={masks}>{address}</BlurredIp>
                </p>

                <p className={'mt-2 text-[10px] leading-snug text-promo-ink/75'}>{t('consolePage.pointClient')}</p>
            </div>
        </button>
    );
}

export default memo(ServerConsoleContainer, isEqual);
