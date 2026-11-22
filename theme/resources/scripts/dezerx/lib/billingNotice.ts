import { billingNotices } from '@/api/server/billing';
import type { TranslateFn } from '@/i18n';

export interface DueNotice {
    tone: 'warning' | 'danger';
    title: string;
    body: string;
}

export const DUE_LABEL: Record<DueNotice['tone'], string> = {
    warning: 'overview.renewNow',
    danger: 'overview.payNow',
};

export const DUE_ACTION: Record<DueNotice['tone'], string> = {
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-danger/15 text-danger ',
};


export function daysUntil(date: Date): number {
    return Math.round((date.getTime() - Date.now()) / 86400000);
}

export function dueNotice(due: Date | null, t: TranslateFn): DueNotice | null {
    const { warnDays, warnText, overdueText, warnBody, overdueBody, preview } = billingNotices();

    const days = due === null ? 0 : daysUntil(due);
    const overdue = preview === 'overdue' || (preview === '' && due !== null && days < 0);
    const soon = preview === 'due' || (preview === '' && due !== null && days >= 0 && days <= warnDays);

    if (!overdue && !soon) {
        return null;
    }

    const count = Math.abs(due === null ? 3 : days);
    const when = due === null ? new Date().toLocaleDateString() : due.toLocaleDateString();
    const fill = (text: string) => text.replace(/\{days\}/g, String(count)).replace(/\{date\}/g, when);

    const custom = overdue ? overdueText : warnText;
    const written = overdue ? overdueBody : warnBody;
    const body = written === '' ? t(overdue ? 'overview.overdueBody' : 'overview.dueSoonBody') : fill(written);

    if (custom !== '') {
        return { tone: overdue ? 'danger' : 'warning', title: fill(custom), body };
    }

    if (overdue) {
        return { tone: 'danger', title: t('overview.overdueNotice', { count, date: when }), body };
    }

    return {
        tone: 'warning',
        title: count === 0 ? t('overview.dueTodayNotice') : t('overview.dueSoonNotice', { count, date: when }),
        body,
    };
}
