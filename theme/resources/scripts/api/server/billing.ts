import http from '@/api/http';

export interface BillingInvoice {
    id: string;
    dueAt: Date | null;
    amount: string | null;
    url: string;
}

export interface BillingInfo {
    status: string | null;
    product: string | null;
    logo: string | null;
    interval: string | null;
    price: { amount: string | null; currency: string | null };
    renewsAt: Date | null;
    manageUrl: string;
    invoice: BillingInvoice | null;
}

export interface BillingNotices {
    warnDays: number;
    warnText: string;
    overdueText: string;
    warnBody: string;
    overdueBody: string;
    global: boolean;
    preview: '' | 'due' | 'overdue';
}

interface BootWindow extends Window {
    SiteConfiguration?: {
        dezerx?: {
            billing?: {
                enabled?: boolean;
                warnDays?: number;
                warnText?: string;
                overdueText?: string;
                warnBody?: string;
                overdueBody?: string;
                global?: boolean;
                preview?: string;
            };
        };
    };
}

const boot = () => (window as BootWindow).SiteConfiguration?.dezerx?.billing;

export function billingAvailable(): boolean {
    return boot()?.enabled === true;
}

export function billingNotices(): BillingNotices {
    const config = boot();
    const preview = config?.preview;

    return {
        warnDays: typeof config?.warnDays === 'number' ? config.warnDays : 7,
        warnText: config?.warnText ?? '',
        overdueText: config?.overdueText ?? '',
        warnBody: config?.warnBody ?? '',
        overdueBody: config?.overdueBody ?? '',
        global: config?.global === true,
        preview: preview === 'due' || preview === 'overdue' ? preview : '',
    };
}

export function billingLink(...urls: (string | null | undefined)[]): string {
    for (const url of urls) {
        const trimmed = (url ?? '').trim();

        if (trimmed !== '') {
            return trimmed;
        }
    }

    return '';
}

const date = (value: unknown): Date | null => {
    if (typeof value !== 'string' || value === '') {
        return null;
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getBillingInfo = async (uuid: string): Promise<BillingInfo | null> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/billing`);

    const attributes = data?.attributes;

    if (!attributes) {
        return null;
    }

    return {
        status: attributes.status ?? null,
        product: attributes.product ?? null,
        logo: attributes.logo ?? null,
        interval: attributes.interval ?? null,
        price: {
            amount: attributes.price?.amount ?? null,
            currency: attributes.price?.currency ?? null,
        },
        renewsAt: date(attributes.renews_at),
        manageUrl: attributes.manage_url,
        invoice: attributes.invoice
            ? {
                  id: attributes.invoice.id,
                  dueAt: date(attributes.invoice.due_at),
                  amount: attributes.invoice.amount ?? null,
                  url: attributes.invoice.url,
              }
            : null,
    };
};

const pending = new Map<string, Promise<BillingInfo | null>>();

export const readBillingInfo = (uuid: string): Promise<BillingInfo | null> => {
    const already = pending.get(uuid);

    if (already !== undefined) {
        return already;
    }

    const request = getBillingInfo(uuid).catch((error) => {
        pending.delete(uuid);

        throw error;
    });

    pending.set(uuid, request);

    return request;
};
