import React, { lazy } from 'react';
import { hot } from 'react-hot-loader/root';
import { Route, Router, Switch } from 'react-router-dom';
import { StoreProvider } from 'easy-peasy';
import { store } from '@/state';
import { SiteSettings } from '@/state/settings';
import ProgressBar from '@/components/elements/ProgressBar';
import { NotFound } from '@/components/elements/ScreenBlock';
import tw from 'twin.macro';
import GlobalStylesheet from '@/assets/css/GlobalStylesheet';
import { history } from '@/components/history';
import { setupInterceptors } from '@/api/interceptors';
import AuthenticatedRoute from '@/components/elements/AuthenticatedRoute';
import { ServerContext } from '@/state/server';
import '@fontsource-variable/montserrat';
import '@/assets/tailwind.css';
import { LoadingSuspense } from '@/dezerx/components/Loading';
import { ToastProvider } from '@/dezerx/components/ui/Toast';
import { IconSetProvider } from '@/dezerx/icons/runtime';
import { promoteStyles } from '@/dezerx/lib/appearance';

const DashboardRouter = lazy(() => import(/* webpackChunkName: "dashboard" */ '@/routers/DashboardRouter'));
const ServerRouter = lazy(() => import(/* webpackChunkName: "server" */ '@/routers/ServerRouter'));
const AuthenticationRouter = lazy(() => import(/* webpackChunkName: "auth" */ '@/routers/AuthenticationRouter'));

interface ExtendedWindow extends Window {
    SiteConfiguration?: SiteSettings;
    PterodactylUser?: {
        uuid: string;
        username: string;
        email: string;
        
        name_first: string;
        root_admin: boolean;
        demo: boolean;
        staff: boolean;
        use_totp: boolean;
        avatar_hash: string;
        avatar_url: string | null;
        language: string;
        updated_at: string;
        created_at: string;
        /* eslint-enable camelcase */
    };
}

setupInterceptors(history);

promoteStyles();

const App = () => {
    const { PterodactylUser, SiteConfiguration } = window as ExtendedWindow;
    if (PterodactylUser && !store.getState().user.data) {
        store.getActions().user.setUserData({
            uuid: PterodactylUser.uuid,
            username: PterodactylUser.username,
            nameFirst: PterodactylUser.name_first ?? '',
            email: PterodactylUser.email,
            language: PterodactylUser.language,
            rootAdmin: PterodactylUser.root_admin,
            demo: PterodactylUser.demo === true,
            staff: PterodactylUser.staff === true,
            useTotp: PterodactylUser.use_totp,
            avatarHash: PterodactylUser.avatar_hash ?? '',
            avatarUrl: PterodactylUser.avatar_url ?? null,
            createdAt: new Date(PterodactylUser.created_at),
            updatedAt: new Date(PterodactylUser.updated_at),
        });
    }

    if (!store.getState().settings.data) {
        store.getActions().settings.setSettings(SiteConfiguration!);
    }

    return (
        <IconSetProvider>
            <ToastProvider>
            <GlobalStylesheet />
            <StoreProvider store={store}>
                <ProgressBar />
                <div css={tw`mx-auto w-auto`}>
                    <Router history={history}>
                        <Switch>
                            <Route path={'/auth'}>
                                <LoadingSuspense full>
                                    <AuthenticationRouter />
                                </LoadingSuspense>
                            </Route>
                            <AuthenticatedRoute path={'/server/:id'}>
                                <LoadingSuspense full>
                                    <ServerContext.Provider>
                                        <ServerRouter />
                                    </ServerContext.Provider>
                                </LoadingSuspense>
                            </AuthenticatedRoute>
                            <AuthenticatedRoute path={'/'}>
                                <LoadingSuspense full>
                                    <DashboardRouter />
                                </LoadingSuspense>
                            </AuthenticatedRoute>
                            <Route path={'*'}>
                                <NotFound />
                            </Route>
                        </Switch>
                    </Router>
                </div>
            </StoreProvider>
        </ToastProvider>
        </IconSetProvider>
    );
};

export default hot(App);
