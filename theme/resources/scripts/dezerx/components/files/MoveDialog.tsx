import React, { FormEvent, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Folder, FolderTree } from 'lucide-react';
import loadDirectory from '@/api/server/files/loadDirectory';
import { Button, Input, Skeleton } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { join, normalisePath, parentOf } from '@/dezerx/components/files/paths';
import { useT } from '@/i18n';

export interface MoveRequest {
    root: string;
    names: string[];
    onConfirm: (destination: string) => Promise<void>;
}

export function MoveDialog({
    uuid,
    request,
    onClose,
}: {
    uuid: string;
    request: MoveRequest | null;
    onClose: () => void;
}) {
    const t = useT();
    const [at, setAt] = useState('/');
    const [folders, setFolders] = useState<string[] | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setAt(request?.root ?? '/');
        setBusy(false);
    }, [request]);

    useEffect(() => {
        if (request === null) {
            return;
        }

        let live = true;
        const directory = normalisePath(at);

        setFolders(null);

        const timer = window.setTimeout(() => {
            loadDirectory(uuid, directory)
                .then((entries) => {
                    if (live) {
                        setFolders(entries.filter((entry) => !entry.isFile).map((entry) => entry.name));
                    }
                })
                .catch(() => {
                    if (live) {
                        setFolders([]);
                    }
                });
        }, 250);

        return () => {
            live = false;
            window.clearTimeout(timer);
        };
    }, [request, at, uuid]);

    const destination = normalisePath(at);
    const sources = (request?.names ?? []).map((name) => join(request?.root ?? '/', name));

    const intoItself = sources.some((source) => destination === source || destination.startsWith(`${source}/`));
    const unchanged = request !== null && destination === request.root;
    const blocked = intoItself || unchanged;

    const problem = intoItself ? t('moveDialog.intoItself') : undefined;
    const note = unchanged ? t('moveDialog.alreadyHere') : undefined;

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        if (request === null || busy || blocked) {
            return;
        }

        setBusy(true);

        try {
            await request.onConfirm(destination);
            onClose();
        } catch {
        } finally {
            setBusy(false);
        }
    };

    const count = request?.names.length ?? 0;

    return (
        <DialogShell
            open={request !== null}
            onClose={() => !busy && onClose()}
            width={'md'}
            title={
                count === 1
                    ? t('moveDialog.title', { name: request?.names[0] ?? '' })
                    : t('moveDialog.titleMany', { count })
            }
            body={t('moveDialog.currentlyIn', { directory: request?.root ?? '/' })}
        >
            <form onSubmit={(event) => void submit(event)}>
                <div className={'mt-4 overflow-hidden rounded-2xl ring-1 ring-line-field'}>
                    <div className={'flex items-center gap-1.5 border-b border-line-field px-2 py-1.5'}>
                        <button
                            type={'button'}
                            disabled={destination === '/'}
                            onClick={() => setAt(parentOf(destination))}
                            aria-label={t('moveDialog.upOne')}
                            title={t('moveDialog.upOne')}
                            className={
                                'rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-raised hover:text-ink disabled:pointer-events-none disabled:opacity-40'
                            }
                        >
                            <ChevronLeft className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        </button>

                        <p className={'min-w-0 flex-1 truncate text-[11px] text-ink-faint'}>{destination}</p>
                    </div>

                    <div className={'max-h-52 min-h-[7rem] overflow-y-auto p-1'}>
                        {folders === null ? (
                            <div className={'space-y-1.5 p-2'}>
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <Skeleton key={index} className={'h-3 w-28'} />
                                ))}
                            </div>
                        ) : folders.length === 0 ? (
                            <p className={'p-2 text-xs text-ink-faint'}>{t('moveDialog.noFolders')}</p>
                        ) : (
                            folders.map((name) => {
                                const path = join(destination, name);
                                const self = sources.indexOf(path) >= 0;

                                return (
                                    <button
                                        key={path}
                                        type={'button'}
                                        disabled={self}
                                        onClick={() => setAt(path)}
                                        title={self ? t('moveDialog.intoItself') : path}
                                        className={cn(
                                            'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                                            self
                                                ? 'cursor-not-allowed text-ink-faint opacity-50'
                                                : 'text-ink-muted hover:bg-raised hover:text-ink'
                                        )}
                                    >
                                        <Folder className={'h-3.5 w-3.5 shrink-0'} aria-hidden={'true'} />
                                        <span className={'min-w-0 flex-1 truncate'}>{name}</span>
                                        <ChevronRight className={'h-3 w-3 shrink-0 opacity-60'} aria-hidden={'true'} />
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className={'mt-4'}>
                    <Input
                        value={at}
                        onChange={(event) => setAt(event.target.value)}
                        label={t('moveDialog.destination')}
                        error={problem}
                        hint={note}
                        spellCheck={false}
                        autoComplete={'off'}
                        icon={<FolderTree className={'h-4 w-4'} />}
                    />
                </div>

                <DialogFooter>
                    <Button type={'button'} variant={'ghost'} size={'sm'} onClick={onClose} disabled={busy}>
                        {t('common.cancel')}
                    </Button>
                    <Button type={'submit'} size={'sm'} loading={busy} disabled={blocked}>
                        {t('common.move')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogShell>
    );
}

export default MoveDialog;
