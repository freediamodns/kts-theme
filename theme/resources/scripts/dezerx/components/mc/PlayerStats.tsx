import React, { useEffect, useState } from 'react';
import { Skeleton, SkeletonRegion } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { Atlas, bareId, findIcon, iconStyle, loadAtlas } from '@/dezerx/components/mc/textures';
import { useT } from '@/i18n';

export interface Tally {
    total: number;
    top: { id: string; name: string; count: number }[];
}

export interface Stats {
    available: boolean;
    summary?: {
        playTimeTicks: number;
        deaths: number;
        playerKills: number;
        mobKills: number;
        jumps: number;
        damageDealt: number;
        damageTaken: number;
    };
    distances?: { id: string; name: string; blocks: number }[];
    mined?: Tally;
    used?: Tally;
    killed?: Tally;
    crafted?: Tally;
}

const SHOWN = 10;

function playtime(ticks: number): string {
    const minutes = Math.floor(ticks / 20 / 60);
    const hours = Math.floor(minutes / 60);

    if (hours === 0) {
        return `${minutes} min`;
    }

    return `${hours} h, ${minutes % 60} min`;
}

const ROW_ICON = 20;

function RowIcon({ id }: { id: string }) {
    const [atlas, setAtlas] = useState<Atlas | null>(null);

    useEffect(() => {
        let live = true;

        void loadAtlas().then((loaded) => {
            if (live) {
                setAtlas(loaded);
            }
        });

        return () => {
            live = false;
        };
    }, []);

    const icon =
        atlas === null ? null : findIcon(atlas, id) ?? findIcon(atlas, `${bareId(id)}_spawn_egg`);

    if (atlas === null || icon === null) {
        return <span aria-hidden={'true'} className={'h-5 w-5 shrink-0'} />;
    }

    return (
        <span
            aria-hidden={'true'}
            className={'h-5 w-5 shrink-0 select-none'}
            style={iconStyle(atlas, icon, ROW_ICON)}
        />
    );
}

export function PlayerStats({ stats }: { stats: Stats | null }) {
    const t = useT();

    if (stats === null) {
        return (
            <div className={'rounded-2xl bg-card p-4'}>
                <SkeletonRegion label={t('playerStats.loading')}>
                    <Skeleton className={'h-5 w-32'} />
                    <Skeleton className={'mt-3 h-24 w-full'} />
                </SkeletonRegion>
            </div>
        );
    }

    if (!stats.available || !stats.summary) {
        return (
            <div className={'rounded-2xl bg-card p-4'}>
                <p className={'text-sm font-semibold tracking-tight text-ink'}>{t('playerStats.title')}</p>
                <p className={'mt-1 text-xs text-ink-faint'}>{t('playerStats.nothingCounted')}</p>
            </div>
        );
    }

    const { summary } = stats;
    const kdr =
        summary.deaths === 0 ? summary.playerKills.toFixed(2) : (summary.playerKills / summary.deaths).toFixed(2);

    return (
        <div className={'space-y-4 rounded-2xl bg-card p-4'}>
            <p className={'text-sm font-semibold tracking-tight text-ink'}>{t('playerStats.title')}</p>

            <dl className={'grid grid-cols-2 gap-3 sm:grid-cols-4'}>
                <Figure label={t('playerStats.playTime')} value={playtime(summary.playTimeTicks)} />
                <Figure label={t('playerStats.playerKills')} value={summary.playerKills.toLocaleString()} />
                <Figure label={t('playerStats.deaths')} value={summary.deaths.toLocaleString()} />
                <Figure label={t('playerStats.kd')} value={kdr} />
                <Figure label={t('playerStats.mobKills')} value={summary.mobKills.toLocaleString()} />
                <Figure label={t('playerStats.jumps')} value={summary.jumps.toLocaleString()} />
                <Figure label={t('playerStats.damageDealt')} value={(summary.damageDealt / 10).toLocaleString()} />
                <Figure label={t('playerStats.damageTaken')} value={(summary.damageTaken / 10).toLocaleString()} />
            </dl>

            {stats.distances && stats.distances.length > 0 && (
                <Section
                    title={t('playerStats.distance')}
                    unit={t('playerStats.blocks')}
                    total={stats.distances.reduce((sum, entry) => sum + entry.blocks, 0)}
                    icons={false}
                    rows={stats.distances.map((entry) => ({ id: entry.id, name: entry.name, count: entry.blocks }))}
                />
            )}

            {stats.mined && stats.mined.total > 0 && (
                <Section title={t('playerStats.mined')} total={stats.mined.total} rows={stats.mined.top} />
            )}

            {stats.used && stats.used.total > 0 && (
                <Section title={t('playerStats.used')} total={stats.used.total} rows={stats.used.top} />
            )}

            {stats.killed && stats.killed.total > 0 && (
                <Section title={t('playerStats.killed')} total={stats.killed.total} rows={stats.killed.top} />
            )}

            {stats.crafted && stats.crafted.total > 0 && (
                <Section title={t('playerStats.crafted')} total={stats.crafted.total} rows={stats.crafted.top} />
            )}
        </div>
    );
}

function Figure({ label, value }: { label: string; value: string }) {
    return (
        <div className={'min-w-0 rounded-xl bg-overlay/40 p-3'}>
            <dt className={'truncate text-[10px] uppercase tracking-wider text-ink-faint'}>{label}</dt>
            <dd className={'mt-0.5 truncate text-sm font-semibold text-ink'}>{value}</dd>
        </div>
    );
}

function Section({
    title,
    total,
    rows,
    unit,
    icons = true,
}: {
    title: string;
    total: number;
    rows: { id: string; name: string; count: number }[];
    unit?: string;
    icons?: boolean;
}) {
    const t = useT();
    const [all, setAll] = useState(false);
    const visible = all ? rows : rows.slice(0, SHOWN);

    return (
        <div>
            <div className={'mb-2 flex items-baseline justify-between gap-3'}>
                <p className={'text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>{title}</p>
                <p className={'shrink-0 text-xs text-ink-muted'}>
                    <span className={'font-semibold text-ink'}>{total.toLocaleString()}</span>
                    {unit ? ` ${unit}` : ''}
                </p>
            </div>

            <ul className={'space-y-px'}>
                {visible.map((row) => (
                    <li
                        key={row.id}
                        className={cn(
                            'flex items-center justify-between gap-3 rounded-lg px-2 py-1',
                            'odd:bg-overlay/30'
                        )}
                    >
                        <span className={'flex min-w-0 items-center gap-2'}>
                            {icons && <RowIcon id={row.id} />}
                            <span className={'min-w-0 truncate text-xs text-ink-muted'}>{row.name}</span>
                        </span>
                        <span className={'shrink-0 font-mono text-xs tabular-nums text-ink'}>
                            {row.count.toLocaleString()}
                        </span>
                    </li>
                ))}
            </ul>

            {rows.length > SHOWN && (
                <button
                    type={'button'}
                    onClick={() => setAll((was) => !was)}
                    className={'mt-1.5 text-[11px] font-medium text-accent hover:underline'}
                >
                    {all ? t('playerStats.showFewer') : t('playerStats.showAll', { count: rows.length })}
                </button>
            )}
        </div>
    );
}
