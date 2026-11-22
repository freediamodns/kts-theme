import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Columns2, Eye, PencilLine } from 'lucide-react';
import { Skeleton } from '@/dezerx/components/ui';
import { isMarkdown } from '@/dezerx/lib/markdown';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

const MonacoEditor = lazy(() => import('@/dezerx/components/files/MonacoEditor'));
const MarkdownPreview = lazy(() => import('@/dezerx/components/files/MarkdownPreview'));

type View = 'edit' | 'split' | 'preview';

interface Props {
    path: string | null;
    value: string;
    open: string[];
    height: number;
    readOnly: boolean;
    onChange: (value: string) => void;
    mode?: string;
}

export default function CodeEditor(props: Props) {
    const t = useT();
    const markdown = isMarkdown(props.path);
    const [view, setView] = useState<View>('edit');

    useEffect(() => {
        if (!markdown) {
            setView('edit');
        }
    }, [markdown, props.path]);

    const fallback = <Skeleton className={'w-full'} style={{ height: props.height }} />;

    if (!markdown) {
        return (
            <Suspense fallback={fallback}>
                <MonacoEditor {...props} />
            </Suspense>
        );
    }

    const views: { id: View; label: string; icon: React.ReactNode }[] = [
        { id: 'edit', label: t('files.viewEdit'), icon: <PencilLine className={'h-3.5 w-3.5'} /> },
        { id: 'split', label: t('files.viewSplit'), icon: <Columns2 className={'h-3.5 w-3.5'} /> },
        { id: 'preview', label: t('files.viewPreview'), icon: <Eye className={'h-3.5 w-3.5'} /> },
    ];

    const showEditor = view !== 'preview';
    const showPreview = view !== 'edit';

    return (
        <div className={'flex flex-col'} style={{ height: props.height }}>
            <div className={'mb-2 flex items-center justify-end gap-1'}>
                <div role={'tablist'} className={'flex items-center gap-1 rounded-xl bg-card p-1'}>
                    {views.map((entry) => (
                        <button
                            key={entry.id}
                            type={'button'}
                            role={'tab'}
                            aria-selected={view === entry.id}
                            title={entry.label}
                            onClick={() => setView(entry.id)}
                            className={cn(
                                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                                view === entry.id ? 'bg-overlay text-ink' : 'text-ink-muted hover:text-ink'
                            )}
                        >
                            {entry.icon}
                            <span className={'hidden sm:inline'}>{entry.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className={'flex min-h-0 flex-1 gap-3'}>
                {showEditor && (
                    <div className={cn('min-w-0', showPreview ? 'w-1/2' : 'w-full')}>
                        <Suspense fallback={fallback}>
                            <MonacoEditor {...props} height={0} />
                        </Suspense>
                    </div>
                )}

                {showPreview && (
                    <div
                        className={cn(
                            'min-w-0 rounded-xl bg-card ring-1 ring-line-field',
                            showEditor ? 'w-1/2' : 'w-full'
                        )}
                    >
                        <Suspense fallback={fallback}>
                            <MarkdownPreview value={props.value} />
                        </Suspense>
                    </div>
                )}
            </div>
        </div>
    );
}
