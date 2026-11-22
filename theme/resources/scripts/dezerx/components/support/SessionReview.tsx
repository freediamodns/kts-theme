import React, { useState } from 'react';
import { Mood, SessionFeedback } from '@/api/server/support';
import { useToast } from '@/dezerx/components/ui';
import { apiMessage } from '@/dezerx/components/console/Section';
import { FACES, MOODS } from '@/dezerx/components/support/Mood';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

export function SessionReview({
    current,
    onSend,
}: {
    current: SessionFeedback | null;
    onSend: (mood: Mood, note: string) => Promise<unknown>;
}) {
    const t = useT();
    const { toast } = useToast();

    const [busy, setBusy] = useState<Mood | null>(null);

    const send = async (mood: Mood) => {
        setBusy(mood);

        try {
            await onSend(mood, '');
            toast(t('support.reviewThanks'), { tone: 'success' });
        } catch (problem) {
            toast(apiMessage(problem, t('support.actionFailed')), { tone: 'error' });
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className={'flex items-center gap-1'}>
            {MOODS.map((mood) => (
                <button
                    key={mood}
                    type={'button'}
                    disabled={busy !== null}
                    aria-label={t(`support.mood.${mood}`)}
                    aria-pressed={current?.mood === mood}
                    onClick={() => void send(mood)}
                    className={cn(
                        'rounded-xl px-1.5 py-1 text-lg leading-none transition-opacity',
                        current?.mood === mood ? 'opacity-100' : 'opacity-45 hover:opacity-100',
                        busy !== null && 'cursor-default'
                    )}
                >
                    {FACES[mood]}
                </button>
            ))}
        </div>
    );
}

export default SessionReview;
