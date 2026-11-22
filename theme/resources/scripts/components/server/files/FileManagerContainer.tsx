import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { FileCode2, RotateCcw, Save } from 'lucide-react';
import { httpErrorToHuman } from '@/api/http';
import { FileObject } from '@/api/server/files/loadDirectory';
import getFileContents from '@/api/server/files/getFileContents';
import getFileDownloadUrl from '@/api/server/files/getFileDownloadUrl';
import saveFileContents from '@/api/server/files/saveFileContents';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import ErrorBoundary from '@/components/elements/ErrorBoundary';
import { ServerContext } from '@/state/server';
import { useStoreActions } from '@/state/hooks';
import { usePermissions } from '@/plugins/usePermissions';
import { hashToPath } from '@/helpers';
import { Button, Skeleton, SkeletonRegion, useToast } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { useShellWidth } from '@/dezerx/lib/useShellWidth';
import { FileKind } from '@/dezerx/lib/fileKind';
import { IgnoreRule, isIgnoredBy } from '@/dezerx/lib/gitignore';
import { useResizable } from '@/dezerx/lib/useResizable';
import FileTree from '@/dezerx/components/files/FileTree';
import FileList from '@/dezerx/components/files/FileList';
import CodeEditor from '@/dezerx/components/files/CodeEditor';
import EditorTabs from '@/dezerx/components/files/EditorTabs';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { basename, isWithin } from '@/dezerx/components/files/paths';
import { useT } from '@/i18n';

interface Tab {
    path: string;
    kind: FileKind;
    saved: string;
    draft: string;
    image: string | null;
    loading: boolean;
}

type ViewMode = 'list' | 'editor';

const MODE_KEY = 'dezerx.files.mode';

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
    const t = useT();

    return (
        <Button
            size={'sm'}
            variant={'secondary'}
            title={t('files.codeEditorHint')}
            onClick={() => onChange(mode === 'list' ? 'editor' : 'list')}
            icon={<FileCode2 className={'h-3.5 w-3.5'} />}
        >
            {mode === 'list' ? t('files.codeEditor') : t('files.listView')}
        </Button>
    );
}

function isDirty(tab: Tab): boolean {
    return tab.kind === 'text' && !tab.loading && tab.draft !== tab.saved;
}

export default function FileManagerContainer() {
    const t = useT();
    const { hash } = useLocation();
    const { toast } = useToast();

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const setDirectory = ServerContext.useStoreActions((actions) => actions.files.setDirectory);
    const clearFlashes = useStoreActions((actions) => actions.flashes.clearFlashes);

    const [canReadContent, canWrite] = usePermissions(['file.read-content', 'file.create']);

    const [initialDirectory] = useState(() => hashToPath(hash));

    const [mode, setMode] = useState<ViewMode>(() => (localStorage.getItem(MODE_KEY) === 'editor' ? 'editor' : 'list'));

    const [browsing, setBrowsing] = useState(() => hashToPath(hash));

    useEffect(() => {
        localStorage.setItem(MODE_KEY, mode);
    }, [mode]);

    const browse = useCallback(
        (path: string) => {
            setBrowsing(path);
            setDirectory(path);
        },
        [setDirectory]
    );

    const [tabs, setTabs] = useState<Tab[]>([]);
    const [active, setActive] = useState<string | null>(null);
    const [closing, setClosing] = useState<FileDialogRequest | null>(null);
    const [ignores, setIgnores] = useState<Record<string, IgnoreRule[]>>({});

    useEffect(() => {
        clearFlashes('files');
    }, [clearFlashes]);

    const width = useShellWidth();

    const tree = useResizable({ axis: 'x', initial: 288, min: 200, max: 560, storageKey: 'dezerx.files.tree' });
    const editor = useResizable({ axis: 'y', initial: 544, min: 240, max: 1100, storageKey: 'dezerx.files.editor' });

    const panel = useRef<HTMLDivElement>(null);
    const [anchor, setAnchor] = useState<{ left: number; width: number } | null>(null);

    useEffect(() => {
        const element = panel.current;

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
        window.addEventListener('scroll', measure, true);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, []);

    const activeTab = tabs.find((tab) => tab.path === active) ?? null;
    const anyDirty = tabs.some(isDirty);

    const patch = useCallback((path: string, change: Partial<Tab>) => {
        setTabs((live) => live.map((tab) => (tab.path === path ? { ...tab, ...change } : tab)));
    }, []);

    const open = useCallback(
        (path: string, file: FileObject, kind: FileKind) => {
            if (kind === 'binary') {
                toast(t('files.notEditable', { name: basename(path) }), { tone: 'warning' });

                return;
            }

            setActive(path);

            if (tabs.some((tab) => tab.path === path)) {
                return;
            }

            setTabs((live) =>
                live.some((tab) => tab.path === path)
                    ? live
                    : [...live, { path, kind, saved: '', draft: '', image: null, loading: true }]
            );

            const failed = (error: unknown) => {
                toast(httpErrorToHuman(error), { tone: 'error' });
                setTabs((live) => live.filter((tab) => tab.path !== path));
                setActive((live) => (live === path ? null : live));
            };

            if (kind === 'image') {
                getFileDownloadUrl(uuid, path)
                    .then((url) => patch(path, { image: url, loading: false }))
                    .catch(failed);

                return;
            }

            getFileContents(uuid, path)
                .then((contents) => patch(path, { saved: contents, draft: contents, loading: false }))
                .catch(failed);
        },
        [tabs, uuid, patch, toast]
    );

    const drop = useCallback(
        (paths: string[]) => {
            const gone = new Set(paths);
            const at = tabs.findIndex((tab) => gone.has(tab.path));
            const kept = tabs.filter((tab) => !gone.has(tab.path));

            setTabs(kept);

            if (active !== null && gone.has(active)) {
                setActive(kept[Math.min(Math.max(at, 0), kept.length - 1)]?.path ?? null);
            }
        },
        [tabs, active]
    );

    const askDrop = useCallback(
        (paths: string[], title: string) => {
            const losing = tabs.filter((tab) => paths.indexOf(tab.path) >= 0 && isDirty(tab));

            if (losing.length === 0) {
                drop(paths);

                return;
            }

            setClosing({
                title,
                body:
                    losing.length === 1
                        ? t('files.unsavedOne', { name: basename(losing[0]!.path) })
                        : t('files.unsavedMany', { count: losing.length }),
                confirmLabel: t('files.discardAndClose'),
                destructive: true,
                onConfirm: async () => drop(paths),
            });
        },
        [tabs, drop, t]
    );

    const onPathsChanged = useCallback((from: string, to: string | null) => {
        setTabs((live) =>
            live.reduce<Tab[]>((kept, tab) => {
                if (!isWithin(tab.path, from)) {
                    kept.push(tab);
                } else if (to !== null) {
                    kept.push({ ...tab, path: to + tab.path.slice(from.length) });
                }

                return kept;
            }, [])
        );

        setActive((live) => {
            if (live === null || !isWithin(live, from)) {
                return live;
            }

            return to === null ? null : to + live.slice(from.length);
        });
    }, []);

    const save = useCallback(
        async (path: string | null) => {
            const tab = tabs.find((entry) => entry.path === path);

            if (!tab || !isDirty(tab) || !canWrite) {
                return;
            }

            const contents = tab.draft;

            try {
                await saveFileContents(uuid, tab.path, contents);

                setTabs((live) =>
                    live.map((entry) => (entry.path === tab.path ? { ...entry, saved: contents } : entry))
                );
                toast(t('files.saved', { name: basename(tab.path) }), { tone: 'success' });
            } catch (error) {
                toast(httpErrorToHuman(error), { tone: 'error' });
            }
        },
        [tabs, uuid, canWrite, toast, t]
    );

    const shortcuts = useRef<(event: KeyboardEvent) => void>(() => undefined);

    shortcuts.current = (event: KeyboardEvent) => {
        const command = event.metaKey || event.ctrlKey;
        const key = event.key.toLowerCase();

        if (command && !event.altKey && key === 's') {
            event.preventDefault();

            if (event.shiftKey) {
                for (const tab of tabs) {
                    if (isDirty(tab)) {
                        void save(tab.path);
                    }
                }
            } else {
                void save(active);
            }

            return;
        }

        if (command && event.altKey && (key === 'arrowleft' || key === 'arrowright')) {
            if (tabs.length < 2) {
                return;
            }

            event.preventDefault();

            const at = tabs.findIndex((tab) => tab.path === active);
            const step = key === 'arrowleft' ? -1 : 1;
            const next = tabs[((((at < 0 ? 0 : at) + step) % tabs.length) + tabs.length) % tabs.length];

            if (next) {
                setActive(next.path);
            }

            return;
        }

        if (event.altKey && !command && key >= '1' && key <= '9') {
            const next = tabs[Number(key) - 1];

            if (next) {
                event.preventDefault();
                setActive(next.path);
            }
        }
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => shortcuts.current(event);

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        if (!anyDirty) {
            return;
        }

        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', warn);

        return () => window.removeEventListener('beforeunload', warn);
    }, [anyDirty]);

    const height = editor.size;
    const showEditor = activeTab !== null && activeTab.kind === 'text' && !activeTab.loading;

    if (mode === 'list') {
        return (
            <ServerContentBlock title={t('files.title')} showFlashKey={'files'}>
                <ErrorBoundary>
                    <FileList
                        uuid={uuid}
                        directory={browsing}
                        onNavigate={browse}
                        toolbarExtra={<ViewToggle mode={mode} onChange={setMode} />}
                    />
                </ErrorBoundary>
            </ServerContentBlock>
        );
    }

    return (
        <ServerContentBlock title={t('files.title')} showFlashKey={'files'}>
            <FileDialog request={closing} onClose={() => setClosing(null)} />

            <div className={'mb-4 flex justify-end'}>
                <ViewToggle mode={mode} onChange={setMode} />
            </div>

            <ErrorBoundary>
                <div
                    style={{ '--tree': `${tree.size}px` } as CSSProperties}
                    className={
                        width >= 900
                            ? 'grid min-w-0 grid-cols-[var(--tree)_minmax(0,1fr)] items-start gap-4'
                            : 'grid min-w-0 gap-4'
                    }
                >
                    <FileTree
                        uuid={uuid}
                        selected={active}
                        onSelect={open}
                        onPathsChanged={onPathsChanged}
                        onDirectoryChange={setDirectory}
                        onIgnoresChange={setIgnores}
                        initialDirectory={initialDirectory}
                        bodyHeight={height}
                    />

                    <div ref={panel} className={'relative min-w-0'}>
                        <div
                            {...tree.handleProps}
                            aria-label={t('files.resizeTree')}
                            title={t('files.resizeHint')}
                            className={cn(
                                'group absolute -left-4 top-0 h-full w-4 cursor-col-resize touch-none items-center justify-center focus:outline-none',
                                width >= 900 ? 'flex' : 'hidden'
                            )}
                        >
                            <span
                                aria-hidden={'true'}
                                className={cn(
                                    'h-10 w-1 rounded-full transition-colors',
                                    tree.dragging
                                        ? 'bg-accent'
                                        : 'bg-line-field group-hover:bg-ink-faint group-focus:bg-accent'
                                )}
                            />
                        </div>

                        <div className={'overflow-hidden rounded-2xl bg-card ring-1 ring-line-field'}>
                            <EditorTabs
                                tabs={tabs.map((tab) => ({
                                    path: tab.path,
                                    name: basename(tab.path),
                                    kind: tab.kind,
                                    dirty: isDirty(tab),
                                    ignored: isIgnoredBy(tab.path, false, ignores),
                                    loading: tab.loading,
                                }))}
                                active={active}
                                onActivate={setActive}
                                onClose={(path) => askDrop([path], t('files.closeTitle', { name: basename(path) }))}
                                onCloseOthers={() =>
                                    askDrop(
                                        tabs.filter((tab) => tab.path !== active).map((tab) => tab.path),
                                        t('files.closeOthersTitle')
                                    )
                                }
                            />

                            <div className={'relative'} style={{ height }}>
                                <div className={cn('absolute inset-0', !showEditor && 'pointer-events-none opacity-0')}>
                                    <CodeEditor
                                        path={showEditor && activeTab ? activeTab.path : null}
                                        value={activeTab?.draft ?? ''}
                                        open={tabs.filter((tab) => tab.kind === 'text').map((tab) => tab.path)}
                                        height={height}
                                        readOnly={!canWrite}
                                        onChange={(value) => {
                                            if (activeTab && activeTab.kind === 'text' && !activeTab.loading) {
                                                patch(activeTab.path, { draft: value });
                                            }
                                        }}
                                    />
                                </div>

                                {!showEditor && (
                                    <div className={'absolute inset-0'}>
                                        {activeTab === null ? (
                                            <EmptyEditor height={height} canRead={canReadContent} />
                                        ) : activeTab.loading ? (
                                            <EditorSkeleton height={height} />
                                        ) : (
                                            <ImagePreview
                                                src={activeTab.image ?? ''}
                                                name={activeTab.path}
                                                height={height}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div
                            {...editor.handleProps}
                            aria-label={t('files.resizeEditor')}
                            title={t('files.resizeHint')}
                            className={
                                'group flex h-4 cursor-row-resize touch-none items-center justify-center focus:outline-none'
                            }
                        >
                            <span
                                aria-hidden={'true'}
                                className={cn(
                                    'h-1 w-10 rounded-full transition-colors',
                                    editor.dragging
                                        ? 'bg-accent'
                                        : 'bg-line-field group-hover:bg-ink-faint group-focus:bg-accent'
                                )}
                            />
                        </div>
                    </div>
                </div>
            </ErrorBoundary>

            {activeTab !== null && isDirty(activeTab) && (
                <SaveBar
                    path={activeTab.path}
                    anchor={anchor}
                    readOnly={!canWrite}
                    onSave={() => void save(activeTab.path)}
                    onDiscard={() => patch(activeTab.path, { draft: activeTab.saved })}
                />
            )}
        </ServerContentBlock>
    );
}

function SaveBar({
    path,
    anchor,
    readOnly,
    onSave,
    onDiscard,
}: {
    path: string;
    anchor: { left: number; width: number } | null;
    readOnly: boolean;
    onSave: () => void;
    onDiscard: () => void;
}) {
    const t = useT();

    const bar = (
        <div
            role={'status'}
            style={anchor ? { left: anchor.left, width: anchor.width } : undefined}
            className={cn('pointer-events-none fixed bottom-6 z-[70] flex justify-center px-4', !anchor && 'inset-x-0')}
        >
            <div
                className={
                    'pointer-events-auto flex max-w-full items-center gap-3 rounded-2xl bg-overlay px-3 py-2 shadow-panel ring-1 ring-line-field'
                }
            >
                <span aria-hidden={'true'} className={'ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning'} />

                <p className={'min-w-0 truncate text-xs text-ink'}>
                    <span className={'font-medium'}>{basename(path)}</span>
                    <span className={'ml-2 text-ink-faint'}>
                        {t(readOnly ? 'files.changedReadOnly' : 'files.changed')}
                    </span>
                </p>

                <div className={'flex shrink-0 items-center gap-1.5'}>
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        onClick={onDiscard}
                        icon={<RotateCcw className={'h-3.5 w-3.5'} />}
                    >
                        {t('files.discard')}
                    </Button>
                    {!readOnly && (
                        <Button
                            size={'sm'}
                            variant={'primary'}
                            onClick={onSave}
                            icon={<Save className={'h-3.5 w-3.5'} />}
                        >
                            {t('common.save')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );

    return typeof document === 'undefined' ? bar : createPortal(bar, document.body);
}

function EditorSkeleton({ height }: { height: number }) {
    const t = useT();

    return (
        <SkeletonRegion label={t('files.opening')}>
            <div style={{ height }} className={'space-y-2.5 overflow-hidden p-4'}>
                {Array.from({ length: 14 }).map((_, index) => (
                    <Skeleton key={index} className={'h-3'} style={{ width: `${35 + ((index * 17) % 55)}%` }} />
                ))}
            </div>
        </SkeletonRegion>
    );
}

function ImagePreview({ src, name, height }: { src: string; name: string; height: number }) {
    const t = useT();
    const [failed, setFailed] = useState(false);

    useEffect(() => setFailed(false), [src]);

    if (failed) {
        return (
            <div style={{ height }} className={'flex flex-col items-center justify-center px-6 text-center'}>
                <p className={'text-sm font-medium text-ink'}>{t('files.imageFailed', { name: basename(name) })}</p>
                <p className={'mt-1 max-w-xs text-xs text-ink-faint'}>{t('files.imageFailedBody')}</p>
            </div>
        );
    }

    return (
        <div
            style={{
                height,
                backgroundImage:
                    'linear-gradient(45deg, rgb(from var(--ink-faint) r g b / 0.12) 25%, transparent 25%, transparent 75%, rgb(from var(--ink-faint) r g b / 0.12) 75%), linear-gradient(45deg, rgb(from var(--ink-faint) r g b / 0.12) 25%, transparent 25%, transparent 75%, rgb(from var(--ink-faint) r g b / 0.12) 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 8px 8px',
            }}
            className={'flex items-center justify-center overflow-auto p-6'}
        >
            <img
                src={src}
                alt={basename(name)}
                onError={() => setFailed(true)}
                className={'max-h-full max-w-full object-contain'}
                style={{ imageRendering: 'pixelated' }}
            />
        </div>
    );
}

function EmptyEditor({ height, canRead }: { height: number; canRead: boolean }) {
    const t = useT();

    return (
        <div style={{ height }} className={'flex flex-col items-center justify-center px-6 text-center'}>
            <span className={'flex h-12 w-12 items-center justify-center rounded-2xl bg-overlay/60 text-ink-faint'}>
                <FileCode2 className={'h-6 w-6'} aria-hidden={'true'} />
            </span>
            <p className={'mt-4 text-sm font-medium text-ink'}>{t('files.nothingOpen')}</p>
            <p className={'mt-1 max-w-xs text-xs text-ink-faint'}>
                {t(canRead ? 'files.nothingOpenBody' : 'files.readDenied')}
            </p>
        </div>
    );
}
