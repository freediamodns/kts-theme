import React, { useEffect, useState } from 'react';
import isEqual from 'react-fast-compare';
import { Check, Copy, Network as NetworkIcon, Plus, Star, Trash2 } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { Allocation } from '@/api/server/getServer';
import { usePermissions } from '@/plugins/usePermissions';
import { useDeepCompareEffect } from '@/plugins/useDeepCompareEffect';
import getServerAllocations from '@/api/swr/getServerAllocations';
import createServerAllocation from '@/api/server/network/createServerAllocation';
import deleteServerAllocation from '@/api/server/network/deleteServerAllocation';
import setPrimaryServerAllocation from '@/api/server/network/setPrimaryServerAllocation';
import setServerAllocationNotes from '@/api/server/network/setServerAllocationNotes';
import { ip } from '@/lib/formatters';
import { Badge, Button, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { useCopied } from '@/dezerx/lib/useCopied';
import { useT } from '@/i18n';

const NetworkContainer = () => {
    const t = useT();
    const { toast } = useToast();

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const limit = ServerContext.useStoreState((state) => state.server.data!.featureLimits.allocations);
    const allocations = ServerContext.useStoreState((state) => state.server.data!.allocations, isEqual);
    const setServerFromState = ServerContext.useStoreActions((actions) => actions.server.setServerFromState);

    const [canCreate, canUpdate, canDelete] = usePermissions([
        'allocation.create',
        'allocation.update',
        'allocation.delete',
    ]);

    const { data, error, mutate } = getServerAllocations();

    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        mutate(allocations);
    }, []);

    useEffect(() => {
        if (error) {
            toast(apiMessage(error, t('network.loadFailed')), { tone: 'error' });
        }
    }, [error]);

    useDeepCompareEffect(() => {
        if (!data) return;

        setServerFromState((state) => ({ ...state, allocations: data }));
    }, [data]);

    const items = data ?? [];
    const full = limit > 0 && items.length >= limit;

    const assign = () => {
        setBusy(true);

        createServerAllocation(uuid)
            .then((allocation) => mutate((current) => (current ?? []).concat(allocation), false))
            .then(() => toast(t('network.assigned'), { tone: 'success' }))
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('network.assignFailed')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    const makePrimary = (allocation: Allocation) => {
        mutate(
            (current) => (current ?? []).map((value) => ({ ...value, isDefault: value.id === allocation.id })),
            false
        );

        setPrimaryServerAllocation(uuid, allocation.id)
            .then(() => toast(t('network.primaryUpdated'), { tone: 'success' }))
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('network.primaryFailed')), { tone: 'error' });
                mutate();
            });
    };

    const editNotes = (allocation: Allocation) =>
        setDialog({
            title: t('network.note'),
            body: t('network.noteBody'),
            confirmLabel: t('common.save'),
            input: { label: t('network.note'), initial: allocation.notes ?? '' },
            onConfirm: async (notes) => {
                try {
                    const updated = await setServerAllocationNotes(uuid, allocation.id, notes);

                    await mutate(
                        (current) => (current ?? []).map((value) => (value.id === allocation.id ? updated : value)),
                        false
                    );
                    toast(t('network.noteSaved'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('network.noteFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    const release = (allocation: Allocation) =>
        setDialog({
            title: t('network.releaseTitle', { port: allocation.port }),
            body: t('network.releaseBody'),
            confirmLabel: t('network.release'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteServerAllocation(uuid, allocation.id);

                    await mutate((current) => (current ?? []).filter((value) => value.id !== allocation.id), false);
                    toast(t('network.released'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('network.releaseFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    return (
        <ServerContentBlock title={t('network.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            {!data ? (
                <SectionSkeleton label={t('network.loading')} rows={2} />
            ) : (
                <div className={'space-y-4'}>
                    <SectionHeader
                        title={t('network.title')}
                        description={
                            limit === 0
                                ? t('network.noSlots')
                                : t('network.inUse', { count: limit, used: items.length })
                        }
                        action={
                            canCreate && (
                                <Button
                                    size={'sm'}
                                    variant={'primary'}
                                    loading={busy}
                                    disabled={full || limit === 0}
                                    onClick={assign}
                                    icon={<Plus className={'h-3.5 w-3.5'} />}
                                    title={
                                        limit === 0
                                            ? t('network.noSlotsHint')
                                            : full
                                            ? t('network.fullHint')
                                            : undefined
                                    }
                                >
                                    {t('network.assign')}
                                </Button>
                            )
                        }
                    />

                    {items.length === 0 ? (
                        <SectionEmpty
                            icon={NetworkIcon}
                            title={t('network.emptyTitle')}
                            body={t(limit === 0 ? 'network.emptyNoSlots' : 'network.emptyBody')}
                        />
                    ) : (
                        <div className={'space-y-3'}>
                            {items.map((allocation) => (
                                <AllocationCard
                                    key={allocation.id}
                                    allocation={allocation}
                                    canUpdate={canUpdate}
                                    canDelete={canDelete}
                                    onPrimary={() => makePrimary(allocation)}
                                    onNotes={() => editNotes(allocation)}
                                    onRelease={() => release(allocation)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </ServerContentBlock>
    );
};

function AllocationCard({
    allocation,
    canUpdate,
    canDelete,
    onPrimary,
    onNotes,
    onRelease,
}: {
    allocation: Allocation;
    canUpdate: boolean;
    canDelete: boolean;
    onPrimary: () => void;
    onNotes: () => void;
    onRelease: () => void;
}) {
    const t = useT();
    const [copied, copy] = useCopied();

    const host = allocation.alias ?? ip(allocation.ip);
    const address = `${host}:${allocation.port}`;

    return (
        <div className={'rounded-2xl bg-card p-4'}>
            <div className={'flex flex-wrap items-center justify-between gap-3'}>
                <div className={'flex min-w-0 items-center gap-2.5'}>
                    <span
                        className={
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-overlay text-ink-muted'
                        }
                    >
                        <NetworkIcon className={'h-4 w-4'} aria-hidden={'true'} />
                    </span>

                    <div className={'min-w-0'}>
                        <div className={'flex flex-wrap items-center gap-2'}>
                            <p className={'truncate text-sm font-medium text-ink'}>{address}</p>
                            {allocation.isDefault && <Badge tone={'info'}>{t('network.primary')}</Badge>}
                        </div>
                        <p className={'mt-0.5 truncate text-xs text-ink-faint'}>
                            {allocation.notes ?? t('network.noNote')}
                            {allocation.alias && ` · ${ip(allocation.ip)}`}
                        </p>
                    </div>
                </div>

                <div className={'flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto'}>
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        onClick={() => copy(address)}
                        icon={
                            copied ? (
                                <Check className={'h-3.5 w-3.5 text-success'} />
                            ) : (
                                <Copy className={'h-3.5 w-3.5'} />
                            )
                        }
                    >
                        {t('common.copy')}
                    </Button>

                    {canUpdate && (
                        <Button size={'sm'} variant={'ghost'} onClick={onNotes}>
                            {t('network.note')}
                        </Button>
                    )}

                    {!allocation.isDefault && (
                        <>
                            {canUpdate && (
                                <Button
                                    size={'sm'}
                                    variant={'ghost'}
                                    onClick={onPrimary}
                                    icon={<Star className={'h-3.5 w-3.5'} />}
                                >
                                    {t('network.primary')}
                                </Button>
                            )}
                            {canDelete && (
                                <Button
                                    size={'sm'}
                                    variant={'ghost'}
                                    onClick={onRelease}
                                    className={'text-danger hover:bg-danger/10 hover:text-danger'}
                                    icon={<Trash2 className={'h-3.5 w-3.5'} />}
                                >
                                    {t('network.release')}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default NetworkContainer;
