interface BootWindow extends Window {
    SiteConfiguration?: { dezerx?: { serverCreate?: { enabled?: boolean; renewals?: boolean } } };
}

function config(): { enabled: boolean; renewals: boolean } {
    const saved = (window as BootWindow).SiteConfiguration?.dezerx?.serverCreate ?? {};

    return {
        enabled: saved.enabled === true,
        renewals: saved.renewals === true,
    };
}

export function serverCreateAvailable(): boolean {
    return config().enabled;
}

export function serverCreateRenewals(): boolean {
    return config().renewals;
}

export const CREATE_PATH = '/create-server';

export function countdown(iso: string | null): string | null {
    const minutes = minutesUntil(iso);

    if (minutes === null || minutes <= 0) {
        return null;
    }

    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const rest = minutes % 60;

    if (days > 0) {
        return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }

    if (hours > 0) {
        return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
    }

    return `${minutes}m`;
}

export function minutesUntil(iso: string | null): number | null {
    if (iso === null) {
        return null;
    }

    const at = Date.parse(iso);

    return Number.isNaN(at) ? null : Math.round((at - Date.now()) / 60000);
}
