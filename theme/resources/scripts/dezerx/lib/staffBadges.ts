import { useEffect } from 'react';
import { StaffBadges, getStaffBadges } from '@/api/dezerx/staff';
import { useExternalStore } from '@/dezerx/lib/externalStore';
import { staffEnabled } from '@/dezerx/lib/staff';

const POLL = 30000;

const EMPTY: StaffBadges = { queue: 0, servers: {} };

let current: StaffBadges = EMPTY;
let timer: number | null = null;
let watching = 0;

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

function snapshot(): StaffBadges {
    return current;
}

function same(left: StaffBadges, right: StaffBadges): boolean {
    const keys = Object.keys(left.servers);

    return (
        left.queue === right.queue &&
        keys.length === Object.keys(right.servers).length &&
        keys.every((key) => left.servers[key] === right.servers[key])
    );
}

function publish(next: StaffBadges): void {
    if (same(current, next)) {
        return;
    }

    current = next;

    for (const listener of listeners) {
        listener();
    }
}

async function pull(): Promise<void> {
    if (document.hidden) {
        return;
    }

    try {
        const payload = await getStaffBadges();

        publish({ queue: payload.queue ?? 0, servers: payload.servers ?? {} });
    } catch {
        return;
    }
}

export function refreshStaffBadges(): void {
    if (watching > 0) {
        void pull();
    }
}

function useBadgeFeed(): StaffBadges {
    const on = staffEnabled();

    useEffect(() => {
        if (!on) {
            return;
        }

        watching += 1;

        if (watching === 1) {
            void pull();
            timer = window.setInterval(() => void pull(), POLL);
        }

        return () => {
            watching -= 1;

            if (watching === 0 && timer !== null) {
                window.clearInterval(timer);
                timer = null;
            }
        };
    }, [on]);

    return useExternalStore(subscribe, snapshot);
}

export function useStaffQueueBadge(): number {
    return useBadgeFeed().queue;
}

export function useServerSupportBadge(identifier: string | null): number {
    const badges = useBadgeFeed();

    return identifier === null ? 0 : badges.servers[identifier] ?? 0;
}
