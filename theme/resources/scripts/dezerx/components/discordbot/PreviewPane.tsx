import React, { useState } from 'react';
import { cn } from '@/dezerx/lib/cn';

export interface PreviewCard {
    key: string;
    title: string;
    html: string;
}

export default function PreviewPane({
    stylesheet,
    previews,
    drawing = false,
    empty,
}: {
    stylesheet: string;
    previews: PreviewCard[];
    drawing?: boolean;
    empty: string;
}) {
    const [chosen, setChosen] = useState('controlpanel');
    const current = previews.find((preview) => preview.key === chosen) ?? previews[0] ?? null;

    return (
        <div className={'space-y-6'}>
            <div className={'flex flex-wrap gap-1.5 rounded-2xl bg-card p-5 ring-1 ring-line-field'}>
                {previews.map((preview) => (
                    <button
                        key={preview.key}
                        type={'button'}
                        onClick={() => setChosen(preview.key)}
                        className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                            current?.key === preview.key
                                ? 'bg-[#5865f2] text-white'
                                : 'bg-overlay/60 text-ink-muted hover:text-ink'
                        )}
                    >
                        {preview.title}
                    </button>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{ __html: stylesheet }} />

            <div className={cn('overflow-hidden ring-1 ring-black/20 transition-opacity', drawing && 'opacity-60')}>
                {current === null ? (
                    <div className={'dzp-msg dzp-empty'}>{empty}</div>
                ) : (
                    <div dangerouslySetInnerHTML={{ __html: current.html }} />
                )}
            </div>
        </div>
    );
}
