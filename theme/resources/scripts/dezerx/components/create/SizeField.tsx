import React from 'react';
import { Info } from 'lucide-react';
import { HoverTip, Input } from '@/dezerx/components/ui';
import { CreateUnits, ResourceBounds } from '@/api/dezerx/serverCreate';
import { formatCores, formatPercent, formatSize, formatUsage } from '@/dezerx/lib/format';
import useAutoId from '@/dezerx/lib/useAutoId';
import { useT } from '@/i18n';

export const SIZED = ['memory', 'disk', 'cpu', 'databases', 'allocations', 'backups'] as const;

export type Sized = typeof SIZED[number];

export const SIZE_STEP: Record<Sized, number> = {
    memory: 256,
    disk: 256,
    cpu: 25,
    databases: 1,
    allocations: 1,
    backups: 1,
};

export const SIZE_LABEL: Record<Sized, string> = {
    memory: 'create.memory',
    disk: 'create.disk',
    cpu: 'create.cpu',
    databases: 'create.databases',
    allocations: 'create.extraPorts',
    backups: 'create.backups',
};

export const FALLBACK_UNITS: CreateUnits = { cpu: 'percent', memory: 'mb', disk: 'gb' };

export function writeSize(key: Sized, value: number, units: CreateUnits): string {
    if (key === 'cpu') {
        return units.cpu === 'cores' ? formatCores(value) : formatPercent(value);
    }

    return key === 'memory' || key === 'disk' ? formatSize(value) : String(value);
}

export function writeLeft(key: Sized, value: number, units: CreateUnits): string {
    if (key === 'cpu') {
        return units.cpu === 'cores' && value > 0 ? formatCores(value) : formatPercent(value);
    }

    return key === 'memory' || key === 'disk' ? formatUsage(value) : String(value);
}

export function ceilingOf(bounds: ResourceBounds): number {
    return bounds.left === null ? bounds.max : Math.min(bounds.max, bounds.left);
}

export function unitFor(
    key: Sized,
    units: CreateUnits,
    onChange: (next: CreateUnits) => void,
    label: (key: string) => string
): SizeUnitAffix | undefined {
    if (key === 'cpu') {
        const cores = units.cpu === 'cores';

        return {
            label: cores ? label('create.unitCores') : label('create.unitPercent'),
            scale: cores ? 100 : 1,
            tip: label('create.unitSwitchCpu'),
            onToggle: () => onChange({ ...units, cpu: cores ? 'percent' : 'cores' }),
        };
    }

    if (key === 'memory' || key === 'disk') {
        const gigabytes = units[key] === 'gb';

        return {
            label: gigabytes ? label('create.unitGb') : label('create.unitMb'),
            scale: gigabytes ? 1024 : 1,
            tip: label('create.unitSwitchSize'),
            onToggle: () => onChange({ ...units, [key]: gigabytes ? 'mb' : 'gb' }),
        };
    }

    return undefined;
}

export interface SizeUnitAffix {
    label: string;
    scale: number;
    tip: string;
    onToggle?: () => void;
}

function UnitAffix({ unit }: { unit: SizeUnitAffix }) {
    if (unit.onToggle === undefined) {
        return <span className={'px-2 text-[11px] font-medium text-ink-faint'}>{unit.label}</span>;
    }

    return (
        <HoverTip label={unit.tip} side={'left'}>
            <button
                type={'button'}
                onClick={unit.onToggle}
                aria-label={unit.tip}
                className={
                    'rounded-lg px-2 py-1 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink-muted'
                }
            >
                {unit.label}
            </button>
        </HoverTip>
    );
}

export function SizeField({
    label,
    bounds,
    value,
    step,
    format,
    unit,
    onChange,
}: {
    label: string;
    bounds: ResourceBounds;
    value: number;
    step: number;
    format: (value: number) => string;
    unit?: SizeUnitAffix;
    onChange: (value: number) => void;
}) {
    const t = useT();
    const id = useAutoId();
    const ceiling = ceilingOf(bounds);
    const over = value > ceiling;
    const under = value < bounds.min;

    const scale = unit?.scale ?? 1;
    const shown = (figure: number) => Number((figure / scale).toFixed(3));

    const range =
        bounds.left === null
            ? t('create.sizeRange', { min: format(bounds.min), max: format(bounds.max) })
            : t('create.sizeRangeLeft', {
                  min: format(bounds.min),
                  max: format(bounds.max),
                  left: format(bounds.left),
              });

    return (
        <div className={'w-full'}>
            <div className={'mb-1.5 flex items-center gap-1.5'}>
                <label htmlFor={id} className={'block text-xs font-medium tracking-tight text-ink-muted'}>
                    {label}
                </label>

                <HoverTip label={range} side={'top'}>
                    <button
                        type={'button'}
                        aria-label={range}
                        className={
                            'inline-flex rounded-full text-ink-faint transition-colors hover:text-ink-muted focus-visible:text-ink-muted'
                        }
                    >
                        <Info className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                    </button>
                </HoverTip>

                <button
                    type={'button'}
                    onClick={() => onChange(ceiling)}
                    disabled={value >= ceiling}
                    className={
                        'ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint transition-colors hover:text-accent disabled:pointer-events-none disabled:opacity-40'
                    }
                >
                    {t('create.max')}
                </button>
            </div>

            <Input
                id={id}
                type={'number'}
                value={String(shown(value))}
                min={shown(bounds.min)}
                max={shown(ceiling)}
                step={shown(step)}
                className={unit === undefined ? undefined : 'pr-16'}
                error={
                    under
                        ? t('create.sizeTooSmall', { min: format(bounds.min) })
                        : over
                        ? t('create.sizeTooBig', { max: format(ceiling) })
                        : undefined
                }
                action={unit === undefined ? undefined : <UnitAffix unit={unit} />}
                onChange={(event) => onChange(Math.round((Number.parseFloat(event.currentTarget.value) || 0) * scale))}
            />
        </div>
    );
}
