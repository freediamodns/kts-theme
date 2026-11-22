import React, { ComponentType, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, KeyRound, Loader2, Pencil, Plug, Plus, Server, TriangleAlert } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { Button, Input, Notice, Select, useToast } from '@/dezerx/components/ui';
import { SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { CredentialForm, HostForm } from '@/dezerx/components/importer/ProfileForms';
import { cn } from '@/dezerx/lib/cn';
import {
    CredentialInput,
    HostInput,
    ImportCredential,
    ImportHost,
    ImportLogin,
    ImportStatus,
    ImporterPayload,
    Protocol,
    TestResult,
    TransferMode,
    createCredential,
    createHost,
    deleteCredential,
    deleteHost,
    getImportStatus,
    getImporter,
    startImport,
    testImport,
    updateCredential,
    updateHost,
} from '@/api/server/importer';
import { useT } from '@/i18n';

const CARD = 'rounded-2xl bg-card p-4';

const MANUAL = '__manual__';

const RUNNING: ImportStatus['state'][] = ['connecting', 'scanning', 'copying'];

type ProfileKind = 'host' | 'credential';

type Editing = { kind: 'host'; entry: ImportHost | null } | { kind: 'credential'; entry: ImportCredential | null };

export default function ImporterContainer() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { toast } = useToast();

    const [payload, setPayload] = useState<ImporterPayload | null>(null);

    const [profileType, setProfileType] = useState<ProfileKind>('host');
    const [editing, setEditing] = useState<Editing | null>(null);

    const [host, setHost] = useState('');
    const [credential, setCredential] = useState('');

    const [manualHost, setManualHost] = useState('');
    const [manualPort, setManualPort] = useState('22');
    const [manualMode, setManualMode] = useState<Protocol>('sftp');
    const [manualUser, setManualUser] = useState('');
    const [manualSecret, setManualSecret] = useState('');

    const [source, setSource] = useState('/');
    const [destination, setDestination] = useState('/');
    const [transferMode, setTransferMode] = useState<TransferMode>('merge');

    const [saving, setSaving] = useState(false);

    const [testing, setTesting] = useState(false);
    const [starting, setStarting] = useState(false);
    const [test, setTest] = useState<TestResult | null>(null);
    const [progress, setProgress] = useState<ImportStatus | null>(null);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [now, setNow] = useState(() => Date.now());

    const poller = useRef<number | null>(null);

    useEffect(() => {
        if (progress === null) {
            return;
        }

        const tick = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(tick);
    }, [progress === null]);

    const chosenHost = useMemo(() => payload?.hosts.find((entry) => entry.id === host) ?? null, [payload, host]);
    const chosenCredential = useMemo(
        () => payload?.credentials.find((entry) => entry.id === credential) ?? null,
        [payload, credential]
    );

    const manual = host === MANUAL;
    const manualCredential = credential === MANUAL || credential === '';

    const poll = () => {
        const tick = async () => {
            try {
                const data = await getImportStatus(uuid);

                if (data.state === 'done' || data.state === 'failed') {
                    setProgress(null);
                    setStarting(false);
                    toast(data.message, { tone: data.state === 'done' ? 'success' : 'error' });

                    return;
                }

                setProgress(data);
            } catch {
                setProgress((held) => held);
            }

            poller.current = window.setTimeout(() => void tick(), 3000);
        };

        poller.current = window.setTimeout(() => void tick(), 2000);
    };

    useEffect(() => {
        getImporter(uuid)
            .then((data) => {
                setPayload(data);
                setHost(data.hosts[0]?.id ?? MANUAL);
                setCredential(data.credentials[0]?.id ?? MANUAL);

                if (RUNNING.includes(data.status.state)) {
                    setProgress(data.status);
                    setStarting(true);
                    poll();
                }
            })
            .catch((error) => toast(apiMessage(error, t('importer.readFailed')), { tone: 'error' }));

        return () => {
            if (poller.current !== null) {
                window.clearTimeout(poller.current);
            }
        };
    }, [uuid]);

    useEffect(() => {
        setTest(null);
    }, [host, credential]);

    useEffect(() => {
        setSource(chosenHost?.path || '/');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [host]);

    const login = (): ImportLogin => ({
        host_profile: manual ? undefined : host,
        credential_profile: manualCredential ? undefined : credential,
        host: manual ? manualHost.trim() : undefined,
        port: manual ? Number(manualPort) || undefined : undefined,
        mode: manual ? manualMode : undefined,
        username: manualCredential ? manualUser.trim() : undefined,
        secret: manualCredential ? manualSecret : undefined,
        source: source.trim(),
    });

    const ready =
        (manual ? manualHost.trim() !== '' : host !== '') &&
        (manualCredential ? manualUser.trim() !== '' && manualSecret !== '' : credential !== '');

    const saveHost = async (body: HostInput) => {
        setSaving(true);

        const editingHost = editing?.kind === 'host' ? editing.entry : null;

        try {
            const saved =
                editingHost === null ? await createHost(uuid, body) : await updateHost(uuid, editingHost.id, body);

            setPayload((held) =>
                held === null
                    ? held
                    : {
                          ...held,
                          hosts:
                              editingHost === null
                                  ? [...held.hosts, saved]
                                  : held.hosts.map((row) => (row.id === saved.id ? saved : row)),
                      }
            );

            setHost(saved.id);
            setEditing(null);
            setProfileType('credential');
            toast(t('importer.hostSaved'), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('importer.hostSaveFailed')), { tone: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const saveCredential = async (body: CredentialInput) => {
        setSaving(true);

        const editingCredential = editing?.kind === 'credential' ? editing.entry : null;

        try {
            const saved =
                editingCredential === null
                    ? await createCredential(uuid, body)
                    : await updateCredential(uuid, editingCredential.id, body);

            setPayload((held) =>
                held === null
                    ? held
                    : {
                          ...held,
                          credentials:
                              editingCredential === null
                                  ? [...held.credentials, saved]
                                  : held.credentials.map((row) => (row.id === saved.id ? saved : row)),
                      }
            );

            setCredential(saved.id);
            setEditing(null);
            toast(t('importer.credentialSaved'), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('importer.credentialSaveFailed')), { tone: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const removeHost = (entry: ImportHost) =>
        setDialog({
            title: t('importer.removeTitle', { label: entry.label }),
            body: t('importer.removeBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            onConfirm: async () => {
                await deleteHost(uuid, entry.id);

                setPayload((held) =>
                    held === null ? held : { ...held, hosts: held.hosts.filter((row) => row.id !== entry.id) }
                );

                setHost((held) => (held === entry.id ? MANUAL : held));
                setEditing(null);
                toast(t('importer.hostRemoved'), { tone: 'success' });
            },
        });

    const removeCredential = (entry: ImportCredential) =>
        setDialog({
            title: t('importer.removeTitle', { label: entry.label }),
            body: t('importer.removeBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            onConfirm: async () => {
                await deleteCredential(uuid, entry.id);

                setPayload((held) =>
                    held === null
                        ? held
                        : { ...held, credentials: held.credentials.filter((row) => row.id !== entry.id) }
                );

                setCredential((held) => (held === entry.id ? MANUAL : held));
                setEditing(null);
                toast(t('importer.credentialRemoved'), { tone: 'success' });
            },
        });

    const runTest = async () => {
        setTesting(true);
        setTest(null);

        try {
            const result = await testImport(uuid, login());

            setTest(result);
            toast(result.ok ? t('importer.testPassed') : result.error ?? t('importer.testFailed'), {
                tone: result.ok ? 'success' : 'error',
            });
        } catch (error) {
            toast(apiMessage(error, t('importer.testFailed')), { tone: 'error' });
        } finally {
            setTesting(false);
        }
    };

    const confirmStart = () =>
        setDialog({
            title: t('importer.startTitle'),
            body: t(transferMode === 'replace' ? 'importer.startBodyReplace' : 'importer.startBody', {
                destination: destination.trim() || '/',
            }),
            confirmLabel: t('importer.start'),
            destructive: true,
            onConfirm: async () => {
                setStarting(true);

                try {
                    const { message } = await startImport(uuid, {
                        ...login(),
                        destination: destination.trim() || '/',
                        transferMode,
                    });

                    toast(message, { tone: 'success' });
                    setProgress({
                        state: 'connecting',
                        message: t('importer.queued'),
                        startedAt: Date.now() / 1000,
                        updatedAt: Date.now() / 1000,
                        progress: null,
                    });
                    poll();
                } catch (error) {
                    setStarting(false);
                    toast(apiMessage(error, t('importer.startFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    if (payload === null) {
        return (
            <ServerContentBlock title={t('importer.title')}>
                <SectionSkeleton label={t('importer.loading')} />
            </ServerContentBlock>
        );
    }

    const atLimit =
        profileType === 'host'
            ? payload.hosts.length >= payload.maxProfiles
            : payload.credentials.length >= payload.maxProfiles;

    const addLabel = profileType === 'host' ? t('importer.newHost') : t('importer.newCredential');

    const elapsedSeconds = progress?.startedAt ? Math.max(0, now / 1000 - progress.startedAt) : null;
    const counts = progress?.progress ?? null;
    const etaSeconds =
        counts && counts.total !== null && counts.current > 0 && elapsedSeconds !== null
            ? ((counts.total - counts.current) * elapsedSeconds) / counts.current
            : null;
    const percent =
        counts && counts.total !== null && counts.total > 0
            ? Math.min(100, Math.round((counts.current / counts.total) * 100))
            : null;

    return (
        <ServerContentBlock title={t('importer.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <div className={'space-y-4'}>
                {progress === null ? (
                    <Notice tone={'warning'} title={t('importer.noticeTitle')}>
                        {t('importer.noticeBody')}
                    </Notice>
                ) : (
                    <div className={'flex items-center gap-3 rounded-2xl bg-card p-4'}>
                        <Loader2 aria-hidden={'true'} className={'h-4 w-4 shrink-0 animate-spin text-accent'} />
                        <div className={'min-w-0 flex-1'}>
                            <div className={'flex items-center justify-between gap-2'}>
                                <p className={'truncate text-sm font-medium text-ink'}>
                                    {t(`importer.state.${progress.state}`)}
                                </p>
                                {elapsedSeconds !== null && (
                                    <span className={'shrink-0 text-[11px] tabular-nums text-ink-faint'}>
                                        {formatDuration(elapsedSeconds)}
                                    </span>
                                )}
                            </div>

                            <p className={'mt-0.5 truncate text-xs text-ink-faint'}>{progress.message}</p>

                            {percent !== null && counts && (
                                <div className={'mt-2'}>
                                    <div className={'h-1.5 w-full overflow-hidden rounded-full bg-overlay/60'}>
                                        <div
                                            className={'h-full rounded-full bg-accent transition-[width] duration-500'}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <div className={'mt-1 flex items-center justify-between text-[11px] text-ink-faint'}>
                                        <span>
                                            {counts.current} / {counts.total}
                                        </span>
                                        {etaSeconds !== null && (
                                            <span>{t('importer.eta', { time: formatDuration(etaSeconds) })}</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className={'grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]'}>
                    <div className={'space-y-3'}>
                        <p className={'text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>
                            {t('importer.profiles')}
                        </p>

                        <div className={'flex items-center gap-2'}>
                            <Select
                                value={profileType}
                                onChange={(value) => {
                                    setProfileType(value as ProfileKind);
                                    setEditing(null);
                                }}
                                options={[
                                    { value: 'host', label: t('importer.serversTitle') },
                                    { value: 'credential', label: t('importer.credentialsTitle') },
                                ]}
                            />

                            <button
                                type={'button'}
                                aria-label={addLabel}
                                title={addLabel}
                                disabled={atLimit}
                                onClick={() => setEditing({ kind: profileType, entry: null } as Editing)}
                                className={cn(
                                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-overlay text-ink-muted transition-colors',
                                    'hover:bg-raised hover:text-ink disabled:pointer-events-none disabled:opacity-50'
                                )}
                            >
                                <Plus className={'h-4 w-4'} aria-hidden={'true'} />
                            </button>
                        </div>

                        <div className={'space-y-1.5'}>
                            {profileType === 'host' ? (
                                payload.hosts.length === 0 ? (
                                    <EmptyProfiles label={t('importer.noHosts')} />
                                ) : (
                                    payload.hosts.map((entry) => (
                                        <ProfileRow
                                            key={entry.id}
                                            icon={Server}
                                            active={entry.id === host}
                                            title={entry.label}
                                            subtitle={`${entry.host}:${entry.port}`}
                                            onClick={() => setEditing({ kind: 'host', entry })}
                                        />
                                    ))
                                )
                            ) : payload.credentials.length === 0 ? (
                                <EmptyProfiles label={t('importer.noCredentials')} />
                            ) : (
                                payload.credentials.map((entry) => (
                                    <ProfileRow
                                        key={entry.id}
                                        icon={KeyRound}
                                        active={entry.id === credential}
                                        title={entry.label}
                                        subtitle={entry.username}
                                        onClick={() => setEditing({ kind: 'credential', entry })}
                                    />
                                ))
                            )}

                            <ProfileRow
                                icon={Pencil}
                                active={profileType === 'host' ? manual : manualCredential}
                                title={profileType === 'host' ? t('importer.manualHost') : t('importer.manualCredential')}
                                onClick={() => {
                                    if (profileType === 'host') {
                                        setHost(MANUAL);
                                    } else {
                                        setCredential(MANUAL);
                                    }

                                    setEditing(null);
                                }}
                            />
                        </div>
                    </div>

                    <div className={CARD}>
                        {editing !== null ? (
                            editing.kind === 'host' ? (
                                <HostForm
                                    editing={editing.entry}
                                    busy={saving}
                                    onSave={(body) => void saveHost(body)}
                                    onCancel={() => setEditing(null)}
                                    onUse={
                                        editing.entry
                                            ? () => {
                                                  setHost(editing.entry!.id);
                                                  setEditing(null);
                                                  setProfileType('credential');
                                              }
                                            : undefined
                                    }
                                    onDelete={editing.entry ? () => removeHost(editing.entry!) : undefined}
                                />
                            ) : (
                                <CredentialForm
                                    editing={editing.entry}
                                    busy={saving}
                                    onSave={(body) => void saveCredential(body)}
                                    onCancel={() => setEditing(null)}
                                    onUse={
                                        editing.entry
                                            ? () => {
                                                  setCredential(editing.entry!.id);
                                                  setEditing(null);
                                              }
                                            : undefined
                                    }
                                    onDelete={editing.entry ? () => removeCredential(editing.entry!) : undefined}
                                />
                            )
                        ) : (
                            <div>
                                <p className={'text-sm font-semibold tracking-tight text-ink'}>
                                    {t('importer.settingsTitle')}
                                </p>

                                <div className={'mt-4 space-y-4'}>
                                    <div>
                                        <div className={'grid gap-3 sm:grid-cols-3'}>
                                            <Input
                                                label={t('importer.host')}
                                                value={manual ? manualHost : chosenHost?.host ?? ''}
                                                disabled={!manual}
                                                onChange={(event) => setManualHost(event.target.value)}
                                                placeholder={'node12.oldhost.com'}
                                            />
                                            <Input
                                                label={t('importer.port')}
                                                value={manual ? manualPort : String(chosenHost?.port ?? '')}
                                                disabled={!manual}
                                                inputMode={'numeric'}
                                                onChange={(event) => setManualPort(event.target.value)}
                                            />
                                            <Select
                                                label={t('importer.protocol')}
                                                value={manual ? manualMode : chosenHost?.mode ?? 'sftp'}
                                                disabled={!manual}
                                                onChange={(value) => {
                                                    setManualMode(value as Protocol);
                                                    setManualPort(value === 'ftp' ? '21' : '22');
                                                }}
                                                options={[
                                                    { value: 'sftp', label: 'SFTP' },
                                                    { value: 'ftp', label: 'FTP' },
                                                ]}
                                            />
                                        </div>

                                        {!manual && chosenHost && (
                                            <p className={'mt-2 text-[11px] text-ink-faint'}>
                                                {t('importer.usingHost', { label: chosenHost.label })}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <div className={'grid gap-3 sm:grid-cols-2'}>
                                            <Input
                                                label={t('importer.username')}
                                                value={manualCredential ? manualUser : chosenCredential?.username ?? ''}
                                                disabled={!manualCredential}
                                                autoComplete={'off'}
                                                onChange={(event) => setManualUser(event.target.value)}
                                                placeholder={'user.a1b2c3d4'}
                                            />
                                            <Input
                                                label={t('importer.password')}
                                                type={'password'}
                                                revealable={manualCredential}
                                                value={manualCredential ? manualSecret : ''}
                                                disabled={!manualCredential}
                                                autoComplete={'new-password'}
                                                onChange={(event) => setManualSecret(event.target.value)}
                                                placeholder={manualCredential ? undefined : '••••••••'}
                                            />
                                        </div>

                                        {manualCredential ? (
                                            <p className={'mt-2 text-[11px] text-ink-faint'}>
                                                {t('importer.manualCredentialHint')}
                                            </p>
                                        ) : (
                                            chosenCredential && (
                                                <p className={'mt-2 text-[11px] text-ink-faint'}>
                                                    {t('importer.usingCredential', { label: chosenCredential.label })}
                                                </p>
                                            )
                                        )}
                                    </div>

                                    <div className={'grid gap-3 sm:grid-cols-2'}>
                                        <Input
                                            label={t('importer.source')}
                                            value={source}
                                            onChange={(event) => setSource(event.target.value)}
                                            placeholder={'/'}
                                        />
                                        <Input
                                            label={t('importer.destination')}
                                            value={destination}
                                            onChange={(event) => setDestination(event.target.value)}
                                            placeholder={'/'}
                                        />
                                    </div>

                                    <div className={'flex items-center gap-2'}>
                                        <Button
                                            size={'sm'}
                                            variant={'secondary'}
                                            loading={testing}
                                            disabled={!ready}
                                            onClick={() => void runTest()}
                                            icon={<Plug className={'h-3.5 w-3.5'} />}
                                        >
                                            {t('importer.test')}
                                        </Button>

                                        <div className={'w-44 shrink-0'}>
                                            <Select
                                                size={'sm'}
                                                value={transferMode}
                                                onChange={(value) => setTransferMode(value as TransferMode)}
                                                options={payload.transferModes.map((value) => ({
                                                    value,
                                                    label: t(`importer.modes.${value}`),
                                                }))}
                                            />
                                        </div>

                                        <Button
                                            size={'sm'}
                                            loading={starting}
                                            disabled={!ready || progress !== null}
                                            onClick={confirmStart}
                                            icon={<Download className={'h-3.5 w-3.5'} />}
                                            className={'ml-auto'}
                                        >
                                            {t('importer.start')}
                                        </Button>
                                    </div>

                                    {test !== null && <TestPanel result={test} />}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ServerContentBlock>
    );
}

function ProfileRow({
    icon: Icon,
    active,
    title,
    subtitle,
    onClick,
}: {
    icon: ComponentType<{ className?: string }>;
    active: boolean;
    title: string;
    subtitle?: string;
    onClick: () => void;
}) {
    return (
        <button
            type={'button'}
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'group flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors',
                active ? 'bg-accent shadow-sm' : 'bg-card hover:bg-raised'
            )}
        >
            <span
                className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                    active ? 'bg-black/10 text-ink-inverse' : 'bg-overlay/70 text-ink-faint group-hover:text-ink-muted'
                )}
            >
                <Icon className={'h-4 w-4'} aria-hidden={'true'} />
            </span>

            <span className={'min-w-0 flex-1'}>
                <span className={cn('block truncate text-sm font-medium', active ? 'text-ink-inverse' : 'text-ink')}>
                    {title}
                </span>
                {subtitle && (
                    <span
                        className={cn('block truncate text-[11px]', active ? 'text-ink-inverse/70' : 'text-ink-faint')}
                    >
                        {subtitle}
                    </span>
                )}
            </span>

            {active && (
                <Check
                    aria-hidden={'true'}
                    className={'h-4 w-4 shrink-0 text-ink-inverse'}
                />
            )}
        </button>
    );
}

function EmptyProfiles({ label }: { label: string }) {
    return <p className={'rounded-2xl bg-card px-4 py-6 text-center text-xs text-ink-faint'}>{label}</p>;
}

function formatDuration(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }

    return `${secs}s`;
}

function TestPanel({ result }: { result: TestResult }) {
    if (result.ok) {
        return null;
    }

    return (
        <div className={'rounded-xl bg-danger/10 p-3'}>
            <p className={'flex items-center gap-2 text-xs font-medium text-ink'}>
                <TriangleAlert aria-hidden={'true'} className={'h-3.5 w-3.5 shrink-0 text-danger'} />
                {result.error}
            </p>
        </div>
    );
}

export { ImporterContainer };
