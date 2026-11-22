import React, { DragEvent, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory } from 'react-router-dom';
import {
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    Copy,
    Download,
    FileArchive,
    FilePlus,
    Folder,
    FolderPlus,
    Lock,
    MoreVertical,
    Pencil,
    RotateCcw,
    Search,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { FileObject } from '@/api/server/files/loadDirectory';
import loadDirectory from '@/api/server/files/loadDirectory';
import renameFiles from '@/api/server/files/renameFiles';
import deleteFiles from '@/api/server/files/deleteFiles';
import createDirectory from '@/api/server/files/createDirectory';
import compressFiles from '@/api/server/files/compressFiles';
import copyFile from '@/api/server/files/copyFile';
import chmodFiles from '@/api/server/files/chmodFiles';
import getFileDownloadUrl from '@/api/server/files/getFileDownloadUrl';
import { usePermissions } from '@/plugins/usePermissions';
import { bytesToString } from '@/lib/formatters';
import {
    Button,
    Checkbox,
    ContextMenu,
    ContextMenuRequest,
    Input,
    Pager,
    Select,
    Skeleton,
    useToast,
} from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { cardBorder, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { fileKind, isArchive } from '@/dezerx/lib/fileKind';
import { FileIcon, useFileIcons } from '@/dezerx/components/files/icons';
import { FileDialog, FileDialogRequest, worldWarning } from '@/dezerx/components/files/FileDialog';
import { MoveDialog, MoveRequest } from '@/dezerx/components/files/MoveDialog';
import { PermissionsDialog, PermissionsRequest } from '@/dezerx/components/files/PermissionsDialog';
import { FILE_MOVE_TYPE, isWorldFolder, join, parentOf, relativeTo } from '@/dezerx/components/files/paths';
import { useExtract, useUploads } from '@/dezerx/components/files/UploadConflicts';
import { fromDataTransfer, fromFileList } from '@/dezerx/components/files/uploads';
import Breadcrumbs from '@/dezerx/components/files/Breadcrumbs';
import { apiMessage } from '@/dezerx/components/console/Section';
import { useT } from '@/i18n';

type SortKey = 'name' | 'size' | 'modified';

interface Sort {
    key: SortKey;
    descending: boolean;
}

const PAGE_SIZES = [25, 50, 100, 250];

const PAGE_SIZE_KEY = 'dezerx.files.perPage';

function storedPageSize(): number {
    try {
        const stored = Number(window.localStorage.getItem(PAGE_SIZE_KEY));

        return PAGE_SIZES.indexOf(stored) >= 0 ? stored : 50;
    } catch {
        return 50;
    }
}

export default function FileList({
    uuid,
    directory,
    onNavigate,
    toolbarExtra,
}: {
    uuid: string;
    directory: string;
    onNavigate: (path: string) => void;
    toolbarExtra?: React.ReactNode;
}) {
    const t = useT();
    const history = useHistory();
    const { toast } = useToast();

    useFileIcons();

    const [canReadContent, canCreate, canUpdate, canDelete, canArchive] = usePermissions([
        'file.read-content',
        'file.create',
        'file.update',
        'file.delete',
        'file.archive',
    ]);

    const [files, setFiles] = useState<FileObject[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<Sort>({ key: 'name', descending: false });
    const [marked, setMarked] = useState<Set<string>>(new Set());
    const [menu, setMenu] = useState<ContextMenuRequest | null>(null);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [move, setMove] = useState<MoveRequest | null>(null);
    const [permissions, setPermissions] = useState<PermissionsRequest | null>(null);
    const [busy, setBusy] = useState(false);
    const [dragging, setDragging] = useState<string[] | null>(null);
    const [over, setOver] = useState<string | null>(null);
    const [dropping, setDropping] = useState(false);

    useEffect(() => {
        const clear = () => setDropping(false);

        window.addEventListener('drop', clear);
        window.addEventListener('dragend', clear);

        return () => {
            window.removeEventListener('drop', clear);
            window.removeEventListener('dragend', clear);
        };
    }, []);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(storedPageSize);

    const upload = useRef<HTMLInputElement>(null);
    const root = useRef<HTMLDivElement>(null);
    const uploadFolder = useRef<HTMLInputElement>(null);

    const refresh = useCallback(() => {
        setError(null);

        return loadDirectory(uuid, directory)
            .then((listing) => {
                setFiles(listing);
                setMarked((current) => {
                    const names = new Set(listing.map((file) => file.name));
                    return new Set([...current].filter((name) => names.has(name)));
                });
            })
            .catch((problem) => {
                setFiles([]);
                setError(apiMessage(problem, t('files.loadFailed')));
            });
    }, [uuid, directory, t]);

    useEffect(() => {
        setFiles(null);
        setMarked(new Set());
        setPage(1);
        refresh();
    }, [refresh]);

    const uploads = useUploads({ uuid, onUploaded: refresh });
    const extract = useExtract({ uuid, onExtracted: refresh });

    useEffect(() => setPage(1), [query, sort, perPage]);

    useEffect(() => {
        try {
            window.localStorage.setItem(PAGE_SIZE_KEY, String(perPage));
        } catch {}
    }, [perPage]);

    const sorted = useMemo(() => {
        const needle = query.trim().toLowerCase();

        const matching = (files ?? []).filter((file) => needle === '' || file.name.toLowerCase().includes(needle));

        const direction = sort.descending ? -1 : 1;

        return [...matching].sort((a, b) => {
            if (a.isFile !== b.isFile) {
                return a.isFile ? 1 : -1;
            }

            if (sort.key === 'size') {
                return (a.size - b.size) * direction;
            }

            if (sort.key === 'modified') {
                return (a.modifiedAt.getTime() - b.modifiedAt.getTime()) * direction;
            }

            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }) * direction;
        });
    }, [files, query, sort]);

    const pageCount = Math.max(1, Math.ceil(sorted.length / perPage));
    const currentPage = Math.min(page, pageCount);
    const paged = sorted.slice((currentPage - 1) * perPage, currentPage * perPage);

    const reorder = (key: SortKey) =>
        setSort((current) => ({ key, descending: current.key === key ? !current.descending : false }));

    const run = async (work: Promise<unknown>, fallback: string) => {
        setBusy(true);

        try {
            await work;
            await refresh();
        } catch (problem) {
            toast(apiMessage(problem, fallback), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const openFile = (file: FileObject) => {
        if (!file.isFile) {
            return onNavigate(join(directory, file.name));
        }

        if (!file.isEditable() || !canReadContent) {
            return download(file);
        }

        history.push(`/server/${uuid}/files/edit#${encodeURIComponent(join(directory, file.name))}`);
    };

    const download = async (file: FileObject) => {
        try {
            window.location.href = await getFileDownloadUrl(uuid, join(directory, file.name));
        } catch (problem) {
            toast(apiMessage(problem, t('files.downloadFailed')), { tone: 'error' });
        }
    };

    const rename = (file: FileObject) =>
        setDialog({
            title: t('files.renameTitle'),
            confirmLabel: t('files.rename'),
            input: { label: t('files.name'), initial: file.name },
            onConfirm: async (value) => {
                if (value !== '' && value !== file.name) {
                    await renameFiles(uuid, directory, [{ from: file.name, to: value }]);
                    await refresh();
                }
            },
        });

    const remove = (names: string[]) =>
        setDialog({
            title: names.length === 1 ? t('files.deleteTitle') : t('files.deleteManyTitle'),
            body: t('files.deleteBody'),
            confirmLabel: t('files.delete'),
            destructive: true,
            ...worldWarning(
                (files ?? [])
                    .filter((file) => names.indexOf(file.name) >= 0 && isWorldFolder(file))
                    .map((file) => file.name),
                t
            ),
            onConfirm: async () => {
                await deleteFiles(uuid, directory, names);
                setMarked(new Set());
                await refresh();
            },
        });

    const newFolder = () =>
        setDialog({
            title: t('files.newFolderTitle'),
            confirmLabel: t('files.create'),
            input: { label: t('files.name'), initial: '' },
            onConfirm: async (value) => {
                if (value !== '') {
                    await createDirectory(uuid, directory, value);
                    await refresh();
                }
            },
        });

    const pickUpload = () => upload.current?.click();

    const pickFolder = () => uploadFolder.current?.click();

    const onUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const chosen = Array.from(event.target.files ?? []);
        event.target.value = '';

        void uploads.start(directory, fromFileList(chosen));
    };

    const dragNames = (file: FileObject) => (marked.has(file.name) ? [...marked] : [file.name]);

    const canDropOn = (key: string): boolean => dragging !== null && canUpdate && !busy && !dragging.includes(key);

    const moveInto = async (destination: string, names: string[]) => {
        setBusy(true);

        try {
            await renameFiles(
                uuid,
                '/',
                names.map((name) => ({
                    from: relativeTo(join(directory, name), '/'),
                    to: relativeTo(join(destination, name), '/'),
                }))
            );

            setMarked(new Set());
            await refresh();

            toast(
                names.length === 1
                    ? t('fileTree.movedOne', { name: names[0], destination })
                    : t('fileTree.movedMany', { count: names.length, destination }),
                { tone: 'success' }
            );
        } catch (problem) {
            toast(apiMessage(problem, t('files.moveFailed')), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const endDrag = () => {
        setDragging(null);
        setOver(null);
    };

    const dragProps = (file: FileObject) => ({
        draggable: canUpdate && !busy,
        onDragStart: (event: DragEvent<HTMLElement>) => {
            const names = dragNames(file);

            setDragging(names);
            setOver(null);

            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData(FILE_MOVE_TYPE, names.join('\n'));
            event.dataTransfer.setData('text/plain', join(directory, file.name));
        },
        onDragEnd: endDrag,
    });

    const dropProps = (key: string, destination: string) => ({
        onDragOver: (event: DragEvent<HTMLElement>) => {
            if (!canDropOn(key)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'move';
            setOver(key);
        },
        onDragLeave: () => setOver((current) => (current === key ? null : current)),
        onDrop: (event: DragEvent<HTMLElement>) => {
            const names = dragging;
            const allowed = canDropOn(key);

            if (names === null) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            endDrag();

            if (!allowed) {
                return;
            }

            void moveInto(destination, names);
        },
    });

    const rowMenu = (event: React.MouseEvent, file: FileObject): void => {
        event.preventDefault();

        const path = join(directory, file.name);

        setMenu({
            x: event.clientX,
            y: event.clientY,
            title: file.name,
            items: [
                {
                    label: t('files.rename'),
                    icon: Pencil,
                    disabled: !canUpdate,
                    onSelect: () => rename(file),
                },
                {
                    label: t('files.move'),
                    icon: ArrowLeft,
                    disabled: !canUpdate,
                    onSelect: () =>
                        setMove({
                            root: directory,
                            names: [file.name],
                            onConfirm: (destination) => moveInto(destination, [file.name]),
                        }),
                },
                {
                    label: t('files.copy'),
                    icon: Copy,
                    disabled: !canCreate || !file.isFile,
                    onSelect: () => run(copyFile(uuid, path), t('files.copyFailed')),
                },
                {
                    label: t('files.permissions'),
                    icon: Lock,
                    disabled: !canUpdate,
                    onSelect: () =>
                        setPermissions({
                            root: directory,
                            names: [file.name],
                            mode: file.modeBits,
                            label: file.name,
                            directory: !file.isFile,
                            onConfirm: async (mode) => {
                                await chmodFiles(uuid, directory, [{ file: file.name, mode }]);
                                await refresh();
                            },
                        }),
                },
                {
                    label: isArchive(file) ? t('files.decompress') : t('files.compress'),
                    icon: FileArchive,
                    disabled: isArchive(file) ? !canCreate || extract.busy : !canArchive,
                    onSelect: () =>
                        isArchive(file)
                            ? void extract.start(directory, file.name)
                            : run(compressFiles(uuid, directory, [file.name]), t('files.compressFailed')),
                },
                {
                    label: t('files.download'),
                    icon: Download,
                    disabled: !file.isFile,
                    onSelect: () => download(file),
                },
                {
                    label: t('files.delete'),
                    icon: Trash2,
                    disabled: !canDelete,
                    onSelect: () => remove([file.name]),
                },
            ],
        });
    };

    const allMarked = paged.length > 0 && paged.every((file) => marked.has(file.name));

    const markPage = () =>
        setMarked((live) => {
            const next = new Set(live);

            for (const file of paged) {
                allMarked ? next.delete(file.name) : next.add(file.name);
            }

            return next;
        });

    const moveMarked = () =>
        setMove({
            root: directory,
            names: [...marked],
            onConfirm: (destination) => moveInto(destination, [...marked]),
        });

    return (
        <div ref={root} className={'space-y-3'}>
            {extract.render}
            <input ref={upload} type={'file'} multiple hidden onChange={onUpload} />
            <input ref={uploadFolder} type={'file'} multiple hidden onChange={onUpload} {...{ webkitdirectory: '' }} />
            {uploads.render}

            <div
                onDragOver={(event) => {
                    if (dragging !== null || !canCreate || event.dataTransfer.types.indexOf('Files') < 0) {
                        return;
                    }

                    event.preventDefault();
                    setDropping(true);
                }}
                onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        return;
                    }

                    setDropping(false);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setDropping(false);

                    if (dragging !== null || !canCreate) {
                        return;
                    }

                    if (event.dataTransfer.types.indexOf(FILE_MOVE_TYPE) >= 0) {
                        return;
                    }

                    void fromDataTransfer(event.dataTransfer)
                        .then((entries) =>
                            entries === null
                                ? toast(t('fileTree.noFolderUploads'), { tone: 'warning' })
                                : uploads.start(directory, entries)
                        )
                        .catch(() => toast(t('files.uploadFailed'), { tone: 'error' }));
                }}
                className={cn(
                    'relative overflow-hidden rounded-2xl bg-card ring-1 ring-line-field',
                    dropping && 'ring-2 ring-accent/60'
                )}
            >
                {dropping && (
                    <div
                        className={
                            'pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-card/90 text-sm font-medium text-ink'
                        }
                    >
                        {t('fileTree.uploadInto', { directory })}
                    </div>
                )}
                <div
                    className={'flex flex-wrap items-center justify-between gap-3 border-b border-line-field px-4 py-3'}
                >
                    <div className={'w-full shrink-0 sm:w-64'}>
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t('files.search')}
                            icon={<Search className={'h-4 w-4'} />}
                        />
                    </div>

                    <div className={'flex flex-wrap items-center gap-2 sm:ml-auto'}>
                        {toolbarExtra}

                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            onClick={() => refresh()}
                            icon={<RotateCcw className={'h-3.5 w-3.5'} />}
                        >
                            {t('files.refresh')}
                        </Button>

                        {canCreate && (
                            <>
                                <Button
                                    size={'sm'}
                                    variant={'secondary'}
                                    onClick={newFolder}
                                    icon={<FolderPlus className={'h-3.5 w-3.5'} />}
                                >
                                    {t('files.newFolder')}
                                </Button>

                                <Button
                                    size={'sm'}
                                    variant={'secondary'}
                                    onClick={pickUpload}
                                    disabled={uploads.busy}
                                    icon={<Upload className={'h-3.5 w-3.5'} />}
                                >
                                    {t('files.upload')}
                                </Button>

                                <Button
                                    size={'sm'}
                                    variant={'secondary'}
                                    onClick={pickFolder}
                                    disabled={uploads.busy}
                                    icon={<Folder className={'h-3.5 w-3.5'} />}
                                >
                                    {t('uploads.uploadFolder')}
                                </Button>

                                <Button
                                    size={'sm'}
                                    onClick={() =>
                                        history.push(`/server/${uuid}/files/new#${encodeURIComponent(directory)}`)
                                    }
                                    icon={<FilePlus className={'h-3.5 w-3.5'} />}
                                >
                                    {t('files.newFile')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className={'border-b border-line-field px-4 py-2'}>
                    <Breadcrumbs directory={directory} onNavigate={onNavigate} />
                </div>

                <div
                    className={
                        'flex items-center gap-3 border-b border-line-field px-4 py-2.5 text-xs font-medium text-ink-faint'
                    }
                >
                    <Checkbox checked={allMarked} onChange={markPage} aria-label={t('files.selectAll')} />
                    <SortHeader
                        label={t('files.name')}
                        active={sort.key === 'name'}
                        descending={sort.descending}
                        onClick={() => reorder('name')}
                        className={'flex-1'}
                    />
                    <SortHeader
                        label={t('files.size')}
                        active={sort.key === 'size'}
                        descending={sort.descending}
                        onClick={() => reorder('size')}
                        className={'hidden w-24 justify-end sm:flex'}
                    />
                    <SortHeader
                        label={t('files.modified')}
                        active={sort.key === 'modified'}
                        descending={sort.descending}
                        onClick={() => reorder('modified')}
                        className={'hidden w-44 justify-end md:flex'}
                    />
                    <span className={'w-8'} />
                </div>

                {files === null ? (
                    <div className={'space-y-1 p-4'}>
                        {Array.from({ length: 8 }).map((_, index) => (
                            <Skeleton key={index} className={'h-8 w-full rounded-xl'} />
                        ))}
                    </div>
                ) : error !== null ? (
                    <p className={'p-6 text-center text-sm text-danger'}>{error}</p>
                ) : sorted.length === 0 ? (
                    <p className={'p-6 text-center text-sm text-ink-faint'}>
                        {query.trim() === '' ? t('files.empty') : t('files.noMatch')}
                    </p>
                ) : (
                    <ul className={cn((busy || extract.busy) && 'pointer-events-none opacity-60')}>
                        {directory !== '/' && (
                            <li {...dropProps('..', parentOf(directory))}>
                                <button
                                    type={'button'}
                                    onClick={() => onNavigate(parentOf(directory))}
                                    className={cn(
                                        'flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-ink-muted hover:bg-surface-hover',
                                        over === '..' && 'bg-accent/10 ring-1 ring-inset ring-accent/60'
                                    )}
                                >
                                    <span className={'w-4'} />
                                    <ArrowLeft className={'h-4 w-4'} aria-hidden={'true'} />
                                    {'..'}
                                </button>
                            </li>
                        )}

                        {paged.map((file) => (
                            <li key={file.key} className={'border-t border-line-field first:border-t-0'}>
                                <div
                                    onContextMenu={(event) => rowMenu(event, file)}
                                    {...dragProps(file)}
                                    {...(file.isFile ? {} : dropProps(file.name, join(directory, file.name)))}
                                    className={cn(
                                        'group flex items-center gap-3 px-4 py-2 hover:bg-surface-hover',
                                        !file.isFile &&
                                            over === file.name &&
                                            'bg-accent/10 ring-1 ring-inset ring-accent/60',
                                        dragging?.includes(file.name) && 'opacity-50'
                                    )}
                                >
                                    <Checkbox
                                        checked={marked.has(file.name)}
                                        onChange={() =>
                                            setMarked((current) => {
                                                const next = new Set(current);
                                                next.has(file.name) ? next.delete(file.name) : next.add(file.name);
                                                return next;
                                            })
                                        }
                                        aria-label={file.name}
                                    />

                                    <button
                                        type={'button'}
                                        onClick={() => openFile(file)}
                                        className={'flex min-w-0 flex-1 items-center gap-2.5 text-left'}
                                    >
                                        {file.isFile ? (
                                            <FileIcon
                                                name={file.name}
                                                kind={fileKind(file)}
                                                className={'h-4 w-4 shrink-0'}
                                            />
                                        ) : (
                                            <Folder
                                                aria-hidden={'true'}
                                                className={'h-4 w-4 shrink-0 fill-warning/25 text-warning'}
                                            />
                                        )}
                                        <span className={'truncate text-sm text-ink'}>{file.name}</span>
                                    </button>

                                    <span className={'hidden w-24 text-right text-xs text-ink-faint sm:block'}>
                                        {file.isFile ? bytesToString(file.size) : ''}
                                    </span>

                                    <span className={'hidden w-44 text-right text-xs text-ink-faint md:block'}>
                                        {file.modifiedAt.toLocaleString()}
                                    </span>

                                    <button
                                        type={'button'}
                                        aria-label={t('files.actions')}
                                        onClick={(event) => rowMenu(event, file)}
                                        className={
                                            'rounded-lg p-1 text-ink-faint hover:bg-surface-hover hover:text-ink'
                                        }
                                    >
                                        <MoreVertical className={'h-4 w-4'} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {files !== null && error === null && sorted.length > PAGE_SIZES[0]! && (
                    <div
                        className={
                            'flex flex-wrap items-center justify-between gap-3 border-t border-line-field px-4 py-2.5'
                        }
                    >
                        <div className={'flex items-center gap-3 text-xs text-ink-faint'}>
                            <span className={'tabular-nums'}>
                                {t('files.showing', {
                                    from: (currentPage - 1) * perPage + 1,
                                    to: Math.min(currentPage * perPage, sorted.length),
                                    total: sorted.length,
                                })}
                            </span>
                            <div className={'w-32'}>
                                <Select
                                    size={'sm'}
                                    value={String(perPage)}
                                    onChange={(value) => setPerPage(Number(value))}
                                    options={PAGE_SIZES.map((size) => ({
                                        value: String(size),
                                        label: t('files.perPage', { count: size }),
                                    }))}
                                />
                            </div>
                        </div>

                        <div className={'[&>nav]:pt-0'}>
                            <Pager
                                pagination={{
                                    total: sorted.length,
                                    count: paged.length,
                                    perPage,
                                    currentPage,
                                    totalPages: pageCount,
                                }}
                                onPage={setPage}
                            />
                        </div>
                    </div>
                )}
            </div>

            {marked.size > 0 && (
                <SelectionBar anchor={root} count={marked.size} onClear={() => setMarked(new Set())}>
                    {canArchive && (
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            disabled={busy}
                            onClick={() => run(compressFiles(uuid, directory, [...marked]), t('files.compressFailed'))}
                            icon={<FileArchive className={'h-3.5 w-3.5'} />}
                        >
                            {t('files.compress')}
                        </Button>
                    )}

                    {canUpdate && (
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            disabled={busy}
                            onClick={moveMarked}
                            icon={<ArrowLeft className={'h-3.5 w-3.5 rotate-180'} />}
                        >
                            {t('files.move')}
                        </Button>
                    )}

                    {canDelete && (
                        <Button
                            size={'sm'}
                            variant={'danger'}
                            disabled={busy}
                            onClick={() => remove([...marked])}
                            icon={<Trash2 className={'h-3.5 w-3.5'} />}
                        >
                            {t('files.delete')}
                        </Button>
                    )}
                </SelectionBar>
            )}

            <ContextMenu request={menu} onClose={() => setMenu(null)} />
            <FileDialog request={dialog} onClose={() => setDialog(null)} />
            <MoveDialog uuid={uuid} request={move} onClose={() => setMove(null)} />
            <PermissionsDialog request={permissions} onClose={() => setPermissions(null)} />
        </div>
    );
}

function SortHeader({
    label,
    active,
    descending,
    onClick,
    className,
}: {
    label: string;
    active: boolean;
    descending: boolean;
    onClick: () => void;
    className?: string;
}) {
    const Arrow = descending ? ChevronDown : ChevronUp;

    return (
        <button
            type={'button'}
            onClick={onClick}
            className={cn(
                'flex items-center gap-1 rounded-lg py-0.5 hover:text-ink',
                active ? 'text-ink' : 'text-ink-faint',
                className
            )}
        >
            {label}
            <Arrow
                aria-hidden={'true'}
                className={cn('h-3 w-3 transition-opacity', active ? 'opacity-100' : 'opacity-0')}
            />
        </button>
    );
}

function useAnchor(target: RefObject<HTMLElement>): { left: number; width: number } | null {
    const [anchor, setAnchor] = useState<{ left: number; width: number } | null>(null);

    useEffect(() => {
        const element = target.current;

        if (!element || typeof ResizeObserver === 'undefined') {
            return;
        }

        const measure = () => {
            const box = element.getBoundingClientRect();

            setAnchor({ left: box.left, width: box.width });
        };

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(element);
        window.addEventListener('resize', measure);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [target]);

    return anchor;
}

function SelectionBar({
    anchor,
    count,
    onClear,
    children,
}: {
    anchor: RefObject<HTMLElement>;
    count: number;
    onClear: () => void;
    children: React.ReactNode;
}) {
    const t = useT();
    const box = useAnchor(anchor);
    const border = cardBorder(usePanelTheme()['surface.border']);

    const bar = (
        <div
            role={'toolbar'}
            aria-label={t('files.selected', { count })}
            style={box ? { left: box.left, width: box.width } : undefined}
            className={cn('pointer-events-none fixed bottom-6 z-50 flex justify-center px-4', !box && 'inset-x-0')}
        >
            <div
                style={border ? { border: `1px solid ${border}` } : undefined}
                className={
                    'dz-on-raised pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-2xl bg-raised px-2.5 py-2 shadow-panel animate-modal-in motion-reduce:animate-none'
                }
            >
                <span className={'flex items-center gap-1 pl-1'}>
                    <span
                        className={
                            'min-w-[1.5rem] rounded-lg bg-accent px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-ink-inverse'
                        }
                    >
                        {count}
                    </span>
                    <span className={'text-xs text-ink-muted'}>{t('files.selectedLabel', { count })}</span>
                </span>

                <button
                    type={'button'}
                    onClick={onClear}
                    aria-label={t('fileTree.clearSelection')}
                    title={t('fileTree.clearSelection')}
                    className={'rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-overlay hover:text-ink'}
                >
                    <X className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                </button>

                <span aria-hidden={'true'} className={'h-5 w-px bg-line-field'} />

                {children}
            </div>
        </div>
    );

    return typeof document === 'undefined' ? bar : createPortal(bar, document.body);
}
