import React, { FormEvent, useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import getApiKeys, { ApiKey } from '@/api/account/getApiKeys';
import createApiKey from '@/api/account/createApiKey';
import deleteApiKey from '@/api/account/deleteApiKey';
import PageBlock from '@/dezerx/components/PageBlock';
import { Button, Input, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { useCopied } from '@/dezerx/lib/useCopied';
import { useT } from '@/i18n';

export default () => {
    const t = useT();
    const { toast } = useToast();

    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [secret, setSecret] = useState('');
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    useEffect(() => {
        getApiKeys()
            .then((keys) => setKeys(keys))
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('account.api.loadFailed')), { tone: 'error' });
            })
            .then(() => setLoading(false));
    }, []);

    const remove = (key: ApiKey) =>
        setDialog({
            title: t('account.api.deleteTitle', { identifier: key.identifier }),
            body: t('account.api.deleteBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteApiKey(key.identifier);

                    setKeys((current) => current.filter((candidate) => candidate.identifier !== key.identifier));
                    toast(t('account.api.deleted'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('account.api.deleteFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    return (
        <PageBlock title={t('account.api.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />
            <SecretDialog secret={secret} onClose={() => setSecret('')} />

            {loading && keys.length === 0 ? (
                <SectionSkeleton label={t('account.api.loading')} rows={2} />
            ) : (
                <div className={'space-y-4'}>
                    <SectionHeader
                        title={t('account.api.title')}
                        description={t('account.api.description')}
                        action={
                            <Button
                                size={'sm'}
                                variant={creating ? 'secondary' : 'primary'}
                                onClick={() => setCreating((value) => !value)}
                                icon={!creating ? <Plus className={'h-3.5 w-3.5'} /> : undefined}
                            >
                                {t(creating ? 'common.cancel' : 'account.api.newKey')}
                            </Button>
                        }
                    />

                    {creating && (
                        <CreateForm
                            onCreated={(key, token) => {
                                setKeys((current) => [...current, key]);
                                setSecret(token);
                                setCreating(false);
                            }}
                        />
                    )}

                    {keys.length === 0 ? (
                        <SectionEmpty
                            icon={KeyRound}
                            title={t('account.api.emptyTitle')}
                            body={t('account.api.emptyBody')}
                        />
                    ) : (
                        <div className={'space-y-3'}>
                            {keys.map((key) => (
                                <KeyCard key={key.identifier} apiKey={key} onDelete={() => remove(key)} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </PageBlock>
    );
};

function CreateForm({ onCreated }: { onCreated: (key: ApiKey, token: string) => void }) {
    const t = useT();
    const { toast } = useToast();

    const [description, setDescription] = useState('');
    const [allowedIps, setAllowedIps] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);

        createApiKey(description, allowedIps)
            .then(({ secretToken, ...key }) => {
                onCreated(key, `${key.identifier}${secretToken}`);
                toast(t('account.api.created'), { tone: 'success' });
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('account.api.createFailed')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    return (
        <form onSubmit={submit} className={'space-y-4 rounded-2xl bg-card p-4'}>
            <Input
                required
                minLength={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                label={t('common.description')}
                hint={t('account.api.descriptionHint')}
                placeholder={t('account.api.descriptionPlaceholder')}
            />

            <div>
                <label htmlFor={'allowed-ips'} className={'mb-1.5 block text-xs font-medium text-ink-muted'}>
                    {t('account.api.allowedIps')}
                </label>
                <textarea
                    id={'allowed-ips'}
                    rows={4}
                    value={allowedIps}
                    spellCheck={false}
                    onChange={(event) => setAllowedIps(event.target.value)}
                    placeholder={'203.0.113.4\n2001:db8::/32'}
                    className={
                        'dz-input w-full rounded-2xl border-line-field bg-raised px-4 py-3 font-mono text-xs text-ink transition-colors placeholder:text-ink-faint hover:border-ink-faint/25 focus:border-accent/60'
                    }
                />
                <p className={'mt-1.5 text-xs text-ink-faint'}>{t('account.api.allowedIpsHint')}</p>
            </div>

            <div className={'flex justify-end'}>
                <Button
                    type={'submit'}
                    size={'sm'}
                    variant={'primary'}
                    loading={busy}
                    disabled={description.trim().length < 4}
                >
                    {t('account.api.createKey')}
                </Button>
            </div>
        </form>
    );
}

function KeyCard({ apiKey, onDelete }: { apiKey: ApiKey; onDelete: () => void }) {
    const t = useT();
    const [copied, copy] = useCopied();

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
                        <p className={'truncate text-sm font-medium text-ink'}>{apiKey.description}</p>
                        <p className={'mt-0.5 truncate text-xs text-ink-faint'}>
                            <span className={'font-mono'}>{apiKey.identifier}</span>
                            {' · '}
                            {apiKey.lastUsedAt
                                ? t('account.api.lastUsed', {
                                      when: format(apiKey.lastUsedAt, 'MMM do, yyyy HH:mm'),
                                  })
                                : t('account.api.neverUsed')}
                            {apiKey.allowedIps.length > 0 &&
                                ` · ${t('account.api.addressesAllowed', { count: apiKey.allowedIps.length })}`}
                        </p>
                    </div>
                </div>

                <div className={'flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto'}>
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        onClick={() => copy(apiKey.identifier)}
                        title={t('account.api.copyIdHint')}
                        icon={
                            copied ? (
                                <Check className={'h-3.5 w-3.5 text-success'} />
                            ) : (
                                <Copy className={'h-3.5 w-3.5'} />
                            )
                        }
                    >
                        {t('account.api.copyId')}
                    </Button>

                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        onClick={onDelete}
                        className={'text-danger hover:bg-danger/10 hover:text-danger'}
                        icon={<Trash2 className={'h-3.5 w-3.5'} />}
                    >
                        {t('common.delete')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function SecretDialog({ secret, onClose }: { secret: string; onClose: () => void }) {
    const t = useT();
    const [copied, copy] = useCopied();

    return (
        <DialogShell
            open={secret !== ''}
            onClose={() => undefined}
            width={'md'}
            title={t('account.api.secretTitle')}
            body={t('account.api.secretBody')}
        >
            <pre
                className={
                    'mt-4 overflow-x-auto rounded-xl bg-raised p-3 font-mono text-xs leading-relaxed text-ink-muted'
                }
            >
                {secret}
            </pre>

            <DialogFooter>
                <Button
                    variant={'secondary'}
                    size={'sm'}
                    onClick={() => copy(secret)}
                    icon={
                        copied ? <Check className={'h-3.5 w-3.5 text-success'} /> : <Copy className={'h-3.5 w-3.5'} />
                    }
                >
                    {t(copied ? 'common.copied' : 'common.copy')}
                </Button>
                <Button size={'sm'} variant={'primary'} onClick={onClose}>
                    {t('account.api.secretSaved')}
                </Button>
            </DialogFooter>
        </DialogShell>
    );
}
