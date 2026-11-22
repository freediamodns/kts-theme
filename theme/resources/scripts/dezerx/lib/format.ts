import { currentLocale, t } from '@/i18n';

const UNLIMITED = '∞';

export function formatUsage(megabytes: number): string {
    if (!Number.isFinite(megabytes) || megabytes <= 0) {
        return '0 MB';
    }

    return megabytes >= 1024
        ? `${(megabytes / 1024).toFixed(megabytes % 1024 === 0 ? 0 : 1)} GB`
        : `${Math.round(megabytes)} MB`;
}

export function formatSize(megabytes: number): string {
    if (megabytes <= 0) {
        return UNLIMITED;
    }

    return formatUsage(megabytes);
}

export function formatPercent(percent: number): string {
    if (!Number.isFinite(percent)) {
        return '-';
    }

    return `${Math.max(0, Math.round(percent))}%`;
}

export function formatCores(percent: number): string {
    if (!Number.isFinite(percent)) {
        return '-';
    }

    if (percent <= 0) {
        return UNLIMITED;
    }

    const cores = percent / 100;

    return t('format.cores', {
        count: cores,
        cores: Number.isInteger(cores) ? cores : cores.toFixed(1),
    });
}

export function bytesToMb(bytes: number): number {
    return bytes / 1024 / 1024;
}

export function formatRelative(date: Date | string, locale = currentLocale()): string {
    const then = (date instanceof Date ? date : new Date(date)).getTime();
    const seconds = Math.round((then - Date.now()) / 1000);

    const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ['year', 31_536_000],
        ['month', 2_592_000],
        ['day', 86_400],
        ['hour', 3_600],
        ['minute', 60],
    ];

    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) {
            return formatter.format(Math.round(seconds / size), unit);
        }
    }

    return formatter.format(seconds, 'second');
}

export { UNLIMITED };

export function formatUptime(milliseconds: number): string {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
        return '-';
    }

    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
        return `${days}${t('format.days')} ${hours}${t('format.hours')}`;
    }

    if (hours > 0) {
        return `${hours}${t('format.hours')} ${minutes}${t('format.minutes')}`;
    }

    if (minutes > 0) {
        return `${minutes}${t('format.minutes')} ${seconds % 60}${t('format.seconds')}`;
    }

    return `${seconds}${t('format.seconds')}`;
}

export function formatRate(bytesPerSecond: number): string {
    if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
        return '0 B/s';
    }

    if (bytesPerSecond >= 1048576) {
        return `${(bytesPerSecond / 1048576).toFixed(1)} MB/s`;
    }

    if (bytesPerSecond >= 1024) {
        return `${Math.round(bytesPerSecond / 1024)} KB/s`;
    }

    return `${Math.round(bytesPerSecond)} B/s`;
}
