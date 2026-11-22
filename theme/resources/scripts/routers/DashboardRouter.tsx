import React, { lazy } from 'react';
import { Route, Switch } from 'react-router-dom';
import DashboardContainer from '@/components/dashboard/DashboardContainer';
import { NotFound } from '@/components/elements/ScreenBlock';
import TransitionRouter from '@/TransitionRouter';
import { useLocation } from 'react-router';
import { Loading } from '@/dezerx/components/Loading';
import routes from '@/routers/routes';
import PanelLayout from '@/dezerx/layouts/PanelLayout';
import { accountMounts, pageTransition, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { useIsStaff } from '@/dezerx/lib/staff';
import { CREATE_PATH, serverCreateAvailable } from '@/dezerx/lib/serverCreate';
import { discordBotAvailable } from '@/dezerx/lib/addons';

const StaffContainer = lazy(() => import('@/dezerx/components/support/StaffContainer'));
const CreateServerContainer = lazy(() => import('@/dezerx/components/create/CreateServerContainer'));
const DiscordBotContainer = lazy(() => import('@/dezerx/components/discordbot/DiscordBotContainer'));

export default () => {
    const location = useLocation();
    const theme = usePanelTheme();
    const transition = pageTransition(theme['page.transition']);

    const mounts = React.useMemo(() => accountMounts(theme), [theme]);
    const staff = useIsStaff();
    const creation = serverCreateAvailable();
    const discordBot = React.useMemo(() => discordBotAvailable(), []);

    return (
        <PanelLayout>
            <TransitionRouter>
                <React.Suspense fallback={<Loading />}>
                    <div key={transition === '' ? undefined : location.pathname} className={transition}>
                        <Switch location={location}>
                            {(mounts.get('/') ?? ['/']).map((mount) => (
                                <Route key={`dashboard@${mount}`} path={mount} exact>
                                    <DashboardContainer />
                                </Route>
                            ))}
                            {routes.account.flatMap(({ path, component: Component }) => {
                                const declared =
                                    `/account/${path}`.replace(/\/+$/, '').replace('//', '/') || '/account';

                                return (mounts.get(declared) ?? [declared]).map((mount) => (
                                    <Route key={`${declared}@${mount}`} path={mount} exact>
                                        <Component />
                                    </Route>
                                ));
                            })}
                            {staff && (
                                <Route path={'/staff'} exact>
                                    <StaffContainer />
                                </Route>
                            )}
                            {discordBot && (
                                <Route path={'/account/discord'} exact>
                                    <DiscordBotContainer />
                                </Route>
                            )}
                            {creation && (
                                <Route path={CREATE_PATH} exact>
                                    <CreateServerContainer />
                                </Route>
                            )}
                            <Route path={'*'}>
                                <NotFound />
                            </Route>
                        </Switch>
                    </div>
                </React.Suspense>
            </TransitionRouter>
        </PanelLayout>
    );
};
