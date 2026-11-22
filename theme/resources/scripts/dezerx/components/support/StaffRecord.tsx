import React from 'react';
import { StaffRecordSummary } from '@/api/dezerx/staff';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

function Figure({ value, label }: { value: string; label: string }) {
    return (
        <div className={'rounded-2xl bg-card px-4 py-3'}>
            <p className={'font-display text-xl font-semibold tabular-nums text-ink'}>{value}</p>
            <p className={'mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>{label}</p>
        </div>
    );
}

export function StaffRecordPanel({ record, className }: { record: StaffRecordSummary; className?: string }) {
    const t = useT();

    const hours = Math.floor(record.minutes / 60);
    const time =
        hours > 0 ? t('support.recordHours', { hours }) : t('support.recordMinutes', { minutes: record.minutes });

    return (
        <div className={cn('grid gap-2 sm:grid-cols-3 lg:grid-cols-6', className)}>
            <Figure value={String(record.taken)} label={t('support.recordTaken')} />
            <Figure value={String(record.servers)} label={t('support.recordServers')} />
            <Figure value={String(record.resolved)} label={t('support.recordResolved')} />
            <Figure value={String(record.handedBack)} label={t('support.recordHandedBack')} />
            <Figure value={String(record.declined)} label={t('support.recordDeclined')} />
            <Figure value={time} label={t('support.recordTime')} />
        </div>
    );
}

export default StaffRecordPanel;
