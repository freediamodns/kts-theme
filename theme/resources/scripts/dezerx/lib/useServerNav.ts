import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { ServerContext } from '@/state/server';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { ServerNavGroup, ServerNavItem, isAbsolute, outOfReach, serverNavGroups } from '@/dezerx/lib/serverNav';
import { addonAppliesTo } from '@/dezerx/lib/addons';
import { staffEnabled } from '@/dezerx/lib/staff';
import { arrange, useNavArrangement } from '@/dezerx/lib/navArrangement';
import { useT } from '@/i18n';

export function allowed(permissions: string[], action: string | string[] | null): boolean {
    if (action === null) {
        return true;
    }

    if (permissions[0] === '*') {
        return true;
    }

    const wanted = Array.isArray(action) ? action : [action];

    if (wanted.length === 0) {
        return true;
    }

    return wanted.some(
        (permission) =>
            (permission.endsWith('.*') &&
                permissions.filter((held) => held.startsWith(permission.split('.')[0])).length > 0) ||
            permissions.indexOf(permission) >= 0
    );
}

export interface ServerNavData {
    groups: ServerNavGroup[];
    href: (item: ServerNavItem) => string;
}

export function useServerNav(base: string): ServerNavData {
    const t = useT();
    const theme = usePanelTheme();
    const permissions = ServerContext.useStoreState((state) => state.server.permissions);

    const egg = ServerContext.useStoreState((state) => state.server.data?.egg?.uuid);
    const node = ServerContext.useStoreState((state) => state.server.data?.nodeId ?? 0);

    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data?.rootAdmin === true);
    const demo = useStoreState((state: ApplicationStore) => state.user.data?.demo === true);

    const bypass = rootAdmin && !demo;

    const arrangement = useNavArrangement();

    const groups = useMemo(
        () =>
            serverNavGroups(theme['manager.nav'], theme['manager.groups'], t, theme['overview.enabled'])
                .map((group) => ({
                    ...group,
                    items: group.items
                        .filter(
                            (item) =>
                                allowed(permissions, item.permission) &&
                                allowed(permissions, item.require) &&
                                (item.eggs.length === 0 || (egg !== undefined && item.eggs.includes(egg))) &&
                                (item.addon === undefined || addonAppliesTo(item.addon, egg, node)) &&
                                (item.key !== '/support' || staffEnabled())
                        )
                        .map((item) => ({
                            ...item,
                            restriction: outOfReach(item, node) ? item.restriction : undefined,
                            locked: outOfReach(item, node) && !bypass,
                        })),
                }))
                .filter((group) => group.items.length > 0),
        [permissions, egg, node, bypass, theme, t]
    );

    const ordered = useMemo(
        () => (theme['manager.arrange'] ? arrange(groups, arrangement) : groups),
        [groups, arrangement, theme]
    );

    const href = useCallback(
        (item: ServerNavItem) => {
            if (isAbsolute(item.path)) {
                return item.path;
            }

            if (item.custom) {
                return item.path;
            }

            if (item.key === '/discord') {
                return '/account/discord';
            }

            return `${base.replace(/\/+$/, '')}${item.path === '/' ? '' : item.path}` || '/';
        },
        [base]
    );

    return { groups: ordered, href };
}

const FOLD_KEY = 'dezerx.nav-folded';

function readFolded(): string[] {
    try {
        const raw = window.localStorage.getItem(FOLD_KEY);

        return raw === null ? [] : (JSON.parse(raw) as string[]);
    } catch {
        return [];
    }
}

export function useFoldedGroups(): {
    folded: (key: string, collapsible: boolean, startsOpen: boolean) => boolean;
    toggle: (key: string, open: boolean) => void;
} {
    const [closed, setClosed] = useState<string[]>(readFolded);
    const [opened, setOpened] = useState<string[]>([]);

    useEffect(() => {
        try {
            window.localStorage.setItem(FOLD_KEY, JSON.stringify(closed));
        } catch {}
    }, [closed]);

    const folded = useCallback(
        (key: string, collapsible: boolean, startsOpen: boolean) => {
            if (!collapsible) {
                return false;
            }

            if (closed.includes(key)) {
                return true;
            }

            if (opened.includes(key)) {
                return false;
            }

            return !startsOpen;
        },
        [closed, opened]
    );

    const toggle = useCallback((key: string, open: boolean) => {
        setClosed((current) => (open ? current.filter((one) => one !== key) : [...current, key]));
        setOpened((current) => (open ? [...current, key] : current.filter((one) => one !== key)));
    }, []);

    return { folded, toggle };
}
