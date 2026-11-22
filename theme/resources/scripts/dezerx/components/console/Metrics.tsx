import React, { ComponentType, memo, RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Network } from 'lucide-react';
import { Skeleton, SkeletonRegion } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { formatRate } from '@/dezerx/lib/format';
import { ChartStyle, GraphMode } from '@/dezerx/lib/panelTheme';
import useAutoId from '@/dezerx/lib/useAutoId';
import { ResourceSample, SAMPLE_WINDOW } from '@/dezerx/components/console/useResourceSamples';
import { useT } from '@/i18n';

export const TileSpark = memo(function TileSpark({
    values,
    color,
    ceiling,
    inline = false,
}: {
    values: number[];
    color: string;
    ceiling?: number;
    inline?: boolean;
}) {
    const gradient = useAutoId();

    if (values.length < 2) {
        return null;
    }

    const top = ceiling && ceiling > 0 ? ceiling : Math.max(...values, Number.EPSILON) * 1.15;

    const points = values.map((value, index) => {
        const x = (index / (values.length - 1)) * 100;

        return `${x},${100 - Math.min(value / top, 1) * 45}`;
    });

    return (
        <svg
            aria-hidden={'true'}
            viewBox={'0 0 100 100'}
            preserveAspectRatio={'none'}
            className={cn('pointer-events-none w-full', inline ? 'mt-1.5 h-6' : 'absolute inset-0 h-full')}
        >
            <defs>
                <linearGradient id={gradient} x1={'0'} y1={'0'} x2={'0'} y2={'1'}>
                    <stop offset={'0%'} style={{ stopColor: color, stopOpacity: 0.22 }} />
                    <stop offset={'100%'} style={{ stopColor: color, stopOpacity: 0 }} />
                </linearGradient>
            </defs>

            <path d={`M 0,100 L ${points.join(' L ')} L 100,100 Z`} fill={`url(#${gradient})`} />
            <path
                d={`M ${points.join(' L ')}`}
                fill={'none'}
                style={{ stroke: color }}
                strokeWidth={1.5}
                strokeLinecap={'round'}
                strokeLinejoin={'round'}
                vectorEffect={'non-scaling-stroke'}
                opacity={0.5}
            />
        </svg>
    );
});

export interface ChartSeries {
    label: string;
    values: number[];
    color: string;
}

const CHART_HEADROOM = 1.15;

const PLOT_TOP = 6;
const PLOT_BOTTOM = 96;

const CHART_HEIGHT = 128;
const CHART_FALLBACK_WIDTH = 240;

const BAR_SLOT = 9;
const BAR_GAP = 2;
const BAR_MAX_WIDTH = 14;
const BAR_MIN_WIDTH = 2;
const BAR_RADIUS = 4;
const BAR_MIN_BUCKETS = 6;

const AXIS_TICKS = [0.75, 0.5, 0.25, 0];

type Column = number | null;

const ratioOf = (value: number, top: number) => Math.min(Math.max(value, 0) / top, 1);

const offsetFor = (fraction: number) => ((PLOT_BOTTOM - fraction * (PLOT_BOTTOM - PLOT_TOP)) * CHART_HEIGHT) / 100;

function useMeasuredWidth<T extends HTMLElement>(): [RefObject<T>, number] {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const element = ref.current;

        if (!element || typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver((entries) => {
            setWidth(entries[0]?.contentRect.width ?? element.clientWidth);
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return [ref, width];
}

function bucketOver(values: number[], count: number, capacity: number): Column[] {
    const out: Column[] = [];
    const step = capacity / count;

    for (let index = 0; index < count; index++) {
        const from = Math.floor(index * step);
        const to = Math.max(from + 1, Math.floor((index + 1) * step));

        let peak: Column = null;

        for (let cursor = from; cursor < to && cursor < values.length; cursor++) {
            peak = Math.max(peak ?? 0, values[cursor] ?? 0);
        }

        out.push(peak);
    }

    return out;
}

function bar(left: number, width: number, height: number, rx: number, ry: number): string {
    const right = left + width;
    const topEdge = PLOT_BOTTOM - height;
    const cornerX = Math.min(rx, width / 2);
    const cornerY = Math.min(ry, height);

    return [
        `M ${left},${PLOT_BOTTOM}`,
        `L ${left},${topEdge + cornerY}`,
        `Q ${left},${topEdge} ${left + cornerX},${topEdge}`,
        `L ${right - cornerX},${topEdge}`,
        `Q ${right},${topEdge} ${right},${topEdge + cornerY}`,
        `L ${right},${PLOT_BOTTOM}`,
        'Z',
    ].join(' ');
}

interface PlotGeometry {
    columns: number;
    values: Column[][];
    centres: number[];
    band: number;
    barWidth: number;
    stride: number;
}

function geometryFor(series: ChartSeries[], width: number, bars: boolean): PlotGeometry {
    const longest = Math.max(...series.map((line) => line.values.length), 0);
    const capacity = Math.max(SAMPLE_WINDOW, longest);

    if (!bars) {
        const span = Math.max(capacity - 1, 1);

        return {
            columns: capacity,
            values: series.map((line) => Array.from({ length: capacity }, (_, index) => line.values[index] ?? null)),
            centres: Array.from({ length: capacity }, (_, index) => (index / span) * width),
            band: width / span,
            barWidth: 0,
            stride: 0,
        };
    }

    const count = Math.max(BAR_MIN_BUCKETS, Math.min(Math.floor(width / BAR_SLOT) || BAR_MIN_BUCKETS, capacity));

    const lanes = series.length;
    const slot = width / count;
    const barWidth = Math.max(BAR_MIN_WIDTH, Math.min(BAR_MAX_WIDTH, (slot - BAR_GAP * lanes) / lanes));

    return {
        columns: count,
        values: series.map((line) => bucketOver(line.values, count, capacity)),
        centres: Array.from({ length: count }, (_, index) => (index + 0.5) * slot),
        band: slot,
        barWidth,
        stride: barWidth + BAR_GAP,
    };
}

function linePath(values: Column[], centres: number[], top: number, width: number) {
    const points: string[] = [];

    for (let index = 0; index < values.length; index++) {
        const value = values[index];

        if (value === null || value === undefined) {
            break;
        }

        const x = ((centres[index] ?? 0) / width) * 100;
        const y = PLOT_BOTTOM - ratioOf(value, top) * (PLOT_BOTTOM - PLOT_TOP);

        points.push(`${x},${y}`);
    }

    const end = ((centres[points.length - 1] ?? 0) / width) * 100;

    return { d: points.join(' L '), end, drawn: points.length };
}

function BarPlot({
    series,
    geometry,
    top,
    width,
    active,
}: {
    series: ChartSeries[];
    geometry: PlotGeometry;
    top: number;
    width: number;
    active: number | null;
}) {
    const lanes = series.length;

    const xUnit = 100 / width;
    const yUnit = 100 / CHART_HEIGHT;

    const radius = Math.min(BAR_RADIUS, geometry.barWidth / 2);
    const rx = radius * xUnit;
    const ry = radius * yUnit;

    return (
        <>
            {series.map((line, lane) => (
                <g key={line.label}>
                    {(geometry.values[lane] ?? []).map((value, index) => {
                        const centre = (geometry.centres[index] ?? 0) + (lane - (lanes - 1) / 2) * geometry.stride;
                        const waiting = value === null;
                        const height = waiting ? ry : Math.max(ratioOf(value, top) * (PLOT_BOTTOM - PLOT_TOP), ry);

                        return (
                            <path
                                key={index}
                                className={waiting ? 'text-ink/10' : undefined}
                                fill={waiting ? 'currentColor' : line.color}
                                opacity={waiting || active === null || active === index ? 1 : 0.45}
                                d={bar(
                                    (centre - geometry.barWidth / 2) * xUnit,
                                    geometry.barWidth * xUnit,
                                    height,
                                    rx,
                                    ry
                                )}
                            />
                        );
                    })}
                </g>
            ))}
        </>
    );
}

export const ResourceChart = memo(function ResourceChart({
    icon: Icon,
    label,
    series,
    ceiling,
    format,
    footnote,
    variant = 'line',
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    series: ChartSeries[];
    ceiling?: number;
    format: (value: number) => string;
    footnote?: string;
    variant?: ChartStyle;
}) {
    const t = useT();
    const gradient = useAutoId();

    const { top, peak } = useMemo(() => {
        let peak = 0;

        for (const line of series) {
            for (const value of line.values) {
                peak = Math.max(peak, value);
            }
        }

        return { peak, top: ceiling && ceiling > 0 ? ceiling : Math.max(peak * CHART_HEADROOM, Number.EPSILON) };
    }, [series, ceiling]);

    const [plotArea, plotWidth] = useMeasuredWidth<HTMLDivElement>();
    const [hover, setHover] = useState<number | null>(null);

    const bars = variant === 'bar';
    const drawable = series.some((line) => line.values.length >= (bars ? 1 : 2));
    const latest = series.map((line) => line.values[line.values.length - 1] ?? 0);

    const width = plotWidth || CHART_FALLBACK_WIDTH;
    const geometry = useMemo(() => geometryFor(series, width, bars), [series, width, bars]);

    const lines = bars ? [] : geometry.values.map((values) => linePath(values, geometry.centres, top, width));
    const filled = lines.reduce((furthest, line) => Math.max(furthest, line.drawn > 0 ? line.end : 0), 0);

    const ticks = AXIS_TICKS.map((fraction) => ({ fraction, text: format(top * fraction) }));
    const widestTick = ticks.reduce((widest, tick) => (tick.text.length > widest.length ? tick.text : widest), '');

    const held = hover !== null && hover < geometry.columns ? hover : null;
    const active = held !== null && geometry.values.some((line) => line[held] != null) ? held : null;
    const marker = active === null ? 0 : geometry.centres[active] ?? 0;

    const track = (event: React.PointerEvent<HTMLDivElement>) => {
        const box = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - box.left;

        let nearest: number | null = null;
        let best = Infinity;

        geometry.centres.forEach((centre, index) => {
            const distance = Math.abs(centre - x);

            if (distance < best) {
                best = distance;
                nearest = index;
            }
        });

        setHover((current) => (current === nearest ? current : nearest));
    };

    return (
        <div className={'rounded-2xl bg-card p-4'}>
            <div className={'flex items-start justify-between gap-3'}>
                <div className={'min-w-0'}>
                    <div className={'flex items-center gap-1.5 text-ink-faint'}>
                        <Icon className={'h-3.5 w-3.5 shrink-0'} aria-hidden={'true'} />
                        <p className={'truncate text-[11px] font-medium tracking-tight'}>{label}</p>
                    </div>

                    <div className={'mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1'}>
                        {series.map((line, index) => (
                            <p
                                key={line.label}
                                className={
                                    'flex items-baseline gap-1.5 truncate text-lg font-semibold tracking-tight text-ink'
                                }
                            >
                                <span
                                    aria-hidden={'true'}
                                    className={cn(
                                        'shrink-0 self-center',
                                        bars ? 'h-2.5 w-1.5 rounded-sm' : 'h-0.5 w-2.5 rounded-full'
                                    )}
                                    style={{ background: line.color }}
                                />
                                {format(latest[index] ?? 0)}
                                {series.length > 1 && (
                                    <span className={'text-[11px] font-normal text-ink-faint'}>{line.label}</span>
                                )}
                            </p>
                        ))}
                    </div>
                </div>

                <div className={'shrink-0 text-right'}>
                    <p className={'text-[11px] tabular-nums text-ink-faint'}>{format(top)}</p>
                    {footnote !== undefined && <p className={'mt-0.5 text-[10px] text-ink-faint'}>{footnote}</p>}
                </div>
            </div>

            <div className={'mt-3 flex gap-2'}>
                {drawable && (
                    <div aria-hidden={'true'} className={'relative h-32 shrink-0'}>
                        <span className={'invisible text-[10px] tabular-nums'}>{widestTick}</span>

                        {ticks.map(({ fraction, text }) => (
                            <span
                                key={fraction}
                                style={{ top: offsetFor(fraction) }}
                                className={
                                    'absolute right-0 -translate-y-1/2 whitespace-nowrap text-[10px] tabular-nums text-ink-faint'
                                }
                            >
                                {text}
                            </span>
                        ))}
                    </div>
                )}

                <div ref={plotArea} className={'relative min-w-0 flex-1'}>
                    {drawable ? (
                        <>
                            <svg
                                aria-hidden={'true'}
                                viewBox={'0 0 100 100'}
                                preserveAspectRatio={'none'}
                                className={'block h-32 w-full'}
                            >
                                <defs>
                                    {series.map((line, index) => (
                                        <linearGradient
                                            key={line.label}
                                            id={`${gradient}-${index}`}
                                            x1={'0'}
                                            y1={'0'}
                                            x2={'0'}
                                            y2={'1'}
                                        >
                                            <stop offset={'0%'} style={{ stopColor: line.color, stopOpacity: 0.28 }} />
                                            <stop offset={'100%'} style={{ stopColor: line.color, stopOpacity: 0 }} />
                                        </linearGradient>
                                    ))}
                                </defs>

                                {[0.25, 0.5, 0.75].map((fraction) => {
                                    const y = PLOT_BOTTOM - fraction * (PLOT_BOTTOM - PLOT_TOP);

                                    return (
                                        <line
                                            key={fraction}
                                            x1={0}
                                            x2={100}
                                            y1={y}
                                            y2={y}
                                            className={'text-line-field'}
                                            style={{ stroke: 'currentColor' }}
                                            strokeWidth={1}
                                            vectorEffect={'non-scaling-stroke'}
                                        />
                                    );
                                })}

                                {bars ? (
                                    <BarPlot
                                        series={series}
                                        geometry={geometry}
                                        top={top}
                                        width={width}
                                        active={active}
                                    />
                                ) : (
                                    <>
                                        {filled < 100 && (
                                            <line
                                                x1={filled}
                                                x2={100}
                                                y1={PLOT_BOTTOM}
                                                y2={PLOT_BOTTOM}
                                                className={'text-ink/10'}
                                                style={{ stroke: 'currentColor' }}
                                                strokeWidth={3}
                                                strokeLinecap={'round'}
                                                vectorEffect={'non-scaling-stroke'}
                                            />
                                        )}

                                        {series.map((line, index) => {
                                            const path = lines[index];

                                            if (!path || path.drawn < 2) {
                                                return null;
                                            }

                                            return (
                                                <g key={line.label}>
                                                    <path
                                                        d={`M 0,${PLOT_BOTTOM} L ${path.d} L ${path.end},${PLOT_BOTTOM} Z`}
                                                        fill={`url(#${gradient}-${index})`}
                                                    />
                                                    <path
                                                        d={`M ${path.d}`}
                                                        fill={'none'}
                                                        style={{ stroke: line.color }}
                                                        strokeWidth={1.5}
                                                        strokeLinecap={'round'}
                                                        strokeLinejoin={'round'}
                                                        vectorEffect={'non-scaling-stroke'}
                                                    />
                                                </g>
                                            );
                                        })}
                                    </>
                                )}
                            </svg>

                            {active !== null && !bars && (
                                <span
                                    aria-hidden={'true'}
                                    style={{
                                        left: marker - geometry.band / 2,
                                        width: geometry.band,
                                        top: offsetFor(1),
                                        height: offsetFor(0) - offsetFor(1),
                                    }}
                                    className={'pointer-events-none absolute rounded-sm bg-ink/[0.07]'}
                                />
                            )}

                            {active !== null &&
                                !bars &&
                                series.map((line, index) => {
                                    const value = geometry.values[index]?.[active];

                                    if (value === null || value === undefined) {
                                        return null;
                                    }

                                    return (
                                        <span
                                            key={line.label}
                                            aria-hidden={'true'}
                                            style={{
                                                left: marker,
                                                top: offsetFor(ratioOf(value, top)),
                                                background: line.color,
                                            }}
                                            className={
                                                'pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card'
                                            }
                                        />
                                    );
                                })}

                            {active !== null && (
                                <div
                                    aria-hidden={'true'}
                                    style={
                                        marker < width / 2
                                            ? { left: marker + 10 }
                                            : { right: Math.max(width - marker, 0) + 10 }
                                    }
                                    className={
                                        'pointer-events-none absolute top-1 z-10 rounded-xl bg-overlay/80 px-2.5 py-1.5 shadow-panel ring-1 ring-line-field backdrop-blur-md'
                                    }
                                >
                                    {series.map((line, index) => {
                                        const value = geometry.values[index]?.[active];

                                        if (value === null || value === undefined) {
                                            return null;
                                        }

                                        return (
                                            <p
                                                key={line.label}
                                                className={
                                                    'flex items-center gap-1.5 whitespace-nowrap text-[11px] tabular-nums text-ink'
                                                }
                                            >
                                                <span
                                                    aria-hidden={'true'}
                                                    className={'h-1.5 w-1.5 shrink-0 rounded-full'}
                                                    style={{ background: line.color }}
                                                />
                                                {series.length > 1 && (
                                                    <span className={'text-ink-faint'}>{line.label}</span>
                                                )}
                                                <span className={'ml-auto font-medium'}>{format(value)}</span>
                                            </p>
                                        );
                                    })}
                                </div>
                            )}

                            <div
                                className={'absolute inset-0'}
                                onPointerMove={track}
                                onPointerLeave={() => setHover(null)}
                            />
                        </>
                    ) : (
                        <SkeletonRegion label={t('metrics.waiting', { label: label.toLowerCase() })}>
                            <Skeleton className={'h-32 w-full'} />
                        </SkeletonRegion>
                    )}
                </div>
            </div>

            <p className={'mt-2 text-[10px] text-ink-faint'}>
                {t('metrics.summary', {
                    count: Math.max(...series.map((line) => line.values.length)),
                    peak: format(peak),
                })}
            </p>
        </div>
    );
});

export const StatTile = memo(function StatTile({
    icon: Icon,
    label,
    value,
    limit,
    history,
    ceiling,
    color = 'var(--chart-1)',
    dense = false,
    graph = 'behind',
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: string | null;
    limit: string;
    history?: number[];
    ceiling?: number;
    color?: string;
    dense?: boolean;
    graph?: GraphMode;
}) {
    return (
        <div className={cn('relative overflow-hidden rounded-2xl bg-card', dense ? 'rounded-xl p-2.5' : 'p-4')}>
            {history && graph === 'behind' && <TileSpark values={history} color={color} ceiling={ceiling} />}

            <div className={'relative'}>
                <div className={'flex items-center gap-1.5 text-ink-faint'}>
                    <Icon className={cn('shrink-0', dense ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-hidden={'true'} />
                    <p className={cn('truncate font-medium tracking-tight', dense ? 'text-[10px]' : 'text-[11px]')}>
                        {label}
                    </p>
                </div>

                {value === null ? (
                    <SkeletonRegion label={`Loading ${label.toLowerCase()}`}>
                        <Skeleton className={cn('w-16', dense ? 'mt-1 h-4' : 'mt-2 h-6')} />
                        <Skeleton className={'mt-1.5 h-3 w-12'} />
                    </SkeletonRegion>
                ) : (
                    <>
                        <p
                            className={cn(
                                'truncate font-semibold tracking-tight text-ink',
                                dense ? 'mt-1 text-sm' : 'mt-1.5 text-lg'
                            )}
                        >
                            {value}
                        </p>
                        <p className={cn('truncate text-ink-faint', dense ? 'text-[10px]' : 'mt-0.5 text-[11px]')}>
                            {limit}
                        </p>

                        {history && graph === 'under' && (
                            <TileSpark values={history} color={color} ceiling={ceiling} inline />
                        )}
                    </>
                )}
            </div>
        </div>
    );
});

export const NetworkTile = memo(function NetworkTile({
    samples,
    latest,
    dense = false,
    graph = 'behind',
}: {
    samples: ResourceSample[];
    latest: ResourceSample | null;
    dense?: boolean;
    graph?: GraphMode;
}) {
    const t = useT();
    const { inbound, outbound, ceiling } = useMemo(() => {
        const inbound = samples.map((sample) => sample.rxBps);
        const outbound = samples.map((sample) => sample.txBps);

        let peak = Number.EPSILON;

        for (const value of inbound) {
            peak = Math.max(peak, value);
        }

        for (const value of outbound) {
            peak = Math.max(peak, value);
        }

        return { inbound, outbound, ceiling: peak * 1.15 };
    }, [samples]);

    return (
        <div className={cn('relative overflow-hidden rounded-2xl bg-card', dense ? 'rounded-xl p-2.5' : 'p-4')}>
            {graph === 'behind' && (
                <>
                    <TileSpark values={inbound} color={'var(--chart-1)'} ceiling={ceiling} />
                    <TileSpark values={outbound} color={'var(--chart-2)'} ceiling={ceiling} />
                </>
            )}

            <div className={'relative'}>
                <div className={'flex items-center gap-1.5 text-ink-faint'}>
                    <Network className={cn('shrink-0', dense ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-hidden={'true'} />
                    <p className={cn('truncate font-medium tracking-tight', dense ? 'text-[10px]' : 'text-[11px]')}>
                        {t('metrics.network')}
                    </p>
                </div>

                {latest === null ? (
                    <SkeletonRegion label={t('metrics.loadingNetwork')}>
                        <Skeleton className={cn('w-16', dense ? 'mt-1 h-4' : 'mt-2 h-6')} />
                        <Skeleton className={'mt-1.5 h-3 w-12'} />
                    </SkeletonRegion>
                ) : (
                    <div
                        className={cn(
                            'flex flex-wrap items-start',
                            dense ? 'mt-1 gap-x-3 gap-y-1' : 'mt-1.5 gap-x-6 gap-y-2'
                        )}
                    >
                        <NetworkFigure
                            value={formatRate(latest.rxBps)}
                            label={t('metrics.inbound')}
                            color={'var(--chart-1)'}
                            dense={dense}
                        />
                        <NetworkFigure
                            value={formatRate(latest.txBps)}
                            label={t('metrics.outbound')}
                            color={'var(--chart-2)'}
                            dense={dense}
                        />
                    </div>
                )}

                {graph === 'under' && (
                    <div className={'relative'}>
                        <TileSpark values={inbound} color={'var(--chart-1)'} ceiling={ceiling} inline />
                    </div>
                )}
            </div>
        </div>
    );
});

const NetworkFigure = memo(function NetworkFigure({
    value,
    label,
    color,
    dense = false,
}: {
    value: string;
    label: string;
    color: string;
    dense?: boolean;
}) {
    return (
        <div className={'min-w-0'}>
            <p className={cn('truncate font-semibold tracking-tight text-ink', dense ? 'text-sm' : 'text-lg')}>
                {value}
            </p>
            <p
                className={cn(
                    'flex items-center gap-1.5 truncate text-ink-faint',
                    dense ? 'text-[10px]' : 'mt-0.5 text-[11px]'
                )}
            >
                <span
                    aria-hidden={'true'}
                    className={'h-0.5 w-2.5 shrink-0 rounded-full'}
                    style={{ background: color }}
                />
                {label}
            </p>
        </div>
    );
});
