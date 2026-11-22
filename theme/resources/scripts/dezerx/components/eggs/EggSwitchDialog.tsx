import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Egg as EggIcon, TriangleAlert } from 'lucide-react';
import { Button, Checkbox } from '@/dezerx/components/ui';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { resolveEggArt } from '@/dezerx/lib/serverArtwork';
import { cn } from '@/dezerx/lib/cn';
import { EggSwitchChoices, EggSwitchOptions, EggTarget } from '@/api/server/eggSwitcher';
import { useT } from '@/i18n';

export interface SwitchRequest {
    from: { uuid: string; name: string; nest: string; image: string };
    to: EggTarget;
    options: EggSwitchOptions;
    onConfirm: (choices: EggSwitchChoices) => Promise<void>;
}

function EggMark({ uuid, name, size = 'md' }: { uuid: string; name: string; size?: 'sm' | 'md' }) {
    const theme = usePanelTheme();
    const logo = resolveEggArt(uuid, name, theme).logo;
    const [broken, setBroken] = useState(false);

    useEffect(() => setBroken(false), [logo]);

    const box = size === 'sm' ? 'h-9 w-9' : 'h-14 w-14';

    if (logo === null || broken) {
        return <></>;
    }

    return (
        <img
            src={logo}
            alt={''}
            aria-hidden={'true'}
            onError={() => setBroken(true)}
            className={cn('shrink-0 object-contain', box)}
        />
    );
}

function Side({ uuid, name, footnote, label }: { uuid: string; name: string; footnote: string; label: string }) {
    return (
        <div className={'flex min-w-0 flex-1 flex-col items-center gap-2 rounded-2xl bg-overlay/40 p-4 text-center'}>
            <EggMark uuid={uuid} name={name} />

            <div className={'min-w-0 w-full'}>
                <p className={'text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>{label}</p>
                <p className={'mt-0.5 truncate text-sm font-medium text-ink'}>{name}</p>
                <p className={'truncate text-[11px] text-ink-faint'}>{footnote || '—'}</p>
            </div>
        </div>
    );
}

export function EggSwitchDialog({ request, onClose }: { request: SwitchRequest | null; onClose: () => void }) {
    const t = useT();
    const [busy, setBusy] = useState(false);
    const [choices, setChoices] = useState<EggSwitchChoices>({ startup: true, reinstall: true, wipe: false });

    useEffect(() => {
        setBusy(false);
        setChoices({ startup: true, reinstall: true, wipe: false });
    }, [request]);

    const options = request?.options;
    const startup = options?.startup !== 'choose' || choices.startup;
    const reinstall = options?.reinstall !== 'choose' || choices.reinstall;
    const wipe = reinstall && (options?.wipe === 'force' || (options?.wipe === 'choose' && choices.wipe));
    const pick = (key: keyof EggSwitchChoices) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.currentTarget.checked;

        setChoices((current) => ({ ...current, [key]: checked }));
    };

    const confirm = async () => {
        if (!request || busy) {
            return;
        }

        setBusy(true);

        try {
            await request.onConfirm({ startup, reinstall, wipe });
            onClose();
        } catch {
        } finally {
            setBusy(false);
        }
    };

    const image = request?.to.images[0] ?? '';

    return (
        <DialogShell
            open={request !== null}
            onClose={() => !busy && onClose()}
            width={'lg'}
            title={request ? t('eggs.dialogTitle', { name: request.to.name }) : ''}
        >
            {request && (
                <div className={'mt-4 space-y-4'}>
                    <div className={'flex items-center gap-2'}>
                        <Side
                            label={t('eggs.runningNow')}
                            uuid={request.from.uuid}
                            name={request.from.name}
                            footnote={request.from.nest}
                        />

                        <ArrowLeftRight aria-hidden={'true'} className={'h-8 w-8 shrink-0 text-ink-faint'} />

                        <Side
                            label={t('eggs.switchingTo')}
                            uuid={request.to.uuid}
                            name={request.to.name}
                            footnote={request.to.nest}
                        />
                    </div>

                    <dl className={'space-y-1.5 rounded-2xl bg-overlay/30 p-3 text-xs'}>
                        <div className={'flex items-baseline justify-between gap-3'}>
                            <dt className={'shrink-0 text-ink-faint'}>{t('settings.image')}</dt>
                            <dd className={'min-w-0 truncate font-mono text-[11px] text-ink-muted'}>
                                {image === '' ? request.from.image || '—' : image}
                            </dd>
                        </div>

                        <div className={'flex items-baseline justify-between gap-3'}>
                            <dt className={'shrink-0 text-ink-faint'}>{t('eggs.startupAndVariables')}</dt>
                            <dd className={'min-w-0 truncate text-[11px] text-ink-muted'}>
                                {startup
                                    ? t('eggs.itsOwn', { name: request.to.name })
                                    : t('eggs.startupKept', { name: request.to.name })}
                            </dd>
                        </div>

                        {image === '' && (
                            <p className={'pt-1 text-[11px] text-ink-faint'}>{t('eggs.noImageOfItsOwn')}</p>
                        )}
                    </dl>

                    {(request.options.startup === 'choose' ||
                        request.options.reinstall === 'choose' ||
                        (reinstall && request.options.wipe === 'choose')) && (
                        <div className={'space-y-2.5 rounded-2xl bg-overlay/30 p-3'}>
                            {request.options.startup === 'choose' && (
                                <Checkbox
                                    size={'sm'}
                                    label={t('eggs.optionStartup', { name: request.to.name })}
                                    checked={choices.startup}
                                    disabled={busy}
                                    onChange={pick('startup')}
                                />
                            )}
                            {request.options.reinstall === 'choose' && (
                                <Checkbox
                                    size={'sm'}
                                    label={t('eggs.optionReinstall')}
                                    checked={choices.reinstall}
                                    disabled={busy}
                                    onChange={pick('reinstall')}
                                />
                            )}
                            {reinstall && request.options.wipe === 'choose' && (
                                <Checkbox
                                    size={'sm'}
                                    label={t('eggs.optionWipe')}
                                    checked={choices.wipe}
                                    disabled={busy}
                                    onChange={pick('wipe')}
                                />
                            )}
                        </div>
                    )}

                    <div
                        className={
                            'flex items-start gap-2.5 rounded-2xl bg-danger/10 p-3 text-xs leading-relaxed text-ink-muted'
                        }
                    >
                        <TriangleAlert aria-hidden={'true'} className={'mt-0.5 h-4 w-4 shrink-0 text-danger'} />
                        {reinstall ? (
                            <p>
                                {t('eggs.warningBefore')}
                                <span className={'font-medium text-ink'}>{request.to.name}</span>
                                {wipe ? t('eggs.warningWipe') : t('eggs.warningAfter')}
                            </p>
                        ) : (
                            <p>{t('eggs.warningNoReinstall', { name: request.to.name })}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type={'button'} variant={'ghost'} size={'sm'} onClick={onClose} disabled={busy}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type={'button'}
                            size={'sm'}
                            variant={'danger'}
                            loading={busy}
                            onClick={() => void confirm()}
                        >
                            {reinstall ? t('eggs.switchAndRebuild') : t('eggs.switchOnly')}
                        </Button>
                    </DialogFooter>
                </div>
            )}
        </DialogShell>
    );
}

export { EggMark };
export default EggSwitchDialog;
