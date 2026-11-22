import React, { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Paintbrush } from 'lucide-react';
import { Button } from '@/dezerx/components/ui';
import { setEditorOpen } from '@/dezerx/components/editor/store';
import { useDemo } from '@/dezerx/lib/demo';
import { Trans } from 'react-i18next';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { useT } from '@/i18n';

const SEEN = 'dezerx.demo.welcomed';


export function DemoWelcome() {
    const t = useT();
    const demo = useDemo();
    const panel = useStoreState((state: ApplicationStore) => state.settings.data?.name) ?? t('demo.thePanel');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!demo) {
            return;
        }

        try {
            if (window.sessionStorage.getItem(SEEN) === '1') {
                return;
            }

            window.sessionStorage.setItem(SEEN, '1');
        } catch {
        }

        setOpen(true);
    }, [demo]);

    if (!demo) {
        return null;
    }

    const close = () => setOpen(false);

    return (
        <Dialog open={open} onClose={close} className={'relative z-[60]'}>
            <div className={'fixed inset-0  backdrop-blur-sm animate-backdrop-in'} aria-hidden={'true'} />

            <div className={'fixed inset-0 flex items-center justify-center p-4'}>
                <Dialog.Panel
                    className={
                        'w-full max-w-md overflow-hidden rounded-2xl dz-on-raised bg-raised/60 p-6 shadow-panel ring-1 ring-line-field backdrop-blur-xl animate-modal-in motion-reduce:animate-none'
                    }
                >
                    <Dialog.Title className={'text-xl font-semibold tracking-tight text-ink'}>
                        {t('demo.welcomeTitle')}
                    </Dialog.Title>

                    <Dialog.Description className={'mt-2 text-sm text-ink-muted'}>
                        {t('demo.welcomeBody')}
                    </Dialog.Description>

                    <p className={'mt-3 text-sm text-ink-muted'}>
                        <Trans
                            i18nKey={'demo.editorLine'}
                            components={{ b: <strong className={'font-medium text-ink'} /> }}
                        />
                    </p>

                    <div className={'mt-6 flex flex-col gap-2 sm:flex-row-reverse'}>
                        <Button
                            fullWidth
                            onClick={() => {
                                close();
                                setEditorOpen(true);
                            }}
                            icon={<Paintbrush className={'h-4 w-4'} />}
                        >
                            {t('demo.openEditor')}
                        </Button>

                        <Button fullWidth variant={'secondary'} onClick={close}>
                            {t('demo.lookAround')}
                        </Button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

export default DemoWelcome;
