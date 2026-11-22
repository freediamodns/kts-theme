import { useEffect, useState } from 'react';
import { ipCountryEndpoint } from '@/dezerx/themeConfig';

const STORAGE_KEY = 'dz:ip-country';

const cache: Record<string, string | null> = readCache();
const inFlight = new Set<string>();
const listeners = new Set<() => void>();

function readCache(): Record<string, string | null> {
    try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function writeCache(): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
    }
}

function publish(): void {
    listeners.forEach((listener) => listener());
}

function lookup(ip: string): void {
    if (!ipCountryEndpoint || ip in cache || inFlight.has(ip)) {
        return;
    }

    inFlight.add(ip);

    fetch(ipCountryEndpoint.replace('{ip}', encodeURIComponent(ip)), {
        headers: { Accept: 'application/json' },
    })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
            const code = typeof data?.country === 'string' ? data.country.toUpperCase() : null;

            cache[ip] = code && /^[A-Z]{2}$/.test(code) ? code : null;
        })
        .catch(() => {
            cache[ip] = null;
        })
        .finally(() => {
            inFlight.delete(ip);
            writeCache();
            publish();
        });
}

export default function useIpCountry(ip: string | null): string | null {
    const [, force] = useState(0);

    useEffect(() => {
        if (!ip || !ipCountryEndpoint) {
            return;
        }

        const listener = () => force((n) => n + 1);

        listeners.add(listener);
        lookup(ip);

        return () => {
            listeners.delete(listener);
        };
    }, [ip]);

    return ip ? cache[ip] ?? null : null;
}
