import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PaginationDataSet } from '@/api/http';
import { Button } from '@/dezerx/components/ui/Button';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

function windowed(current: number, total: number): number[] {
    const shown = new Set<number>([1, total]);

    for (let entry = current - 1; entry <= current + 1; entry++) {
        if (entry >= 1 && entry <= total) {
            shown.add(entry);
        }
    }

    return [...shown].sort((first, second) => first - second);
}

export function Pager({ pagination, onPage }: { pagination: PaginationDataSet; onPage: (page: number) => void }) {
    const t = useT();

    if (pagination.totalPages <= 1) {
        return null;
    }

    const pages = windowed(pagination.currentPage, pagination.totalPages);

    return (
        <nav aria-label={t('common.pages')} className={'flex flex-wrap items-center justify-center gap-1 pt-4'}>
            <Button
                size={'sm'}
                variant={'ghost'}
                aria-label={t('common.previousPage')}
                disabled={pagination.currentPage <= 1}
                onClick={() => onPage(pagination.currentPage - 1)}
                icon={<ChevronLeft className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
            />

            {pages.map((entry, index) => (
                <span key={entry} className={'flex items-center'}>
                    {index > 0 && entry - (pages[index - 1] ?? 0) > 1 && (
                        <span aria-hidden={'true'} className={'px-1 text-xs text-ink-faint'}>
                            …
                        </span>
                    )}
                    <button
                        type={'button'}
                        onClick={() => onPage(entry)}
                        aria-current={entry === pagination.currentPage ? 'page' : undefined}
                        className={cn(
                            'min-w-8 rounded-lg px-2 py-1.5 text-xs transition-colors',
                            entry === pagination.currentPage
                                ? 'bg-accent/15 font-semibold text-ink'
                                : 'text-ink-muted hover:bg-raised hover:text-ink'
                        )}
                    >
                        {entry}
                    </button>
                </span>
            ))}

            <Button
                size={'sm'}
                variant={'ghost'}
                aria-label={t('common.nextPage')}
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => onPage(pagination.currentPage + 1)}
                icon={<ChevronRight className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
            />
        </nav>
    );
}
