import React, { ReactNode, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import { ArrowUpRight, ExternalLink, Link2, PictureInPicture2, TriangleAlert } from 'lucide-react';
import { ServerContext } from '@/state/server';
import { ContextMenu, ContextMenuRequest, useToast } from '@/dezerx/components/ui';
import SectionIsland, { IslandRequest } from '@/dezerx/components/console/SectionIsland';
import { NavContextHandler, NavContextTarget, OVERVIEW_PATH } from '@/dezerx/lib/serverNav';
import ServerHeader from '@/dezerx/components/console/ServerHeader';
import ServerNav from '@/dezerx/components/console/ServerNav';
import ServerSidebar from '@/dezerx/components/console/ServerSidebar';
import ServerTopBar from '@/dezerx/components/console/ServerTopBar';
import { ServerNotices } from '@/dezerx/components/NoticeBoard';
import ServiceNotice from '@/dezerx/components/ServiceNotice';
import { billingAvailable, billingNotices } from '@/api/server/billing';
import { StatsContext } from '@/dezerx/components/console/stats';
import { useResourceSamples } from '@/dezerx/components/console/useResourceSamples';
import { useSidebarSlot } from '@/dezerx/layouts/PanelLayout';
import { cn } from '@/dezerx/lib/cn';
import { serverHeaderVisible, sidebarShell, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { ShellWidthProvider, useMeasuredWidth, useShellSize } from '@/dezerx/lib/useShellWidth';
import { useT, type TranslateFn } from '@/i18n';

export default function ServerLayout({ children }: { children: ReactNode }) {
    const t = useT();
    const match = useRouteMatch<{ id: string }>();
    const history = useHistory();
    const { pathname } = useLocation();
    const theme = usePanelTheme();
    const { toast } = useToast();

    const bannerTakesOver =
        theme['overview.enabled'] &&
        pathname.replace(/\/+$/, '') === `${match.url.replace(/\/+$/, '')}${OVERVIEW_PATH}` &&
        theme['overview.blocks'].some((block) => block.kind === 'banner' && block.enabled);

    const { samples, latest } = useResourceSamples();
    const slot = useSidebarSlot();

    const stats = useMemo(() => ({ samples, latest }), [samples, latest]);

    const [menu, setMenu] = useState<ContextMenuRequest | null>(null);

    const status = ServerContext.useStoreState((state) => state.server.data!.status);
    const node = ServerContext.useStoreState((state) => state.server.data!.node);
    const isInstalling = ServerContext.useStoreState((state) => state.server.isInstalling);
    const isTransferring = ServerContext.useStoreState((state) => state.server.data!.isTransferring);
    const isNodeUnderMaintenance = ServerContext.useStoreState((state) => state.server.data!.isNodeUnderMaintenance);

    const suspended = status === 'suspended';

    const locked = suspended || isInstalling || isTransferring || isNodeUnderMaintenance;

    const { wide } = useShellSize();

    const [inner, setInner] = useState<HTMLElement | null>(null);
    const innerWidth = useMeasuredWidth(inner);

    const navbar = theme['manager.mode'] === 'navbar';
    const merged = theme['manager.mode'] === 'merged';
    const railed = !navbar && !merged && sidebarShell(theme['manager.design']).forceRail;

    const column = !navbar && !merged && wide;

    const [islands, setIslands] = useState<IslandRequest[]>([]);

    const openIsland = useCallback((target: NavContextTarget) => {
        const item = target.item;
        const component = item?.component;

        if (!item || !component) {
            return;
        }

        setIslands((current) => {
            const rest = current.filter((island) => island.id !== target.href);

            return [
                ...rest,
                {
                    id: target.href,
                    label: target.label,
                    to: target.href,
                    exact: item.exact,
                    icon: item.icon,
                    component,
                },
            ];
        });
    }, []);

    const onItemContextMenu = useCallback<NavContextHandler>(
        (event, target) => {
            event.preventDefault();

            const { href, label, item } = target;
            const absolute = new URL(href, window.location.origin).toString();

            setMenu({
                x: event.clientX,
                y: event.clientY,
                title: label,
                items: [
                    { label: t('serverLayout.open'), icon: ArrowUpRight, onSelect: () => history.push(href) },
                    ...(item?.component
                        ? [
                              {
                                  label: t('serverLayout.openInTab'),
                                  icon: PictureInPicture2,
                                  onSelect: () => openIsland(target),
                              },
                          ]
                        : []),
                    {
                        label: t('serverLayout.openInBrowserTab'),
                        icon: ExternalLink,
                        onSelect: () => window.open(absolute, '_blank', 'noopener'),
                    },
                    {
                        label: t('serverLayout.copyLink'),
                        icon: Link2,
                        onSelect: () => {
                            void navigator.clipboard
                                ?.writeText(absolute)
                                .then(() => toast(t('serverLayout.linkCopied'), { tone: 'success' }));
                        },
                    },
                ],
            });
        },
        [history, toast, openIsland, t]
    );

    const base = match.url;

    const nav = <ServerNav base={base} onItemContextMenu={onItemContextMenu} />;

    return (
        <StatsContext.Provider value={stats}>
            {merged && slot
                ? createPortal(
                      <ServerSidebar base={base} suspended={locked} onItemContextMenu={onItemContextMenu} />,
                      slot
                  )
                : null}

            <div
                className={cn(
                    'grid gap-4 sm:gap-6',
                    column
                        ? cn(
                              'items-start',
                              railed ? 'grid-cols-[4.75rem_minmax(0,1fr)]' : 'grid-cols-[12.5rem_minmax(0,1fr)]'
                          )
                        : 'grid-cols-1'
                )}
            >
                {!navbar && !merged && nav}

                <div ref={setInner} className={'min-w-0 space-y-4 sm:space-y-6'}>
                    {merged && <div className={'app-inline-nav lg:hidden'}>{nav}</div>}

                    {navbar ? (
                        <ServerTopBar
                            base={base}
                            uptimeMs={latest?.uptimeMs ?? 0}
                            suspended={locked}
                            statusLabel={conflictLabel(t, isInstalling, isTransferring, isNodeUnderMaintenance)}
                            onItemContextMenu={onItemContextMenu}
                        />
                    ) : (
                        serverHeaderVisible(theme) &&
                        !bannerTakesOver && (
                            <ServerHeader
                                uptimeMs={latest?.uptimeMs ?? 0}
                                suspended={locked}
                                statusLabel={conflictLabel(t, isInstalling, isTransferring, isNodeUnderMaintenance)}
                            />
                        )
                    )}

                    <ServerNotices node={node} />

                    {billingAvailable() && billingNotices().global && <ServiceNotice />}

                    {suspended && <Banner>{t('serverLayout.suspendedBanner')}</Banner>}

                    {!suspended && isNodeUnderMaintenance && <Banner>{t('serverLayout.maintenanceBanner')}</Banner>}

                    {!suspended && !isNodeUnderMaintenance && isInstalling && (
                        <Banner>{t('serverLayout.installingBanner')}</Banner>
                    )}

                    {!suspended && !isNodeUnderMaintenance && isTransferring && (
                        <Banner>{t('serverLayout.transferringBanner')}</Banner>
                    )}

                    <ShellWidthProvider value={innerWidth}>{children}</ShellWidthProvider>
                </div>
            </div>

            <ContextMenu request={menu} onClose={() => setMenu(null)} />

            {islands.length > 0 &&
                createPortal(
                    <>
                        {islands.map((island, index) => (
                            <SectionIsland
                                key={island.id}
                                request={island}
                                index={index}
                                onOpen={() => {
                                    history.push(island.to);
                                    setIslands((current) => current.filter((one) => one.id !== island.id));
                                }}
                                onClose={() => setIslands((current) => current.filter((one) => one.id !== island.id))}
                                onFocus={() =>
                                    setIslands((current) =>
                                        current[current.length - 1]?.id === island.id
                                            ? current
                                            : [...current.filter((one) => one.id !== island.id), island]
                                    )
                                }
                            />
                        ))}
                    </>,
                    document.body
                )}
        </StatsContext.Provider>
    );
}

function conflictLabel(
    t: TranslateFn,
    installing: boolean,
    transferring: boolean,
    maintenance: boolean
): string | undefined {
    if (maintenance) {
        return t('serverLayout.maintenance');
    }

    if (installing) {
        return t('serverLayout.installing');
    }

    if (transferring) {
        return t('conflict.transferring');
    }

    return undefined;
}

function Banner({ children }: { children: ReactNode }) {
    return (
        <div className={'flex items-start gap-2.5 rounded-2xl bg-danger/10 p-4 text-sm text-ink'}>
            <TriangleAlert aria-hidden={'true'} className={'mt-0.5 h-4 w-4 shrink-0 text-danger'} />
            <p>{children}</p>
        </div>
    );
}
