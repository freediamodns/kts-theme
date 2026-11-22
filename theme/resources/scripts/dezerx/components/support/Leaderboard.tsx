import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { BoardRow, Leaderboard as Board, Verdict, getLeaderboard } from '@/api/dezerx/staff';
import { Notice, Select, Skeleton, SkeletonRegion } from '@/dezerx/components/ui';
import { SectionEmpty, apiMessage } from '@/dezerx/components/console/Section';
import { PersonAvatar } from '@/dezerx/components/PersonAvatar';
import { MOODS, MoodMark } from '@/dezerx/components/support/Mood';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

type Column = 'sessions' | 'resolved' | 'feedback';

const TONES: Record<Verdict, string> = {
    great: 'text-success',
    okay: 'text-warning',
    poor: 'text-danger',
    none: 'text-ink-faint',
};

const ALL = 'all';

function score(row: BoardRow): number {
    return row.happy + row.okay / 2 - row.sad;
}

function monthLabel(month: string): string {
    const [year, index] = month.split('-');
    const date = new Date(Number(year), Number(index) - 1, 1);

    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function Heading({
    column,
    label,
    sort,
    onSort,
}: {
    column: Column;
    label: string;
    sort: { column: Column; ascending: boolean };
    onSort: (column: Column) => void;
}) {
    const active = sort.column === column;
    const Arrow = active && sort.ascending ? ChevronUp : ChevronDown;

    return (
        <th className={'px-4 py-2.5 text-right font-semibold'}>
            <button
                type={'button'}
                onClick={() => onSort(column)}
                className={cn(
                    'inline-flex items-center gap-1 uppercase tracking-wider transition-colors',
                    active ? 'text-ink' : 'hover:text-ink-muted'
                )}
            >
                {label}
                <Arrow className={cn('h-3 w-3', !active && 'opacity-40')} aria-hidden={'true'} />
            </button>
        </th>
    );
}

export function Leaderboard() {
    const t = useT();

    const [month, setMonth] = useState<string>(ALL);
    const [data, setData] = useState<Board | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [sort, setSort] = useState<{ column: Column; ascending: boolean }>({
        column: 'sessions',
        ascending: false,
    });

    useEffect(() => {
        let alive = true;

        getLeaderboard(month === ALL ? null : month)
            .then((payload) => {
                if (!alive) {
                    return;
                }

                setData({
                    board: payload.board ?? [],
                    summary: payload.summary ?? { happy: 0, okay: 0, sad: 0 },
                    verdict: payload.verdict ?? 'none',
                    month: payload.month ?? null,
                    months: payload.months ?? [],
                });
                setError(null);
            })
            .catch((problem) => alive && setError(problem));

        return () => {
            alive = false;
        };
    }, [month]);

    const rows = useMemo(() => {
        if (data === null) {
            return [];
        }

        const reading = (row: BoardRow) =>
            sort.column === 'feedback' ? score(row) : sort.column === 'resolved' ? row.resolved : row.sessions;

        return [...data.board].sort((left, right) =>
            sort.ascending ? reading(left) - reading(right) : reading(right) - reading(left)
        );
    }, [data, sort]);

    if (data === null) {
        return error !== null ? (
            <Notice tone={'danger'} title={t('support.loadFailed')}>
                {apiMessage(error, t('support.unreachable'))}
            </Notice>
        ) : (
            <SkeletonRegion label={t('support.loading')}>
                <Skeleton className={'h-20 w-full rounded-2xl'} />
                <Skeleton className={'mt-3 h-56 w-full rounded-2xl'} />
            </SkeletonRegion>
        );
    }

    const turn = (column: Column) =>
        setSort((current) => ({ column, ascending: current.column === column ? !current.ascending : false }));

    return (
        <div className={'space-y-3'}>
            <div className={'flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3'}>
                <p className={cn('text-sm font-medium', TONES[data.verdict] ?? TONES.none)}>
                    {t(`support.verdict.${data.verdict}`)}
                </p>

                <div className={'flex items-center gap-4'}>
                    {MOODS.map((mood) => (
                        <span key={mood} className={'inline-flex items-center gap-1.5'}>
                            <MoodMark mood={mood} className={'text-base'} />
                            <span className={'text-sm font-semibold tabular-nums text-ink'}>{data.summary[mood]}</span>
                        </span>
                    ))}
                </div>
            </div>

            {data.board.length === 0 ? (
                <SectionEmpty icon={Trophy} title={t('support.boardEmpty')} body={t('support.boardEmptyBody')} />
            ) : (
                <div className={'overflow-x-auto rounded-2xl bg-card'}>
                    <table className={'w-full min-w-[34rem] border-collapse text-left'}>
                        <thead>
                            <tr className={'text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>
                                <th className={'px-4 py-2.5 font-semibold'}>
                                    <span className={'flex items-center gap-3'}>
                                        {t('support.tabBoard')}

                                        <Select
                                            size={'sm'}
                                            value={month}
                                            onChange={setMonth}
                                            className={'w-40'}
                                            options={[
                                                { value: ALL, label: t('support.boardAllTime') },
                                                ...data.months.map((entry) => ({
                                                    value: entry,
                                                    label: monthLabel(entry),
                                                })),
                                            ]}
                                        />
                                    </span>
                                </th>

                                <Heading
                                    column={'sessions'}
                                    label={t('support.boardSessions')}
                                    sort={sort}
                                    onSort={turn}
                                />
                                <Heading
                                    column={'resolved'}
                                    label={t('support.boardResolved')}
                                    sort={sort}
                                    onSort={turn}
                                />
                                <Heading column={'feedback'} label={t('support.boardSaid')} sort={sort} onSort={turn} />
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={row.staff} className={'border-t border-line-field text-xs text-ink-muted'}>
                                    <td className={'px-4 py-2.5'}>
                                        <span className={'flex items-center gap-2'}>
                                            {index === 0 ? (
                                                <img
                                                    src={'/dezerx/first-place.webp'}
                                                    alt={''}
                                                    aria-hidden={'true'}
                                                    width={18}
                                                    height={18}
                                                    loading={'lazy'}
                                                    decoding={'async'}
                                                    draggable={false}
                                                    className={'h-[18px] w-[18px] shrink-0 select-none'}
                                                />
                                            ) : (
                                                <span
                                                    className={
                                                        'w-[18px] shrink-0 text-center text-[11px] font-semibold tabular-nums text-ink-faint'
                                                    }
                                                >
                                                    {index + 1}
                                                </span>
                                            )}

                                            <PersonAvatar
                                                hash={row.avatar}
                                                url={row.avatarUrl}
                                                name={row.staff}
                                                size={20}
                                                className={'h-5 w-5 text-[10px]'}
                                            />

                                            <span className={'truncate font-medium text-ink'}>{row.staff}</span>
                                        </span>
                                    </td>

                                    <td className={'px-4 py-2.5 text-right tabular-nums'}>{row.sessions}</td>
                                    <td className={'px-4 py-2.5 text-right tabular-nums'}>{row.resolved}</td>

                                    <td className={'px-4 py-2.5'}>
                                        <span className={'flex items-center justify-end gap-2.5'}>
                                            {MOODS.map((mood) => (
                                                <span key={mood} className={'inline-flex items-center gap-1'}>
                                                    <MoodMark mood={mood} />
                                                    <span className={'tabular-nums'}>{row[mood]}</span>
                                                </span>
                                            ))}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Leaderboard;
