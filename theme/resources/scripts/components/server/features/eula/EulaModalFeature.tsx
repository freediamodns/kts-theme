import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import saveFileContents from '@/api/server/files/saveFileContents';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import { SocketEvent, SocketRequest } from '@/components/server/events';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { Button } from '@/dezerx/components/ui';
import { useT } from '@/i18n';
import Translate from '@/components/elements/Translate';

const EulaModalFeature = () => {
    const t = useT();
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { connected, instance } = ServerContext.useStoreState((state) => state.socket);

    useEffect(() => {
        if (!connected || !instance || status === 'running') return;

        const listener = (line: string) => {
            if (line.toLowerCase().indexOf('you need to agree to the eula in order to run the server') >= 0) {
                setVisible(true);
            }
        };

        instance.addListener(SocketEvent.CONSOLE_OUTPUT, listener);

        return () => {
            instance.removeListener(SocketEvent.CONSOLE_OUTPUT, listener);
        };
    }, [connected, instance, status]);

    const onAcceptEULA = () => {
        setLoading(true);
        clearFlashes('feature:eula');

        saveFileContents(uuid, 'eula.txt', 'eula=true')
            .then(() => {
                if (status === 'offline' && instance) {
                    instance.send(SocketRequest.SET_STATE, 'restart');
                }

                setLoading(false);
                setVisible(false);
            })
            .catch((error) => {
                console.error(error);
                clearAndAddHttpError({ key: 'feature:eula', error });
            })
            .then(() => setLoading(false));
    };

    useEffect(() => {
        clearFlashes('feature:eula');
    }, []);

    return (
        <DialogShell
            open={visible}
            onClose={() => undefined}
            title={t('features.eula.title')}
            body={
                <Translate
                    i18nKey={'features.eula.body'}
                    components={{
                        accept: <strong className={'font-semibold text-ink'} />,
                        file: <code className={'rounded bg-overlay/70 px-1 py-0.5 font-mono text-xs text-ink'} />,
                        link: (
                            <a
                                href={'https://www.minecraft.net/eula'}
                                target={'_blank'}
                                rel={'noreferrer noopener'}
                                className={'text-accent underline underline-offset-2 hover:text-accent/80'}
                            />
                        ),
                    }}
                />
            }
        >
            <FlashMessageRender byKey={'feature:eula'} className={'mt-4'} />

            <DialogFooter>
                <Button variant={'ghost'} disabled={loading} onClick={() => setVisible(false)}>
                    {t('features.eula.notNow')}
                </Button>

                <Button loading={loading} onClick={onAcceptEULA}>
                    {t('features.eula.accept')}
                </Button>
            </DialogFooter>
        </DialogShell>
    );
};

export default EulaModalFeature;
