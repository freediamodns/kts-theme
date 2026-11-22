import { useCallback, useMemo } from 'react';
import { useExternalStore } from '@/dezerx/lib/externalStore';
import type { ServerNavGroup } from '@/dezerx/lib/serverNav';

export const PINNED_GROUP = '';

export interface NavArrangement {
    order: string[];
    groups: Record<string, string>;
}

const STORAGE_KEY = 'dezerx.nav-arrangement';

const EMPTY: NavArrangement = { order: [], groups: {} };

let current: NavArrangement = read();

const listeners = new Set<() => void>();

function read(): NavArrangement {
    if (typeof window === 'undefined') {
        return EMPTY;
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);

        if (raw === null) {
            return EMPTY;
        }

        const parsed = JSON.parse(raw) as Partial<NavArrangement>;

        return {
            order: Array.isArray(parsed.order) ? parsed.order.filter((key) => typeof key === 'string') : [],
            groups:
                parsed.groups !== null && typeof parsed.groups === 'object'
                    ? Object.fromEntries(
                          Object.entries(parsed.groups as Record<string, unknown>).filter(
                              ([, value]) => typeof value === 'string'
                          ) as [string, string][]
                      )
                    : {},
        };
    } catch {
        return EMPTY;
    }
}

function publish(next: NavArrangement): void {
    current = next;

    try {
        if (next.order.length === 0 && Object.keys(next.groups).length === 0) {
            window.localStorage.removeItem(STORAGE_KEY);
        } else {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
    } catch {
    }

    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

function snapshot(): NavArrangement {
    return current;
}

export function useNavArrangement(): NavArrangement {
    return useExternalStore(subscribe, snapshot);
}

export function isArranged(arrangement: NavArrangement): boolean {
    return arrangement.order.length > 0 || Object.keys(arrangement.groups).length > 0;
}

export function resetArrangement(): void {
    publish(EMPTY);
}

export function arrange(groups: ServerNavGroup[], arrangement: NavArrangement): ServerNavGroup[] {
    if (!isArranged(arrangement)) {
        return groups;
    }

    const known = new Set(groups.map((group) => group.key));
    const rank = new Map(arrangement.order.map((key, at) => [key, at]));

    const buckets = new Map<string, ServerNavGroup['items']>();
    const declared: string[] = [];

    for (const group of groups) {
        buckets.set(group.key, []);
        declared.push(group.key);
    }

    if (!buckets.has(PINNED_GROUP)) {
        buckets.set(PINNED_GROUP, []);
    }

    let index = 0;

    for (const group of groups) {
        for (const item of group.items) {
            const wanted = arrangement.groups[item.key];
            const target = wanted !== undefined && (wanted === PINNED_GROUP || known.has(wanted)) ? wanted : group.key;

            buckets.get(target)?.push(item);

            if (!rank.has(item.key)) {
                rank.set(item.key, arrangement.order.length + index);
            }

            index += 1;
        }
    }

    const sorted = (items: ServerNavGroup['items']) =>
        [...items].sort((a, b) => (rank.get(a.key) ?? 0) - (rank.get(b.key) ?? 0));

    const out: ServerNavGroup[] = [];
    const pinned = sorted(buckets.get(PINNED_GROUP) ?? []);

    if (pinned.length > 0) {
        const existing = groups.find((group) => group.key === PINNED_GROUP);

        out.push(
            existing
                ? { ...existing, items: pinned }
                : {
                      key: PINNED_GROUP,
                      label: '',
                      icon: groups[0]?.icon ?? (() => null),
                      collapsible: false,
                      open: true,
                      items: pinned,
                  }
        );
    }

    for (const key of declared) {
        if (key === PINNED_GROUP) {
            continue;
        }

        const items = sorted(buckets.get(key) ?? []);

        if (items.length === 0) {
            continue;
        }

        const group = groups.find((entry) => entry.key === key);

        if (group) {
            out.push({ ...group, items });
        }
    }

    return out;
}

export interface NavMove {
    key: string;
    group: string;
    before: string | null;
}

export function useArrangeNav(groups: ServerNavGroup[]): {
    arrangement: NavArrangement;
    arranged: boolean;
    move: (change: NavMove) => void;
    reset: () => void;
} {
    const arrangement = useNavArrangement();

    const flat = useMemo(
        () => groups.flatMap((group) => group.items.map((item) => ({ key: item.key, group: group.key }))),
        [groups]
    );

    const move = useCallback(
        ({ key, group, before }: NavMove) => {
            const without = flat.filter((entry) => entry.key !== key);
            const at = before === null ? without.length : without.findIndex((entry) => entry.key === before);
            const index = at < 0 ? without.length : at;

            const next = [...without.slice(0, index), { key, group }, ...without.slice(index)];
            const here = new Set(next.map((entry) => entry.key));

            publish({
                order: [
                    ...next.map((entry) => entry.key),
                    ...arrangement.order.filter((entry) => !here.has(entry)),
                ],
                groups: {
                    ...arrangement.groups,
                    ...Object.fromEntries(next.map((entry) => [entry.key, entry.group])),
                },
            });
        },
        [flat, arrangement]
    );

    return { arrangement, arranged: isArranged(arrangement), move, reset: resetArrangement };
}
