import TransferListener from '@/components/server/TransferListener';
import React, { useEffect, useMemo, useState } from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';
import TransitionRouter from '@/TransitionRouter';
import WebsocketHandler from '@/components/server/WebsocketHandler';
import { ServerContext } from '@/state/server';
import { Loading, LoadingSuspense } from '@/dezerx/components/Loading';
import { NotFound, ServerError } from '@/components/elements/ScreenBlock';
import { httpErrorToHuman } from '@/api/http';
import { useStoreState } from 'easy-peasy';
import InstallListener from '@/components/server/InstallListener';
import ErrorBoundary from '@/components/elements/ErrorBoundary';
import { useLocation } from 'react-router';
import { ExternalLink } from 'lucide-react';
import ConflictStateRenderer from '@/components/server/ConflictStateRenderer';
import PermissionRoute from '@/components/elements/PermissionRoute';
import routes from '@/routers/routes';
import { addonAppliesTo } from '@/dezerx/lib/addons';
import PanelLayout from '@/dezerx/layouts/PanelLayout';
import ServerLayout from '@/dezerx/layouts/ServerLayout';
import { OVERVIEW_PATH, outOfReach, routeMounts, tabRoute } from '@/dezerx/lib/serverNav';
import { pageTransition, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { useT } from '@/i18n';

export default () => {
    const t = useT();
    const match = useRouteMatch<{ id: string }>();
    const location = useLocation();
    const theme = usePanelTheme();
    const transition = pageTransition(theme['page.transition']);

    const mounts = useMemo(() => routeMounts(theme), [theme]);

    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const demo = useStoreState((state) => state.user.data?.demo === true);
    const [error, setError] = useState('');

    const id = ServerContext.useStoreState((state) => state.server.data?.id);
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const inConflictState = ServerContext.useStoreState((state) => state.server.inConflictState);
    const serverId = ServerContext.useStoreState((state) => state.server.data?.internalId);
    const egg = ServerContext.useStoreState((state) => state.server.data?.egg?.uuid);
    const nodeId = ServerContext.useStoreState((state) => state.server.data?.nodeId ?? 0);

    const bypass = rootAdmin && !demo;

    const blocked = useMemo(
        () =>
            new Set<string>(
                bypass
                    ? []
                    : theme['manager.nav']
                          .filter((tab) => outOfReach(tab, nodeId))
                          .map((tab) => tabRoute(tab.route, tab.key))
            ),
        [theme, nodeId, bypass]
    );
    const getServer = ServerContext.useStoreActions((actions) => actions.server.getServer);
    const clearServerState = ServerContext.useStoreActions((actions) => actions.clearServerState);

    const to = (value: string, url = false) => {
        if (value === '/') {
            return url ? match.url : match.path;
        }
        return `${(url ? match.url : match.path).replace(/\/*$/, '')}/${value.replace(/^\/+/, '')}`;
    };

    useEffect(
        () => () => {
            clearServerState();
        },
        []
    );

    useEffect(() => {
        setError('');

        getServer(match.params.id).catch((error) => {
            console.error(error);
            setError(httpErrorToHuman(error));
        });

        return () => {
            clearServerState();
        };
    }, [match.params.id]);

    return (
        <PanelLayout
            inServer
            rail
            actions={
                rootAdmin && serverId ? (
                    <a
                        href={`/admin/servers/view/${serverId}`}
                        target={'_blank'}
                        rel={'noreferrer'}
                        title={t('serverLayout.manageInAdmin')}
                        aria-label={t('serverLayout.manageInAdmin')}
                        className={
                            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-3xl bg-raised text-ink-muted transition-colors hover:bg-overlay hover:text-ink'
                        }
                    >
                        <ExternalLink className={'h-4 w-4'} aria-hidden={'true'} />
                    </a>
                ) : null
            }
        >
            {!uuid || !id ? (
                error ? (
                    <ServerError message={error} />
                ) : (
                    <Loading />
                )
            ) : (
                <>
                    <InstallListener />
                    <TransferListener />
                    <WebsocketHandler />

                    <ServerLayout>
                        {inConflictState &&
                        (!rootAdmin || (rootAdmin && !location.pathname.endsWith(`/server/${id}`))) ? (
                            <ConflictStateRenderer />
                        ) : (
                            <ErrorBoundary>
                                <TransitionRouter>
                                    <div key={transition === '' ? undefined : location.pathname} className={transition}>
                                        <Switch location={location}>
                                            {routes.server
                                                .filter(
                                                    ({ path, addon }) =>
                                                        (path !== OVERVIEW_PATH || theme['overview.enabled']) &&
                                                        (addon === undefined || addonAppliesTo(addon, egg, nodeId)) &&
                                                        !blocked.has(path)
                                                )
                                                .map(({ path, permission, component: Component }) =>
                                                    (mounts.get(path) ?? [path]).map((mount) => (
                                                        <PermissionRoute
                                                            key={`${path}@${mount}`}
                                                            permission={permission}
                                                            path={to(mount)}
                                                            exact
                                                        >
                                                            <LoadingSuspense>
                                                                <Component />
                                                            </LoadingSuspense>
                                                        </PermissionRoute>
                                                    ))
                                                )}
                                            <Route path={'*'} component={NotFound} />
                                        </Switch>
                                    </div>
                                </TransitionRouter>
                            </ErrorBoundary>
                        )}
                    </ServerLayout>
                </>
            )}
        </PanelLayout>
    );
};
