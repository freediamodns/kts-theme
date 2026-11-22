import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Inbox, X } from 'lucide-react';
import { useActivityLogs } from '@/api/server/activity';
import { ActivityLogFilters } from '@/api/account/activity';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import useLocationHash from '@/plugins/useLocationHash';
import { Badge, Button, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { ActivityList, ActivityPager } from '@/dezerx/components/activity/ActivityLog';
import CountryFlag from '@/dezerx/components/CountryFlag';
import BlurredIp from '@/dezerx/components/BlurredIp';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { useT } from '@/i18n';

export default () => {
    const t = useT();
    const blurIps = usePanelTheme()['activity.blurIps'];
    const { toast } = useToast();
    const { hash, pathTo } = useLocationHash();
    const history = useHistory();

    const [filters, setFilters] = useState<ActivityLogFilters>({ page: 1, sorts: { timestamp: -1 } });

    const { data, isValidating, error } = useActivityLogs(filters, {
        revalidateOnMount: true,
        revalidateOnFocus: false,
    });

    useEffect(() => {
        setFilters((value) => ({ ...value, filters: { ip: hash.ip, event: hash.event } }));
    }, [hash]);

    useEffect(() => {
        if (error) {
            toast(apiMessage(error, t('activityLog.loadFailed')), { tone: 'error' });
        }
    }, [error]);

    const filtered = Boolean(filters.filters?.event || filters.filters?.ip);

    return (
        <ServerContentBlock title={'Activity'}>
            {!data && isValidating ? (
                <SectionSkeleton label={t('activityLog.loading')} />
            ) : (
                <div className={'space-y-4'}>
                    <SectionHeader
                        title={'Activity'}
                        description={t('activityLog.serverDescription')}
                        action={
                            filtered && (
                                <Button
                                    size={'sm'}
                                    variant={'secondary'}
                                    icon={<X className={'h-3.5 w-3.5'} />}
                                    onClick={() => {
                                        history.push({ hash: '' });
                                        setFilters((value) => ({ ...value, filters: {}, page: 1 }));
                                    }}
                                >
                                    {t('activityLog.clearFilters')}
                                </Button>
                            )
                        }
                    />

                    {filtered && (
                        <div className={'flex flex-wrap items-center gap-2'}>
                            {filters.filters?.event && (
                                <Badge tone={'info'}>{`Event · ${filters.filters.event}`}</Badge>
                            )}
                            {filters.filters?.ip && (
                                <Badge tone={'info'}>
                                    {!blurIps && <CountryFlag ip={String(filters.filters.ip)} />}
                                    {'IP · '}
                                    <BlurredIp reveal={blurIps}>{String(filters.filters.ip)}</BlurredIp>
                                </Badge>
                            )}
                        </div>
                    )}

                    {!data?.items.length ? (
                        <SectionEmpty
                            icon={Inbox}
                            title={t('activityLog.emptyTitle')}
                            body={filtered ? t('activityLog.emptyFiltered') : t('activityLog.serverEmptyBody')}
                        />
                    ) : (
                        <ActivityList entries={data.items} pathTo={pathTo} />
                    )}

                    {data && (
                        <ActivityPager
                            pagination={data.pagination}
                            onPage={(page) => setFilters((value) => ({ ...value, page }))}
                        />
                    )}
                </div>
            )}
        </ServerContentBlock>
    );
};
