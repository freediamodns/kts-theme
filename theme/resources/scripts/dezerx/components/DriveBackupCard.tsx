import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { CheckCircle2, CircleAlert, Loader2, Unplug, UploadCloud } from 'lucide-react';
import { Button, Select, Skeleton, useToast } from '@/dezerx/components/ui';
import { apiMessage } from '@/dezerx/components/console/Section';
import { GoogleDriveMark } from '@/dezerx/components/GoogleDriveMark';
import { addonAppliesTo, DRIVE_BACKUPS } from '@/dezerx/lib/addons';
import { ServerContext } from '@/state/server';
import { DriveStatus, disconnectDrive, getDrive, runDrive, saveDrive } from '@/api/server/drive';
import { useT, type TranslateFn } from '@/i18n';

const intervals = (t: TranslateFn) => [
    { value: '0', label: t('drive.intervalManual') },
    { value: '6', label: t('drive.interval6') },
    { value: '12', label: t('drive.interval12') },
    { value: '24', label: t('drive.interval24') },
    { value: '72', label: t('drive.interval72') },
    { value: '168', label: t('drive.interval168') },
];

const keepOptions = (t: TranslateFn) =>
    ['1', '3', '5', '10', '20'].map((value) => ({ value, label: t('drive.keepNewest', { total: value }) }));

export function DriveBackupCard() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const egg = ServerContext.useStoreState((state) => state.server.data?.egg?.uuid);
    const { toast } = useToast();
    const { search } = useLocation();

    const [status, setStatus] = useState<DriveStatus | null>(null);
    const [busy, setBusy] = useState(false);

    const enabled = addonAppliesTo(DRIVE_BACKUPS, egg);

    const load = () =>
        getDrive(uuid)
            .then(setStatus)
            .catch(() => setStatus(null));

    useEffect(() => {
        if (enabled) {
            void load();
        }
    }, [uuid, enabled]);

    useEffect(() => {
        const outcome = new URLSearchParams(search).get('drive');

        if (!outcome) {
            return;
        }

        if (outcome === 'connected') {
            toast(t('drive.connected'), { tone: 'success' });
            void load();
        } else if (outcome === 'failed') {
            toast(t('drive.connectFailed'), { tone: 'error' });
        }

        window.history.replaceState({}, '', window.location.pathname);
    }, [search]);

    useEffect(() => {
        if (status?.lastState !== 'running') {
            return;
        }

        const timer = window.setInterval(() => void load(), 5000);

        return () => window.clearInterval(timer);
    }, [status?.lastState, uuid]);

    if (!enabled) {
        return null;
    }

    if (status === null) {
        return <Skeleton className={'mb-4 h-[7.5rem] rounded-2xl'} />;
    }

    const update = async (intervalHours: number, keep: number) => {
        setBusy(true);

        try {
            await saveDrive(uuid, intervalHours, keep);
            setStatus({ ...status, intervalHours, keep });
        } catch (error) {
            toast(apiMessage(error, t('drive.saveFailed')), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const run = async () => {
        setBusy(true);

        try {
            const { message } = await runDrive(uuid);

            toast(message, { tone: 'success' });
            await load();
        } catch (error) {
            toast(apiMessage(error, t('drive.runFailed')), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const disconnect = async () => {
        setBusy(true);

        try {
            await disconnectDrive(uuid);
            toast(t('drive.disconnected'), { tone: 'success' });
            await load();
        } catch (error) {
            toast(apiMessage(error, t('drive.disconnectFailed')), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={'mb-4 rounded-2xl bg-card p-4'}>
            <div className={'flex flex-wrap items-start gap-3'}>
                <GoogleDriveMark className={'mt-0.5 h-6 w-6 shrink-0'} />

                <div className={'min-w-0 flex-1'}>
                    <p className={'text-sm font-medium text-ink'}>Google Drive</p>

                    <p className={'mt-0.5 text-xs text-ink-faint'}>
                        {!status.configured
                            ? t('drive.notConfigured')
                            : status.connected
                            ? t('drive.copyingInto', {
                                  account: status.account ?? t('drive.aConnectedAccount'),
                              })
                            : t('drive.notConnected')}
                    </p>

                    {status.connected && status.lastMessage && (
                        <p
                            className={'mt-1.5 flex items-start gap-1.5 text-[11px] text-ink-faint'}
                            role={status.lastState === 'failed' ? 'alert' : undefined}
                        >
                            {status.lastState === 'running' ? (
                                <Loader2 className={'mt-0.5 h-3 w-3 shrink-0 animate-spin'} aria-hidden={'true'} />
                            ) : status.lastState === 'failed' ? (
                                <CircleAlert className={'mt-0.5 h-3 w-3 shrink-0 text-danger'} aria-hidden={'true'} />
                            ) : (
                                <CheckCircle2 className={'mt-0.5 h-3 w-3 shrink-0 text-success'} aria-hidden={'true'} />
                            )}
                            <span>
                                {status.lastMessage}
                                {status.lastState !== 'running' && status.lastRunAt && (
                                    <span className={'text-ink-faint/70'}>
                                        {' · '}
                                        {formatDistanceToNowStrict(new Date(status.lastRunAt), { addSuffix: true })}
                                    </span>
                                )}
                            </span>
                        </p>
                    )}
                </div>

                <div className={'flex shrink-0 items-center gap-1.5'}>
                    {status.configured && !status.connected && status.connectUrl && (
                        <Button
                            size={'sm'}
                            variant={'primary'}
                            onClick={() => window.location.assign(status.connectUrl!)}
                        >
                            {t('drive.connect')}
                        </Button>
                    )}

                    {status.connected && (
                        <>
                            <Button
                                size={'sm'}
                                variant={'primary'}
                                loading={busy || status.lastState === 'running'}
                                onClick={() => void run()}
                                icon={<UploadCloud className={'h-3.5 w-3.5'} />}
                            >
                                {t('drive.backUpNow')}
                            </Button>
                            <button
                                type={'button'}
                                disabled={busy}
                                onClick={() => void disconnect()}
                                title={t('drive.disconnect')}
                                aria-label={t('drive.disconnect')}
                                className={
                                    'inline-flex h-8 w-8 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 disabled:pointer-events-none disabled:opacity-40'
                                }
                            >
                                <Unplug className={'h-4 w-4'} aria-hidden={'true'} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {status.connected && (
                <div className={'mt-3 grid gap-3 sm:grid-cols-2'}>
                    <Select
                        label={t('drive.howOften')}
                        value={String(status.intervalHours)}
                        onChange={(value) => void update(Number(value), status.keep)}
                        options={intervals(t)}
                        disabled={busy}
                    />
                    <Select
                        label={t('drive.historyKept')}
                        hint={t('drive.historyHint')}
                        value={String(status.keep)}
                        onChange={(value) => void update(status.intervalHours, Number(value))}
                        options={keepOptions(t)}
                        disabled={busy}
                    />
                </div>
            )}
        </div>
    );
}
