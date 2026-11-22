import { ComponentType, MouseEvent as ReactMouseEvent } from 'react';
import routes from '@/routers/routes';
import { SIDEBAR_LINK_ICONS } from '@/dezerx/lib/linkIcons';
import {
    DEFAULT_MANAGER_GROUPS,
    DEFAULT_MANAGER_NAV,
    ServerTab,
    ServerTabGroup,
    TabRestriction,
    ThemeConfig,
    managerNavLabel,
    navGroupLabel,
} from '@/dezerx/lib/panelTheme';
import { t as translate, type TranslateFn } from '@/i18n';

export const LOOSE_GROUP = '';

export interface ServerNavItem {
    key: string;

    path: string;

    aliases: string[];
    label: string;
    icon: ComponentType<{ className?: string }>;
    exact: boolean;

    permission: string | string[] | null;

    require: string[];

    eggs: string[];
    addon?: string;
    nodes: number[];
    restriction?: TabRestriction;

    locked?: boolean;
    component?: ComponentType;
    custom: boolean;

    external: boolean;
}

export interface ServerNavGroup {
    key: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    collapsible: boolean;
    open: boolean;
    items: ServerNavItem[];
}

export interface NavContextTarget {
    label: string;
    href: string;
    item?: ServerNavItem;
}

export type NavContextHandler = (event: ReactMouseEvent, target: NavContextTarget) => void;

function routeIndex() {
    const index = new Map<string, typeof routes.server[number]>();

    for (const route of routes.server) {
        if (route.name) {
            index.set(route.path, route);
        }
    }

    return index;
}

function icon(name: string): ComponentType<{ className?: string }> {
    return SIDEBAR_LINK_ICONS[name] ?? SIDEBAR_LINK_ICONS.link;
}

export function tabRoute(value: string, fallback: string): string {
    const trimmed = (value ?? '').trim();

    if (trimmed === '') {
        return fallback;
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    const cleaned = `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}`;

    return cleaned === '/' ? '/' : cleaned;
}

export function isAbsolute(address: string): boolean {
    return /^https?:\/\//i.test(address);
}

function groupOrder(configured: ServerTabGroup[], tabs: ServerTab[]): ServerTabGroup[] {
    const out = [...configured];
    const seen = new Set(out.map((group) => group.key));

    for (const tab of tabs) {
        if (tab.group !== LOOSE_GROUP && !seen.has(tab.group)) {
            seen.add(tab.group);
            out.push({ key: tab.group, label: '', icon: 'link', enabled: true, open: true, collapsible: true });
        }
    }

    return out;
}

export const OVERVIEW_PATH = '/overview';

function tabRestriction(tab: ServerTab): TabRestriction | undefined {
    return (tab.nodes ?? []).length === 0
        ? undefined
        : { badge: tab.badge ?? '', tone: tab.badgeColor ?? 'muted', note: tab.note ?? '' };
}

export function outOfReach(item: { nodes?: number[] }, node: number): boolean {
    return (item.nodes ?? []).includes(node);
}

export function serverHome(id: string, overview: boolean): string {
    return overview ? `/server/${id}${OVERVIEW_PATH}` : `/server/${id}`;
}

export function serverNavGroups(
    nav: ServerTab[] = DEFAULT_MANAGER_NAV,
    configuredGroups: ServerTabGroup[] = DEFAULT_MANAGER_GROUPS,
    t: TranslateFn = translate,
    overview = true
): ServerNavGroup[] {
    const known = routeIndex();
    const buckets = new Map<string, ServerNavItem[]>();

    for (const tab of nav) {
        if (!tab.enabled || (!overview && tab.key === OVERVIEW_PATH)) {
            continue;
        }

/* 728068 */

        const bucket = buckets.get(tab.group) ?? [];

        if (tab.custom) {
            const address = tabRoute(tab.route, '');

            if (address === '') {
                continue;
            }

            bucket.push({
                key: tab.key,
                path: address,
                aliases: [],
                restriction: tabRestriction(tab),
                label: tab.label || tab.key,
                icon: icon(tab.icon),
                exact: false,
                permission: null,
                require: tab.permission,
                eggs: tab.eggs,
                nodes: tab.nodes ?? [],
                custom: true,
                external: tab.external || isAbsolute(address),
            });

            buckets.set(tab.group, bucket);

            continue;
        }

        const route = known.get(tab.key);

        if (!route) {
            continue;
        }

        const address = tabRoute(tab.route, route.path);

        bucket.push({
            key: tab.key,
            path: isAbsolute(address) ? route.path : address,
            aliases: address === route.path ? [] : [route.path],
            restriction: tabRestriction(tab),
            label: managerNavLabel(t, tab.key, tab.label, route.name),
            icon: icon(tab.icon),
            exact: route.exact === true,
            permission: route.permission,
            require: tab.permission,
            eggs: tab.eggs,
            nodes: tab.nodes ?? [],
            addon: route.addon,
            component: route.component,
            custom: false,
            external: false,
        });

        buckets.set(tab.group, bucket);
    }

    const ordered: ServerNavGroup[] = [];

    const loose = buckets.get(LOOSE_GROUP) ?? [];

    if (loose.length > 0) {
        ordered.push({
            key: LOOSE_GROUP,
            label: '',
            icon: icon('link'),
            collapsible: false,
            open: true,
            items: loose,
        });
    }

    for (const group of groupOrder(configuredGroups, nav)) {
        if (!group.enabled) {
            continue;
        }

        const items = buckets.get(group.key) ?? [];

        if (items.length === 0) {
            continue;
        }

        ordered.push({
            key: group.key,
            label: navGroupLabel(t, group.key, group.label),
            icon: icon(group.icon),
            collapsible: group.collapsible,
            open: group.open,
            items,
        });
    }

    return ordered;
}

export function routeMounts(theme: ThemeConfig): Map<string, string[]> {
    const overrides = new Map<string, string>();

    for (const tab of theme['manager.nav']) {
        if (tab.custom) {
            continue;
        }

        const address = tabRoute(tab.route, tab.key);

        if (address !== tab.key && !isAbsolute(address) && address !== '') {
            overrides.set(tab.key, address);
        }
    }

    const mounts = new Map<string, string[]>();

    for (const route of routes.server) {
        const direct = overrides.get(route.path);

        if (direct !== undefined) {
            mounts.set(route.path, [route.path, direct]);

            continue;
        }

        let parent: string | null = null;

        for (const [from] of overrides) {
            if (from !== '/' && route.path.startsWith(`${from}/`) && (parent === null || from.length > parent.length)) {
                parent = from;
            }
        }

        mounts.set(
            route.path,
            parent === null ? [route.path] : [route.path, `${overrides.get(parent)!}${route.path.slice(parent.length)}`]
        );
    }

    return mounts;
}
