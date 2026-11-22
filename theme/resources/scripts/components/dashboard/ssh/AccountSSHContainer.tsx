import React, { FormEvent, useEffect, useState } from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { createSSHKey, deleteSSHKey, useSSHKeys } from '@/api/account/ssh-keys';
import { SSHKey } from '@definitions/user';
import PageBlock from '@/dezerx/components/PageBlock';
import { Button, Input, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { useT } from '@/i18n';

export default () => {
    const t = useT();
    const { toast } = useToast();

    const { data, isValidating, error, mutate } = useSSHKeys({
        revalidateOnMount: true,
        revalidateOnFocus: false,
    });

    const [creating, setCreating] = useState(false);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    useEffect(() => {
        if (error) {
            toast(apiMessage(error, t('account.ssh.loadFailed')), { tone: 'error' });
        }
    }, [error]);

    const remove = (key: SSHKey) =>
        setDialog({
            title: t('account.ssh.removeTitle', { name: key.name }),
            body: t('account.ssh.removeBody'),
            confirmLabel: t('common.remove'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteSSHKey(key.fingerprint);

                    await mutate(
                        (current) => (current ?? []).filter((candidate) => candidate.fingerprint !== key.fingerprint),
                        false
                    );
                    toast(t('account.ssh.removed'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('account.ssh.removeFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    return (
        <PageBlock title={t('account.ssh.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            {!data && isValidating ? (
                <SectionSkeleton label={t('account.ssh.loading')} rows={2} />
            ) : (
                <div className={'space-y-4'}>
                    <SectionHeader
                        title={t('account.ssh.title')}
                        description={t('account.ssh.description')}
                        action={
                            <Button
                                size={'sm'}
                                variant={creating ? 'secondary' : 'primary'}
                                onClick={() => setCreating((value) => !value)}
                                icon={!creating ? <Plus className={'h-3.5 w-3.5'} /> : undefined}
                            >
                                {t(creating ? 'common.cancel' : 'account.ssh.addKey')}
                            </Button>
                        }
                    />

                    {creating && (
                        <CreateForm
                            onCreated={(key) => {
                                void mutate((current) => [...(current ?? []), key], false);
                                setCreating(false);
                            }}
                        />
                    )}

                    {!data || data.length === 0 ? (
                        <SectionEmpty
                            icon={KeyRound}
                            title={t('account.ssh.emptyTitle')}
                            body={t('account.ssh.emptyBody')}
                        />
                    ) : (
                        <div className={'space-y-3'}>
                            {data.map((key) => (
                                <KeyCard key={key.fingerprint} sshKey={key} onRemove={() => remove(key)} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </PageBlock>
    );
};

function CreateForm({ onCreated }: { onCreated: (key: SSHKey) => void }) {
    const t = useT();
    const { toast } = useToast();

    const [name, setName] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);

        createSSHKey(name, publicKey)
            .then((key) => {
                toast(t('account.ssh.added', { name: key.name }), { tone: 'success' });
                onCreated(key);
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('account.ssh.addFailed')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    return (
        <form onSubmit={submit} className={'space-y-4 rounded-2xl bg-card p-4'}>
            <Input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                label={t('common.name')}
                hint={t('account.ssh.nameHint')}
                placeholder={t('account.ssh.namePlaceholder')}
            />

            <div>
                <label htmlFor={'public-key'} className={'mb-1.5 block text-xs font-medium text-ink-muted'}>
                    {t('account.ssh.publicKey')}
                </label>
                <textarea
                    id={'public-key'}
                    rows={5}
                    required
                    value={publicKey}
                    spellCheck={false}
                    onChange={(event) => setPublicKey(event.target.value)}
                    placeholder={'ssh-ed25519 AAAAC3Nza… you@laptop'}
                    className={
                        'dz-input w-full rounded-2xl border-line-field bg-raised px-4 py-3 font-mono text-xs text-ink transition-colors placeholder:text-ink-faint hover:border-ink-faint/25 focus:border-accent/60'
                    }
                />
                <p className={'mt-1.5 text-xs text-ink-faint'}>{t('account.ssh.publicKeyHint')}</p>
            </div>

            <div className={'flex justify-end'}>
                <Button
                    type={'submit'}
                    size={'sm'}
                    variant={'primary'}
                    loading={busy}
                    disabled={name.trim() === '' || publicKey.trim() === ''}
                >
                    {t('account.ssh.addKey')}
                </Button>
            </div>
        </form>
    );
}

function KeyCard({ sshKey, onRemove }: { sshKey: SSHKey; onRemove: () => void }) {
    const t = useT();

    return (
        <div className={'rounded-2xl bg-card p-4'}>
            <div className={'flex flex-wrap items-center justify-between gap-3'}>
                <div className={'flex min-w-0 items-center gap-2.5'}>
                    <span
                        className={
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-overlay text-ink-muted'
                        }
                    >
                        <KeyRound className={'h-4 w-4'} aria-hidden={'true'} />
                    </span>

                    <div className={'min-w-0'}>
                        <p className={'truncate text-sm font-medium text-ink'}>{sshKey.name}</p>
                        <p className={'mt-0.5 truncate font-mono text-xs text-ink-faint'}>
                            {`SHA256:${sshKey.fingerprint}`}
                        </p>
                        <p className={'mt-0.5 text-xs text-ink-faint'}>
                            {t('account.ssh.addedOn', { when: format(sshKey.createdAt, 'MMM do, yyyy HH:mm') })}
                        </p>
                    </div>
                </div>

                <Button
                    size={'sm'}
                    variant={'ghost'}
                    onClick={onRemove}
                    className={'text-danger hover:bg-danger/10 hover:text-danger'}
                    icon={<Trash2 className={'h-3.5 w-3.5'} />}
                >
                    {t('common.remove')}
                </Button>
            </div>
        </div>
    );
}
