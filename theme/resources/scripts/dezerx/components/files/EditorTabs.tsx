import React, { MouseEvent as ReactMouseEvent, useEffect, useRef } from 'react';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { FileKind } from '@/dezerx/lib/fileKind';
import { FileIcon, useFileIcons } from '@/dezerx/components/files/icons';
import { useT } from '@/i18n';

export interface EditorTab {
    path: string;
    name: string;
    kind: FileKind;
    dirty: boolean;
    ignored: boolean;
    loading: boolean;
}

export default function EditorTabs({
    tabs,
    active,
    onActivate,
    onClose,
    onCloseOthers,
}: {
    tabs: EditorTab[];
    active: string | null;
    onActivate: (path: string) => void;
    onClose: (path: string) => void;
    onCloseOthers: () => void;
}) {
    const t = useT();
    const strip = useRef<HTMLDivElement>(null);

    useFileIcons();

    useEffect(() => {
        if (active === null) {
            return;
        }

        const element = Array.from(strip.current?.children ?? []).find(
            (child) => child.getAttribute('data-tab') === active
        );

        (element as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [active, tabs.length]);

    if (tabs.length === 0) {
        return null;
    }

    const onAuxClick = (event: ReactMouseEvent, path: string) => {
        if (event.button === 1) {
            event.preventDefault();
            onClose(path);
        }
    };

    return (
        <div className={'flex items-stretch border-b border-line-field bg-raised/40'}>
            <div
                ref={strip}
                role={'tablist'}
                aria-label={t('editorTabs.openFiles')}
                className={'no-scrollbar flex min-w-0 flex-1 items-stretch overflow-x-auto'}
            >
                {tabs.map((tab) => {
                    const current = tab.path === active;

                    return (
                        <div
                            key={tab.path}
                            data-tab={tab.path}
                            className={cn(
                                'group relative flex shrink-0 items-center border-r border-line-field transition-colors',
                                current ? 'bg-card' : 'hover:bg-raised/70',
                                tab.ignored && !current && 'opacity-60'
                            )}
                        >
                            <button
                                type={'button'}
                                role={'tab'}
                                aria-selected={current}
                                title={tab.path}
                                onClick={() => onActivate(tab.path)}
                                onAuxClick={(event) => onAuxClick(event, tab.path)}
                                className={cn(
                                    'flex max-w-[14rem] items-center gap-1.5 py-2 pl-3 pr-1.5 text-xs',
                                    current ? 'font-medium text-ink' : 'text-ink-muted'
                                )}
                            >
                                {tab.loading ? (
                                    <Loader2 aria-hidden={'true'} className={'h-3.5 w-3.5 shrink-0 animate-spin'} />
                                ) : (
                                    <FileIcon name={tab.name} kind={tab.kind} className={'h-3.5 w-3.5 shrink-0'} />
                                )}
                                <span className={'truncate'}>{tab.name}</span>
                            </button>

                            <button
                                type={'button'}
                                onClick={() => onClose(tab.path)}
                                onAuxClick={(event) => onAuxClick(event, tab.path)}
                                aria-label={tab.dirty ? `Close ${tab.name}, unsaved` : `Close ${tab.name}`}
                                title={tab.dirty ? t('editorTabs.unsaved') : `Close ${tab.name}`}
                                className={cn(
                                    'mr-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors',
                                    'text-ink-faint hover:bg-overlay hover:text-ink'
                                )}
                            >
                                <span
                                    aria-hidden={'true'}
                                    className={cn(
                                        'h-1.5 w-1.5 rounded-full bg-warning',
                                        tab.dirty ? 'group-hover:hidden' : 'hidden'
                                    )}
                                />
                                <X
                                    aria-hidden={'true'}
                                    className={cn('h-3 w-3', tab.dirty && 'hidden group-hover:block')}
                                />
                            </button>

                            {current && (
                                <span aria-hidden={'true'} className={'absolute inset-x-0 -bottom-px h-px bg-accent'} />
                            )}
                        </div>
                    );
                })}
            </div>

            {tabs.length > 1 && (
                <button
                    type={'button'}
                    onClick={onCloseOthers}
                    title={t('editorTabs.closeOthers')}
                    aria-label={t('editorTabs.closeOthers')}
                    className={
                        'shrink-0 border-l border-line-field px-2.5 text-[11px] text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                    }
                >
                    {t('editorTabs.closeOthers')}
                </button>
            )}
        </div>
    );
}
