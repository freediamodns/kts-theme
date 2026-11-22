import React, { ComponentType, DragEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
    ChevronRight,
    Download,
    FileArchive,
    FilePlus,
    Folder,
    FolderPlus,
    FolderTree,
    Lock,
    MoreVertical,
    PackageOpen,
    Pencil,
    RefreshCw,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { httpErrorToHuman } from '@/api/http';
import { FileObject } from '@/api/server/files/loadDirectory';
import loadDirectory from '@/api/server/files/loadDirectory';
import createDirectory from '@/api/server/files/createDirectory';
import deleteFiles from '@/api/server/files/deleteFiles';
import renameFiles from '@/api/server/files/renameFiles';
import chmodFiles from '@/api/server/files/chmodFiles';
import compressFiles from '@/api/server/files/compressFiles';
import getFileContents from '@/api/server/files/getFileContents';
import getFileDownloadUrl from '@/api/server/files/getFileDownloadUrl';
import saveFileContents from '@/api/server/files/saveFileContents';
import { usePermissions } from '@/plugins/usePermissions';
import { Checkbox, ContextMenu, ContextMenuItem, ContextMenuRequest, Skeleton, useToast } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { FileKind, fileKind, isArchive } from '@/dezerx/lib/fileKind';
import { IgnoreRule, isIgnoredBy, parseIgnoreFile } from '@/dezerx/lib/gitignore';
import { FileIcon, useFileIcons } from '@/dezerx/components/files/icons';
import { FileDialog, FileDialogRequest, worldWarning } from '@/dezerx/components/files/FileDialog';
import { MoveDialog, MoveRequest } from '@/dezerx/components/files/MoveDialog';
import { PermissionsDialog, PermissionsRequest } from '@/dezerx/components/files/PermissionsDialog';
import { FILE_MOVE_TYPE, isWithin, isWorldFolder, join, relativeTo } from '@/dezerx/components/files/paths';
import { useExtract, useUploads } from '@/dezerx/components/files/UploadConflicts';
import { fromDataTransfer, fromFileList } from '@/dezerx/components/files/uploads';
import { useT } from '@/i18n';

type Loaded = Record<string, FileObject[] | null | undefined>;

const ROW_LIMIT = 250;

const PREFETCH_DELAY = 180;

interface Marked {
    root: string;
    names: Set<string>;
}

interface Dragged {
    root: string;
    names: string[];
}

export interface FileTreeProps {
    uuid: string;
    selected: string | null;
    onSelect: (path: string, file: FileObject, kind: FileKind) => void;
    onPathsChanged: (from: string, to: string | null) => void;
    onDirectoryChange?: (directory: string) => void;
    onIgnoresChange?: (sets: Record<string, IgnoreRule[]>) => void;
    initialDirectory?: string;
    bodyHeight?: number;
}

export default function FileTree({
    uuid,
    selected,
    onSelect,
    onPathsChanged,
    onDirectoryChange,
    onIgnoresChange,
    initialDirectory = '/',
    bodyHeight,
}: FileTreeProps) {
    const t = useT();
    const { toast } = useToast();

    useFileIcons();

    const [canReadContent, canCreate, canUpdate, canDelete, canArchive] = usePermissions([
        'file.read-content',
        'file.create',
        'file.update',
        'file.delete',
        'file.archive',
    ]);

    const [loaded, setLoaded] = useState<Loaded>({});
    const [open, setOpen] = useState<Set<string>>(() => {
        const set = new Set<string>(['/']);

        let at = '';
        for (const segment of initialDirectory.split('/').filter(Boolean)) {
            at = `${at}/${segment}`;
            set.add(at);
        }

        return set;
    });
    const [active, setActive] = useState(initialDirectory);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [moving, setMoving] = useState<MoveRequest | null>(null);
    const [permissions, setPermissions] = useState<PermissionsRequest | null>(null);
    const [menu, setMenu] = useState<ContextMenuRequest | null>(null);
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
    const [dragged, setDragged] = useState<Dragged | null>(null);
    const [over, setOver] = useState<string | null>(null);
    const [marked, setMarked] = useState<Marked>({ root: '/', names: new Set() });
    const [working, setWorking] = useState(false);
    const [ignores, setIgnores] = useState<Record<string, IgnoreRule[]>>({});
    const [limits, setLimits] = useState<Record<string, number>>({});
    const picker = useRef<HTMLInputElement>(null);
    const folderPicker = useRef<HTMLInputElement>(null);

    const pivot = useRef<string | null>(null);
    const loadedRef = useRef<Loaded>(loaded);
    const ignoresRef = useRef(ignores);

    loadedRef.current = loaded;
    ignoresRef.current = ignores;

    const generation = useRef(new Map<string, number>());
    const alive = useRef(true);

    useEffect(() => {
        alive.current = true;

        return () => {
            alive.current = false;
        };
    }, []);

    useEffect(() => {
        onDirectoryChange?.(active);
    }, [active, onDirectoryChange]);

    useEffect(() => {
        onIgnoresChange?.(ignores);
    }, [ignores, onIgnoresChange]);

    const readIgnores = useCallback(
        (directory: string, entries: FileObject[]) => {
            const has = entries.some((entry) => entry.isFile && entry.name === '.gitignore');

            if (!has) {
                setIgnores((current) => {
                    if (current[directory] === undefined) {
                        return current;
                    }

                    const next = { ...current };
                    delete next[directory];

                    return next;
                });

                return;
            }

            if (!canReadContent) {
                return;
            }

            getFileContents(uuid, join(directory, '.gitignore'))
                .then((text) => {
                    if (alive.current) {
                        setIgnores((current) => ({ ...current, [directory]: parseIgnoreFile(text) }));
                    }
                })
                .catch(() => {});
        },
        [uuid, canReadContent]
    );

    const read = useCallback(
        async (directory: string, force = false) => {
            if (!force && loadedRef.current[directory] !== undefined) {
                return;
            }

            const mark = (generation.current.get(directory) ?? 0) + 1;
            generation.current.set(directory, mark);

            setLoaded((current) => ({ ...current, [directory]: null }));

            try {
                const entries = await loadDirectory(uuid, directory);

                if (!alive.current || generation.current.get(directory) !== mark) {
                    return;
                }

                setLoaded((current) => ({ ...current, [directory]: sortEntries(entries) }));
                readIgnores(directory, entries);
            } catch (error) {
                if (!alive.current || generation.current.get(directory) !== mark) {
                    return;
                }

                setLoaded((current) => {
                    const next = { ...current };
                    delete next[directory];

                    return next;
                });
                toast(httpErrorToHuman(error), { tone: 'error' });
            }
        },
        [uuid, toast, readIgnores]
    );

    const uploads = useUploads({ uuid, onUploaded: (directory) => read(directory, true) });
    const extract = useExtract({ uuid, onExtracted: (directory) => read(directory, true) });

    useEffect(() => {
        for (const directory of Array.from(open)) {
            void read(directory);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [read]);

    const hover = useRef<number | null>(null);

    const cancelPrefetch = useCallback(() => {
        if (hover.current !== null) {
            window.clearTimeout(hover.current);
            hover.current = null;
        }
    }, []);

    useEffect(() => cancelPrefetch, [cancelPrefetch]);

    const prefetch = useCallback(
        (directory: string) => {
            cancelPrefetch();

            if (loadedRef.current[directory] !== undefined) {
                return;
            }

            hover.current = window.setTimeout(() => {
                hover.current = null;
                void read(directory);
            }, PREFETCH_DELAY);
        },
        [cancelPrefetch, read]
    );

    const count = marked.names.size;

    const clearMarked = () => {
        setMarked({ root: '/', names: new Set() });
        pivot.current = null;
    };

    const mark = (directory: string, name: string, extend: boolean) => {
        setMarked((current) => {
            if (current.root !== directory) {
                pivot.current = name;

                return { root: directory, names: new Set([name]) };
            }

            const names = new Set(current.names);
            const entries = loadedRef.current[directory] ?? [];
            const from = entries.findIndex((entry) => entry.name === pivot.current);
            const to = entries.findIndex((entry) => entry.name === name);

            if (extend && from !== -1 && to !== -1) {
                const [start, end] = from < to ? [from, to] : [to, from];

                for (const entry of entries.slice(start, end + 1)) {
                    names.add(entry.name);
                }

                return { root: directory, names };
            }

            if (names.has(name)) {
                names.delete(name);
            } else {
                names.add(name);
            }

            pivot.current = name;

            return { root: directory, names };
        });
    };

    const scope = count > 0 ? marked.root : active;
    const inScope = loaded[scope] ?? null;

    const allMarked =
        count > 0 && inScope !== null && inScope.length > 0 && inScope.every((entry) => marked.names.has(entry.name));

    const markAll = () => {
        if (inScope === null) {
            return;
        }

        if (allMarked) {
            clearMarked();

            return;
        }

        pivot.current = null;
        setMarked({ root: scope, names: new Set(inScope.map((entry) => entry.name)) });
    };

    const toggle = (directory: string) => {
        setActive(directory);
        setOpen((current) => {
            const next = new Set(current);

            if (next.has(directory)) {
                next.delete(directory);

                if (isWithin(marked.root, directory)) {
                    clearMarked();
                }
            } else {
                next.add(directory);
                void read(directory);
            }

            return next;
        });
    };

    const mutate = async (directory: string, work: () => Promise<void>, done: string) => {
        try {
            await work();
            await read(directory, true);
            toast(done, { tone: 'success' });
        } catch (error) {
            toast(httpErrorToHuman(error), { tone: 'error' });

            throw error;
        }
    };

    const newFolder = () =>
        setDialog({
            title: t('fileTree.newFolder'),
            body: t('fileTree.createdIn', { directory: active }),
            confirmLabel: t('common.create'),
            input: { label: t('fileTree.folderName'), initial: '' },
            onConfirm: (name) =>
                mutate(active, () => createDirectory(uuid, active, name), t('fileTree.created', { name })),
        });

    const newFile = () =>
        setDialog({
            title: t('fileTree.newFile'),
            body: t('fileTree.createdIn', { directory: active }),
            confirmLabel: t('common.create'),
            input: { label: t('fileTree.fileName'), initial: '' },
            onConfirm: (name) =>
                mutate(active, () => saveFileContents(uuid, join(active, name), ''), t('fileTree.created', { name })),
        });

    const rename = (directory: string, entry: FileObject) =>
        setDialog({
            title: t('fileTree.renameTitle', { name: entry.name }),
            confirmLabel: t('fileTree.rename'),
            input: { label: t('fileTree.newName'), initial: entry.name },
            onConfirm: (to) =>
                mutate(
                    directory,
                    async () => {
                        await renameFiles(uuid, directory, [{ from: entry.name, to }]);
                        onPathsChanged(join(directory, entry.name), join(directory, to));
                    },
                    t('fileTree.renamed', { name: to })
                ),
        });

    const remove = (directory: string, entry: FileObject) =>
        setDialog({
            title: t('fileTree.deleteTitle', { name: entry.name }),
            body: t(entry.isFile ? 'fileTree.deleteFileBody' : 'fileTree.deleteFolderBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            ...worldWarning(isWorldFolder(entry) ? [entry.name] : [], t),
            onConfirm: () =>
                mutate(
                    directory,
                    async () => {
                        await deleteFiles(uuid, directory, [entry.name]);
                        onPathsChanged(join(directory, entry.name), null);
                    },
                    t('fileTree.deleted', { name: entry.name })
                ),
        });

    const compress = (directory: string, entry: FileObject) =>
        void mutate(
            directory,
            async () => {
                await compressFiles(uuid, directory, [entry.name]);
            },
            t('fileTree.compressed', { name: entry.name })
        ).catch(() => undefined);

    const decompress = (directory: string, entry: FileObject) => void extract.start(directory, entry.name);

    const bulk = (work: () => Promise<void>, done: string) => {
        const root = marked.root;

        setWorking(true);

        return mutate(root, work, done)
            .then(clearMarked)
            .catch(() => undefined)
            .finally(() => setWorking(false));
    };

    const moveTo = (root: string, names: string[], destination: string) => {
        setWorking(true);

        return mutate(
            root,
            async () => {
                await renameFiles(
                    uuid,
                    '/',
                    names.map((name) => ({
                        from: relativeTo(join(root, name), '/'),
                        to: relativeTo(join(destination, name), '/'),
                    }))
                );

                for (const name of names) {
                    onPathsChanged(join(root, name), join(destination, name));
                }
            },
            names.length === 1
                ? t('fileTree.movedOne', { name: names[0], destination })
                : t('fileTree.movedMany', { count: names.length, destination })
        )
            .then(async () => {
                if (loadedRef.current[destination] !== undefined) {
                    await read(destination, true);
                }

                clearMarked();
            })
            .finally(() => setWorking(false));
    };

    const askMove = (root: string, names: string[]) =>
        setMoving({ root, names, onConfirm: (destination) => moveTo(root, names, destination) });

    const askPermissions = (root: string, names: string[], entry: FileObject | null) =>
        setPermissions({
            root,
            names,
            mode: entry?.modeBits ?? '',
            directory: entry ? !entry.isFile : false,
            label: entry?.name ?? t('fileTree.itemsLabel', { count: names.length }),
            onConfirm: (mode) => {
                setWorking(true);

                return mutate(
                    root,
                    () =>
                        chmodFiles(
                            uuid,
                            root,
                            names.map((file) => ({ file, mode }))
                        ),
                    names.length === 1
                        ? t('fileTree.modeOne', { name: names[0], mode })
                        : t('fileTree.modeMany', { count: names.length, mode })
                )
                    .then(() => {
                        if (names.length > 1) {
                            clearMarked();
                        }
                    })
                    .finally(() => setWorking(false));
            },
        });

    const removeMarked = () => {
        const { root, names } = marked;
        const files = Array.from(names);

        setDialog({
            title: t('fileTree.deleteManyTitle', { count: files.length }),
            body: t('fileTree.deleteManyBody', { directory: root }),
            confirmLabel: t('common.delete'),
            destructive: true,
            ...worldWarning(
                (loaded[root] ?? [])
                    .filter((entry) => names.has(entry.name) && isWorldFolder(entry))
                    .map((entry) => entry.name),
                t
            ),
            onConfirm: () =>
                bulk(async () => {
                    await deleteFiles(uuid, root, files);

                    for (const name of files) {
                        onPathsChanged(join(root, name), null);
                    }
                }, t('fileTree.deletedMany', { count: files.length })),
        });
    };

    const compressMarked = () => {
        const { root, names } = marked;
        const files = Array.from(names);

        void bulk(async () => {
            await compressFiles(uuid, root, files);
        }, t('fileTree.compressedMany', { count: files.length }));
    };

    const onDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDropping(false);

        if (event.dataTransfer.types.indexOf(FILE_MOVE_TYPE) >= 0) {
            return;
        }

        if (!canCreate) {
            return;
        }

        const target = active;

        void fromDataTransfer(event.dataTransfer)
            .then((entries) =>
                entries === null
                    ? toast(t('fileTree.noFolderUploads'), { tone: 'warning' })
                    : uploads.start(target, entries)
            )
            .catch(() => toast(t('files.uploadFailed'), { tone: 'error' }));
    };

    const download = async (path: string) => {
        try {
            window.location.href = await getFileDownloadUrl(uuid, path);
        } catch (error) {
            toast(httpErrorToHuman(error), { tone: 'error' });
        }
    };

    const startDrag = (event: DragEvent<HTMLDivElement>, directory: string, entry: FileObject) => {
        const names =
            marked.root === directory && marked.names.has(entry.name) ? Array.from(marked.names) : [entry.name];

        setDragged({ root: directory, names });
        setOver(null);

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(FILE_MOVE_TYPE, names.join('\n'));
        event.dataTransfer.setData('text/plain', join(directory, entry.name));
    };

    const endDrag = () => {
        setDragged(null);
        setOver(null);
    };

    const canDrop = (directory: string): boolean => {
        if (dragged === null || working || dragged.root === directory) {
            return false;
        }

        return !dragged.names.some((name) => isWithin(directory, join(dragged.root, name)));
    };

    const dropProps = (directory: string) => ({
        onDragOver: (event: DragEvent<HTMLDivElement>) => {
            if (!canDrop(directory)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'move';
            setOver(directory);
        },
        onDragLeave: () => setOver((current) => (current === directory ? null : current)),
        onDrop: (event: DragEvent<HTMLDivElement>) => {
            const payload = dragged;
            const allowed = canDrop(directory);

            if (payload === null) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            endDrag();

            if (!allowed) {
                return;
            }

            void moveTo(payload.root, payload.names, directory).catch(() => undefined);
        },
    });

    const menuFor = (directory: string, entry: FileObject, path: string): ContextMenuItem[] => {
        const items: ContextMenuItem[] = [];

        if (canUpdate) {
            items.push({ label: t('files.rename'), icon: Pencil, onSelect: () => rename(directory, entry) });
            items.push({
                label: t('files.move'),
                icon: FolderTree,
                onSelect: () => askMove(directory, [entry.name]),
            });
            items.push({
                label: t('files.permissions'),
                icon: Lock,
                hint: entry.modeBits,
                onSelect: () => askPermissions(directory, [entry.name], entry),
            });
        }

        if (entry.isFile) {
            items.push({ label: t('files.download'), icon: Download, onSelect: () => void download(path) });
        }

        if (isArchive(entry)) {
            if (canCreate) {
                items.push({
                    label: t('files.decompress'),
                    icon: PackageOpen,
                    onSelect: () => decompress(directory, entry),
                });
            }
        } else if (canArchive) {
            items.push({ label: t('files.compress'), icon: FileArchive, onSelect: () => compress(directory, entry) });
        }

        if (canDelete) {
            items.push({ label: t('common.delete'), icon: Trash2, onSelect: () => remove(directory, entry) });
        }

        return items;
    };

    const rows = (directory: string, depth: number, inherited: boolean): React.ReactNode => {
        const entries = loaded[directory];

        if (entries === null) {
            return (
                <div className={'space-y-1.5 py-1'} style={{ paddingLeft: depth * 12 + 8 }}>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className={'h-3 w-28'} />
                    ))}
                </div>
            );
        }

        if (entries === undefined) {
            return null;
        }

        if (entries.length === 0) {
            return (
                <p className={'py-1 text-xs text-ink-faint'} style={{ paddingLeft: depth * 12 + 8 }}>
                    Empty.
                </p>
            );
        }

        const limit = limits[directory] ?? ROW_LIMIT;
        const shown = entries.slice(0, limit);
        const hidden = entries.length - shown.length;

        const drawn = shown.map((entry) => {
            const path = join(directory, entry.name);
            const expanded = open.has(path);
            const kind = fileKind(entry);
            const ticked = marked.root === directory && marked.names.has(entry.name);

            const ignored = inherited || entry.name === '.git' || isIgnoredBy(path, !entry.isFile, ignores);

            const items = menuFor(directory, entry, path);

            const openMenu = (x: number, y: number) => {
                if (items.length === 0) {
                    return;
                }

                setMenu({ x, y, title: entry.name, items });
            };

            return (
                <div key={path}>
                    <div
                        draggable={!working && canUpdate}
                        onDragStart={(event) => startDrag(event, directory, entry)}
                        onDragEnd={endDrag}
                        onContextMenu={(event) => {
                            event.preventDefault();
                            openMenu(event.clientX, event.clientY);
                        }}
                        onPointerEnter={kind === 'directory' && !expanded ? () => prefetch(path) : undefined}
                        onPointerLeave={kind === 'directory' && !expanded ? cancelPrefetch : undefined}
                        {...(kind === 'directory' ? dropProps(path) : {})}
                        className={cn(
                            'group my-px flex items-center rounded-lg pr-1 transition-colors',
                            over === path
                                ? 'bg-accent/10 ring-1 ring-accent/60'
                                : ticked
                                ? 'bg-accent/[0.07]'
                                : selected === path
                                ? 'bg-accent/10'
                                : 'hover:bg-raised',
                            dragged?.root === directory && dragged.names.indexOf(entry.name) >= 0 && 'opacity-50',
                            ignored && 'opacity-50'
                        )}
                    >
                        <label
                            title={`Select ${entry.name}`}
                            style={{ paddingLeft: depth * 12 + 8 }}
                            className={'flex shrink-0 cursor-pointer items-center py-1.5 pr-1.5'}
                        >
                            <Checkbox
                                size={'xs'}
                                checked={ticked}
                                onChange={() => undefined}
                                onClick={(event) => mark(directory, entry.name, event.shiftKey)}
                            />
                            <span className={'sr-only'}>{t('fileTree.selectEntry', { name: entry.name })}</span>
                        </label>

                        <button
                            type={'button'}
                            onClick={() => (kind === 'directory' ? toggle(path) : onSelect(path, entry, kind))}
                            title={
                                kind === 'binary'
                                    ? t('fileTree.notEditableTitle', { path })
                                    : ignored
                                    ? t('fileTree.ignoredTitle', { path })
                                    : path
                            }
                            aria-expanded={kind === 'directory' ? expanded : undefined}
                            className={cn(
                                'flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-xs',
                                selected === path
                                    ? 'font-medium text-ink'
                                    : kind === 'binary'
                                    ? 'text-ink-faint'
                                    : 'text-ink-muted'
                            )}
                        >
                            {kind === 'directory' ? (
                                <ChevronRight
                                    aria-hidden={'true'}
                                    className={cn('h-3 w-3 shrink-0 transition-transform', expanded && 'rotate-90')}
                                />
                            ) : (
                                <span aria-hidden={'true'} className={'w-3 shrink-0'} />
                            )}

                            <FileIcon name={entry.name} kind={kind} className={'h-3.5 w-3.5 shrink-0'} />

                            <span className={'truncate'}>{entry.name}</span>
                        </button>

                        {items.length > 0 && (
                            <button
                                type={'button'}
                                aria-label={t('fileTree.actionsFor', { name: entry.name })}
                                onClick={(event) => {
                                    event.stopPropagation();

                                    const box = event.currentTarget.getBoundingClientRect();

                                    openMenu(box.right, box.bottom + 4);
                                }}
                                className={
                                    'shrink-0 rounded-lg p-1 text-ink-faint opacity-0 transition-opacity hover:bg-overlay hover:text-ink focus:opacity-100 group-hover:opacity-100'
                                }
                            >
                                <MoreVertical className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                            </button>
                        )}
                    </div>

                    {kind === 'directory' && expanded && rows(path, depth + 1, ignored)}
                </div>
            );
        });

        if (hidden <= 0) {
            return drawn;
        }

        return [
            ...drawn,
            <div
                key={'__more'}
                className={'flex flex-wrap items-center gap-x-2 py-1 text-xs'}
                style={{ paddingLeft: depth * 12 + 8 }}
            >
                <span className={'text-ink-faint'}>
                    {t('fileTree.partial', { shown: shown.length, total: entries.length })}
                </span>
                <button
                    type={'button'}
                    onClick={() => setLimits((current) => ({ ...current, [directory]: limit + ROW_LIMIT }))}
                    className={'rounded-md font-medium text-accent hover:underline'}
                >
                    {t('fileTree.showMore', { count: Math.min(hidden, ROW_LIMIT) })}
                </button>
            </div>,
        ];
    };

    return (
        <>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />
            <MoveDialog uuid={uuid} request={moving} onClose={() => setMoving(null)} />
            <PermissionsDialog request={permissions} onClose={() => setPermissions(null)} />
            <ContextMenu request={menu} onClose={() => setMenu(null)} />

            {uploads.render}
            {extract.render}

            {[picker, folderPicker].map((ref, index) => (
                <input
                    key={index}
                    ref={ref}
                    type={'file'}
                    multiple
                    className={'hidden'}
                    {...(ref === folderPicker ? { webkitdirectory: '' } : {})}
                    onChange={(event) => {
                        void uploads.start(active, fromFileList(Array.from(event.target.files ?? [])));
                        event.target.value = '';
                    }}
                />
            ))}

            <div
                onDragOver={(event) => {
                    if (dragged !== null || !canCreate) {
                        return;
                    }

                    event.preventDefault();
                    setDropping(true);
                }}
                onDragLeave={() => setDropping(false)}
                onDrop={onDrop}
                className={cn(
                    'relative rounded-2xl bg-card p-2 transition-colors',
                    dropping && 'ring-2 ring-accent/60'
                )}
            >
                {dropping && (
                    <div
                        className={
                            'pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-card/90 text-xs font-medium text-ink'
                        }
                    >
                        Drop to upload into {active}
                    </div>
                )}

                {count > 0 ? (
                    <div className={'flex items-center gap-1.5 rounded-xl px-2 py-1'}>
                        <SelectAll
                            checked={allMarked}
                            mixed={!allMarked}
                            disabled={working || inScope === null}
                            onClick={markAll}
                            label={t(allMarked ? 'fileTree.deselectAll' : 'fileTree.selectAll', { scope })}
                        />

                        <p className={'min-w-0 flex-1 truncate text-[11px] text-ink'}>
                            <span className={'font-medium'}>{count} selected</span>
                            <span className={'ml-1.5 text-ink-faint'}>in {marked.root}</span>
                        </p>

                        <div className={'flex shrink-0 items-center'}>
                            {canUpdate && (
                                <IconAction
                                    label={t('fileTree.moveItems', { count })}
                                    onClick={() => askMove(marked.root, Array.from(marked.names))}
                                    disabled={working}
                                    icon={FolderTree}
                                />
                            )}
                            {canUpdate && (
                                <IconAction
                                    label={t('fileTree.permissionsItems', { count })}
                                    onClick={() => askPermissions(marked.root, Array.from(marked.names), null)}
                                    disabled={working}
                                    icon={Lock}
                                />
                            )}
                            {canArchive && (
                                <IconAction
                                    label={t('fileTree.archiveItems', { count })}
                                    onClick={compressMarked}
                                    disabled={working}
                                    icon={FileArchive}
                                />
                            )}
                            {canDelete && (
                                <IconAction
                                    label={t('fileTree.deleteItems', { count })}
                                    onClick={removeMarked}
                                    disabled={working}
                                    icon={Trash2}
                                    destructive
                                />
                            )}
                            <IconAction
                                label={t('fileTree.clearSelection')}
                                onClick={clearMarked}
                                disabled={working}
                                icon={X}
                            />
                        </div>
                    </div>
                ) : (
                    <div className={'flex items-center gap-1.5 px-2 py-1.5'}>
                        <SelectAll
                            checked={false}
                            mixed={false}
                            disabled={inScope === null}
                            onClick={markAll}
                            label={t('fileTree.selectAll', { scope })}
                        />

                        <p
                            className={'min-w-0 flex-1 truncate text-[11px] text-ink-faint'}
                            title={t('fileTree.newFilesLandIn', { directory: active })}
                        >
                            {active}
                        </p>

                        <div className={'flex shrink-0 items-center'}>
                            {canCreate && (
                                <IconAction label={t('fileTree.newFile')} onClick={newFile} icon={FilePlus} />
                            )}
                            {canCreate && (
                                <IconAction label={t('fileTree.newFolder')} onClick={newFolder} icon={FolderPlus} />
                            )}
                            {canCreate && (
                                <IconAction
                                    label={t('fileTree.uploadInto', { directory: active })}
                                    onClick={() => picker.current?.click()}
                                    disabled={uploads.busy}
                                    icon={Upload}
                                />
                            )}
                            {canCreate && (
                                <IconAction
                                    label={t('uploads.uploadFolderInto', { directory: active })}
                                    onClick={() => folderPicker.current?.click()}
                                    disabled={uploads.busy}
                                    icon={Folder}
                                />
                            )}
                            <IconAction
                                label={t('fileTree.refresh')}
                                onClick={() => void read(active, true)}
                                icon={RefreshCw}
                            />
                        </div>
                    </div>
                )}

                {dragged !== null && dragged.root !== '/' && (
                    <div
                        {...dropProps('/')}
                        className={cn(
                            'absolute inset-x-2 bottom-2 z-20 rounded-xl border border-dashed px-2 py-1.5 text-center text-[11px] transition-colors',
                            over === '/'
                                ? 'border-accent bg-accent/15 text-ink'
                                : 'border-line-field bg-card/95 text-ink-faint'
                        )}
                    >
                        {t('fileTree.dropToRoot')}
                    </div>
                )}

                <div
                    style={{ maxHeight: bodyHeight ?? undefined }}
                    className={cn('overflow-y-auto', bodyHeight === undefined && 'max-h-[32rem]')}
                >
                    {rows('/', 0, false)}
                </div>
            </div>
        </>
    );
}

function sortEntries(entries: FileObject[]): FileObject[] {
    return entries
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .sort((a, b) => (a.isFile === b.isFile ? 0 : a.isFile ? 1 : -1));
}

function SelectAll({
    checked,
    mixed,
    disabled,
    onClick,
    label,
}: {
    checked: boolean;
    mixed: boolean;
    disabled: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <Checkbox
            size={'xs'}
            checked={checked}
            indeterminate={mixed && !checked}
            disabled={disabled}
            onChange={onClick}
            aria-label={label}
            title={label}
        />
    );
}

function IconAction({
    label,
    onClick,
    icon: Icon,
    disabled = false,
    destructive = false,
}: {
    label: string;
    onClick: () => void;
    icon: ComponentType<{ className?: string }>;
    disabled?: boolean;
    destructive?: boolean;
}) {
    return (
        <button
            type={'button'}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={cn(
                'rounded-lg p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-40',
                destructive ? 'text-danger hover:bg-danger/10' : 'text-ink-faint hover:bg-raised hover:text-ink'
            )}
        >
            <Icon className={'h-3.5 w-3.5'} aria-hidden={'true'} />
        </button>
    );
}
