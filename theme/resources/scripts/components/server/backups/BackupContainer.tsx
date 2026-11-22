import React, { FormEvent, useContext, useEffect, useState } from 'react';
import {
    Archive,
    ChevronLeft,
    ChevronRight,
    Download,
    Loader2,
    Lock,
    LockOpen,
    Plus,
    RotateCcw,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { DriveBackupCard } from '@/dezerx/components/DriveBackupCard';
import { ServerContext } from '@/state/server';
import { ServerBackup } from '@/api/server/types';
import { SocketEvent } from '@/components/server/events';
import useWebsocketEvent from '@/plugins/useWebsocketEvent';
import { usePermissions } from '@/plugins/usePermissions';
import getServerBackups, { Context as ServerBackupContext } from '@/api/swr/getServerBackups';
import createServerBackup from '@/api/server/backups/createServerBackup';
import deleteBackup from '@/api/server/backups/deleteBackup';
import getBackupDownloadUrl from '@/api/server/backups/getBackupDownloadUrl';
import { restoreServerBackup } from '@/api/server/backups';
import http from '@/api/http';
import { bytesToString } from '@/lib/formatters';
import { Badge, Button, Checkbox, Input, Notice, useToast } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { useT } from '@/i18n';

const BackupContainer = () => {
    const t = useT();
    const { toast } = useToast();
    const { page, setPage } = useContext(ServerBackupContext);

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const limit = ServerContext.useStoreState((state) => state.server.data!.featureLimits.backups);
    const setServerFromState = ServerContext.useStoreActions((actions) => actions.server.setServerFromState);

    const [canCreate, canDownload, canRestore, canDelete] = usePermissions([
        'backup.create',
        'backup.download',
        'backup.restore',
        'backup.delete',
    ]);

    const status = ServerContext.useStoreState((state) => state.status.value);

    const { data, error, mutate } = getServerBackups();

    const [creating, setCreating] = useState(false);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [restoring, setRestoring] = useState<ServerBackup | null>(null);

    const items = data?.items ?? [];
    const count = data?.backupCount ?? 0;
    const full = limit > 0 && count >= limit;
    const running = items.some((backup) => backup.completedAt === null);

    const remove = (backup: ServerBackup) =>
        setDialog({
            title: t('backups.deleteTitle', { name: backup.name }),
            body: t('backups.deleteBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteBackup(uuid, backup.uuid);

                    await mutate(
                        (current) => ({
                            ...current,
                            items: current.items.filter((value) => value.uuid !== backup.uuid),
                            backupCount: current.backupCount - 1,
                        }),
                        false
                    );
                    toast(t('backups.deleted'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('backups.deleteFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    const unlock = (backup: ServerBackup) =>
        setDialog({
            title: t('backups.unlockTitle', { name: backup.name }),
            body: t('backups.unlockBody'),
            confirmLabel: t('backups.unlock'),
            onConfirm: () => toggleLock(backup),
        });

    const toggleLock = async (backup: ServerBackup) => {
        try {
            await http.post(`/api/client/servers/${uuid}/backups/${backup.uuid}/lock`);

            await mutate(
                (current) => ({
                    ...current,
                    items: current.items.map((value) =>
                        value.uuid === backup.uuid ? { ...value, isLocked: !value.isLocked } : value
                    ),
                }),
                false
            );
            toast(t(backup.isLocked ? 'backups.unlocked' : 'backups.locked'), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('backups.lockFailed')), { tone: 'error' });

            throw error;
        }
    };

    const download = async (backup: ServerBackup) => {
        try {
            const url = await getBackupDownloadUrl(uuid, backup.uuid);

            window.location.href = url;
        } catch (error) {
            console.error(error);
            toast(apiMessage(error, t('backups.downloadFailed')), { tone: 'error' });
        }
    };

    return (
        <ServerContentBlock title={t('backups.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <RestoreDialog
                backup={restoring}
                onClose={() => setRestoring(null)}
                onConfirm={async (backup, truncate) => {
                    try {
                        await restoreServerBackup(uuid, backup.uuid, truncate);

                        setServerFromState((state) => ({ ...state, status: 'restoring_backup' }));
                        toast(t('backups.restoreStarted'), { tone: 'success' });
                    } catch (error) {
                        toast(apiMessage(error, t('backups.restoreFailed')), { tone: 'error' });

                        throw error;
                    }
                }}
            />

            {error && (
                <Notice
                    tone={'danger'}
                    className={'mb-4'}
                    title={t('backups.loadFailed')}
                    action={
                        <Button size={'sm'} variant={'secondary'} onClick={() => void mutate()}>
                            {t('common.tryAgain')}
                        </Button>
                    }
                >
                    {apiMessage(error, t('common.serverUnreachable'))}
                </Notice>
            )}

            <DriveBackupCard />

            {!data ? (
                !error && <SectionSkeleton label={t('backups.loading')} />
            ) : (
                <div className={'space-y-4'}>
                    <SectionHeader
                        title={t('backups.title')}
                        description={
                            limit === 0 ? t('backups.noSlots') : t('backups.stored', { count: limit, used: count })
                        }
                        action={
                            canCreate && (
                                <Button
                                    size={'sm'}
                                    variant={creating ? 'secondary' : 'primary'}
                                    disabled={!creating && (full || limit === 0 || running)}
                                    onClick={() => setCreating((value) => !value)}
                                    icon={!creating ? <Plus className={'h-3.5 w-3.5'} /> : undefined}
                                    title={
                                        limit === 0
                                            ? t('backups.noSlotsHint')
                                            : full
                                            ? t('backups.fullHint')
                                            : running
                                            ? t('backups.runningHint')
                                            : undefined
                                    }
                                >
                                    {t(creating ? 'common.cancel' : 'backups.newBackup')}
                                </Button>
                            )
                        }
                    />

                    {creating && (
                        <CreateForm
                            uuid={uuid}
                            canLock={canDelete}
                            onCreated={(backup) => {
                                void mutate(
                                    (current) => ({
                                        ...current,
                                        items: current.items.concat(backup),
                                        backupCount: current.backupCount + 1,
                                    }),
                                    false
                                );
                                setCreating(false);
                            }}
                        />
                    )}

                    {items.length === 0 ? (
                        <SectionEmpty
                            icon={Archive}
                            title={t('backups.emptyTitle')}
                            body={t(
                                limit === 0
                                    ? 'backups.emptyNoSlots'
                                    : page > 1
                                    ? 'backups.emptyPage'
                                    : 'backups.emptyBody'
                            )}
                        />
                    ) : (
                        <div className={'space-y-3'}>
                            {items.map((backup) => (
                                <BackupCard
                                    key={backup.uuid}
                                    backup={backup}
                                    canDownload={canDownload}
                                    canRestore={canRestore}
                                    canDelete={canDelete}
                                    offline={status === 'offline'}
                                    onLock={() => (backup.isLocked ? unlock(backup) : void toggleLock(backup))}
                                    onDownload={() => void download(backup)}
                                    onRestore={() => setRestoring(backup)}
                                    onDelete={() => remove(backup)}
                                />
                            ))}
                        </div>
                    )}

                    {data.pagination.totalPages > 1 && (
                        <div className={'flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3'}>
                            <span className={'text-xs text-ink-faint'}>
                                {t('common.pageOf', {
                                    current: data.pagination.currentPage,
                                    total: data.pagination.totalPages,
                                })}
                            </span>

                            <div className={'flex items-center gap-2'}>
                                <Button
                                    size={'sm'}
                                    variant={'ghost'}
                                    aria-label={t('common.previousPage')}
                                    className={'h-8 w-8 px-0'}
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                    icon={<ChevronLeft className={'h-4 w-4'} />}
                                />
                                <Button
                                    size={'sm'}
                                    variant={'ghost'}
                                    aria-label={t('common.nextPage')}
                                    className={'h-8 w-8 px-0'}
                                    disabled={page >= data.pagination.totalPages}
                                    onClick={() => setPage(page + 1)}
                                    icon={<ChevronRight className={'h-4 w-4'} />}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </ServerContentBlock>
    );
};

function CreateForm({
    uuid,
    canLock,
    onCreated,
}: {
    uuid: string;
    canLock: boolean;
    onCreated: (backup: ServerBackup) => void;
}) {
    const t = useT();
    const { toast } = useToast();

    const [name, setName] = useState('');
    const [ignored, setIgnored] = useState('');
    const [locked, setLocked] = useState(false);
    const [busy, setBusy] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);

        createServerBackup(uuid, { name: name.trim() || undefined, ignored, isLocked: locked })
            .then((backup) => {
                toast(t('backups.started'), { tone: 'success' });
                onCreated(backup);
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('backups.startFailed')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    return (
        <form onSubmit={submit} className={'space-y-4 rounded-2xl bg-card p-4'}>
            <Input
                value={name}
                maxLength={191}
                onChange={(event) => setName(event.target.value)}
                label={t('common.name')}
                hint={t('backups.nameHint')}
                placeholder={t('backups.namePlaceholder')}
            />

            <div>
                <label htmlFor={'backup-ignored'} className={'mb-1.5 block text-xs font-medium text-ink-muted'}>
                    {t('backups.ignored')}
                </label>
                <textarea
                    id={'backup-ignored'}
                    rows={4}
                    value={ignored}
                    spellCheck={false}
                    onChange={(event) => setIgnored(event.target.value)}
                    placeholder={'cache/\n*.log'}
                    className={
                        'dz-input w-full rounded-2xl border-line-field bg-raised px-4 py-3 font-mono text-xs text-ink transition-colors placeholder:text-ink-faint hover:border-ink-faint/25 focus:border-accent/60'
                    }
                />
                <p className={'mt-1.5 text-xs text-ink-faint'}>{t('backups.ignoredHint')}</p>
            </div>

            {canLock && (
                <Checkbox
                    size={'sm'}
                    checked={locked}
                    onChange={(event) => setLocked(event.target.checked)}
                    label={t('backups.lockOnCreate')}
                />
            )}

            <div className={'flex justify-end'}>
                <Button type={'submit'} size={'sm'} variant={'primary'} loading={busy}>
                    {t('backups.startBackup')}
                </Button>
            </div>
        </form>
    );
}

function useElapsed(since: Date, active: boolean): string {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!active) {
            return;
        }

        setNow(Date.now());

        const id = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(id);
    }, [active]);

    const seconds = Math.max(0, Math.floor((now - since.getTime()) / 1000));
    const pad = (value: number) => String(value).padStart(2, '0');

    return seconds >= 3600
        ? `${Math.floor(seconds / 3600)}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
        : `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`;
}

function BackupCard({
    backup,
    canDownload,
    canRestore,
    canDelete,
    offline,
    onLock,
    onDownload,
    onRestore,
    onDelete,
}: {
    backup: ServerBackup;
    canDownload: boolean;
    canRestore: boolean;
    canDelete: boolean;
    offline: boolean;
    onLock: () => void;
    onDownload: () => void;
    onRestore: () => void;
    onDelete: () => void;
}) {
    const t = useT();
    const { mutate } = getServerBackups();

    const pending = backup.completedAt === null;
    const broken = !pending && !backup.isSuccessful;
    const elapsed = useElapsed(backup.createdAt, pending);

    useWebsocketEvent(`${SocketEvent.BACKUP_COMPLETED}:${backup.uuid}` as SocketEvent, (data) => {
        try {
            const parsed = JSON.parse(data);

            mutate(
                (current) => ({
                    ...current,
                    items: current.items.map((value) =>
                        value.uuid !== backup.uuid
                            ? value
                            : {
                                  ...value,
                                  isSuccessful: parsed.is_successful || true,
                                  checksum: (parsed.checksum_type || '') + ':' + (parsed.checksum || ''),
                                  bytes: parsed.file_size || 0,
                                  completedAt: new Date(),
                              }
                    ),
                }),
                false
            );
        } catch (error) {
            console.warn(error);
        }
    });

    return (
        <div className={'rounded-2xl bg-card p-4 transition-colors'}>
            <div className={'flex flex-wrap items-center justify-between gap-3'}>
                <div className={'flex min-w-0 items-center gap-2.5'}>
                    <span
                        className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                            pending ? 'text-accent' : 'bg-overlay text-ink-muted'
                        )}
                    >
                        {pending ? (
                            <Loader2 className={'h-4 w-4 animate-spin'} aria-hidden={'true'} />
                        ) : broken ? (
                            <TriangleAlert className={'h-4 w-4 text-danger'} aria-hidden={'true'} />
                        ) : (
                            <Archive className={'h-4 w-4'} aria-hidden={'true'} />
                        )}
                    </span>

                    <div className={'min-w-0'}>
                        <div className={'flex flex-wrap items-center gap-2'}>
                            <p className={'truncate text-sm font-medium text-ink'}>{backup.name}</p>

                            {backup.isLocked && <Badge tone={'info'}>{t('backups.badgeLocked')}</Badge>}
                            {pending && <Badge tone={'warning'}>{t('backups.badgePending')}</Badge>}
                            {broken && <Badge tone={'danger'}>{t('backups.badgeFailed')}</Badge>}
                        </div>

                        {!pending && (
                            <p
                                className={'mt-0.5 truncate text-xs text-ink-faint'}
                                title={format(backup.createdAt, 'MMM do, yyyy H:mm:ss')}
                            >
                                {`${bytesToString(backup.bytes)} · ${formatDistanceToNow(backup.createdAt, {
                                    includeSeconds: true,
                                    addSuffix: true,
                                })}`}
                            </p>
                        )}
                    </div>
                </div>

                {!pending && (
                    <div className={'flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto'}>
                        {canDelete && (
                            <Button
                                size={'sm'}
                                variant={'ghost'}
                                onClick={onLock}
                                title={t(backup.isLocked ? 'backups.unlockHint' : 'backups.lockHint')}
                                icon={
                                    backup.isLocked ? (
                                        <Lock className={'h-3.5 w-3.5'} />
                                    ) : (
                                        <LockOpen className={'h-3.5 w-3.5'} />
                                    )
                                }
                            >
                                {t(backup.isLocked ? 'backups.unlock' : 'backups.lock')}
                            </Button>
                        )}

                        {backup.isSuccessful && (
                            <>
                                {canDownload && (
                                    <Button
                                        size={'sm'}
                                        variant={'ghost'}
                                        onClick={onDownload}
                                        icon={<Download className={'h-3.5 w-3.5'} />}
                                    >
                                        {t('common.download')}
                                    </Button>
                                )}
                                {canRestore && (
                                    <Button
                                        size={'sm'}
                                        variant={'ghost'}
                                        onClick={onRestore}
                                        disabled={!offline}
                                        title={t(offline ? 'backups.restoreHint' : 'backups.restoreOfflineHint')}
                                        icon={<RotateCcw className={'h-3.5 w-3.5'} />}
                                    >
                                        {t('backups.restore')}
                                    </Button>
                                )}
                            </>
                        )}

                        {canDelete && (
                            <Button
                                size={'sm'}
                                variant={'ghost'}
                                onClick={onDelete}
                                disabled={backup.isLocked}
                                title={t(backup.isLocked ? 'backups.deleteLockedHint' : 'backups.deleteHint')}
                                className={'text-danger hover:bg-danger/10 hover:text-danger'}
                                icon={<Trash2 className={'h-3.5 w-3.5'} />}
                            >
                                {t('common.delete')}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {pending && (
                <div className={'mt-3.5'}>
                    <div
                        role={'progressbar'}
                        aria-label={t('backups.badgePending')}
                        className={'h-1.5 w-full overflow-hidden rounded-full bg-overlay'}
                    >
                        <div className={'h-full w-1/3 rounded-full bg-accent animate-shimmer'} />
                    </div>

                    <div className={'mt-2 flex items-center justify-end gap-3 text-[11px]'}>
                        <span className={'shrink-0 font-mono tabular-nums text-ink-faint'}>{elapsed}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function RestoreDialog({
    backup,
    onClose,
    onConfirm,
}: {
    backup: ServerBackup | null;
    onClose: () => void;
    onConfirm: (backup: ServerBackup, truncate: boolean) => Promise<void>;
}) {
    const t = useT();
    const [truncate, setTruncate] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setTruncate(false);
        setBusy(false);
    }, [backup]);

    const confirm = async () => {
        if (!backup || busy) {
            return;
        }

        setBusy(true);

        try {
            await onConfirm(backup, truncate);
            onClose();
        } catch {
        } finally {
            setBusy(false);
        }
    };

    return (
        <DialogShell
            open={backup !== null}
            onClose={() => !busy && onClose()}
            title={backup ? t('backups.restoreTitle', { name: backup.name }) : ''}
            body={t('backups.restoreDialogBody')}
        >
            <div className={'mt-4 rounded-2xl bg-raised p-3'}>
                <Checkbox
                    size={'sm'}
                    checked={truncate}
                    disabled={busy}
                    onChange={(event) => setTruncate(event.target.checked)}
                    label={t('backups.truncate')}
                />
            </div>

            <DialogFooter>
                <Button type={'button'} variant={'ghost'} size={'sm'} onClick={onClose} disabled={busy}>
                    {t('common.cancel')}
                </Button>
                <Button type={'button'} size={'sm'} variant={'danger'} loading={busy} onClick={() => void confirm()}>
                    {t('backups.restore')}
                </Button>
            </DialogFooter>
        </DialogShell>
    );
}

export default () => {
    const [page, setPage] = useState<number>(1);

    return (
        <ServerBackupContext.Provider value={{ page, setPage }}>
            <BackupContainer />
        </ServerBackupContext.Provider>
    );
};
