import React, { FormEvent, useEffect, useState } from 'react';
import { Button, Checkbox, Input, Notice } from '@/dezerx/components/ui';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { useT } from '@/i18n';

export interface FileDialogRequest {
    title: string;
    body?: string;
    confirmLabel: string;
    destructive?: boolean;
    input?: { label: string; initial: string; optional?: boolean };
    warning?: { title: string; body: string };
    acknowledge?: string;
    onConfirm: (value: string) => Promise<void>;
}

export function worldWarning(
    worlds: string[],
    t: ReturnType<typeof useT>
): Pick<FileDialogRequest, 'warning' | 'acknowledge'> {
    if (worlds.length === 0) {
        return {};
    }

    return {
        warning: {
            title: t('files.worldWarningTitle', { count: worlds.length, names: worlds.join(', ') }),
            body: t('files.worldWarningBody', { count: worlds.length }),
        },
        acknowledge: t('files.worldAcknowledge', { count: worlds.length }),
    };
}

export function FileDialog({ request, onClose }: { request: FileDialogRequest | null; onClose: () => void }) {
    const t = useT();
    const [value, setValue] = useState('');
    const [busy, setBusy] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        setValue(request?.input?.initial ?? '');
        setBusy(false);
        setAcknowledged(false);
    }, [request]);

    const blocked = Boolean(request?.acknowledge) && !acknowledged;

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        if (!request || busy || blocked) {
            return;
        }

        const answer = value.trim();

        if (request.input && answer === '' && request.input.optional !== true) {
            return;
        }

        setBusy(true);

        try {
            await request.onConfirm(answer);
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
            title={request?.title}
            body={request?.body}
            width={request?.warning ? 'md' : 'sm'}
        >
            <form onSubmit={(event) => void submit(event)}>
                {request?.input && (
                    <div className={'mt-4'}>
                        <Input
                            autoFocus
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                            label={request.input.label}
                            spellCheck={false}
                            autoComplete={'off'}
                        />
                    </div>
                )}

                {request?.warning && (
                    <Notice tone={'danger'} title={request.warning.title} className={'mt-4'}>
                        {request.warning.body}
                    </Notice>
                )}

                {request?.acknowledge && (
                    <Checkbox
                        className={'mt-4'}
                        checked={acknowledged}
                        onChange={(event) => setAcknowledged(event.target.checked)}
                        label={request.acknowledge}
                        disabled={busy}
                    />
                )}

                <DialogFooter>
                    <Button type={'button'} variant={'ghost'} size={'sm'} onClick={onClose} disabled={busy}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type={'submit'}
                        size={'sm'}
                        loading={busy}
                        disabled={blocked}
                        variant={request?.destructive ? 'danger' : 'primary'}
                    >
                        {request?.confirmLabel}
                    </Button>
                </DialogFooter>
            </form>
        </DialogShell>
    );
}

export default FileDialog;
