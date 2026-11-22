import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Folder, History, RotateCcw, Trash2 } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { usePermissions } from '@/plugins/usePermissions';
import { bytesToString } from '@/lib/formatters';
import { Button, Skeleton, useToast } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { FileIcon, useFileIcons } from '@/dezerx/components/files/icons';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { SectionEmpty, apiMessage } from '@/dezerx/components/console/Section';
import {
    RecycleBinPayload,
    RecycledFile,
    emptyRecycleBin,
    getRecycleBin,
    purgeRecycled,
    restoreAllRecycled,
    restoreRecycled,
} from '@/api/server/recycleBin';
import { useT } from '@/i18n';

export default function RecycleBinContainer() {
    const t = useT();
    const { toast } = useToast();

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    useFileIcons();

    const [canDelete] = usePermissions(['file.delete']);

    const [payload, setPayload] = useState<RecycleBinPayload | null>(null);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(
        () =>
            getRecycleBin(uuid)
                .then(setPayload)
                .catch((problem) => toast(apiMessage(problem, t('recycleBin.readFailed')), { tone: 'error' })),
        [uuid, t]
    );

    useEffect(() => {
        refresh();
    }, [refresh]);

    const run = async (work: Promise<unknown>, fallback: string) => {
        setBusy(true);

        try {
            await work;
            await refresh();
        } catch (problem) {
            toast(apiMessage(problem, fallback), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const items = payload?.items ?? [];

    const total = useMemo(() => items.reduce((sum, item) => sum + item.size, 0), [items]);

    const restore = (item: RecycledFile) =>
        run(
            restoreRecycled(uuid, item.id).then((path) =>
                toast(t('recycleBin.restored', { name: item.name, path }), { tone: 'success' })
            ),
            t('recycleBin.restoreFailed')
        );

    const purge = (item: RecycledFile) =>
        setDialog({
            title: t('recycleBin.purgeTitle', { name: item.name }),
            body: t('recycleBin.purgeBody'),
            confirmLabel: t('recycleBin.purge'),
            destructive: true,
            onConfirm: async () => {
                await purgeRecycled(uuid, item.id);
                await refresh();
            },
        });

    const restoreEverything = () =>
        setDialog({
            title: t('recycleBin.restoreAllTitle'),
            body: t('recycleBin.restoreAllBody'),
            confirmLabel: t('recycleBin.restoreAll'),
            onConfirm: async () => {
                const { restored, failed } = await restoreAllRecycled(uuid);

                toast(
                    failed > 0
                        ? t('recycleBin.restoredSome', { restored, failed })
                        : t('recycleBin.restoredAll', { count: restored }),
                    { tone: failed > 0 ? 'warning' : 'success' }
                );

                await refresh();
            },
        });

    const emptyEverything = () =>
        setDialog({
            title: t('recycleBin.emptyTitle'),
            body: t('recycleBin.emptyBody'),
            confirmLabel: t('recycleBin.empty'),
            destructive: true,
            onConfirm: async () => {
                await emptyRecycleBin(uuid);
                await refresh();
            },
        });

    return (
        <ServerContentBlock title={t('recycleBin.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <div className={'overflow-hidden rounded-2xl bg-card ring-1 ring-line-field'}>
                <div
                    className={
                        'flex flex-wrap items-center justify-between gap-3 border-b border-line-field px-4 py-3'
                    }
                >
                    <p className={'text-sm text-ink-muted'}>
                        {payload === null
                            ? t('recycleBin.loading')
                            : t('recycleBin.summary', {
                                  count: items.length,
                                  size: bytesToString(total),
                                  days: payload.retentionDays,
                              })}
                    </p>

                    <div className={'flex flex-wrap items-center gap-2'}>
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            onClick={() => refresh()}
                            icon={<RotateCcw className={'h-3.5 w-3.5'} />}
                        >
                            {t('files.refresh')}
                        </Button>

                        {canDelete && items.length > 0 && (
                            <>
                                <Button
                                    size={'sm'}
                                    variant={'secondary'}
                                    onClick={restoreEverything}
                                    icon={<History className={'h-3.5 w-3.5'} />}
                                >
                                    {t('recycleBin.restoreAll')}
                                </Button>

                                <Button
                                    size={'sm'}
                                    variant={'danger'}
                                    onClick={emptyEverything}
                                    icon={<Trash2 className={'h-3.5 w-3.5'} />}
                                >
                                    {t('recycleBin.empty')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {payload === null ? (
                    <div className={'space-y-1 p-4'}>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton key={index} className={'h-9 w-full rounded-xl'} />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className={'p-6'}>
                        <SectionEmpty
                            icon={Trash2}
                            title={t('recycleBin.emptyTitle2')}
                            body={t('recycleBin.emptyBody2', { days: payload.retentionDays })}
                        />
                    </div>
                ) : (
                    <ul className={cn(busy && 'pointer-events-none opacity-60')}>
                        {items.map((item) => (
                            <li key={item.id} className={'border-t border-line-field first:border-t-0'}>
                                <div className={'flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover'}>
                                    {item.isDirectory ? (
                                        <Folder
                                            aria-hidden={'true'}
                                            className={'h-4 w-4 shrink-0 fill-warning/25 text-warning'}
                                        />
                                    ) : (
                                        <FileIcon name={item.name} kind={'text'} className={'h-4 w-4 shrink-0'} />
                                    )}

                                    <div className={'min-w-0 flex-1'}>
                                        <p className={'truncate text-sm text-ink'}>{item.name}</p>
                                        <p className={'truncate text-xs text-ink-faint'}>{item.root}</p>
                                    </div>

                                    <span className={'hidden w-24 text-right text-xs text-ink-faint sm:block'}>
                                        {item.isDirectory ? '' : bytesToString(item.size)}
                                    </span>

                                    <span className={'hidden w-36 text-right text-xs text-ink-faint md:block'}>
                                        {remaining(item.expiresAt, t)}
                                    </span>

                                    {canDelete && (
                                        <div className={'flex shrink-0 items-center gap-1'}>
                                            <button
                                                type={'button'}
                                                title={t('recycleBin.restore')}
                                                aria-label={t('recycleBin.restore')}
                                                onClick={() => restore(item)}
                                                className={
                                                    'rounded-lg p-1.5 text-ink-faint hover:bg-surface-hover hover:text-ink'
                                                }
                                            >
                                                <History className={'h-4 w-4'} />
                                            </button>

                                            <button
                                                type={'button'}
                                                title={t('recycleBin.purge')}
                                                aria-label={t('recycleBin.purge')}
                                                onClick={() => purge(item)}
                                                className={
                                                    'rounded-lg p-1.5 text-ink-faint hover:bg-surface-hover hover:text-danger'
                                                }
                                            >
                                                <Trash2 className={'h-4 w-4'} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </ServerContentBlock>
    );
}

function remaining(expires: Date, t: (key: string, vars?: Record<string, unknown>) => string): string {
    const ms = expires.getTime() - Date.now();

    if (ms <= 0) {
        return t('recycleBin.dueNow');
    }

    const hours = Math.floor(ms / 3_600_000);

    if (hours >= 24) {
        return t('recycleBin.daysLeft', { count: Math.floor(hours / 24) });
    }

    if (hours >= 1) {
        return t('recycleBin.hoursLeft', { count: hours });
    }

    return t('recycleBin.minutesLeft', { count: Math.max(1, Math.floor(ms / 60_000)) });
}
