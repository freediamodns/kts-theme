import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import getServer from '@/api/server/getServer';
import type { ServerStatus } from '@/api/server/types';
import type { CreatedServer } from '@/api/dezerx/serverCreate';
import { Button } from '@/dezerx/components/ui';
import { serverHome } from '@/dezerx/lib/serverNav';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { useT } from '@/i18n';

const POLL_MS = 3000;

const PATIENCE_MS = 12 * 60 * 1000;

const DEMO_MS = 4200;

const DOTS = 8;

type Phase = 'installing' | 'failed' | 'stalled';

function Dots() {
    return (
        <div
            className={
                'relative h-16 w-16 motion-safe:animate-spin motion-reduce:animate-none [animation-duration:1.4s] [animation-timing-function:linear]'
            }
        >
            {Array.from({ length: DOTS }, (_, index) => (
                <span
                    key={index}
                    aria-hidden={'true'}
                    className={'absolute inset-0'}
                    style={{ transform: `rotate(${(index * 360) / DOTS}deg)` }}
                >
                    <span
                        className={'absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent'}
                        style={{ opacity: 1 - index / DOTS }}
                    />
                </span>
            ))}
        </div>
    );
}

export default function InstallProgress({ server, demo = false }: { server: CreatedServer; demo?: boolean }) {
    const t = useT();
    const history = useHistory();
    const theme = usePanelTheme();

    const [phase, setPhase] = useState<Phase>('installing');
    const started = useRef(Date.now());

    const open = () => history.push(serverHome(server.identifier, theme['overview.enabled']));

    useEffect(() => {
        let live = true;
        let timer = 0;

        const settle = (status: ServerStatus) => {
            if (status === 'install_failed' || status === 'reinstall_failed') {
                setPhase('failed');

                return true;
            }

            if (status !== 'installing' && status !== 'restoring_backup') {
                open();

                return true;
            }

            return false;
        };

        const ask = async () => {
            if (!live) {
                return;
            }

            if (Date.now() - started.current > PATIENCE_MS) {
                setPhase('stalled');

                return;
            }

            try {
                const [found] = await getServer(server.identifier);

                if (live && settle(found.status)) {
                    return;
                }
            } catch {
            }

            if (live) {
                timer = window.setTimeout(ask, POLL_MS);
            }
        };

        if (demo) {
            timer = window.setTimeout(ask, DEMO_MS);
        } else {
            void ask();
        }

        return () => {
            live = false;
            window.clearTimeout(timer);
        };
    }, [server.identifier, demo]);

    const stopped = phase !== 'installing';

    return (
        <div className={'flex min-h-[55vh] flex-col items-center justify-center gap-6 px-6 text-center'}>
            {stopped ? <TriangleAlert className={'h-10 w-10 text-warning'} aria-hidden={'true'} /> : <Dots />}

            <div className={'max-w-md'}>
                <h2 className={'font-akira text-lg tracking-tight text-ink'}>{t(`create.install.${phase}`)}</h2>
                <p className={'mt-2 text-sm leading-relaxed text-ink-muted'}>
                    {t(`create.install.${phase}Body`, { name: server.name })}
                </p>
            </div>

            <Button variant={stopped ? 'primary' : 'secondary'} size={'sm'} onClick={open}>
                {t('create.install.open')}
            </Button>
        </div>
    );
}

export { InstallProgress };
