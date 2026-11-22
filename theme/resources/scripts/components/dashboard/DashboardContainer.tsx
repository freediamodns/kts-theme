import React, { useEffect, useMemo, useState } from 'react';
import { CategoryBar, IconAction, blankCategory, visibleServers } from '@/dezerx/components/ServerCategories';
import { ServerCategory, getCategories } from '@/api/account/preferences';
import { demoRefusal, useDemo } from '@/dezerx/lib/demo';
import useSWR from 'swr';
import { useLocation } from 'react-router-dom';
import { useStoreState } from 'easy-peasy';
import { FolderPlus, Inbox, LayoutGrid, Menu } from 'lucide-react';
import { Server } from '@/api/server/getServer';
import getServers from '@/api/getServers';
import { PaginatedResult } from '@/api/http';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import { usePersistedState } from '@/plugins/usePersistedState';
import { cn } from '@/dezerx/lib/cn';
import { matchesServer } from '@/dezerx/lib/serverSearch';
import useServerStats from '@/dezerx/lib/useServerStats';
import { RowDesign, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { useLayoutSearch } from '@/dezerx/layouts/PanelLayout';
import { Card, CardContent, CardHeader, Pager, Skeleton, SkeletonRegion, Toggle, useToast } from '@/dezerx/components/ui';
import ServerCard, { rowContainer } from '@/dezerx/components/ServerCard';
import QuickLinks from '@/dezerx/components/QuickLinks';
import ActivityPanel from '@/dezerx/components/ActivityPanel';
import NoticeBoard from '@/dezerx/components/NoticeBoard';
import CreateServerButton from '@/dezerx/components/create/CreateServerButton';
import { serverCreateAvailable } from '@/dezerx/lib/serverCreate';
import { CreateSummary, getCreateSummary } from '@/api/dezerx/serverCreate';
import { useT } from '@/i18n';

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wider text-ink-faint';

function EmptyState({ title, body }: { title: string; body: string }) {
    return (
        <CardContent className={'flex flex-col items-center px-6 py-14 text-center'}>
            <span className={'flex h-12 w-12 items-center justify-center rounded-2xl text-ink-faint'}>
                <Inbox className={'h-12 w-12'} />
            </span>
            <p className={'mt-4 text-sm font-medium text-ink'}>{title}</p>
            <p className={'mt-1 max-w-xs text-sm text-ink-faint'}>{body}</p>
        </CardContent>
    );
}

function ServerListSkeleton() {
    const t = useT();

    return (
        <SkeletonRegion label={t('dashboard.loadingServers')}>
            <div className={'grid gap-4'}>
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className={'rounded-2xl bg-card p-4'}>
                        <div className={'flex items-center gap-2.5'}>
                            <Skeleton className={'h-8 w-8 shrink-0 rounded-lg'} />
                            <div className={'min-w-0 flex-1'}>
                                <Skeleton className={'h-3.5 w-28'} />
                                <Skeleton className={'mt-1.5 h-3 w-20'} />
                            </div>
                        </div>
                        <Skeleton className={'mt-5 h-8 w-32'} />
                    </div>
                ))}
            </div>
        </SkeletonRegion>
    );
}

export default () => {
    const t = useT();
    const theme = usePanelTheme();
    const { toast } = useToast();

    const { search } = useLocation();
    const defaultPage = Number(new URLSearchParams(search).get('page') || '1');

    const [page, setPage] = useState(!isNaN(defaultPage) && defaultPage > 0 ? defaultPage : 1);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const uuid = useStoreState((state) => state.user.data!.uuid);
    const username = useStoreState((state) => state.user.data!.username);
    const nameFirst = useStoreState((state) => state.user.data!.nameFirst);
    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const appName = useStoreState((state) => state.settings.data?.name);
    const [showOnlyAdmin, setShowOnlyAdmin] = usePersistedState(`${uuid}:show_all_servers`, false);

    const query = useLayoutSearch();

    const { data: servers, error } = useSWR<PaginatedResult<Server>>(
        ['/api/client/servers', showOnlyAdmin && rootAdmin, page],
        () => getServers({ page, type: showOnlyAdmin && rootAdmin ? 'admin' : undefined })
    );

    const items = servers?.items ?? [];

    const creation = serverCreateAvailable();
    const { data: creating } = useSWR<CreateSummary>(
        creation ? '/api/client/dezerx/server-create/summary' : null,
        getCreateSummary
    );

    const [categories, setCategories] = useState<ServerCategory[]>([]);
    const [openCategory, setOpenCategory] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<ServerCategory | null>(null);

    useEffect(() => {
        getCategories()
            .then(setCategories)
            .catch(() => setCategories([]));
    }, []);
    const { stats, unreachable } = useServerStats(items);

    const scoped = useMemo(() => visibleServers(items, categories, openCategory), [items, categories, openCategory]);

    const grouped = categories.length > 0 && openCategory === null;
    const demo = useDemo();

    const [demoDesign, setDemoDesign] = usePersistedState<RowDesign | null>(`${uuid}:demo_row_design`, null);
    const rowDesign: RowDesign =
        demo && (demoDesign === 'banner' || demoDesign === 'tile') ? demoDesign : theme['manager.rows'];

    const newCategory = demo
        ? () => toast(demoRefusal(), { tone: 'error' })
        : () => setEditingCategory(blankCategory());

    const headerActions = (showNew: boolean) =>
        demo ? (
            <div className={'flex items-center gap-2'}>
                <DesignSwitch value={rowDesign} onChange={setDemoDesign} />
                {showNew && (
                    <IconAction
                        label={t('dashboard.newCategory')}
                        onClick={newCategory}
                        icon={<FolderPlus className={'h-4 w-4'} aria-hidden={'true'} />}
                    />
                )}
            </div>
        ) : (
            showNew && (
                <IconAction
                    label={t('dashboard.newCategory')}
                    onClick={newCategory}
                    icon={<FolderPlus className={'h-4 w-4'} aria-hidden={'true'} />}
                />
            )
        );

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();

        if (!needle) {
            return scoped;
        }

        return scoped.filter((server) => matchesServer(server, needle));
    }, [scoped, query]);

    useEffect(() => {
        setPage(1);
    }, [showOnlyAdmin]);

    useEffect(() => {
        if (!servers) return;
        if (servers.pagination.currentPage > 1 && !servers.items.length) {
            setPage(1);
        }
    }, [servers?.pagination.currentPage]);

    useEffect(() => {
        const title = t('nav.account.dashboard');

        document.title = appName ? `${appName} | ${title}` : title;
    }, [appName, t]);

    useEffect(() => {
        window.history.replaceState(null, document.title, `/${page <= 1 ? '' : `?page=${page}`}`);
    }, [page]);

    useEffect(() => {
        if (error) clearAndAddHttpError({ key: 'dashboard', error });
        if (!error) clearFlashes('dashboard');
    }, [error]);

    return (
        <div className={'space-y-6'}>
            <div className={'flex flex-wrap items-end justify-between gap-4'}>
                <div className={'min-w-0'}>
                    <h1 className={' truncate font-akira text-lg font-medium tracking-tight text-ink sm:text-2xl'}>
                        {t('dashboard.welcome', { name: nameFirst || username })}
                    </h1>
                    <p className={'mt-1 truncate text-sm text-ink-faint'}>{t('dashboard.subtitle')}</p>
                </div>

                <div className={'flex flex-wrap items-center gap-x-4 gap-y-2'}>
                    {rootAdmin && (
                        <div className={'flex items-center gap-2'}>
                            <span className={'text-xs text-ink-faint'}>
                                {t(showOnlyAdmin ? 'dashboard.showingOthers' : 'dashboard.showingYours')}
                            </span>
                            <Toggle
                                name={'show_all_servers'}
                                checked={showOnlyAdmin ?? false}
                                onChange={() => setShowOnlyAdmin((s) => !s)}
                                label={t(showOnlyAdmin ? 'dashboard.showingOthers' : 'dashboard.showingYours')}
                            />
                        </div>
                    )}

                    {creation && <CreateServerButton remaining={creating?.remaining} />}
                </div>
            </div>

            <FlashMessageRender byKey={'dashboard'} />

            <NoticeBoard />

            {theme['servers.quickLinks'] && <QuickLinks />}

            <div
                className={cn('grid gap-4', theme['servers.activity'] && 'xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')}
            >
                <div>
                    {grouped ? (
                        <div className={' flex items-center justify-between gap-3 mb-2'}>
                            <p className={SECTION_LABEL}>{t('dashboard.serverGroups')}</p>

                            {headerActions(true)}
                        </div>
                    ) : (
                        <CardHeader
                            className={'border-0 px-0 pb-4 pt-0'}
                            title={t('dashboard.yourServers')}
                            description={t('dashboard.yourServersDescription')}
                            action={headerActions(openCategory === null)}
                        />
                    )}

                    <CategoryBar
                        categories={categories}
                        servers={items}
                        open={openCategory}
                        onOpen={setOpenCategory}
                        stats={stats}
                        onChange={setCategories}
                        editing={editingCategory}
                        onEdit={setEditingCategory}
                    />

                    {grouped && filtered.length > 0 && (
                        <p className={cn(SECTION_LABEL, 'mb-3')}>{t('dashboard.unorganised')}</p>
                    )}

                    {!servers ? (
                        <ServerListSkeleton />
                    ) : (
                        <>
                            {items.length === 0 ? (
                                <EmptyState
                                    title={t(showOnlyAdmin ? 'dashboard.emptyOthers' : 'dashboard.emptyYours')}
                                    body={t(showOnlyAdmin ? 'dashboard.emptyOthersBody' : 'dashboard.emptyYoursBody')}
                                />
                            ) : filtered.length === 0 ? (
                                <CardContent className={'px-0 py-10 text-center text-sm text-ink-faint'}>
                                    {query.trim() !== ''
                                        ? t('dashboard.noMatches', { query: query.trim() })
                                        : openCategory !== null
                                        ? t('dashboard.emptyCategory')
                                        : ''}
                                </CardContent>
                            ) : (
                                <div className={rowContainer(rowDesign)}>
                                    {filtered.map((server, index) => (
                                        <ServerCard
                                            key={server.uuid}
                                            server={server}
                                            live={stats[server.uuid]}
                                            unreachable={Boolean(unreachable[server.uuid])}
                                            design={rowDesign}
                                            index={index}
                                        />
                                    ))}
                                </div>
                            )}

                            <Pager pagination={servers.pagination} onPage={setPage} />
                        </>
                    )}
                </div>

                {theme['servers.activity'] && (
                    <div className={'space-y-6'}>
                        <Card className={'h-fit shadow-none'}>
                            <ActivityPanel />
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

function DesignSwitch({ value, onChange }: { value: RowDesign; onChange: (design: RowDesign) => void }) {
    const t = useT();
    const options: { design: RowDesign; label: string; Icon: typeof Menu }[] = [
        { design: 'banner', label: t('dashboard.viewRows'), Icon: Menu },
        { design: 'tile', label: t('dashboard.viewTiles'), Icon: LayoutGrid },
    ];

    return (
        <div className={'flex rounded-xl bg-overlay p-0.5 ring-1 ring-line-field'} role={'group'} aria-label={t('dashboard.viewLabel')}>
            {options.map(({ design, label, Icon }) => (
                <button
                    key={design}
                    type={'button'}
                    title={label}
                    aria-label={label}
                    aria-pressed={value === design}
                    onClick={() => onChange(design)}
                    className={cn(
                        'grid h-8 w-8 place-items-center rounded-lg transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
                        value === design ? 'bg-raised text-ink shadow-sm' : 'text-ink-faint hover:text-ink'
                    )}
                >
                    <Icon className={'h-4 w-4'} aria-hidden={'true'} />
                </button>
            ))}
        </div>
    );
}
