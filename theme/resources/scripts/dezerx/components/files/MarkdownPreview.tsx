import React, { useMemo } from 'react';
import { renderMarkdown } from '@/dezerx/lib/markdown';
import { cn } from '@/dezerx/lib/cn';
import style from './markdown.module.css';

export default function MarkdownPreview({ value, className }: { value: string; className?: string }) {
    const html = useMemo(() => renderMarkdown(value), [value]);

    return (
        <div
            className={cn(style.prose, 'h-full overflow-auto px-4 py-3', className)}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
