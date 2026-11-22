import React, { useCallback, useEffect, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button, useToast } from '@/dezerx/components/ui';
import { SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import { StartupPreset, applyStartupPreset, getStartupPresets } from '@/api/server/startupPresets';
import { useT } from '@/i18n';

export default function StartupPresets({
    uuid,
    canEdit,
    onApplied,
}: {
    uuid: string;
    canEdit: boolean;
    onApplied: () => void;
}) {
    const t = useT();
    const { toast } = useToast();

    const [presets, setPresets] = useState<StartupPreset[]>([]);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(() => {
        getStartupPresets(uuid)
            .then(setPresets)
            .catch(() => setPresets([]));
    }, [uuid]);

    useEffect(load, [load]);

    if (presets.length === 0) {
        return null;
    }

    const apply = async (preset: StartupPreset) => {
        setBusy(preset.id);

        try {
            const { message } = await applyStartupPreset(uuid, preset.id);

            load();
            toast(message, { tone: 'success' });
            onApplied();
        } catch (error) {
            toast(apiMessage(error, t('presets.applyFailed')), { tone: 'error' });
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className={'space-y-3'}>
            <SectionHeader title={t('presets.title')} description={t('presets.description')} />

            <div className={'grid gap-3 sm:grid-cols-2'}>
                {presets.map((preset) => (
                    <div key={preset.id} className={'flex h-full flex-col gap-3 rounded-2xl bg-card p-4'}>
                        <div className={'min-w-0 flex-1'}>
                            <p className={'truncate text-sm font-medium text-ink'}>{preset.label}</p>

                            {preset.description !== '' && (
                                <p className={'mt-1 text-xs text-ink-faint'}>{preset.description}</p>
                            )}

                            <pre
                                className={
                                    'mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-overlay/50 p-2.5 text-[11px] leading-relaxed text-ink-muted'
                                }
                            >
                                {preset.command}
                            </pre>
                        </div>

                        <Button
                            size={'sm'}
                            variant={'primary'}
                            fullWidth
                            loading={busy === preset.id}
                            disabled={!canEdit}
                            onClick={() => void apply(preset)}
                            icon={<Wand2 className={'h-3.5 w-3.5'} />}
                        >
                            {canEdit ? t('common.apply') : t('presets.locked')}
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export { StartupPresets };
