import React, { ComponentType, useState } from 'react';
import {
    Activity,
    BarChart3,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Eye,
    EyeOff,
    Image,
    LayoutGrid,
    ServerCog,
    Settings2,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import {
    OVERVIEW_METRICS,
    OVERVIEW_PARTS,
    type ChartStyle,
    type OverviewBlock,
    type OverviewBlockKind,
    type OverviewMetric,
    type OverviewWidth,
} from '@/dezerx/lib/panelTheme';
import { AddRow, Field, move } from '@/dezerx/components/editor/Controls';
import { GEAR, LABEL, ROW, STEP } from '@/dezerx/components/editor/EditorRows';
import { Checkbox, Select } from '@/dezerx/components/ui';
import { useT, type TranslateFn } from '@/i18n';

type IconType = ComponentType<{ className?: string }>;

export function RingIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox={'0 0 24 24'}
            fill={'none'}
            stroke={'currentColor'}
            strokeWidth={2}
            strokeLinecap={'round'}
            aria-hidden={'true'}
            className={className}
        >
            <circle cx={'12'} cy={'12'} r={'8'} opacity={0.35} />
            <path d={'M12 4a8 8 0 0 1 7.6 10.5'} />
        </svg>
    );
}

export function blockIcon(block: Pick<OverviewBlock, 'kind' | 'style'>): IconType {
    switch (block.kind) {
        case 'banner':
            return Image;
        case 'metrics':
            return LayoutGrid;
        case 'info':
            return ServerCog;
        case 'billing':
            return CreditCard;
        case 'doughnut':
            return RingIcon;
        default:
            return block.style === 'bar' ? BarChart3 : Activity;
    }
}

const WIDTHS: OverviewWidth[] = ['full', 'half', 'third'];

const SPANS: Record<OverviewWidth, string> = {
    full: 'col-span-6',
    half: 'col-span-3',
    third: 'col-span-2',
};

const figure = (block: Pick<OverviewBlock, 'kind'>) => block.kind === 'chart' || block.kind === 'doughnut';

function metricLabel(metric: OverviewMetric, t: TranslateFn): string {
    return t(`metrics.${metric}`);
}

function blockName(block: OverviewBlock, t: TranslateFn): string {
    if (figure(block)) {
        return t(`editor.overview.named.${block.kind}`, { metric: metricLabel(block.metric, t) });
    }

    return t(`editor.overview.kinds.${block.kind}`);
}

function newId(kind: OverviewBlockKind, taken: string[]): string {
    for (;;) {
        const id = `${kind}-${Math.random().toString(16).slice(2, 10)}`;

        if (!taken.includes(id)) {
            return id;
        }
    }
}

const fixed = (
    kind: OverviewBlockKind,
    width: OverviewWidth,
    enabled = true,
    hidden: string[] = []
): OverviewBlock => ({
    id: kind,
    kind,
    enabled,
    width,
    metric: 'cpu',
    style: 'line',
    hidden,
});

const chart = (metric: OverviewMetric, width: OverviewWidth, style: ChartStyle = 'line'): OverviewBlock => ({
    id: `chart-${metric}`,
    kind: 'chart',
    enabled: true,
    width,
    metric,
    style,
    hidden: [],
});

const ring = (metric: OverviewMetric, width: OverviewWidth): OverviewBlock => ({
    id: `doughnut-${metric}`,
    kind: 'doughnut',
    enabled: true,
    width,
    metric,
    style: 'line',
    hidden: [],
});

const PRESETS: { id: string; blocks: OverviewBlock[] }[] = [
    {
        id: 'classic',
        blocks: [fixed('banner', 'full'), fixed('metrics', 'full'), fixed('info', 'half'), fixed('billing', 'half')],
    },
    {
        id: 'glance',
        blocks: [
            fixed('metrics', 'full'),
            chart('cpu', 'third'),
            chart('memory', 'third'),
            ring('disk', 'third'),
            fixed('info', 'half'),
            fixed('billing', 'half'),
            fixed('banner', 'full', false),
        ],
    },
    {
        id: 'trio',
        blocks: [
            fixed('banner', 'full'),
            chart('cpu', 'third'),
            chart('memory', 'third'),
            ring('disk', 'third'),
            fixed('info', 'half'),
            fixed('billing', 'half'),
            fixed('metrics', 'full', false),
        ],
    },
    {
        id: 'dashboard',
        blocks: [
            fixed('metrics', 'full'),
            chart('cpu', 'half'),
            chart('memory', 'half'),
            fixed('info', 'third'),
            ring('disk', 'third'),
            fixed('billing', 'third'),
            fixed('banner', 'full', false),
        ],
    },
    {
        id: 'monitoring',
        blocks: [
            chart('cpu', 'full'),
            chart('memory', 'half'),
            chart('network', 'half', 'bar'),
            ring('cpu', 'third'),
            ring('memory', 'third'),
            ring('disk', 'third'),
            fixed('banner', 'full', false),
            fixed('metrics', 'full', false),
            fixed('info', 'half', false),
            fixed('billing', 'half', false),
        ],
    },
    {
        id: 'compact',
        blocks: [
            fixed('banner', 'full', true, ['description']),
            fixed('info', 'third'),
            ring('disk', 'third'),
            fixed('billing', 'third'),
            fixed('metrics', 'full', false),
        ],
    },
    {
        id: 'minimal',
        blocks: [
            fixed('info', 'half', true, ['serverId']),
            ring('disk', 'half'),
            fixed('banner', 'full', false),
            fixed('metrics', 'full', false),
            fixed('billing', 'half', false),
        ],
    },
];

const shape = (blocks: OverviewBlock[]) =>
    blocks
        .filter((block) => block.enabled)
        .map((block) => `${block.kind}:${block.width}:${figure(block) ? `${block.metric}:${block.style}` : ''}`)
        .join('|');

export function OverviewBlocksField({
    label,
    hint,
    value,
    max,
    headerShown,
    navbar,
    onChange,
}: {
    label: string;
    hint?: string;
    value: OverviewBlock[];
    max: number;
    headerShown: boolean;
    navbar: boolean;
    onChange: (value: OverviewBlock[]) => void;
}) {
    const t = useT();
    const [open, setOpen] = useState<string | null>(null);

    const extras = value.filter((block) => figure(block)).length;
    const current = shape(value);

    const patch = (id: string, next: Partial<OverviewBlock>) =>
        onChange(value.map((block) => (block.id === id ? { ...block, ...next } : block)));

    const add = (kind: 'chart' | 'doughnut') => {
        const id = newId(
            kind,
            value.map((block) => block.id)
        );

        onChange([
            ...value,
            {
                id,
                kind,
                enabled: true,
                width: kind === 'doughnut' ? 'third' : 'half',
                metric: OVERVIEW_METRICS[kind][0]!,
                style: 'line',
                hidden: [],
            },
        ]);
        setOpen(id);
    };

    return (
        <Field label={label} hint={hint}>
            <div className={'space-y-2'}>
                <span className={LABEL}>{t('editor.overview.presets.title')}</span>

                <div className={'grid grid-cols-2 gap-2 sm:grid-cols-3'}>
                    {PRESETS.map((preset) => {
                        const active = shape(preset.blocks) === current;

                        return (
                            <button
                                key={preset.id}
                                type={'button'}
                                onClick={() => {
                                    setOpen(null);
                                    onChange(preset.blocks.map((block) => ({ ...block, hidden: [...block.hidden] })));
                                }}
                                aria-pressed={active}
                                title={t(`editor.overview.presets.${preset.id}.body`)}
                                className={cn(
                                    'rounded-xl p-2 text-left ring-1 transition-colors',
                                    active
                                        ? 'bg-accent/10 ring-accent'
                                        : 'bg-card ring-line-field hover:ring-ink-faint/40'
                                )}
                            >
                                <MiniMap blocks={preset.blocks} />
                                <span className={'mt-2 block truncate text-[13px] font-semibold text-ink'}>
                                    {t(`editor.overview.presets.${preset.id}.name`)}
                                </span>
                                <span className={'mt-0.5 line-clamp-2 block text-[11px] leading-snug text-ink-faint'}>
                                    {t(`editor.overview.presets.${preset.id}.body`)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <LayoutMap blocks={value} />

            <div className={'overflow-hidden rounded-xl bg-card ring-1 ring-line-field'}>
                {value.map((block, index) => (
                    <BlockRow
                        key={block.id}
                        block={block}
                        first={index === 0}
                        last={index === value.length - 1}
                        open={open === block.id}
                        header={
                            block.kind === 'banner' && block.enabled && headerShown
                                ? navbar
                                    ? 'both'
                                    : 'replaces'
                                : null
                        }
                        onToggleOpen={() => setOpen((live) => (live === block.id ? null : block.id))}
                        onPatch={(next) => patch(block.id, next)}
                        onMove={(delta) => onChange(move(value, index, index + delta))}
                        onRemove={() => onChange(value.filter((one) => one.id !== block.id))}
                    />
                ))}
            </div>

            {extras < max ? (
                <div className={'grid grid-cols-2 gap-2'}>
                    <AddRow label={t('editor.overview.addChart')} onClick={() => add('chart')} />
                    <AddRow label={t('editor.overview.addDoughnut')} onClick={() => add('doughnut')} />
                </div>
            ) : (
                <p className={'text-[12px] text-ink-faint'}>{t('editor.overview.limit', { count: max })}</p>
            )}
        </Field>
    );
}

function MiniMap({ blocks }: { blocks: OverviewBlock[] }) {
    return (
        <span aria-hidden={'true'} className={'grid grid-cols-6 gap-0.5 rounded-lg bg-base p-1'}>
            {blocks
                .filter((block) => block.enabled)
                .map((block) => (
                    <span
                        key={block.id}
                        className={cn(
                            'flex items-center justify-center rounded-[3px]',
                            SPANS[block.width],
                            figure(block) ? 'h-4 bg-accent/40' : 'h-2.5 bg-ink/15'
                        )}
                    >
                        {block.kind === 'doughnut' && (
                            <span className={'h-2.5 w-2.5 rounded-full border-2 border-accent'} />
                        )}
                    </span>
                ))}
        </span>
    );
}

function LayoutMap({ blocks }: { blocks: OverviewBlock[] }) {
    const t = useT();
    const shown = blocks.filter((block) => block.enabled);

    return (
        <div aria-hidden={'true'} className={'rounded-xl bg-base p-2 ring-1 ring-line-field'}>
            {shown.length === 0 ? (
                <p className={'py-4 text-center text-[12px] text-ink-faint'}>{t('editor.overview.empty')}</p>
            ) : (
                <div className={'grid grid-cols-6 gap-1.5'}>
                    {shown.map((block) => {
                        const Icon = blockIcon(block);

                        return (
                            <div
                                key={block.id}
                                className={cn(
                                    'flex min-w-0 items-center gap-1.5 rounded-lg px-2',
                                    SPANS[block.width],
                                    figure(block) ? 'h-10 bg-accent/15 text-accent' : 'h-8 bg-card text-ink-faint'
                                )}
                            >
                                <Icon className={'h-3.5 w-3.5 shrink-0'} />
                                <span className={'truncate text-[11px] font-medium'}>{blockName(block, t)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function BlockRow({
    block,
    first,
    last,
    open,
    header,
    onToggleOpen,
    onPatch,
    onMove,
    onRemove,
}: {
    block: OverviewBlock;
    first: boolean;
    last: boolean;
    open: boolean;
    header: 'both' | 'replaces' | null;
    onToggleOpen: () => void;
    onPatch: (next: Partial<OverviewBlock>) => void;
    onMove: (delta: number) => void;
    onRemove: () => void;
}) {
    const t = useT();
    const Icon = blockIcon(block);
    const parts = OVERVIEW_PARTS[block.kind] ?? [];

    const togglePart = (part: string) =>
        onPatch({
            hidden: block.hidden.includes(part) ? block.hidden.filter((one) => one !== part) : [...block.hidden, part],
        });

    return (
        <div className={'border-t border-line-field first:border-t-0'}>
            <div className={cn(ROW, 'border-t-0', !block.enabled && 'opacity-50')}>
                <Icon className={'h-5 w-5 shrink-0 text-ink-faint'} />

                <span className={'min-w-0 flex-1 truncate text-[15px] text-ink'}>{blockName(block, t)}</span>

                {header === 'both' && (
                    <TriangleAlert
                        className={'h-4 w-4 shrink-0 text-warning'}
                        aria-label={t('editor.overview.headerNavbar')}
                    />
                )}

                <WidthPicker value={block.width} onChange={(width) => onPatch({ width })} />

                <button
                    type={'button'}
                    onClick={() => onPatch({ enabled: !block.enabled })}
                    aria-pressed={block.enabled}
                    aria-label={block.enabled ? t('editor.tabs.hide') : t('editor.tabs.show')}
                    className={cn(STEP, block.enabled && 'text-accent')}
                >
                    {block.enabled ? (
                        <Eye className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                    ) : (
                        <EyeOff className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                    )}
                </button>

                <button
                    type={'button'}
                    onClick={() => onMove(-1)}
                    disabled={first}
                    aria-label={t('editor.tabs.moveUp')}
                    className={STEP}
                >
                    <ChevronUp className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                </button>

                <button
                    type={'button'}
                    onClick={() => onMove(1)}
                    disabled={last}
                    aria-label={t('editor.tabs.moveDown')}
                    className={STEP}
                >
                    <ChevronDown className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                </button>

                <button
                    type={'button'}
                    onClick={onToggleOpen}
                    aria-expanded={open}
                    aria-label={t('editor.tabs.settings')}
                    className={cn(GEAR, open && 'bg-accent/20 text-ink')}
                >
                    <Settings2 className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                </button>
            </div>

            {header !== null && (
                <p className={cn('px-3 pb-3 text-[12px]', header === 'both' ? 'text-warning' : 'text-ink-faint')}>
                    {t(header === 'both' ? 'editor.overview.headerNavbar' : 'editor.overview.replacesHeader')}
                </p>
            )}

            {open && (
                <div className={'space-y-3 bg-overlay/30 px-3 pb-3 pt-2'}>
                    {figure(block) && (
                        <div className={'grid gap-3 sm:grid-cols-2'}>
                            <div className={'space-y-1.5'}>
                                <span className={LABEL}>{t('editor.overview.metric')}</span>
                                <Select
                                    size={'sm'}
                                    value={block.metric}
                                    onChange={(metric) => onPatch({ metric: metric as OverviewMetric })}
                                    options={OVERVIEW_METRICS[block.kind as 'chart' | 'doughnut'].map((metric) => ({
                                        value: metric,
                                        label: metricLabel(metric, t),
                                    }))}
                                />
                            </div>

                            {block.kind === 'chart' && (
                                <div className={'space-y-1.5'}>
                                    <span className={LABEL}>{t('editor.overview.style')}</span>
                                    <Select
                                        size={'sm'}
                                        value={block.style}
                                        onChange={(style) => onPatch({ style: style as ChartStyle })}
                                        options={[
                                            { value: 'line', label: t('editor.overview.styles.line') },
                                            { value: 'bar', label: t('editor.overview.styles.bar') },
                                        ]}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {parts.length > 0 && (
                        <div className={'space-y-2'}>
                            <span className={LABEL}>{t('editor.overview.show')}</span>
                            <div className={'grid gap-2 sm:grid-cols-2'}>
                                {parts.map((part) => (
                                    <Checkbox
                                        key={part}
                                        size={'sm'}
                                        checked={!block.hidden.includes(part)}
                                        onChange={() => togglePart(part)}
                                        label={t(`editor.overview.parts.${block.kind}.${part}`)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {figure(block) && (
                        <button
                            type={'button'}
                            onClick={onRemove}
                            className={
                                'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-danger transition-colors hover:bg-danger/10'
                            }
                        >
                            <Trash2 className={'h-4 w-4'} aria-hidden={'true'} />
                            {t('editor.overview.remove')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function WidthPicker({ value, onChange }: { value: OverviewWidth; onChange: (width: OverviewWidth) => void }) {
    const t = useT();

    return (
        <div
            role={'radiogroup'}
            aria-label={t('editor.overview.width')}
            className={'flex shrink-0 rounded-lg bg-overlay p-0.5'}
        >
            {WIDTHS.map((width) => (
                <button
                    key={width}
                    type={'button'}
                    role={'radio'}
                    aria-checked={value === width}
                    title={t(`editor.overview.widths.${width}`)}
                    onClick={() => onChange(width)}
                    className={cn(
                        'rounded-md px-2 py-1 text-[12px] font-semibold tabular-nums transition-colors',
                        value === width ? 'bg-accent text-ink-inverse' : 'text-ink-faint hover:text-ink'
                    )}
                >
                    {width === 'full' ? '1' : width === 'half' ? '½' : '⅓'}
                </button>
            ))}
        </div>
    );
}
