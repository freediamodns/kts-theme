import React, { useEffect, useState } from 'react';
import { Websocket } from '@/plugins/Websocket';
import { ServerContext } from '@/state/server';
import getWebsocketToken from '@/api/server/getWebsocketToken';
import ContentContainer from '@/components/elements/ContentContainer';
import { CSSTransition } from 'react-transition-group';
import Spinner from '@/components/elements/Spinner';
import tw from 'twin.macro';
import { t } from '@/i18n';
import { isDemoUser } from '@/dezerx/lib/demo';
import { DemoSocket } from '@/dezerx/lib/demoServer';

const MINECRAFT_EGG = /minecraft|paper|purpur|spigot|bukkit|folia|bungee|velocity|waterfall|forge|fabric|quilt|sponge/i;

const reconnectErrors = ['jwt: exp claim is invalid', 'jwt: created too far in past (denylist)'];

export default () => {
    let updatingToken = false;
    const [error, setError] = useState<'connecting' | string>('');
    const { connected, instance } = ServerContext.useStoreState((state) => state.socket);
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const server = ServerContext.useStoreState((state) => state.server.data);
    const setServerStatus = ServerContext.useStoreActions((actions) => actions.status.setServerStatus);
    const { setInstance, setConnectionState } = ServerContext.useStoreActions((actions) => actions.socket);

    const updateToken = (uuid: string, socket: Websocket) => {
        if (updatingToken) return;

        updatingToken = true;
        getWebsocketToken(uuid)
            .then((data) => socket.setToken(data.token, true))
            .catch((error) => console.error(error))
            .then(() => {
                updatingToken = false;
            });
    };

    const connect = (uuid: string) => {
        if (isDemoUser() && server) {
            const demo = new DemoSocket({
                uuid,
                port: server.allocations.find((allocation) => allocation.isDefault)?.port ?? 25565,
                limits: server.limits,
                quiet: !MINECRAFT_EGG.test(server.egg?.name ?? ''),
            });

            demo.on('auth success', () => setConnectionState(true));
            demo.on('status', (status) => setServerStatus(status));

            setInstance(demo);
            demo.connect();

            return;
        }

        const socket = new Websocket();

        socket.on('auth success', () => setConnectionState(true));
        socket.on('SOCKET_CLOSE', () => setConnectionState(false));
        socket.on('SOCKET_CONNECT_ERROR', () => {
            setError(t('websocket.connectFailed'));
        });
        socket.on('SOCKET_ERROR', () => {
            setError('connecting');
            setConnectionState(false);
        });
        socket.on('status', (status) => setServerStatus(status));

        socket.on('daemon error', (message) => {
            console.warn('Got error message from daemon socket:', message);
        });

        socket.on('token expiring', () => updateToken(uuid, socket));
        socket.on('token expired', () => updateToken(uuid, socket));
        socket.on('jwt error', (error: string) => {
            setConnectionState(false);
            console.warn('JWT validation error from wings:', error);

            if (reconnectErrors.find((v) => error.toLowerCase().indexOf(v) >= 0)) {
                updateToken(uuid, socket);
            } else {
                setError(t('websocket.credentialsFailed'));
            }
        });

        socket.on('transfer status', (status: string) => {
            if (status === 'starting' || status === 'success') {
                return;
            }

            socket.close();
            setError('connecting');
            setConnectionState(false);
            setInstance(null);
            connect(uuid);
        });

        getWebsocketToken(uuid)
            .then((data) => {
                socket.setToken(data.token).connect(data.socket);

                setInstance(socket);
            })
            .catch((error) => console.error(error));
    };

    useEffect(() => {
        connected && setError('');
    }, [connected]);

    useEffect(() => {
        return () => {
            instance && instance.close();
        };
    }, [instance]);

    useEffect(() => {
        if (instance || !uuid) {
            return;
        }

        connect(uuid);
    }, [uuid]);

    return error ? (
        <CSSTransition timeout={150} in appear classNames={'fade'}>
            <div className={'py-2'}>
                <ContentContainer css={tw`flex items-center justify-center`}>
                    <div
                        className={
                            'flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-2 text-center shadow-panel'
                        }
                    >
                        {error === 'connecting' ? (
                            <>
                                <Spinner size={'small'} />
                                <p className={'text-sm text-red-100'}>
                                    We&apos;re having some trouble connecting to your server, please wait...
                                </p>
                            </>
                        ) : (
                            <p className={'text-sm text-white'}>{error}</p>
                        )}
                    </div>
                </ContentContainer>
            </div>
        </CSSTransition>
    ) : null;
};
