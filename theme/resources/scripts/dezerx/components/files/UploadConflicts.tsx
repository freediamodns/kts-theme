import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Folder, Loader2 } from 'lucide-react';
import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import decompressFiles from '@/api/server/files/decompressFiles';
import { bytesToString } from '@/lib/formatters';
import { Button, useToast } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { cardBorder, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { formatRelative } from '@/dezerx/lib/format';
import { fileKind } from '@/dezerx/lib/fileKind';
import { FileIcon } from '@/dezerx/components/files/icons';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { apiMessage } from '@/dezerx/components/console/Section';
import { discard, settle, stageArchive, Staged, STAGE_PREFIX } from '@/dezerx/components/files/extract';
import {
    canOverwrite,
    Conflict,
    findConflicts,
    Named,
    resolve,
    Resolution,
    sendUploads,
    UploadEntry,
    UploadFailure,
} from '@/dezerx/components/files/uploads';
import { useT } from '@/i18n';

export interface ConflictItem extends Named {
    size: number | null;
    count: number | null;
    modifiedAt: Date | null;
}

interface ConflictRequest {
    title: string;
    directory: string;
    items: ConflictItem[];
    taken: { name: string }[];
    conflicts: Conflict<ConflictItem>[];
    confirmLabel: (count: number) => string;
    onConfirm: (choices: Record<string, Resolution>) => void;
}

const skipAll = (conflicts: Conflict<ConflictItem>[]): Record<string, Resolution> =>
    Object.fromEntries(conflicts.map(({ entry }) => [entry.name, 'skip' as Resolution]));

function fromUpload(entry: UploadEntry): ConflictItem {
    return {
        name: entry.name,
        isFile: entry.isFile,
        size: entry.size,
        count: entry.isFile ? null : entry.files.length,
        modifiedAt: entry.modifiedAt,
    };
}

function fromListing(entry: FileObject): ConflictItem {
    return {
        name: entry.name,
        isFile: entry.isFile,
        size: entry.isFile ? entry.size : null,
        count: null,
        modifiedAt: entry.modifiedAt,
    };
}

type UploadStatus = { phase: 'checking' } | { phase: 'sending'; done: number; total: number; percent: number };

type ExtractPhase = 'checking' | 'unpacking' | 'moving' | 'cleaning';

export function useUploads({
    uuid,
    onUploaded,
}: {
    uuid: string;
    onUploaded: (directory: string) => Promise<unknown> | void;
}) {
    const t = useT();
    const { toast } = useToast();
    const [request, setRequest] = useState<ConflictRequest | null>(null);
    const [status, setStatus] = useState<UploadStatus | null>(null);
    const running = useRef(false);

    const send = useCallback(
        async (directory: string, entries: UploadEntry[]) => {
            if (entries.length === 0) {
                running.current = false;
                setStatus(null);

                return;
            }

            setStatus({
                phase: 'sending',
                done: 0,
                total: entries.reduce((sum, entry) => sum + entry.files.length, 0),
                percent: 0,
            });

            try {
                const count = await sendUploads(uuid, directory, entries, (fraction, done, total) =>
                    setStatus({ phase: 'sending', done, total, percent: Math.round(fraction * 100) })
                );

                await onUploaded(directory);

                toast(
                    entries.length === 1
                        ? t('fileTree.uploadedOne', { name: entries[0]!.name })
                        : t('fileTree.uploadedMany', { count }),
                    { tone: 'success' }
                );
            } catch (problem) {
                if (problem instanceof UploadFailure) {
                    const names = problem.failed.map((entry) => entry.name);
                    const first = problem.failed[0]!.error as { message?: string; response?: { status?: number } };
                    const reason =
                        first?.response?.status === 413
                            ? 'too large for this node'
                            : apiMessage(first, first?.message ?? '');

                    toast(
                        `${t('files.uploadFailed')} ${problem.failed.length}/${problem.total}: ${names
                            .slice(0, 3)
                            .join(', ')}${names.length > 3 ? ', …' : ''}${reason ? ` (${reason})` : ''}`,
                        { tone: 'error' }
                    );
                } else {
                    toast(apiMessage(problem, t('files.uploadFailed')), { tone: 'error' });
                }

                await Promise.resolve(onUploaded(directory)).catch(() => undefined);
            } finally {
                running.current = false;
                setStatus(null);
            }
        },
        [uuid, onUploaded, toast, t]
    );

    const start = useCallback(
        async (directory: string, entries: UploadEntry[]) => {
            if (entries.length === 0) {
                return;
            }

            if (running.current) {
                toast(t('fileTree.uploading'), { tone: 'warning' });

                return;
            }

            running.current = true;
            setStatus({ phase: 'checking' });

            let listing: FileObject[];

            try {
                listing = await loadDirectory(uuid, directory);
            } catch (problem) {
                running.current = false;
                setStatus(null);
                toast(apiMessage(problem, t('files.uploadFailed')), { tone: 'error' });

                return;
            }

            const items = entries.map(fromUpload);
            const conflicts = findConflicts(items, listing);

            if (conflicts.length === 0) {
                return send(directory, entries);
            }

            setStatus(null);
            setRequest({
                title: t('uploads.conflictsTitle'),
                directory,
                items,
                taken: listing,
                conflicts,
                confirmLabel: (count) => t('uploads.uploadCount', { count }),
                onConfirm: (choices) => {
                    setRequest(null);
                    void send(directory, resolve(entries, listing, choices));
                },
            });
        },
        [uuid, send, toast, t]
    );

    const cancel = useCallback(() => {
        running.current = false;
        setRequest(null);
    }, []);

    return {
        start,
        busy: status !== null || request !== null,
        render: (
            <>
                <ConflictDialog request={request} onCancel={cancel} />
                {status !== null && (
                    <ActivityCard
                        title={
                            status.phase === 'checking'
                                ? t('uploads.statusPreparing')
                                : t('uploads.statusUploading', {
                                      done: Math.min(status.done + 1, status.total),
                                      count: status.total,
                                  })
                        }
                        detail={status.phase === 'checking' ? t('uploads.phaseChecking') : null}
                        percent={status.phase === 'sending' ? status.percent : null}
                    />
                )}
            </>
        ),
    };
}

export function useExtract({
    uuid,
    onExtracted,
}: {
    uuid: string;
    onExtracted: (directory: string) => Promise<unknown> | void;
}) {
    const t = useT();
    const { toast } = useToast();
    const [request, setRequest] = useState<ConflictRequest | null>(null);
    const [status, setStatus] = useState<{ phase: ExtractPhase; name: string } | null>(null);
    const running = useRef(false);
    const pending = useRef<{ directory: string; archive: string; staged: Staged } | null>(null);

    const done = useCallback(
        async (directory: string) => {
            await Promise.resolve(onExtracted(directory)).catch(() => undefined);
            running.current = false;
            setStatus(null);
        },
        [onExtracted]
    );

    const finish = useCallback(
        async (directory: string, archive: string, phase: ExtractPhase, work: () => Promise<unknown>) => {
            setStatus({ phase, name: archive });

            try {
                await work();
                toast(t('fileTree.unpacked', { name: archive }), { tone: 'success' });
            } catch (problem) {
                toast(apiMessage(problem, t('files.decompressFailed')), { tone: 'error' });
            } finally {
                await done(directory);
            }
        },
        [done, toast, t]
    );

    const start = useCallback(
        async (directory: string, archive: string) => {
            if (running.current) {
                return;
            }

            running.current = true;
            setStatus({ phase: 'checking', name: archive });

            let listing: FileObject[];
            let staged: Staged;

            try {
                listing = (await loadDirectory(uuid, directory)).filter(
                    (entry) => !entry.name.startsWith(STAGE_PREFIX)
                );

                if (listing.every((entry) => entry.name === archive)) {
                    return finish(directory, archive, 'unpacking', () => decompressFiles(uuid, directory, archive));
                }

                setStatus({ phase: 'unpacking', name: archive });
                staged = await stageArchive(uuid, directory, archive);
            } catch (problem) {
                toast(apiMessage(problem, t('files.decompressFailed')), { tone: 'error' });
                await done(directory);

                return;
            }

            const settleWith = (choices: Record<string, Resolution>) =>
                finish(directory, archive, 'moving', () =>
                    settle(uuid, directory, staged, listing, choices).catch((problem) => {
                        toast(t('uploads.stageLeft', { folder: staged.stageName }), { tone: 'warning' });

                        throw problem;
                    })
                );

            const conflicts = findConflicts(staged.entries.map(fromListing), listing);

            if (conflicts.length === 0) {
                return settleWith({});
            }

            pending.current = { directory, archive, staged };

            setStatus(null);
            setRequest({
                title: t('uploads.extractTitle'),
                directory,
                items: staged.entries.map(fromListing),
                taken: listing,
                conflicts,
                confirmLabel: (count) => t('uploads.extractCount', { count }),
                onConfirm: (choices) => {
                    pending.current = null;
                    setRequest(null);
                    void settleWith(choices);
                },
            });
        },
        [uuid, finish, done, toast, t]
    );

    const cancel = useCallback(() => {
        const left = pending.current;

        pending.current = null;
        setRequest(null);

        if (!left) {
            running.current = false;
            setStatus(null);

            return;
        }

        setStatus({ phase: 'cleaning', name: left.archive });

        void discard(uuid, left.directory, left.staged)
            .catch(() => toast(t('uploads.stageLeft', { folder: left.staged.stageName }), { tone: 'warning' }))
            .finally(() => done(left.directory));
    }, [uuid, done, toast, t]);

    const phases: Record<ExtractPhase, string> = {
        checking: t('uploads.phaseChecking'),
        unpacking: t('uploads.phaseUnpacking'),
        moving: t('uploads.phaseMoving'),
        cleaning: t('uploads.phaseCleaning'),
    };

    return {
        start,
        busy: status !== null || request !== null,
        render: (
            <>
                <ConflictDialog request={request} onCancel={cancel} />
                {status !== null && (
                    <ActivityCard
                        title={t('uploads.statusExtracting', { name: status.name })}
                        detail={phases[status.phase]}
                        percent={null}
                    />
                )}
            </>
        ),
    };
}

function activityStack(): HTMLElement {
    let stack = document.getElementById('dz-activity');

    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'dz-activity';
        stack.className =
            'pointer-events-none fixed bottom-6 right-6 z-50 flex w-80 max-w-[calc(100vw-3rem)] flex-col items-stretch gap-2';
        document.body.appendChild(stack);
    }

    return stack;
}

function ActivityCard({ title, detail, percent }: { title: string; detail: string | null; percent: number | null }) {
    const border = cardBorder(usePanelTheme()['surface.border']);

    const card = (
        <div
            role={'status'}
            aria-live={'polite'}
            style={border ? { border: `1px solid ${border}` } : undefined}
            className={
                'dz-on-raised pointer-events-auto rounded-2xl bg-raised p-3 shadow-panel animate-modal-in motion-reduce:animate-none'
            }
        >
            <div className={'flex items-center gap-2.5'}>
                <Loader2 aria-hidden={'true'} className={'h-4 w-4 shrink-0 animate-spin text-accent'} />

                <div className={'min-w-0 flex-1'}>
                    <p className={'truncate text-xs font-medium text-ink'}>{title}</p>
                    {detail && <p className={'truncate text-[11px] text-ink-faint'}>{detail}</p>}
                </div>

                {percent !== null && (
                    <span className={'shrink-0 text-xs font-medium tabular-nums text-ink-muted'}>{percent}%</span>
                )}
            </div>

            <div
                role={'progressbar'}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent ?? undefined}
                aria-label={title}
                className={'mt-2.5 h-1 overflow-hidden rounded-full bg-overlay'}
            >
                {percent !== null ? (
                    <div
                        className={'h-full rounded-full bg-accent transition-[width] duration-200'}
                        style={{ width: `${percent}%` }}
                    />
                ) : (
                    <div className={'dz-indeterminate h-full w-1/3 rounded-full bg-accent'} />
                )}
            </div>
        </div>
    );

    return typeof document === 'undefined' ? card : createPortal(card, activityStack());
}

function ConflictDialog({ request, onCancel }: { request: ConflictRequest | null; onCancel: () => void }) {
    const t = useT();
    const [choices, setChoices] = useState<Record<string, Resolution>>({});

    useEffect(() => setChoices(skipAll(request?.conflicts ?? [])), [request]);

    const renamed = useMemo(() => {
        if (!request) {
            return new Map<string, string>();
        }

        const planned = resolve(request.items, request.taken, choices);
        const kept = request.items.filter((item) => choices[item.name] !== 'skip');

        return new Map(kept.map((item, index) => [item.name, planned[index]?.name ?? item.name]));
    }, [request, choices]);

    const conflicts = request?.conflicts ?? [];
    const sending = request ? request.items.filter((item) => choices[item.name] !== 'skip').length : 0;

    const applyAll = (choice: Resolution) =>
        setChoices(
            Object.fromEntries(
                conflicts.map((conflict) => [
                    conflict.entry.name,
                    choice === 'overwrite' && !canOverwrite(conflict) ? choices[conflict.entry.name] ?? 'skip' : choice,
                ])
            )
        );

    const everyone = (['skip', 'overwrite', 'rename'] as Resolution[]).find((choice) =>
        conflicts.every(({ entry }) => choices[entry.name] === choice)
    );

    return (
        <DialogShell open={request !== null} onClose={onCancel} title={request?.title ?? ''} width={'xl'}>
            <div className={'mt-3 flex flex-wrap items-center justify-between gap-3'}>
                <p className={'flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-ink-muted'}>
                    <span>{t('uploads.conflictsBody', { count: conflicts.length })}</span>
                    <span
                        className={
                            'inline-flex min-w-0 items-center gap-1 rounded-lg bg-overlay px-2 py-0.5 font-mono text-xs text-ink'
                        }
                    >
                        <Folder aria-hidden={'true'} className={'h-3 w-3 shrink-0 text-warning'} />
                        <span className={'truncate'}>{request?.directory}</span>
                    </span>
                </p>

                {conflicts.length > 1 && (
                    <div className={'flex items-center gap-2'}>
                        <span className={'text-xs text-ink-faint'}>{t('uploads.applyToAll')}</span>
                        <Choices value={everyone ?? null} onChange={applyAll} label={t('uploads.applyToAll')} compact />
                    </div>
                )}
            </div>

            <ul
                className={
                    'mt-4 max-h-[50vh] divide-y divide-line-field overflow-y-auto rounded-2xl bg-card/60 ring-1 ring-line-field'
                }
            >
                {conflicts.map((conflict) => (
                    <ConflictRow
                        key={conflict.entry.name}
                        conflict={conflict}
                        choice={choices[conflict.entry.name] ?? 'skip'}
                        renamedTo={renamed.get(conflict.entry.name) ?? null}
                        onChoose={(choice) => setChoices((current) => ({ ...current, [conflict.entry.name]: choice }))}
                    />
                ))}
            </ul>

            <DialogFooter>
                <Button variant={'ghost'} size={'sm'} onClick={onCancel}>
                    {t('common.cancel')}
                </Button>
                <Button variant={'secondary'} size={'sm'} onClick={() => request?.onConfirm(skipAll(conflicts))}>
                    {t('uploads.skipConflicts')}
                </Button>
                <Button size={'sm'} disabled={sending === 0} onClick={() => request?.onConfirm(choices)}>
                    {request?.confirmLabel(sending)}
                </Button>
            </DialogFooter>
        </DialogShell>
    );
}

function describe(item: Omit<ConflictItem, 'name'>, t: ReturnType<typeof useT>): string {
    const parts = [
        item.count !== null
            ? t('uploads.filesAndSize', { count: item.count, size: bytesToString(item.size ?? 0) })
            : item.isFile && item.size !== null
            ? bytesToString(item.size)
            : t('uploads.folder'),
    ];

    if (item.modifiedAt) {
        parts.push(formatRelative(item.modifiedAt));
    }

    return parts.join(' · ');
}

function ConflictRow({
    conflict,
    choice,
    renamedTo,
    onChoose,
}: {
    conflict: Conflict<ConflictItem>;
    choice: Resolution;
    renamedTo: string | null;
    onChoose: (choice: Resolution) => void;
}) {
    const t = useT();
    const { entry, existing } = conflict;
    const overwritable = canOverwrite(conflict);

    return (
        <li className={'flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-4'}>
            <div className={'flex min-w-0 flex-1 items-start gap-3'}>
                <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-overlay'}>
                    {entry.isFile ? (
                        <FileIcon name={entry.name} kind={fileKind(existing)} className={'h-4 w-4'} />
                    ) : (
                        <Folder aria-hidden={'true'} className={'h-4 w-4 fill-warning/25 text-warning'} />
                    )}
                </span>

                <div className={'min-w-0 flex-1'}>
                    <p className={'truncate text-sm font-medium text-ink'}>{entry.name}</p>

                    <div className={'mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]'}>
                        <span className={'min-w-0'}>
                            <span className={'mr-1 font-semibold uppercase tracking-wide text-accent'}>
                                {t('uploads.incoming')}
                            </span>
                            <span className={'text-ink-muted'}>{describe(entry, t)}</span>
                        </span>
                        <span className={'min-w-0'}>
                            <span className={'mr-1 font-semibold uppercase tracking-wide text-ink-faint'}>
                                {t('uploads.current')}
                            </span>
                            <span className={'text-ink-muted'}>{describe(fromListing(existing), t)}</span>
                        </span>
                    </div>

                    {choice !== 'skip' && (
                        <p className={'mt-1 text-[11px] text-ink-faint'}>
                            {choice === 'rename'
                                ? t('uploads.renameHint', { name: renamedTo ?? entry.name })
                                : entry.isFile
                                ? t('uploads.overwriteHint')
                                : t('uploads.mergeHint')}
                        </p>
                    )}
                </div>
            </div>

            <Choices
                value={choice}
                onChange={onChoose}
                label={entry.name}
                mergeFolder={!entry.isFile}
                overwriteBlocked={overwritable ? undefined : t('uploads.typeMismatch')}
            />
        </li>
    );
}

function Choices({
    value,
    onChange,
    label,
    compact = false,
    mergeFolder = false,
    overwriteBlocked,
}: {
    value: Resolution | null;
    onChange: (choice: Resolution) => void;
    label: string;
    compact?: boolean;
    mergeFolder?: boolean;
    overwriteBlocked?: string;
}) {
    const t = useT();

    const options: { value: Resolution; label: string; blocked?: string }[] = [
        { value: 'skip', label: t('uploads.skip') },
        {
            value: 'overwrite',
            label: mergeFolder ? t('uploads.merge') : t('uploads.overwrite'),
            blocked: overwriteBlocked,
        },
        { value: 'rename', label: t('uploads.rename') },
    ];

    return (
        <div
            role={'radiogroup'}
            aria-label={label}
            className={cn(
                'grid shrink-0 grid-cols-3 gap-0.5 rounded-xl bg-overlay p-0.5',
                compact ? 'w-56' : 'w-full sm:w-64'
            )}
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    type={'button'}
                    role={'radio'}
                    aria-checked={value === option.value}
                    disabled={option.blocked !== undefined}
                    title={option.blocked}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        'truncate rounded-[10px] px-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                        compact ? 'py-1 text-[11px]' : 'py-1.5 text-xs',
                        value === option.value
                            ? 'bg-accent text-ink-inverse shadow-sm'
                            : 'text-ink-muted hover:bg-card hover:text-ink'
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
