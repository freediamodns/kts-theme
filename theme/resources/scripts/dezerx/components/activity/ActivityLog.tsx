import React, { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, ClipboardList, FolderOpen, Terminal } from 'lucide-react';
import { format } from 'date-fns';
import { ActivityLog } from '@definitions/user';
import { PaginationDataSet } from '@/api/http';
import Translate from '@/components/elements/Translate';
import Avatar from '@/components/Avatar';
import { getObjectKeys, isObject } from '@/lib/objects';
import { Button } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { formatRelative } from '@/dezerx/lib/format';
import CountryFlag from '@/dezerx/components/CountryFlag';
import BlurredIp from '@/dezerx/components/BlurredIp';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { useDemo } from '@/dezerx/lib/demo';
import { useT } from '@/i18n';

export function wrapProperties(value: unknown): any {
    if (value === null || typeof value === 'string' || typeof value === 'number') {
        return `<strong>${String(value)}</strong>`;
    }

    if (isObject(value)) {
        return getObjectKeys(value).reduce((obj, key) => {
            if (key === 'count' || (typeof key === 'string' && key.endsWith('_count'))) {
                return { ...obj, [key]: value[key] };
            }

            return { ...obj, [key]: wrapProperties(value[key]) };
        }, {} as Record<string, unknown>);
    }

    if (Array.isArray(value)) {
        return value.map(wrapProperties);
    }

    return value;
}

export function ActivityList({
    entries,
    pathTo,
    marks,
}: {
    entries: ActivityLog[];
    pathTo: (params: Record<string, string>) => string;
    marks?: (activity: ActivityLog) => ReactNode;
}) {
    return (
        <div className={'divide-y divide-line-field overflow-hidden rounded-2xl bg-card'}>
            {entries.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} pathTo={pathTo} marks={marks} />
            ))}
        </div>
    );
}

function ActivityRow({
    activity,
    pathTo,
    marks,
}: {
    activity: ActivityLog;
    pathTo: (params: Record<string, string>) => string;
    marks?: (activity: ActivityLog) => ReactNode;
}) {
    const t = useT();
    const theme = usePanelTheme();
    const demo = useDemo();
    const [open, setOpen] = useState(false);

    const blurIps = theme['activity.blurIps'];

    const actor = activity.relationships.actor;
    const properties = wrapProperties(activity.properties);

    return (
        <div className={'group flex gap-3 p-4'}>
            <div className={'hidden h-9 w-9 shrink-0 overflow-hidden rounded-full bg-overlay sm:flex'}>
                <Avatar name={actor?.uuid || 'system'} />
            </div>

            <div className={'min-w-0 flex-1'}>
                <div className={'flex flex-wrap items-center gap-x-2 gap-y-1'}>
                    <span
                        className={'text-sm font-medium text-ink'}
                        title={actor?.email || t('activityLog.systemUser')}
                    >
                        {actor?.username || t('activityLog.system')}
                    </span>

                    <Link
                        to={`#${pathTo({ event: activity.event })}`}
                        className={'font-mono text-xs text-ink-faint transition-colors hover:text-accent'}
                    >
                        {activity.event}
                    </Link>

                    {activity.isApi && (
                        <span title={t('activityLog.usingApiKey')} className={'text-ink-faint'}>
                            <Terminal className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        </span>
                    )}
                    {activity.event.startsWith('server:sftp.') && (
                        <span title={t('activityLog.overSftp')} className={'text-ink-faint'}>
                            <FolderOpen className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        </span>
                    )}

                    {marks?.(activity)}
                </div>

                <p className={'mt-0.5 text-sm leading-snug text-ink-muted'}>
                    <Translate values={properties} i18nKey={`activity.${activity.event.replace(':', '.')}`} />
                </p>

                <div className={'mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint'}>
                    {activity.ip ? (
                        <>
                            {!blurIps && <CountryFlag ip={activity.ip} />}
                            <BlurredIp reveal={blurIps}>
                                <Link
                                    to={`#${pathTo({ ip: activity.ip })}`}
                                    className={'font-mono transition-colors hover:text-accent'}
                                >
                                    {activity.ip}
                                </Link>
                            </BlurredIp>
                            <span aria-hidden={'true'}>{'·'}</span>
                        </>
                    ) : (
                        demo && (
                            <>
                                <BlurredIp permanent className={'font-mono'}>
                                    {t('activityLog.noIp')}
                                </BlurredIp>
                                <span aria-hidden={'true'}>{'·'}</span>
                            </>
                        )
                    )}

                    <time
                        dateTime={activity.timestamp.toISOString()}
                        title={format(activity.timestamp, 'MMM do, yyyy H:mm:ss')}
                    >
                        {formatRelative(activity.timestamp)}
                    </time>

                    {activity.hasAdditionalMetadata && (
                        <button
                            type={'button'}
                            onClick={() => setOpen((value) => !value)}
                            aria-expanded={open}
                            className={'ml-auto flex items-center gap-1 transition-colors hover:text-ink'}
                        >
                            <ClipboardList className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                            {t(open ? 'users.hideDetails' : 'users.details')}
                            <ChevronDown
                                aria-hidden={'true'}
                                className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
                            />
                        </button>
                    )}
                </div>

                {open && (
                    <pre
                        className={
                            'mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-raised p-3 font-mono text-[11px] leading-relaxed text-ink-muted'
                        }
                    >
                        {JSON.stringify(activity.properties, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    );
}

export function ActivityPager({
    pagination,
    onPage,
}: {
    pagination: PaginationDataSet;
    onPage: (page: number) => void;
}) {
    const t = useT();
    if (pagination.totalPages <= 1) {
        return null;
    }

    return (
        <div className={'flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3'}>
            <span className={'text-xs text-ink-faint'}>
                {t('common.pageOf', { current: pagination.currentPage, total: pagination.totalPages })}
            </span>

            <div className={'flex items-center gap-2'}>
                <Button
                    size={'sm'}
                    variant={'ghost'}
                    aria-label={t('common.previousPage')}
                    className={'h-8 w-8 px-0'}
                    disabled={pagination.currentPage <= 1}
                    onClick={() => onPage(pagination.currentPage - 1)}
                    icon={<ChevronLeft className={'h-4 w-4'} />}
                />
                <Button
                    size={'sm'}
                    variant={'ghost'}
                    aria-label={t('common.nextPage')}
                    className={'h-8 w-8 px-0'}
                    disabled={pagination.currentPage >= pagination.totalPages}
                    onClick={() => onPage(pagination.currentPage + 1)}
                    icon={<ChevronRight className={'h-4 w-4'} />}
                />
            </div>
        </div>
    );
}
