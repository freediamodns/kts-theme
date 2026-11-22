import React, { FormEvent, ReactNode, useState } from 'react';
import isEqual from 'react-fast-compare';
import { useStoreState } from 'easy-peasy';
import { Check, Copy, ExternalLink, Info, RotateCcw } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import Can from '@/components/elements/Can';
import { ServerContext } from '@/state/server';
import { usePermissions } from '@/plugins/usePermissions';
import renameServer from '@/api/server/renameServer';
import reinstallServer from '@/api/server/reinstallServer';
import { ip } from '@/lib/formatters';
import { Button, Input, useToast } from '@/dezerx/components/ui';
import { apiMessage } from '@/dezerx/components/console/Section';
import { DetailRow } from '@/dezerx/components/console/DetailRow';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import FreeServerBox from '@/dezerx/components/create/FreeServerBox';
import NodeFlag from '@/dezerx/components/NodeFlag';
import { cn } from '@/dezerx/lib/cn';
import { useCopied } from '@/dezerx/lib/useCopied';
import { demoRefusal, useDemo } from '@/dezerx/lib/demo';
import { useT } from '@/i18n';

const SettingsContainer = () => {
    const t = useT();
    const { toast } = useToast();

    const username = useStoreState((state) => state.user.data!.username);

    const id = ServerContext.useStoreState((state) => state.server.data!.id);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const node = ServerContext.useStoreState((state) => state.server.data!.node);
    const dockerImage = ServerContext.useStoreState((state) => state.server.data!.dockerImage);
    const skipScripts = ServerContext.useStoreState((state) => state.server.data!.skipScripts);
    const sftp = ServerContext.useStoreState((state) => state.server.data!.sftpDetails, isEqual);
    const status = ServerContext.useStoreState((state) => state.status.value);

    const demo = useDemo();

    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    const sftpHost = demo ? 'example.host' : ip(sftp.ip);
    const sftpPort = demo ? '2022' : String(sftp.port);
    const sftpUsername = demo ? 'username.00000000' : `${username}.${id}`;
    const sftpUrl = `sftp://${sftpUsername}@${sftpHost}:${sftpPort}`;

    const reinstall = () =>
        setDialog({
            title: t('settings.reinstallTitle'),
            body: t('settings.reinstallDialogBody'),
            confirmLabel: t('settings.reinstall'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await reinstallServer(uuid);
                    toast(t('settings.reinstallStarted'), { tone: 'success' });
                } catch (error) {
                    console.error(error);
                    toast(apiMessage(error, t('settings.reinstallFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    return (
        <ServerContentBlock title={t('settings.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <div className={'space-y-4'}>
                <div className={'grid gap-4 lg:grid-cols-2 lg:items-start'}>
                    <div className={'flex flex-col gap-4'}>
                        <Can action={'settings.rename'}>
                            <Card title={t('settings.detailsTitle')} description={t('settings.detailsDescription')}>
                                <RenameForm />
                            </Card>
                        </Can>

                        <Can action={'file.sftp'}>
                            <Card title={t('settings.sftpTitle')} description={t('settings.sftpDescription')}>
                                <div className={'space-y-3'}>
                                    <Connection value={sftpUrl} blurred={demo} />

                                    <dl className={'space-y-2 rounded-xl bg-overlay/40 p-3'}>
                                        <DetailRow
                                            label={t('settings.host')}
                                            value={sftpHost}
                                            copyable
                                            mono
                                            blurred={demo}
                                        />
                                        <DetailRow
                                            label={t('settings.port')}
                                            value={sftpPort}
                                            copyable
                                            mono
                                            blurred={demo}
                                        />
                                        <DetailRow
                                            label={t('settings.username')}
                                            value={sftpUsername}
                                            copyable
                                            mono
                                            blurred={demo}
                                        />
                                    </dl>

                                    <div className={'flex flex-wrap items-center justify-between gap-3'}>
                                        <p
                                            className={
                                                'flex min-w-0 flex-1 items-start gap-2 text-xs leading-relaxed text-ink-faint'
                                            }
                                        >
                                            <Info className={'mt-0.5 h-3.5 w-3.5 shrink-0'} aria-hidden={'true'} />
                                            {t('settings.sftpPassword')}
                                        </p>

                                        {demo ? (
                                            <Button
                                                size={'sm'}
                                                variant={'secondary'}
                                                disabled
                                                title={demoRefusal()}
                                                icon={<ExternalLink className={'h-3.5 w-3.5'} />}
                                            >
                                                {t('settings.openInClient')}
                                            </Button>
                                        ) : (
                                            <a
                                                href={sftpUrl}
                                                className={
                                                    'inline-flex h-9 shrink-0 items-center gap-2 rounded-2xl bg-btn px-3.5 text-xs font-semibold tracking-tight text-btn-ink transition-colors hover:bg-btn/90'
                                                }
                                            >
                                                <ExternalLink aria-hidden={'true'} className={'h-3.5 w-3.5'} />
                                                {t('settings.openInClient')}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </Can>
                    </div>

                    <div className={'flex flex-col gap-4'}>
                        <Card title={t('settings.aboutTitle')}>
                            <dl className={'divide-y divide-line-field'}>
                                <Fact label={t('settings.node')}>
                                    <span className={'flex min-w-0 items-center gap-2'}>
                                        <NodeFlag node={node} className={'h-3.5 w-5 shrink-0 rounded-sm'} />
                                        <span className={'truncate text-xs text-ink'}>{node}</span>
                                    </span>
                                </Fact>
                                <div className={'py-2.5'}>
                                    <DetailRow label={t('settings.image')} value={dockerImage} copyable mono />
                                </div>
                                <div className={'py-2.5'}>
                                    <DetailRow label={'UUID'} value={uuid} copyable mono />
                                </div>
                            </dl>
                        </Card>

                        <Can action={'settings.reinstall'}>
                            <section
                                className={
                                    'flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-danger/10 p-4 sm:p-5'
                                }
                            >
                                <div className={'min-w-0 flex-1'}>
                                    <h2 className={'text-sm font-semibold tracking-tight text-danger'}>
                                        {t('settings.reinstall')}
                                    </h2>
                                    <p className={'mt-0.5 text-xs leading-relaxed text-ink-muted'}>
                                        {t(skipScripts ? 'settings.skipScripts' : 'settings.reinstallWarning')}
                                    </p>
                                </div>

                                {!skipScripts && (
                                    <Button
                                        size={'sm'}
                                        variant={'danger'}
                                        disabled={demo || status !== 'offline'}
                                        title={
                                            demo
                                                ? demoRefusal()
                                                : status === 'offline'
                                                ? undefined
                                                : t('settings.stopFirst')
                                        }
                                        onClick={reinstall}
                                        icon={<RotateCcw className={'h-3.5 w-3.5'} />}
                                    >
                                        {t('settings.reinstall')}
                                    </Button>
                                )}
                            </section>
                        </Can>
                    </div>
                </div>

                <FreeServerBox />
            </div>
        </ServerContentBlock>
    );
};

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className={'rounded-2xl bg-card p-4 sm:p-5'}>
            <header className={'mb-4'}>
                <h2 className={'text-sm font-semibold tracking-tight text-ink'}>{title}</h2>
                {description && <p className={'mt-0.5 text-xs text-ink-faint'}>{description}</p>}
            </header>

            {children}
        </section>
    );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className={'flex items-center justify-between gap-3 py-2.5 first:pt-0'}>
            <dt className={'shrink-0 text-xs text-ink-faint'}>{label}</dt>
            <dd className={'flex min-w-0 justify-end'}>{children}</dd>
        </div>
    );
}

function Connection({ value, blurred }: { value: string; blurred: boolean }) {
    const t = useT();
    const [copied, copy] = useCopied();

    return (
        <div className={'flex items-center gap-2 rounded-xl bg-overlay/40 p-1.5 pl-3'}>
            <span className={'shrink-0 text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>
                {t('settings.connection')}
            </span>

            <span
                aria-hidden={blurred ? true : undefined}
                className={cn('min-w-0 flex-1 truncate text-xs text-ink', blurred && 'select-none blur-[5px]')}
            >
                {value}
            </span>

            {!blurred && (
                <button
                    type={'button'}
                    onClick={() => copy(value)}
                    aria-label={t('common.copy')}
                    title={t('common.copy')}
                    className={
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                    }
                >
                    {copied ? <Check className={'h-3.5 w-3.5 text-success'} /> : <Copy className={'h-3.5 w-3.5'} />}
                </button>
            )}
        </div>
    );
}

function RenameForm() {
    const t = useT();
    const { toast } = useToast();

    const server = ServerContext.useStoreState((state) => state.server.data!, isEqual);
    const setServer = ServerContext.useStoreActions((actions) => actions.server.setServer);
    const [canRename] = usePermissions(['settings.rename']);
    const demo = useDemo();
    const editable = canRename && !demo;

    const [name, setName] = useState(server.name);
    const [description, setDescription] = useState(server.description);
    const [busy, setBusy] = useState(false);

    const dirty = name !== server.name || description !== server.description;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);

        renameServer(server.uuid, name, description)
            .then(() => {
                setServer({ ...server, name, description });
                toast(t('settings.saved'), { tone: 'success' });
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('settings.renameFailed')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    return (
        <form onSubmit={submit} className={'space-y-4'}>
            <Input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={!editable}
                label={t('common.name')}
            />
            <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={!editable}
                label={t('common.description')}
                hint={t('settings.descriptionHint')}
            />

            <div className={'flex justify-end'}>
                <Button
                    type={'submit'}
                    size={'sm'}
                    variant={'primary'}
                    loading={busy}
                    disabled={!editable || !dirty || name.trim() === ''}
                    title={demo ? demoRefusal() : undefined}
                >
                    {t('common.save')}
                </Button>
            </div>
        </form>
    );
}

export default SettingsContainer;
