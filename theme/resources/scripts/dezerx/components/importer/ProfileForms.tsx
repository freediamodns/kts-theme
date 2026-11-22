import React, { useEffect, useState } from 'react';
import { Button, Input, Select } from '@/dezerx/components/ui';
import { CredentialInput, HostInput, ImportCredential, ImportHost, Protocol } from '@/api/server/importer';
import { useT } from '@/i18n';

export function HostForm({
    editing,
    busy,
    onSave,
    onCancel,
    onUse,
    onDelete,
}: {
    editing: ImportHost | null;
    busy: boolean;
    onSave: (body: HostInput) => void;
    onCancel: () => void;
    onUse?: () => void;
    onDelete?: () => void;
}) {
    const t = useT();

    const [label, setLabel] = useState('');
    const [host, setHost] = useState('');
    const [port, setPort] = useState('22');
    const [mode, setMode] = useState<Protocol>('sftp');
    const [touchedPort, setTouchedPort] = useState(false);

    useEffect(() => {
        setLabel(editing?.label ?? '');
        setHost(editing?.host ?? '');
        setPort(String(editing?.port ?? 22));
        setMode(editing?.mode ?? 'sftp');
        setTouchedPort(editing !== null);
    }, [editing]);

    const pickMode = (next: Protocol) => {
        setMode(next);

        if (!touchedPort) {
            setPort(next === 'ftp' ? '21' : '22');
        }
    };

    const ready = label.trim() !== '' && host.trim() !== '';

    return (
        <div>
            <p className={'text-sm font-semibold tracking-tight text-ink'}>
                {t(editing === null ? 'importer.newHost' : 'importer.editHost')}
            </p>

            <div className={'mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
                <Input
                    label={t('importer.name')}
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder={t('importer.namePlaceholder')}
                />
                <Input
                    label={t('importer.host')}
                    value={host}
                    onChange={(event) => setHost(event.target.value)}
                    placeholder={'node12.oldhost.com'}
                />
                <Input
                    label={t('importer.port')}
                    value={port}
                    inputMode={'numeric'}
                    onChange={(event) => {
                        setTouchedPort(true);
                        setPort(event.target.value);
                    }}
                    placeholder={mode === 'ftp' ? '21' : '22'}
                />
                <Select
                    label={t('importer.protocol')}
                    value={mode}
                    onChange={(value) => pickMode(value as Protocol)}
                    options={[
                        { value: 'sftp', label: 'SFTP' },
                        { value: 'ftp', label: 'FTP' },
                    ]}
                />
            </div>

            <div className={'mt-4 flex flex-wrap items-center justify-between gap-2'}>
                <Button size={'sm'} variant={'ghost'} disabled={busy} onClick={onCancel}>
                    {t('common.cancel')}
                </Button>

                <div className={'flex flex-wrap items-center gap-2'}>
                    {onUse && (
                        <Button size={'sm'} variant={'secondary'} disabled={busy} onClick={onUse}>
                            {t('importer.use')}
                        </Button>
                    )}
                    {onDelete && (
                        <Button size={'sm'} variant={'danger'} disabled={busy} onClick={onDelete}>
                            {t('common.delete')}
                        </Button>
                    )}
                    <Button
                        size={'sm'}
                        loading={busy}
                        disabled={!ready}
                        onClick={() =>
                            onSave({
                                label: label.trim(),
                                host: host.trim(),
                                port: Number(port) || (mode === 'ftp' ? 21 : 22),
                                mode,
                            })
                        }
                    >
                        {t('common.save')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function CredentialForm({
    editing,
    busy,
    onSave,
    onCancel,
    onUse,
    onDelete,
}: {
    editing: ImportCredential | null;
    busy: boolean;
    onSave: (body: CredentialInput) => void;
    onCancel: () => void;
    onUse?: () => void;
    onDelete?: () => void;
}) {
    const t = useT();

    const [label, setLabel] = useState('');
    const [username, setUsername] = useState('');
    const [secret, setSecret] = useState('');

    useEffect(() => {
        setLabel(editing?.label ?? '');
        setUsername(editing?.username ?? '');
        setSecret('');
    }, [editing]);

    const ready = label.trim() !== '' && username.trim() !== '' && (editing !== null || secret !== '');

    return (
        <div>
            <p className={'text-sm font-semibold tracking-tight text-ink'}>
                {t(editing === null ? 'importer.newCredential' : 'importer.editCredential')}
            </p>

            <div className={'mt-3 grid gap-3 sm:grid-cols-3'}>
                <Input
                    label={t('importer.name')}
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder={t('importer.namePlaceholder')}
                />
                <Input
                    label={t('importer.username')}
                    value={username}
                    autoComplete={'off'}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder={'user.a1b2c3d4'}
                />
                <Input
                    label={t('importer.password')}
                    type={'password'}
                    revealable
                    value={secret}
                    autoComplete={'new-password'}
                    onChange={(event) => setSecret(event.target.value)}
                    placeholder={editing === null ? undefined : t('importer.secretHeld')}
                />
            </div>

            <p className={'mt-2 text-[11px] text-ink-faint'}>
                {t(editing === null ? 'importer.secretHint' : 'importer.secretKeepHint')}
            </p>

            <div className={'mt-4 flex flex-wrap items-center justify-between gap-2'}>
                <Button size={'sm'} variant={'ghost'} disabled={busy} onClick={onCancel}>
                    {t('common.cancel')}
                </Button>

                <div className={'flex flex-wrap items-center gap-2'}>
                    {onUse && (
                        <Button size={'sm'} variant={'secondary'} disabled={busy} onClick={onUse}>
                            {t('importer.use')}
                        </Button>
                    )}
                    {onDelete && (
                        <Button size={'sm'} variant={'danger'} disabled={busy} onClick={onDelete}>
                            {t('common.delete')}
                        </Button>
                    )}
                    <Button
                        size={'sm'}
                        loading={busy}
                        disabled={!ready}
                        onClick={() =>
                            onSave({
                                label: label.trim(),
                                username: username.trim(),
                                secret: secret === '' ? undefined : secret,
                            })
                        }
                    >
                        {t('common.save')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
