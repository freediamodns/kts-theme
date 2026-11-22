import React, { useEffect, useRef, useState } from 'react';
import {
    ArrowLeftRight,
    Check,
    Code2,
    Copy,
    Database as DatabaseIcon,
    Download,
    KeyRound,
    Plus,
    RefreshCw,
    Trash2,
    Upload,
} from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { useDeepMemoize } from '@/plugins/useDeepMemoize';
import { usePermissions } from '@/plugins/usePermissions';
import getServerDatabases, { ServerDatabase } from '@/api/server/databases/getServerDatabases';
import createServerDatabase from '@/api/server/databases/createServerDatabase';
import deleteServerDatabase from '@/api/server/databases/deleteServerDatabase';
import rotateDatabasePassword from '@/api/server/databases/rotateDatabasePassword';
import { Badge, Button, Checkbox, Notice, Select, useToast } from '@/dezerx/components/ui';
import { useCopied } from '@/dezerx/lib/useCopied';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { bytesToString } from '@/lib/formatters';
import {
    DatabaseTransferSummary,
    exportDatabase,
    getDatabaseTransfer,
    importDatabase,
} from '@/api/server/databaseTransfer';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { DetailRow } from '@/dezerx/components/console/DetailRow';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { useT } from '@/i18n';

const DatabasesContainer = () => {
    const t = useT();
    const { toast } = useToast();

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const limit = ServerContext.useStoreState((state) => state.server.data!.featureLimits.databases);

    const databases = useDeepMemoize(ServerContext.useStoreState((state) => state.databases.data));
    const setDatabases = ServerContext.useStoreActions((actions) => actions.databases.setDatabases);
    const appendDatabase = ServerContext.useStoreActions((actions) => actions.databases.appendDatabase);
    const removeDatabase = ServerContext.useStoreActions((actions) => actions.databases.removeDatabase);

    const [canCreate, canUpdate, canDelete, canTransfer] = usePermissions([
        'database.create',
        'database.update',
        'database.delete',
        'database.view_password',
    ]);

    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [transferring, setTransferring] = useState<string | null>(null);
    const [exporting, setExporting] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [presets, setPresets] = useState<string | null>(null);

    useEffect(() => {
        setLoading(!databases.length);

        getServerDatabases(uuid)
            .then((databases) => setDatabases(databases))
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('databases.loadFailed')), { tone: 'error' });
            })
            .then(() => setLoading(false));
    }, []);

    const full = limit > 0 && databases.length >= limit;

    const create = () =>
        setDialog({
            title: t('databases.newDatabase'),
            body: t('databases.newBody'),
            confirmLabel: t('common.create'),
            input: { label: t('common.name'), initial: '' },
            onConfirm: async (name) => {
                try {
                    const database = await createServerDatabase(uuid, { databaseName: name, connectionsFrom: '%' });

                    appendDatabase(database);
                    toast(t('databases.created', { name }), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('databases.createFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    const remove = (database: ServerDatabase) =>
        setDialog({
            title: t('databases.deleteTitle', { name: database.name }),
            body: t('databases.deleteBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteServerDatabase(uuid, database.id);

                    removeDatabase(database.id);
                    toast(t('databases.deleted', { name: database.name }), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('databases.deleteFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    const rotate = (database: ServerDatabase) =>
        setDialog({
            title: t('databases.rotateTitle', { name: database.name }),
            body: t('databases.rotateBody'),
            confirmLabel: t('databases.rotate'),
            onConfirm: async () => {
                try {
                    const updated = await rotateDatabasePassword(uuid, database.id);

                    appendDatabase(updated);
                    toast(t('databases.rotated'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('databases.rotateFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    const exportOne = async (database: ServerDatabase) => {
        setExporting(database.id);

        try {
            await exportDatabase(uuid, database.id, database.name);
        } catch (error) {
            toast(apiMessage(error, t('databases.transfer.exportFailed')), { tone: 'error' });
        } finally {
            setExporting(null);
        }
    };

    const canImport = canUpdate && canTransfer;

    return (
        <ServerContentBlock title={t('databases.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <TransferDialog
                uuid={uuid}
                open={transferring !== null}
                initial={transferring || null}
                databases={databases}
                canImport={canImport}
                onClose={() => setTransferring(null)}
            />

            <InfoDialog database={databases.find((entry) => entry.id === info) ?? null} onClose={() => setInfo(null)} />

            <PresetsDialog
                database={databases.find((entry) => entry.id === presets) ?? null}
                onClose={() => setPresets(null)}
            />

            {loading && databases.length === 0 ? (
                <SectionSkeleton label={t('databases.loading')} rows={2} />
            ) : (
                <div className={'space-y-4'}>
                    <SectionHeader
                        title={t('databases.title')}
                        description={
                            limit === 0
                                ? t('databases.noSlots')
                                : t('databases.used', { used: databases.length, limit })
                        }
                        action={
                            <div className={'flex flex-wrap items-center gap-2'}>
                                {canTransfer && databases.length > 0 && (
                                    <Button
                                        size={'sm'}
                                        variant={'secondary'}
                                        onClick={() => setTransferring('')}
                                        icon={<ArrowLeftRight className={'h-3.5 w-3.5'} />}
                                    >
                                        {t('databases.transfer.action')}
                                    </Button>
                                )}

                                {canCreate && (
                                    <Button
                                        size={'sm'}
                                        variant={'primary'}
                                        disabled={full || limit === 0}
                                        title={full ? t('databases.fullHint') : undefined}
                                        onClick={create}
                                        icon={<Plus className={'h-3.5 w-3.5'} />}
                                    >
                                        {t('databases.newDatabase')}
                                    </Button>
                                )}
                            </div>
                        }
                    />

                    {databases.length === 0 ? (
                        <SectionEmpty
                            icon={DatabaseIcon}
                            title={t('databases.emptyTitle')}
                            body={t(limit === 0 ? 'databases.emptyNoSlots' : 'databases.emptyBody')}
                        />
                    ) : (
                        <div className={'space-y-3'}>
                            {databases.map((database) => (
                                <DatabaseCard
                                    key={database.id}
                                    database={database}
                                    canTransfer={canTransfer}
                                    canImport={canImport}
                                    canRotate={canUpdate}
                                    canDelete={canDelete}
                                    exporting={exporting === database.id}
                                    onInfo={() => setInfo(database.id)}
                                    onPresets={() => setPresets(database.id)}
                                    onExport={() => void exportOne(database)}
                                    onImport={() => setTransferring(database.id)}
                                    onRotate={() => rotate(database)}
                                    onDelete={() => remove(database)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </ServerContentBlock>
    );
};

function DatabaseCard({
    database,
    canTransfer,
    canImport,
    canRotate,
    canDelete,
    exporting,
    onInfo,
    onPresets,
    onExport,
    onImport,
    onRotate,
    onDelete,
}: {
    database: ServerDatabase;
    canTransfer: boolean;
    canImport: boolean;
    canRotate: boolean;
    canDelete: boolean;
    exporting: boolean;
    onInfo: () => void;
    onPresets: () => void;
    onExport: () => void;
    onImport: () => void;
    onRotate: () => void;
    onDelete: () => void;
}) {
    const t = useT();

    return (
        <div className={'rounded-2xl bg-card p-4'}>
            <div className={'flex flex-wrap items-center justify-between gap-3'}>
                <div className={'flex min-w-0 items-center gap-3'}>
                    <span
                        className={
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent'
                        }
                    >
                        <DatabaseIcon className={'h-4 w-4'} aria-hidden={'true'} />
                    </span>

                    <div className={'min-w-0'}>
                        <div className={'flex flex-wrap items-center gap-2'}>
                            <p className={'truncate text-sm font-semibold text-ink'}>{database.name}</p>
                            <Badge>{'MySQL'}</Badge>
                        </div>

                        <p className={'mt-0.5 truncate font-mono text-xs text-ink-faint'}>
                            {`${t('databases.connectionsFrom', { host: database.allowConnectionsFrom })} \u00b7 ${
                                database.connectionString
                            }`}
                        </p>
                    </div>
                </div>

                <div className={'flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto'}>
                    <Button
                        size={'sm'}
                        variant={'secondary'}
                        onClick={onInfo}
                        icon={<KeyRound className={'h-3.5 w-3.5'} />}
                    >
                        {t('databases.info')}
                    </Button>

                    <Button
                        size={'sm'}
                        variant={'secondary'}
                        onClick={onPresets}
                        icon={<Code2 className={'h-3.5 w-3.5'} />}
                    >
                        {t('databases.presets')}
                    </Button>

                    {canTransfer && (
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            loading={exporting}
                            onClick={onExport}
                            icon={<Download className={'h-3.5 w-3.5'} />}
                        >
                            {t('databases.export')}
                        </Button>
                    )}

                    {canImport && (
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            onClick={onImport}
                            icon={<Upload className={'h-3.5 w-3.5'} />}
                        >
                            {t('databases.import')}
                        </Button>
                    )}

                    {canRotate && (
                        <Button
                            size={'sm'}
                            variant={'ghost'}
                            onClick={onRotate}
                            title={t('databases.rotatePassword')}
                            aria-label={t('databases.rotatePassword')}
                            className={'w-9 px-0'}
                            icon={<RefreshCw className={'h-3.5 w-3.5'} />}
                        />
                    )}

                    {canDelete && (
                        <Button
                            size={'sm'}
                            variant={'ghost'}
                            onClick={onDelete}
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                            className={'w-9 px-0 text-danger hover:bg-danger/10 hover:text-danger'}
                            icon={<Trash2 className={'h-3.5 w-3.5'} />}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoDialog({ database, onClose }: { database: ServerDatabase | null; onClose: () => void }) {
    const t = useT();

    return (
        <DialogShell
            open={database !== null}
            onClose={onClose}
            title={database?.name ?? ''}
            body={t('databases.infoBody')}
            width={'md'}
        >
            {database !== null && (
                <dl className={'mt-4 space-y-2.5 rounded-2xl bg-overlay/40 p-3.5'}>
                    <DetailRow label={t('databases.endpoint')} value={database.connectionString} copyable mono />
                    <DetailRow label={t('databases.allowedFrom')} value={database.allowConnectionsFrom} mono />
                    <DetailRow label={t('databases.database')} value={database.name} copyable mono />
                    <DetailRow label={t('settings.username')} value={database.username} copyable mono />
                    {database.password !== undefined && (
                        <DetailRow label={t('common.password')} value={database.password} secret mono />
                    )}
                </dl>
            )}

            <DialogFooter>
                <Button size={'sm'} variant={'secondary'} onClick={onClose}>
                    {t('common.close')}
                </Button>
            </DialogFooter>
        </DialogShell>
    );
}

function presetsFor(database: ServerDatabase): { label: string; value: string }[] {
    const split = database.connectionString.lastIndexOf(':');
    const host = split > 0 ? database.connectionString.slice(0, split) : database.connectionString;
    const port = split > 0 ? database.connectionString.slice(split + 1) : '3306';
    const password = database.password ?? '<password>';

    return [
        { label: 'JDBC', value: `jdbc:mysql://${host}:${port}/${database.name}` },
        {
            label: 'URI',
            value: `mysql://${encodeURIComponent(database.username)}:${
                database.password === undefined ? password : encodeURIComponent(password)
            }@${host}:${port}/${database.name}`,
        },
        { label: 'MySQL CLI', value: `mysql -h ${host} -P ${port} -u ${database.username} -p ${database.name}` },
        {
            label: 'YAML',
            value: [
                `address: ${host}:${port}`,
                `database: ${database.name}`,
                `username: ${database.username}`,
                `password: '${password.replace(/'/g, "''")}'`,
            ].join('\n'),
        },
        {
            label: '.env',
            value: [
                `DB_HOST=${host}`,
                `DB_PORT=${port}`,
                `DB_DATABASE=${database.name}`,
                `DB_USERNAME=${database.username}`,
                `DB_PASSWORD="${password.replace(/(["\\$`])/g, '\\$1')}"`,
            ].join('\n'),
        },
    ];
}

function PresetsDialog({ database, onClose }: { database: ServerDatabase | null; onClose: () => void }) {
    const t = useT();

    return (
        <DialogShell
            open={database !== null}
            onClose={onClose}
            title={t('databases.presetsTitle', { name: database?.name ?? '' })}
            body={t('databases.presetsBody')}
            width={'lg'}
        >
            {database !== null && (
                <div className={'mt-4 max-h-[60vh] space-y-2.5 overflow-y-auto'}>
                    {database.password === undefined && (
                        <p className={'text-xs text-ink-faint'}>{t('databases.presetsNoPassword')}</p>
                    )}

                    {presetsFor(database).map((preset) => (
                        <PresetBlock key={preset.label} label={preset.label} value={preset.value} />
                    ))}
                </div>
            )}

            <DialogFooter>
                <Button size={'sm'} variant={'secondary'} onClick={onClose}>
                    {t('common.close')}
                </Button>
            </DialogFooter>
        </DialogShell>
    );
}

function PresetBlock({ label, value }: { label: string; value: string }) {
    const t = useT();
    const [copied, copy] = useCopied();

    return (
        <div className={'rounded-2xl bg-overlay/40 p-3'}>
            <div className={'flex items-center justify-between gap-3'}>
                <span className={'text-xs font-medium text-ink-muted'}>{label}</span>

                <button
                    type={'button'}
                    onClick={() => copy(value)}
                    aria-label={`${t('common.copy')} ${label}`}
                    className={
                        'flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                    }
                >
                    {copied ? <Check className={'h-3 w-3 text-success'} /> : <Copy className={'h-3 w-3'} />}
                    {t(copied ? 'common.copied' : 'common.copy')}
                </button>
            </div>

            <pre className={'mt-2 overflow-x-auto whitespace-pre font-mono text-xs text-ink'}>{value}</pre>
        </div>
    );
}

function TransferDialog({
    uuid,
    open,
    initial,
    databases,
    canImport,
    onClose,
}: {
    uuid: string;
    open: boolean;
    initial: string | null;
    databases: ServerDatabase[];
    canImport: boolean;
    onClose: () => void;
}) {
    const t = useT();
    const { toast } = useToast();
    const picker = useRef<HTMLInputElement>(null);

    const [selected, setSelected] = useState('');
    const [summary, setSummary] = useState<DatabaseTransferSummary | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [wipe, setWipe] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);

    const busy = exporting || importing;

    const database = databases.find((entry) => entry.id === selected) ?? null;

    useEffect(() => {
        if (open) {
            setProblem(null);
            setWipe(true);
        }
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setSelected((current) => {
            const wanted = initial ?? current;

            return databases.some((entry) => entry.id === wanted) ? wanted : databases[0]?.id ?? '';
        });
    }, [open, initial, databases]);

    useEffect(() => {
        if (!open || database === null) {
            setSummary(null);

            return;
        }

        let live = true;

        setSummary(null);
        setProblem(null);

        getDatabaseTransfer(uuid, database.id)
            .then((data) => {
                if (live) {
                    setSummary(data);
                }
            })
            .catch((error) => {
                if (live) {
                    setProblem(apiMessage(error, t('databases.transfer.unreachable')));
                }
            });

        return () => {
            live = false;
        };
    }, [uuid, open, database?.id]);

    const runExport = async () => {
        if (!database) {
            return;
        }

        setExporting(true);
        setProblem(null);

        try {
            await exportDatabase(uuid, database.id, database.name);
        } catch (error) {
            setProblem(apiMessage(error, t('databases.transfer.exportFailed')));
        } finally {
            setExporting(false);
        }
    };

    const runImport = async (file: File) => {
        if (!database) {
            return;
        }

        setImporting(true);
        setProblem(null);

        try {
            const result = await importDatabase(uuid, database.id, file, wipe);

            if (result.failed.length > 0) {
                toast(t('databases.transfer.importedWithErrors', { count: result.statements }), { tone: 'warning' });
                setProblem(result.failed.join('\n'));
            } else {
                toast(t('databases.transfer.imported', { count: result.statements }), { tone: 'success' });
                onClose();
            }
        } catch (error) {
            setProblem(apiMessage(error, t('databases.transfer.importFailed')));
        } finally {
            setImporting(false);
        }
    };

    return (
        <DialogShell
            open={open}
            onClose={() => {
                if (!busy) {
                    onClose();
                }
            }}
            title={t('databases.transfer.title')}
            body={t('databases.transfer.intro')}
            width={'md'}
        >
            <div className={'mt-4 space-y-3'}>
                <Select
                    size={'sm'}
                    label={t('databases.transfer.which')}
                    value={selected}
                    disabled={busy}
                    onChange={setSelected}
                    options={databases.map((entry) => ({ value: entry.id, label: entry.name }))}
                    placeholder={t('databases.transfer.which')}
                />

                <div className={'flex items-center justify-between rounded-xl bg-overlay/40 px-3 py-2 text-xs'}>
                    <span className={'text-ink-faint'}>{t('databases.transfer.contents')}</span>
                    <span className={'font-mono text-ink-muted'}>
                        {database === null || summary === null
                            ? '\u2014'
                            : `${t('databases.transfer.tables', { count: summary.tables ?? 0 })} \u00b7 ${bytesToString(
                                  summary.size ?? 0
                              )}`}
                    </span>
                </div>

                {problem !== null && (
                    <Notice tone={'danger'} title={t('databases.transfer.problem')}>
                        <span
                            className={
                                'block max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px]'
                            }
                        >
                            {problem}
                        </span>
                    </Notice>
                )}

                {canImport && (
                    <Checkbox
                        size={'sm'}
                        checked={wipe}
                        disabled={busy || database === null}
                        onChange={(event) => setWipe(event.target.checked)}
                        label={t('databases.transfer.wipe')}
                    />
                )}

                <div className={'flex flex-wrap items-center gap-2 pt-1'}>
                    <Button
                        size={'sm'}
                        variant={'secondary'}
                        loading={exporting}
                        disabled={database === null || importing}
                        onClick={() => void runExport()}
                        icon={<Download className={'h-3.5 w-3.5'} />}
                    >
                        {t('databases.transfer.export')}
                    </Button>

                    {canImport && (
                        <Button
                            size={'sm'}
                            variant={'primary'}
                            loading={importing}
                            disabled={database === null || exporting}
                            onClick={() => picker.current?.click()}
                            icon={<Upload className={'h-3.5 w-3.5'} />}
                        >
                            {t('databases.transfer.import')}
                        </Button>
                    )}
                </div>

                {canImport && (
                    <>
                        <p className={'text-[11px] text-ink-faint'}>
                            {t('databases.transfer.limit', {
                                size: bytesToString((summary?.maxUploadKb ?? 0) * 1024),
                            })}
                        </p>

                        <input
                            ref={picker}
                            type={'file'}
                            accept={'.sql,text/plain,application/sql'}
                            className={'hidden'}
                            onChange={(event) => {
                                const file = event.target.files?.[0];

                                if (file) {
                                    void runImport(file);
                                }

                                event.target.value = '';
                            }}
                        />
                    </>
                )}
            </div>
        </DialogShell>
    );
}

export default DatabasesContainer;
