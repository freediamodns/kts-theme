import type { Schedule } from '@/api/server/schedules/getServerSchedules';
import { currentLocale, t } from '@/i18n';

export type CronFields = Schedule['cron'];

function names(kind: 'weekday' | 'month'): string[] {
    const locale = currentLocale();

    if (kind === 'weekday') {
        const format = new Intl.DateTimeFormat(locale, { weekday: 'long' });

        return Array.from({ length: 7 }, (_, day) => format.format(new Date(Date.UTC(2023, 0, 1 + day))));
    }

    const format = new Intl.DateTimeFormat(locale, { month: 'long' });

    return Array.from({ length: 12 }, (_, month) => format.format(new Date(Date.UTC(2023, month, 1))));
}

export function cronExpression(cron: CronFields): string {
    return [cron.minute, cron.hour, cron.dayOfMonth, cron.month, cron.dayOfWeek].join(' ');
}

const isEvery = (field: string) => field.trim() === '*';

function stepOf(field: string): number | null {
    const match = /^\*\/(\d+)$/.exec(field.trim());

    return match ? Number(match[1]) : null;
}

function listOf(field: string): number[] | null {
    const parts = field.trim().split(',');
    const values: number[] = [];

    for (const part of parts) {
        if (!/^\d+$/.test(part.trim())) {
            return null;
        }

        values.push(Number(part.trim()));
    }

    return values.length > 0 ? values : null;
}

function joinWords(words: string[]): string {
    if (words.length <= 1) {
        return words[0] ?? '';
    }

    return t('cron.and', { list: words.slice(0, -1).join(', '), last: words[words.length - 1] });
}

const pad = (value: number) => String(value).padStart(2, '0');

function describeTime(minute: string, hour: string): string | null {
    const minuteStep = stepOf(minute);
    const hourStep = stepOf(hour);
    const minutes = listOf(minute);
    const hours = listOf(hour);

    if (isEvery(minute) && isEvery(hour)) {
        return t('cron.everyMinute');
    }

    if (minuteStep !== null && isEvery(hour)) {
        return t('cron.everyMinutes', { count: minuteStep });
    }

    if (minutes !== null && isEvery(hour)) {
        return t('cron.minuteOfHour', {
            list: joinWords(minutes.map((value) => t('cron.minuteValue', { value }))),
        });
    }

    if (minutes !== null && minutes.length === 1 && hourStep !== null) {
        return t('cron.everyHours', { count: hourStep, minute: pad(minutes[0]!) });
    }

    if (minutes !== null && minutes.length === 1 && hours !== null) {
        return t('cron.atTimes', {
            list: joinWords(hours.map((value) => `${pad(value)}:${pad(minutes[0]!)}`)),
        });
    }

    return null;
}

function describeDate(dayOfMonth: string, month: string, dayOfWeek: string): string | null {
    const parts: string[] = [];

    const days = listOf(dayOfMonth);
    const months = listOf(month);
    const weekdays = listOf(dayOfWeek);

    if (!isEvery(dayOfMonth)) {
        if (days === null) {
            return null;
        }

        parts.push(t('cron.onDays', { list: joinWords(days.map(ordinal)) }));
    }

    if (!isEvery(month)) {
        if (months === null) {
            return null;
        }

        const labels = names('month');

        parts.push(
            t('cron.inMonths', {
                list: joinWords(months.map((value) => labels[(value - 1) % 12] ?? String(value))),
            })
        );
    }

    if (!isEvery(dayOfWeek)) {
        if (weekdays === null) {
            return null;
        }

        const labels = names('weekday');

        parts.push(
            t('cron.onWeekdays', {
                list: joinWords(weekdays.map((value) => labels[value % 7] ?? String(value))),
            })
        );
    }

    return parts.join(', ');
}

function ordinal(value: number): string {
    return t('cron.ordinal', { count: value, ordinal: true });
}

export function describeCron(cron: CronFields): string {
    const expression = cronExpression(cron);

    const time = describeTime(cron.minute, cron.hour);

    if (time === null) {
        return expression;
    }

    const date = describeDate(cron.dayOfMonth, cron.month, cron.dayOfWeek);

    if (date === null) {
        return expression;
    }

    return date === '' ? time : t('cron.timeAndDate', { time, date });
}
