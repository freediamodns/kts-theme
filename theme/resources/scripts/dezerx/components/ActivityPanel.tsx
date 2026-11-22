import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { useActivityLogs } from '@/api/account/activity';
import { cn } from '@/dezerx/lib/cn';
import { formatRelative } from '@/dezerx/lib/format';
import { Button, CardContent, CardFooter, CardHeader, Skeleton, SkeletonRegion } from '@/dezerx/components/ui';
import CountryFlag from '@/dezerx/components/CountryFlag';
import BlurredIp from '@/dezerx/components/BlurredIp';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { useDemo } from '@/dezerx/lib/demo';
import { useT } from '@/i18n';

const PAGE_SIZE = 3;

function humanize(event: string): string {
    const label = event.split(':').pop() ?? event;

    return label
        .replace(/[._-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase());
}

function scope(event: string): string {
    const [prefix] = event.split(':');

    return prefix ? prefix.replace(/^./, (c) => c.toUpperCase()) : '';
}

function ActivitySkeleton() {
    const t = useT();
    return (
        <SkeletonRegion label={t('activityLog.loading')}>
            <CardContent className={'space-y-4'}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={'flex gap-3'}>
                        <Skeleton className={'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full'} />
                        <div className={'flex-1 space-y-2'}>
                            <Skeleton className={'h-3.5 w-32'} />
                            <Skeleton className={'h-3 w-48'} />
                        </div>
                    </div>
                ))}
            </CardContent>
        </SkeletonRegion>
    );
}

export default function ActivityPanel() {
    const t = useT();
    const demo = useDemo();
    const blurIps = usePanelTheme()['activity.blurIps'];
    const [page, setPage] = useState(0);

    const { data, error } = useActivityLogs(
        { page: 1, sorts: { timestamp: -1 } },
        { revalidateOnMount: true, revalidateOnFocus: false }
    );

    if (error) {
        return (
            <>
                <CardHeader title={t('activityLog.recent')} />
                <CardContent className={'px-5 py-10 text-center text-sm text-ink-faint'}>
                    {t('activityLog.loadFailed')}
                </CardContent>
            </>
        );
    }

    if (!data) {
        return (
            <>
                <CardHeader title={t('activityLog.recent')} />
                <ActivitySkeleton />
            </>
        );
    }

    const entries = data.items;
    const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    const current = Math.min(page, pageCount - 1);
    const start = current * PAGE_SIZE;
    const visible = entries.slice(start, start + PAGE_SIZE);

    return (
        <>
            <CardHeader
                title={t('activityLog.recent')}
                description={entries.length > 0 ? t('activityLog.recentEvents', { count: entries.length }) : undefined}
            />

            {entries.length === 0 ? (
                <CardContent className={'flex flex-col items-center px-6 py-14 text-center'}>
                    <Inbox className={'h-12 w-12 text-ink-faint'} />
                    <p className={'mt-4 text-sm font-medium text-ink'}>{t('activityLog.panelEmptyTitle')}</p>
                    <p className={'mt-1 max-w-xs text-sm text-ink-faint'}>{t('activityLog.panelEmptyBody')}</p>
                </CardContent>
            ) : (
                <CardContent className={'p-4'}>
                    {visible.map((entry, index) => {
                        const last = index === visible.length - 1;

                        return (
                            <div key={entry.id} className={'flex gap-3'}>
                                <div aria-hidden={'true'} className={'flex w-3 shrink-0 flex-col items-center'}>
                                    <span className={'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent'} />
                                    {!last && <span className={'w-px flex-1 bg-line-field'} />}
                                </div>

                                <div className={cn('min-w-0 flex-1', last ? 'pb-0' : 'pb-5')}>
                                    <div className={'flex items-start justify-between gap-3'}>
                                        <p className={'min-w-0 text-sm font-medium text-ink'}>
                                            {humanize(entry.event)}
                                        </p>

                                        <time
                                            dateTime={entry.timestamp.toISOString()}
                                            title={entry.timestamp.toLocaleString()}
                                            className={'shrink-0 text-xs text-ink-faint'}
                                        >
                                            {formatRelative(entry.timestamp)}
                                        </time>
                                    </div>

                                    <p className={'mt-0.5 flex items-center gap-1.5 text-xs text-ink-faint'}>
                                        {entry.ip && !blurIps && <CountryFlag ip={entry.ip} />}
                                        <span className={'truncate'}>{scope(entry.event)}</span>

                                        {entry.ip ? (
                                            <>
                                                <span aria-hidden={'true'}>{'·'}</span>
                                                <BlurredIp reveal={blurIps} className={'truncate'}>
                                                    {entry.ip}
                                                </BlurredIp>
                                            </>
                                        ) : (
                                            demo && (
                                                <>
                                                    <span aria-hidden={'true'}>{'·'}</span>
                                                    <BlurredIp permanent className={'truncate'}>
                                                        {t('activityLog.noIp')}
                                                    </BlurredIp>
                                                </>
                                            )
                                        )}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            )}

            {entries.length > PAGE_SIZE && (
                <CardFooter className={'justify-between'}>
                    <span className={'text-xs text-ink-faint'}>
                        Page {current + 1} of {pageCount}
                    </span>

                    <div className={'flex items-center gap-2'}>
                        <Button
                            variant={'ghost'}
                            size={'sm'}
                            aria-label={t('common.previousPage')}
                            disabled={current === 0}
                            onClick={() => setPage(current - 1)}
                            className={'h-8 w-8 px-0'}
                            icon={<ChevronLeft className={'h-4 w-4'} />}
                        />
                        <Button
                            variant={'ghost'}
                            size={'sm'}
                            aria-label={t('common.nextPage')}
                            disabled={current >= pageCount - 1}
                            onClick={() => setPage(current + 1)}
                            className={'h-8 w-8 px-0'}
                            icon={<ChevronRight className={'h-4 w-4'} />}
                        />
                    </div>
                </CardFooter>
            )}
        </>
    );
}

export { ActivityPanel };
