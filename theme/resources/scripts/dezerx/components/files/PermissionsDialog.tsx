import React, { FormEvent, useEffect, useState } from 'react';
import { Button, Checkbox, Input } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { useT } from '@/i18n';

export interface PermissionsRequest {
    root: string;
    names: string[];
    mode: string;
    label: string;
    directory: boolean;
    onConfirm: (mode: string) => Promise<void>;
}

const CLASSES: Array<{ key: string; label: string }> = [
    { key: 'owner', label: 'permissionsDialog.owner' },
    { key: 'group', label: 'permissionsDialog.group' },
    { key: 'other', label: 'permissionsDialog.everyone' },
];

const BITS: Array<{ flag: number; label: string }> = [
    { flag: 4, label: 'permissionsDialog.read' },
    { flag: 2, label: 'permissionsDialog.write' },
    { flag: 1, label: 'permissionsDialog.execute' },
];

function digitsOf(mode: string, fallback: string): [number, number, number] {
    const clean = /^[0-7]{3,4}$/.test(mode.trim()) ? mode.trim() : fallback;
    const tail = clean.slice(-3);

    return [Number(tail[0] ?? 0), Number(tail[1] ?? 0), Number(tail[2] ?? 0)];
}

export function PermissionsDialog({ request, onClose }: { request: PermissionsRequest | null; onClose: () => void }) {
    const t = useT();
    const [mode, setMode] = useState('644');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setMode(digitsOf(request?.mode ?? '', request?.directory ? '755' : '644').join(''));
        setBusy(false);
    }, [request]);

    const digits = digitsOf(mode, '000');
    const valid = /^[0-7]{3,4}$/.test(mode);

    const toggle = (index: number, flag: number) =>
        setMode(digits.map((digit, at) => (at === index ? digit ^ flag : digit)).join(''));

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        if (request === null || busy || !valid) {
            return;
        }

        setBusy(true);

        try {
            await request.onConfirm(mode);
            onClose();
        } catch {
        } finally {
            setBusy(false);
        }
    };

    return (
        <DialogShell
            open={request !== null}
            onClose={() => !busy && onClose()}
            title={t('permissionsDialog.titleFor', { name: request?.label ?? '' })}
            body={t('permissionsDialog.description')}
        >
            <form onSubmit={(event) => void submit(event)}>
                <div className={'mt-4 overflow-hidden rounded-2xl ring-1 ring-line-field'}>
                    <div className={'grid grid-cols-[minmax(0,1fr)_repeat(3,3rem)] items-center gap-y-1 px-3 py-2'}>
                        <span />
                        {BITS.map((bit) => (
                            <span key={bit.flag} className={'text-center text-[11px] font-medium text-ink-faint'}>
                                {t(bit.label)}
                            </span>
                        ))}

                        {CLASSES.map((owner, index) => (
                            <Row
                                key={owner.key}
                                label={owner.label}
                                digit={digits[index] ?? 0}
                                onToggle={(flag) => toggle(index, flag)}
                            />
                        ))}
                    </div>
                </div>

                <div className={'mt-4 flex items-end gap-2'}>
                    <div className={'w-28'}>
                        <Input
                            value={mode}
                            onChange={(event) => setMode(event.target.value.replace(/[^0-7]/g, '').slice(0, 4))}
                            label={t('permissionsDialog.mode')}
                            inputMode={'numeric'}
                            spellCheck={false}
                            autoComplete={'off'}
                            className={'tabular-nums'}
                        />
                    </div>

                    <div className={'flex flex-1 flex-wrap gap-1.5 pb-1'}>
                        {['644', '755', '600', '777'].map((preset) => (
                            <button
                                key={preset}
                                type={'button'}
                                onClick={() => setMode(preset)}
                                className={cn(
                                    'rounded-lg px-2 py-1 text-[11px] tabular-nums transition-colors',
                                    mode === preset
                                        ? 'bg-accent/10 text-accent'
                                        : 'text-ink-faint hover:bg-raised hover:text-ink'
                                )}
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button type={'button'} variant={'ghost'} size={'sm'} onClick={onClose} disabled={busy}>
                        {t('common.cancel')}
                    </Button>
                    <Button type={'submit'} size={'sm'} loading={busy} disabled={!valid}>
                        {t('common.save')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogShell>
    );
}

function Row({ label, digit, onToggle }: { label: string; digit: number; onToggle: (flag: number) => void }) {
    const t = useT();

    return (
        <>
            <span className={'text-xs text-ink-muted'}>{t(label)}</span>

            {BITS.map((bit) => (
                <span key={bit.flag} className={'flex justify-center'}>
                    <Checkbox
                        size={'sm'}
                        checked={(digit & bit.flag) !== 0}
                        onChange={() => onToggle(bit.flag)}
                        aria-label={t('permissionsDialog.bitLabel', { class: t(label), bit: t(bit.label) })}
                    />
                </span>
            ))}
        </>
    );
}

export default PermissionsDialog;
