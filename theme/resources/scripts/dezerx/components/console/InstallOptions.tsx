import React from 'react';
import { Dialog } from '@headlessui/react';
import { TriangleAlert } from 'lucide-react';
import { Button, Checkbox } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { Trans } from 'react-i18next';
import { useT } from '@/i18n';

export function InstallOptions({
    open,
    platform,
    version,
    build = null,
    busy,
    wipe,
    eula,
    onWipe,
    onEula,
    onConfirm,
    onClose,
}: {
    open: boolean;
    platform: string;
    version: string;
    build?: string | null;
    busy: boolean;
    wipe: boolean;
    eula: boolean;
    onWipe: (next: boolean) => void;
    onEula: (next: boolean) => void;
    onConfirm: () => void;
    onClose: () => void;
}) {
    const t = useT();
    return (
        <Dialog open={open} onClose={busy ? () => undefined : onClose} className={'relative z-[80]'}>
            <div aria-hidden={'true'} className={'fixed inset-0 bg-black/50 backdrop-blur-sm animate-backdrop-in'} />

            <div className={'fixed inset-0 flex items-center justify-center p-4'}>
                <Dialog.Panel
                    className={
                        'animate-modal-in w-full max-w-md overflow-hidden rounded-2xl dz-on-raised bg-raised p-5 shadow-panel ring-1 ring-line-field motion-reduce:animate-none'
                    }
                >
                    <Dialog.Title className={'text-base font-semibold tracking-tight text-ink'}>
                        {t('install.title', { platform, version })}
                    </Dialog.Title>

                    {build && <p className={'mt-1 text-xs font-medium text-accent'}>{t('install.build', { build })}</p>}

                    <p className={'mt-1 text-xs text-ink-muted'}>{t('install.stoppedFirst')}</p>

                    <div className={'mt-4 space-y-2'}>
                        <label
                            className={cn(
                                'flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition-colors',
                                wipe
                                    ? 'bg-danger/10 ring-danger/40'
                                    : 'bg-overlay/40 ring-line-field hover:bg-overlay/70'
                            )}
                        >
                            <Checkbox checked={wipe} onChange={(event) => onWipe(event.target.checked)} />
                            <span className={'min-w-0'}>
                                <span className={'flex items-center gap-1.5 text-sm font-medium text-ink'}>
                                    {t('install.wipeTitle')}
                                    {wipe && (
                                        <TriangleAlert
                                            aria-hidden={'true'}
                                            className={'h-3.5 w-3.5 shrink-0 text-danger'}
                                        />
                                    )}
                                </span>
                                <span className={'mt-0.5 block text-xs text-ink-muted'}>{t('install.wipeBody')}</span>
                            </span>
                        </label>

                        <label
                            className={
                                'flex cursor-pointer items-start gap-3 rounded-xl bg-overlay/40 p-3 ring-1 ring-line-field transition-colors hover:bg-overlay/70'
                            }
                        >
                            <Checkbox checked={eula} onChange={(event) => onEula(event.target.checked)} />
                            <span className={'min-w-0'}>
                                <span className={'block text-sm font-medium text-ink'}>{t('install.eulaTitle')}</span>
                                <span className={'mt-0.5 block text-xs text-ink-muted'}>
                                    <Trans
                                        i18nKey={'install.eulaBody'}
                                        components={{
                                            a: (
                                                <a
                                                    href={'https://minecraft.net/eula'}
                                                    target={'_blank'}
                                                    rel={'noreferrer noopener'}
                                                    className={'underline underline-offset-2 hover:text-ink'}
                                                />
                                            ),
                                        }}
                                    />
                                </span>
                            </span>
                        </label>
                    </div>

                    {wipe && (
                        <p className={'mt-3 rounded-xl bg-danger/10 p-3 text-xs text-ink'}>
                            {t('install.wipeWarning')}
                        </p>
                    )}

                    <div className={'mt-5 flex justify-end gap-2'}>
                        <Button size={'sm'} variant={'ghost'} disabled={busy} onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button size={'sm'} variant={wipe ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
                            {wipe ? t('modpacks.wipeInstall') : t('install.confirm')}
                        </Button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
