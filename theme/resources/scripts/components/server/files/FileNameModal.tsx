import React, { FormEvent, useEffect, useState } from 'react';
import { join } from 'pathe';
import { ServerContext } from '@/state/server';
import { Button, Input } from '@/dezerx/components/ui';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { useT } from '@/i18n';

interface Props {
    visible: boolean;
    onDismissed: () => void;
    onFileNamed: (name: string) => void;
}

export default ({ visible, onFileNamed, onDismissed }: Props) => {
    const t = useT();
    const directory = ServerContext.useStoreState((state) => state.files.directory);

    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setName('');
            setError(null);
        }
    }, [visible]);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const trimmed = name.trim();

        if (trimmed === '') {
            setError(t('fileTree.fileNameRequired'));

            return;
        }

        onFileNamed(join(directory, trimmed));
    };

    return (
        <DialogShell
            open={visible}
            onClose={onDismissed}
            title={t('fileTree.newFile')}
            body={t('fileTree.newFilesLandIn', { directory: directory === '' ? '/' : directory })}
        >
            <form onSubmit={submit}>
                <div className={'mt-4'}>
                    <Input
                        autoFocus
                        value={name}
                        onChange={(event) => {
                            setName(event.target.value);
                            setError(null);
                        }}
                        label={t('fileTree.fileName')}
                        placeholder={'server.properties'}
                        hint={t('fileTree.fileNameHelp')}
                        error={error ?? undefined}
                        spellCheck={false}
                        autoComplete={'off'}
                    />
                </div>

                <DialogFooter>
                    <Button type={'button'} variant={'ghost'} size={'sm'} onClick={onDismissed}>
                        {t('common.cancel')}
                    </Button>
                    <Button type={'submit'} size={'sm'} variant={'primary'}>
                        {t('common.create')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogShell>
    );
};
