import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Save, Trash2 } from 'lucide-react';
import { ServerContext } from '@/state/server';
import { Button, useToast } from '@/dezerx/components/ui';
import { SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import {
    FALLBACK_UNITS,
    SIZED,
    SIZE_LABEL,
    SIZE_STEP,
    SizeField,
    Sized,
    ceilingOf,
    unitFor,
    writeSize,
} from '@/dezerx/components/create/SizeField';
import {
    ChosenResources,
    CreateUnits,
    FreeServerManage,
    deleteFreeServer,
    getFreeServer,
    resizeFreeServer,
} from '@/api/dezerx/serverCreate';
import { useDemo } from '@/dezerx/lib/demo';
import { useT } from '@/i18n';

export default function FreeServerBox() {
    const t = useT();
    const history = useHistory();
    const { toast } = useToast();
    const demo = useDemo();

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const [stand, setStand] = useState<FreeServerManage | null>(null);
    const [units, setUnits] = useState<CreateUnits>(FALLBACK_UNITS);
    const [sized, setSized] = useState<ChosenResources>({});
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let live = true;

        getFreeServer(uuid)
            .then((loaded) => {
                if (live) {
                    setStand(loaded);
                    setUnits({ ...FALLBACK_UNITS, ...loaded.units });
                    setSized({});
                }
            })
            .catch(() => undefined);

        return () => {
            live = false;
        };
    }, [uuid]);

    const sizes = useMemo(() => {
        const out: Record<string, number> = { ...(stand?.current ?? {}) };

        for (const key of SIZED) {
            out[key] = sized[key] ?? stand?.current[key] ?? 0;
        }

        return out;
    }, [stand?.current, sized]);

    const limits = stand?.limits ?? null;

    const oversized = useMemo(() => {
        if (limits === null) {
            return false;
        }

        return SIZED.some((key) => {
            const bounds = limits[key];

            return bounds !== undefined && (sizes[key] < bounds.min || sizes[key] > ceilingOf(bounds));
        });
    }, [limits, sizes]);

    const dirty = stand !== null && SIZED.some((key) => sizes[key] !== stand.current[key]);

    if (stand === null) {
        return null;
    }

    const save = async () => {
        if (!dirty || oversized || busy) {
            return;
        }

        setBusy(true);

        try {
            const saved = await resizeFreeServer(
                uuid,
                Object.fromEntries(SIZED.map((key) => [key, sizes[key]])) as ChosenResources
            );

            setStand(saved);
            setSized({});
            toast(t('freeServer.resized'), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('freeServer.resizeFailed')), { tone: 'error' });
        }

        setBusy(false);
    };

    const remove = () =>
        setDialog({
            title: t('freeServer.deleteTitle'),
            body: t('freeServer.deleteBody'),
            confirmLabel: t('freeServer.delete'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteFreeServer(uuid);
                    toast(t('freeServer.deleted'), { tone: 'success' });
                    history.push('/');
                } catch (error) {
                    toast(apiMessage(error, t('freeServer.deleteFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    return (
        <>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            {stand.resizable && limits !== null && (
                <div className={'space-y-3'}>
                    <SectionHeader title={t('freeServer.sizeTitle')} description={t('freeServer.sizeDescription')} />

                    <div className={'space-y-4 rounded-2xl bg-card p-4'}>
                        <div className={'grid gap-3 sm:grid-cols-3'}>
                            {SIZED.map((key) =>
                                limits[key] === undefined ? null : (
                                    <SizeField
                                        key={key}
                                        label={t(SIZE_LABEL[key])}
                                        bounds={limits[key]}
                                        value={sizes[key]}
                                        step={SIZE_STEP[key]}
                                        format={(value) => writeSize(key as Sized, value, units)}
                                        unit={unitFor(key, units, setUnits, t)}
                                        onChange={(value) => setSized((current) => ({ ...current, [key]: value }))}
                                    />
                                )
                            )}
                        </div>

                        <div className={'flex justify-end'}>
                            <Button
                                size={'sm'}
                                loading={busy}
                                disabled={!dirty || oversized || demo}
                                onClick={save}
                                icon={<Save className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                            >
                                {t('freeServer.resize')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className={'space-y-3'}>
                <SectionHeader title={t('freeServer.deleteTitle')} description={t('freeServer.deleteDescription')} />

                <div className={'flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-danger/10 p-4'}>
                    <p className={'min-w-0 text-xs leading-relaxed text-ink-muted'}>{t('freeServer.deleteWarning')}</p>

                    <Button
                        size={'sm'}
                        variant={'danger'}
                        disabled={demo}
                        onClick={remove}
                        icon={<Trash2 className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                    >
                        {t('freeServer.delete')}
                    </Button>
                </div>
            </div>
        </>
    );
}
