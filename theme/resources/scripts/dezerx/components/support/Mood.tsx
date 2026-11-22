import React from 'react';
import { Mood } from '@/api/server/support';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

export const MOODS: Mood[] = ['happy', 'okay', 'sad'];

export const FACES: Record<Mood, string> = {
    happy: '😀',
    okay: '😐',
    sad: '🙁',
};

export function MoodMark({ mood, className }: { mood: Mood; className?: string }) {
    const t = useT();

    return (
        <span role={'img'} aria-label={t(`support.mood.${mood}`)} className={cn('leading-none', className)}>
            {FACES[mood] ?? FACES.okay}
        </span>
    );
}

export default MoodMark;
