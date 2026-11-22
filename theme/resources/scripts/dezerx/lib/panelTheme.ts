import { promoteStyles } from '@/dezerx/lib/appearance';
import { useExternalStore } from '@/dezerx/lib/externalStore';
import type { TranslateFn } from '@/i18n';

export type SidebarDesign = 'classic' | 'floating' | 'compact' | 'rail' | 'bordered';

export type ActiveDesign = 'bar' | 'pill' | 'glow' | 'underline' | 'solid' | 'dot' | 'gradient';

export type AvatarProvider = 'initial' | 'generated' | 'gravatar' | 'identicon' | 'retro' | 'robohash' | 'dicebear';

export type RowDesign = 'banner' | 'tile';

export type RowAnimation = 'none' | 'fade' | 'rise' | 'slide' | 'zoom';

export type ManagerMode = 'sidebar' | 'merged' | 'navbar';

export type ManagerShell = 'rounded' | 'flat';

export type MetricsPosition = 'right' | 'left' | 'above' | 'below';

export type AddonCardStyle = 'rows' | 'tiles';

export type GraphMode = 'behind' | 'under' | 'none';

export type ChartsPosition = 'off' | 'below' | 'above';

export type ChartStyle = 'line' | 'bar';

export type OverviewBlockKind = 'banner' | 'metrics' | 'info' | 'billing' | 'chart' | 'doughnut';

export type OverviewWidth = 'full' | 'half' | 'third';

export type OverviewMetric = 'cpu' | 'memory' | 'network' | 'disk';

export interface OverviewBlock {
    id: string;
    kind: OverviewBlockKind;
    enabled: boolean;
    width: OverviewWidth;
    metric: OverviewMetric;
    style: ChartStyle;
    hidden: string[];
}

export const OVERVIEW_PARTS: Partial<Record<OverviewBlockKind, string[]>> = {
    banner: ['art', 'logo', 'description', 'node', 'address', 'power'],
    metrics: ['cpu', 'memory', 'disk', 'network', 'graphs'],
    info: ['status', 'uptime', 'hostname', 'node', 'serverId'],
    billing: ['notices', 'status', 'plan', 'price', 'dueDate', 'manage'],
};

export const OVERVIEW_FIXED_BLOCKS: OverviewBlockKind[] = ['banner', 'metrics', 'info', 'billing'];

export const OVERVIEW_METRICS: Record<'chart' | 'doughnut', OverviewMetric[]> = {
    chart: ['cpu', 'memory', 'network'],
    doughnut: ['disk', 'memory', 'cpu'],
};

const overviewBlock = (kind: OverviewBlockKind, width: OverviewWidth): OverviewBlock => ({
    id: kind,
    kind,
    enabled: true,
    width,
    metric: 'cpu',
    style: 'line',
    hidden: [],
});

export type ButtonAnimation = 'none' | 'press' | 'lift' | 'glint' | 'pulse' | 'grow' | 'slide';

export type PageTransition = 'none' | 'fade' | 'rise' | 'slide' | 'scale' | 'blur';

export type Corner = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left';

export type AiPosition = 'bottom-right' | 'bottom-left' | 'off';

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

export type IconSet = 'lucide' | 'tabler' | 'phosphor' | 'remix' | 'hugeicons';

export type IconFamily = 'line' | 'sharp' | 'duotone' | 'duotone-sharp';

export type AuthLayoutStyle =
    | 'split'
    | 'split-reverse'
    | 'centered'
    | 'card'
    | 'hero'
    | 'stacked'
    | 'frame'
    | 'minimal';

export type AuthBackdrop =
    | 'games'
    | 'image'
    | 'gradient'
    | 'aurora'
    | 'beams'
    | 'mesh'
    | 'grid'
    | 'wallpaper'
    | 'solid';

export type AuthCard = 'plain' | 'card' | 'glass' | 'outline' | 'raised';

export type AuthMask = 'diagonal' | 'fade' | 'vignette' | 'none';

export type AuthFocus = 'center' | 'top' | 'bottom' | 'left' | 'right';

export type AuthGlow = 'none' | 'top' | 'behind' | 'corner';

export type AuthArt = 'beside' | 'behind' | 'above' | 'none';

export interface ThemeImage {
    url: string;
    label: string;
    enabled: boolean;
}

export type QuickLinkArt = 'none' | 'globe' | 'outline' | 'discord' | 'fire';

export const QUICK_LINK_ART: Record<QuickLinkArt, string> = {
    none: 'Nothing',
    globe: 'Spinning globe',
    outline: 'Dotted icon',
    discord: 'Discord mark',
    fire: 'Fire',
};

export interface QuickLinkCard {
    label: string;
    blurb: string;
    url: string;
    icon: string;
    feature: boolean;
    art: QuickLinkArt;
    enabled: boolean;
}

export interface SidebarLink {
    label: string;
    url: string;
    icon: string;
    enabled: boolean;
}

export interface SidebarNavItem {
    key: string;
    route: string;
    icon: string;
    label: string;
    enabled: boolean;
    group?: string;
}

export type BadgeTone = 'muted' | 'accent' | 'warning' | 'danger' | 'success';

export const BADGE_TONES: BadgeTone[] = ['muted', 'accent', 'warning', 'danger', 'success'];

export interface TabRestriction {
    badge: string;
    tone: BadgeTone;
    note: string;
}

export interface ServerTab {
    key: string;
    route: string;
    icon: string;
    label: string;
    enabled: boolean;

    nodes?: number[];

    badge?: string;

    badgeColor?: BadgeTone;

    note?: string;

    group: string;

    custom: boolean;

    external: boolean;

    permission: string[];

    eggs: string[];
}

export interface ServerTabGroup {
    key: string;
    label: string;
    icon: string;
    enabled: boolean;

    open: boolean;

    collapsible: boolean;
}

export interface EggArt {
    egg: string;
    image: string;
    imageLight: string;
    logo: string;
}

export type NoticeDesign = 'soft' | 'edge' | 'outline' | 'plain';

export type PowerActionStyle = 'default' | 'accent' | 'solid' | 'soft' | 'outline';

export type ModalDesign = 'stark' | 'classic' | 'accent' | 'glass';

export interface ThemeNotice {
    id: string;
    title: string;
    body: string;
    tone: NoticeTone;
    enabled: boolean;
    dismissible: boolean;
    link?: string;
    linkLabel?: string;
    linkButton?: boolean;
    icon?: string;
    iconImage?: string;
    nodes?: string[];
}

export interface ConsoleRule {
    find: string;
    replace: string;
    regex: boolean;
    art?: boolean;
    enabled: boolean;
}

export interface CssRule {
    selector: string;
    css: string;
    label: string;
    important: boolean;
    enabled: boolean;
}

export interface ThemeConfig {
    'surface.radius': number;
    'surface.border': 'none' | 'subtle' | 'strong' | 'accent';
    'surface.fieldBorder': boolean;
    'surface.opacity': number;
    'surface.baseOpacity': number;
    'surface.blur': number;
    'surface.shadow': 'none' | 'default' | 'soft' | 'deep';
    'modal.design': ModalDesign;
    'modal.fused': boolean;
    'background.image': string;
    'background.dim': number;
    'background.blur': number;
    'page.width': 'contained' | 'wide' | 'full';
    'page.sidebarSolid': boolean;
    'sidebar.design': SidebarDesign;
    'sidebar.active': ActiveDesign;
    'sidebar.user': boolean;
    'sidebar.avatar': AvatarProvider;
    'sidebar.nav': SidebarNavItem[];
    'overview.enabled': boolean;
    'overview.blocks': OverviewBlock[];
    'manager.nav': ServerTab[];
    'manager.groups': ServerTabGroup[];
    'sidebar.links': SidebarLink[];
    'nav.search': boolean;
    'nav.searchStyle': 'inline' | 'pill' | 'wide';
    'nav.colorMode': 'switch' | 'dark' | 'light';
    'manager.rows': RowDesign;
    'manager.mode': ManagerMode;
    'activity.blurIps': boolean;
    'manager.shell': ManagerShell;
    'manager.logo': boolean;
    'manager.controls': boolean;
    'manager.controlsPlace': 'top' | 'bottom';
    'manager.address': boolean;
    'manager.addressBlur': boolean;
    'manager.actions': PowerActionStyle;
    'manager.actionsJoined': boolean;
    'manager.actionsIcons': boolean;
    'manager.design': SidebarDesign;
    'manager.active': ActiveDesign;
    'manager.header': boolean;
    'manager.arrange': boolean;
    'addons.cards': AddonCardStyle;
    'console.metrics': MetricsPosition;
    'console.charts': ChartsPosition;
    'console.chartStyle': ChartStyle;
    'console.graph': GraphMode;
    'console.address': boolean;
    'console.offline': boolean;
    'console.prompt': string;
    'console.daemon': string;
    'console.rules': ConsoleRule[];
    'css.rules': CssRule[];
    'footer.pterodactyl': boolean;
    'footer.powered': boolean;
    'footer.note': string;
    'servers.animation': RowAnimation;
    'servers.artwork': boolean;
    'servers.defaultArt': string;
    'servers.defaultArtLight': string;
    'servers.eggArt': EggArt[];
    'servers.quickLinks': boolean;
    'servers.quickLinkCards': QuickLinkCard[];
    'servers.activity': boolean;
    'icons.set': IconSet;
    'icons.family': IconFamily;
    'icons.weight': number;
    'icons.tint': number;
    'auth.layout': AuthLayoutStyle;
    'auth.card': AuthCard;
    'auth.align': 'left' | 'center';
    'auth.width': number;
    'auth.backdrop': AuthBackdrop;
    'auth.image': string;
    'auth.imageLight': string;
    'auth.focus': AuthFocus;
    'auth.dim': number;
    'auth.blur': number;
    'auth.mask': AuthMask;
    'auth.grid': boolean;
    'auth.noise': boolean;
    'auth.glow': AuthGlow;
    'auth.wallArt': ThemeImage[];
    'auth.wallColumns': number;
    'auth.wallSpeed': number;
    'auth.wallTilt': boolean;
    'auth.logo': boolean;
    'auth.pitch': boolean;
    'auth.heading': string;
    'auth.body': string;
    'auth.footer': string;
    'auth.footerUrl': string;
    'auth.controls': boolean;
    'auth.controlsPlace': Corner;
    'auth.register': boolean;
    'auth.registerNames': boolean;
    'auth.registerDomains': string;
    'auth.registerTerms': string;
    'auth.registerNote': string;
    'seo.title': string;
    'seo.description': string;
    'seo.favicon': string;
    'seo.keywords': string;
    'seo.robots': 'noindex' | 'index';
    'seo.og': 'auto' | 'custom' | 'off';
    'seo.ogImage': string;
    'seo.twitter': string;
    'button.animation': ButtonAnimation;
    'page.transition': PageTransition;
    'toast.glass': boolean;
    'toast.position': Corner;
    'ai.position': AiPosition;
    'presets.button': boolean;
    'notice.dashboard': ThemeNotice[];
    'notice.design': NoticeDesign;
    'notice.manager': ThemeNotice[];
    'locale.enabled': string[];
    'locale.default': string;
    'locale.picker': boolean;
    'locale.account': boolean;
}

export const DEFAULT_NAV: SidebarNavItem[] = [
    { key: 'dashboard', route: '/', icon: 'grid', label: '', enabled: true },
    { key: 'account', route: '/account', icon: 'user', label: '', enabled: true },
    { key: 'api', route: '/account/api', icon: 'key', label: '', enabled: true },
    { key: 'ssh', route: '/account/ssh', icon: 'terminal', label: '', enabled: true },
    { key: 'activity', route: '/account/activity', icon: 'activity', label: '', enabled: true },
];

export const DEFAULT_MANAGER_NAV: ServerTab[] = [
    {
        key: '/overview',
        route: '/overview',
        group: 'Essentials',
        icon: 'grid',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/',
        route: '/',
        group: 'Essentials',
        icon: 'terminal',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/files',
        route: '/files',
        group: 'Essentials',
        icon: 'files',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/startup',
        route: '/startup',
        group: 'Essentials',
        icon: 'rocket',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/settings',
        route: '/settings',
        group: 'Essentials',
        icon: 'settings',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },

    {
        key: '/players',
        route: '/players',
        group: 'MC Utils',
        icon: 'player',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/plugins',
        route: '/plugins',
        group: 'MC Utils',
        icon: 'plug',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/mods',
        route: '/mods',
        group: 'MC Utils',
        icon: 'blocks',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/modpacks',
        route: '/modpacks',
        group: 'MC Utils',
        icon: 'boxes',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/version',
        route: '/version',
        group: 'MC Utils',
        icon: 'tag',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/properties',
        route: '/properties',
        group: 'MC Utils',
        icon: 'sliders',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/worlds',
        route: '/worlds',
        group: 'MC Utils',
        icon: 'world',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/world-viewer',
        route: '/world-viewer',
        group: 'MC Utils',
        icon: 'map',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },

    {
        key: '/hytale-mods',
        route: '/hytale-mods',
        group: 'Hytale',
        icon: 'blocks',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },

    {
        key: '/palworld-mods',
        route: '/palworld-mods',
        group: 'Palworld',
        icon: 'paw',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },

    {
        key: '/rust-players',
        route: '/rust-players',
        group: 'Rust',
        icon: 'rust',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/rust-plugins',
        route: '/rust-plugins',
        group: 'Rust',
        icon: 'plug',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/rust-wipes',
        route: '/rust-wipes',
        group: 'Rust',
        icon: 'clock',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },

    {
        key: '/dayz-mods',
        route: '/dayz-mods',
        group: 'DayZ',
        icon: 'gamepad',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },

    {
        key: '/fivem',
        route: '/fivem',
        group: 'FiveM',
        icon: 'fivem',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },

    {
        key: '/databases',
        route: '/databases',
        group: 'Management',
        icon: 'database',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/backups',
        route: '/backups',
        group: 'Management',
        icon: 'archive',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/network',
        route: '/network',
        group: 'Management',
        icon: 'network',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/schedules',
        route: '/schedules',
        group: 'Management',
        icon: 'schedule',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/users',
        route: '/users',
        group: 'Management',
        icon: 'users',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/support',
        route: '/support',
        group: 'Management',
        icon: 'support',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/activity',
        route: '/activity',
        group: 'Management',
        icon: 'activity',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/egg-switcher',
        route: '/egg-switcher',
        group: 'Management',
        icon: 'swap',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/subdomains',
        route: '/subdomains',
        group: 'Management',
        icon: 'globe',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/discord',
        route: '/discord',
        group: 'Management',
        icon: 'discord',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/recycle-bin',
        route: '/recycle-bin',
        group: 'Management',
        icon: 'trash',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
    {
        key: '/import',
        route: '/import',
        group: 'Management',
        icon: 'download',
        label: '',
        enabled: true,
        custom: false,
        external: false,
        permission: [],
        eggs: [],
    },
];

export const DEFAULT_MANAGER_GROUPS: ServerTabGroup[] = [
    { key: 'Essentials', label: '', icon: 'rocket', enabled: true, open: true, collapsible: false },
    { key: 'MC Utils', label: '', icon: 'blocks', enabled: true, open: true, collapsible: true },
    { key: 'Hytale', label: '', icon: 'cube', enabled: true, open: true, collapsible: true },
    { key: 'Palworld', label: '', icon: 'paw', enabled: true, open: true, collapsible: true },
    { key: 'Rust', label: '', icon: 'wrench', enabled: true, open: true, collapsible: true },
    { key: 'DayZ', label: '', icon: 'gamepad', enabled: true, open: true, collapsible: true },
    { key: 'FiveM', label: '', icon: 'fivem', enabled: true, open: true, collapsible: true },
    { key: 'Management', label: '', icon: 'settings', enabled: true, open: true, collapsible: true },
];

export const MANAGER_NAV_LABELS: Record<string, string> = {
    '/overview': 'Overview',
    '/': 'Console',
    '/files': 'Files',
    '/startup': 'Startup',
    '/settings': 'Settings',
    '/players': 'Players',
    '/plugins': 'Plugins',
    '/mods': 'Mods',
    '/modpacks': 'Modpacks',
    '/version': 'Version',
    '/properties': 'Properties',
    '/worlds': 'Worlds',
    '/world-viewer': 'World Viewer',
    '/recycle-bin': 'Recycle Bin',
    '/hytale-mods': 'Hytale Mods',
    '/palworld-mods': 'Palworld Mods',
    '/rust-players': 'Rust Players',
    '/rust-plugins': 'Rust Plugins',
    '/rust-wipes': 'Rust Wipes',
    '/dayz-mods': 'DayZ Mods',
    '/fivem': 'FiveM',
    '/egg-switcher': 'Switch egg',
    '/databases': 'Databases',
    '/backups': 'Backups',
    '/network': 'Network',
    '/schedules': 'Schedules',
    '/users': 'Users',
    '/support': 'Support',
    '/activity': 'Activity',
    '/subdomains': 'Subdomains',
    '/discord': 'Discord',
    '/import': 'Import',
};

export const PRIMARY_NAV_KEYS = ['dashboard'];

export const NAV_LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    account: 'Overview',
    api: 'API Credentials',
    ssh: 'SSH Keys',
    activity: 'Activity',
    staff: 'Support staff',
    discord: 'Discord Bot',
};

export function managerNavSlug(path: string): string {
    return path === '/' ? 'console' : path.replace(/^\//, '');
}

export function managerNavLabel(t: TranslateFn, path: string, stored?: string, routeName?: string): string {
    return (
        stored ||
        t(`nav.server.${managerNavSlug(path)}`, {
            defaultValue: MANAGER_NAV_LABELS[path] || routeName || path,
        })
    );
}

export function navLabel(t: TranslateFn, key: string, stored?: string): string {
    return stored || t(`nav.account.${key}`, { defaultValue: NAV_LABELS[key] || key });
}

export function navGroupLabel(t: TranslateFn, group: string, stored?: string): string {
    return stored || t(`nav.groups.${group}`, { defaultValue: group });
}

export function newGroupKey(taken: string[]): string {
    let index = taken.length + 1;

    while (taken.includes(`group-${index}`)) {
        index += 1;
    }

    return `group-${index}`;
}

export function newTabKey(taken: string[]): string {
    let index = taken.length + 1;

    while (taken.includes(`custom:${index}`)) {
        index += 1;
    }

    return `custom:${index}`;
}

export function accountMounts(theme: ThemeConfig): Map<string, string[]> {
    const declared = new Map(DEFAULT_NAV.map((item) => [item.route, item.key]));
    const configured = new Map(theme['sidebar.nav'].map((item) => [item.key, item.route]));

    const mounts = new Map<string, string[]>();

    for (const [route, key] of declared) {
        const chosen = configured.get(key);

        mounts.set(route, chosen === undefined || chosen === route ? [route] : [route, chosen]);
    }

    return mounts;
}

export const NAV_EXACT: Record<string, boolean> = {
    dashboard: true,
    account: true,
    api: false,
    ssh: false,
    activity: false,
};

/* a847bf1333dbe3a13552b92cad51f899 */

export const THEME_DEFAULTS: ThemeConfig = {
    'surface.radius': 16,
    'surface.border': 'none',
    'surface.fieldBorder': true,
    'surface.opacity': 100,
    'surface.baseOpacity': 100,
    'surface.blur': 0,
    'surface.shadow': 'default',
    'modal.design': 'stark',
    'modal.fused': false,
    'background.image': '',
    'background.dim': 85,
    'background.blur': 0,
    'page.width': 'contained',
    'page.sidebarSolid': false,
    'sidebar.design': 'classic',
    'sidebar.active': 'bar',
    'sidebar.user': true,
    'sidebar.avatar': 'initial',
    'sidebar.nav': DEFAULT_NAV,
    'overview.enabled': true,
    'overview.blocks': [
        overviewBlock('banner', 'full'),
        overviewBlock('metrics', 'full'),
        overviewBlock('info', 'half'),
        overviewBlock('billing', 'half'),
    ],
    'manager.nav': DEFAULT_MANAGER_NAV,
    'manager.groups': DEFAULT_MANAGER_GROUPS,
    'sidebar.links': [
        { label: 'Discord', url: 'https://discord.gg/', icon: 'discord', enabled: true },
        { label: 'Billing', url: 'https://example.com/billing', icon: 'billing', enabled: true },
        { label: 'Website', url: 'https://example.com', icon: 'globe', enabled: true },
        { label: 'Contact support', url: 'https://example.com/support', icon: 'support', enabled: true },
    ],
    'nav.search': true,
    'nav.searchStyle': 'inline',
    'nav.colorMode': 'switch',
    'manager.rows': 'banner',
    'manager.mode': 'sidebar',
    'activity.blurIps': false,
    'manager.shell': 'rounded',
    'manager.logo': true,
    'manager.controls': true,
    'manager.controlsPlace': 'bottom',
    'manager.address': true,
    'manager.addressBlur': true,
    'manager.actions': 'default',
    'manager.actionsJoined': false,
    'manager.actionsIcons': false,
    'manager.design': 'classic',
    'manager.active': 'bar',
    'manager.header': true,
    'manager.arrange': true,
    'addons.cards': 'rows',
    'console.metrics': 'right',
    'console.charts': 'off',
    'console.chartStyle': 'line',
    'console.graph': 'behind',
    'console.address': true,
    'console.offline': true,
    'console.prompt': 'container@pterodactyl~',
    'console.daemon': 'KTS Host',
    'console.rules': [],
    'css.rules': [],
    'footer.pterodactyl': true,
    'footer.powered': true,
    'footer.note': '',
    'servers.animation': 'none',
    'servers.artwork': true,
    'servers.defaultArt': '/dezerx/eggs/bg/other.webp',
    'servers.defaultArtLight': '/dezerx/eggs/bg/light/other.webp',
    'servers.eggArt': [],
    'servers.quickLinks': true,
    'servers.quickLinkCards': [
        {
            label: 'Discord',
            blurb: 'Get help and talk to the community.',
            url: 'https://discord.gg/',
            icon: 'discord',
            feature: true,
            art: 'globe',
            enabled: true,
        },
        {
            label: 'Billing',
            blurb: 'Invoices, plans and payment.',
            url: 'https://example.com/billing',
            icon: 'billing',
            feature: false,
            art: 'none',
            enabled: true,
        },
        {
            label: 'Website',
            blurb: 'Everything we host, and what it costs.',
            url: 'https://example.com',
            icon: 'globe',
            feature: false,
            art: 'none',
            enabled: true,
        },
        {
            label: 'Contact support',
            blurb: 'Open a ticket with a human.',
            url: 'https://example.com/support',
            icon: 'support',
            feature: false,
            art: 'none',
            enabled: true,
        },
    ],
    'servers.activity': true,
    'icons.set': 'lucide',
    'icons.family': 'line',
    'icons.weight': 100,
    'icons.tint': 20,
    'auth.layout': 'split',
    'auth.card': 'plain',
    'auth.align': 'left',
    'auth.width': 448,
    'auth.backdrop': 'games',
    'auth.image': '',
    'auth.imageLight': '',
    'auth.focus': 'center',
    'auth.dim': 25,
    'auth.blur': 0,
    'auth.mask': 'diagonal',
    'auth.grid': true,
    'auth.noise': false,
    'auth.glow': 'none',
    'auth.wallArt': [],
    'auth.wallColumns': 4,
    'auth.wallSpeed': 52,
    'auth.wallTilt': true,
    'auth.logo': true,
    'auth.pitch': true,
    'auth.heading': '',
    'auth.body': '',
    'auth.footer': '',
    'auth.footerUrl': '',
    'auth.controls': true,
    'auth.controlsPlace': 'top-right',
    'auth.register': false,
    'auth.registerNames': true,
    'auth.registerDomains': '',
    'auth.registerTerms': '',
    'auth.registerNote': '',
    'seo.title': '{page} · KTS Host',
    'seo.description': 'Start, stop and manage your game servers with KTS Host. Access files, backups, network settings and the live console.',
    'seo.favicon': '',
    'seo.keywords': '',
    'seo.robots': 'noindex',
    'seo.og': 'auto',
    'seo.ogImage': '',
    'seo.twitter': '',
    'button.animation': 'press',
    'page.transition': 'none',
    'toast.glass': false,
    'toast.position': 'top-right',
    'ai.position': 'bottom-right',
    'presets.button': true,
    'notice.dashboard': [],
    'notice.design': 'soft',
    'notice.manager': [],
    'locale.enabled': [],
    'locale.default': 'en',
    'locale.picker': true,
    'locale.account': true,
};

let ambient: ThemeConfig = readBootTheme();

const listeners = new Set<() => void>();

interface BootWindow extends Window {
    SiteConfiguration?: { dezerx?: { theme?: Partial<ThemeConfig> } };
}

function readBootTheme(): ThemeConfig {
    if (typeof window === 'undefined') {
        return THEME_DEFAULTS;
    }

    return { ...THEME_DEFAULTS, ...((window as BootWindow).SiteConfiguration?.dezerx?.theme ?? {}) };
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

function snapshot(): ThemeConfig {
    return ambient;
}

export function publishTheme(theme: unknown): void {
    if (!theme || typeof theme !== 'object') {
        return;
    }

    ambient = { ...THEME_DEFAULTS, ...(theme as Partial<ThemeConfig>) };

    for (const listener of listeners) {
        listener();
    }
}

export function usePanelTheme(): ThemeConfig {
    return useExternalStore(subscribe, snapshot);
}

const THEME_DRAFT_ID = 'theme-draft';

const CARD_SELECTOR = '.bg-card:not(.panel-shell):not(body)';

const BASE_SELECTOR = '.bg-base:not(body)';

const CHROME_GUARD =
    '.dz-chrome{--tw-bg-opacity:1;--card-alpha:1;--base-alpha:1;}' +
    '.dz-chrome.bg-card,.dz-chrome .bg-card,.dz-chrome.bg-base,.dz-chrome .bg-base' +
    '{--tw-bg-opacity:1!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}';

const BORDER_SELECTOR = '.bg-card:where(.rounded-xl,.rounded-2xl,.rounded-3xl)';

const MODAL_SELECTOR = '.dz-on-raised';

const FIELD_EDGE = '0.12';

const BORDERS: Record<ThemeConfig['surface.border'], string | null> = {
    none: null,
    subtle: 'rgb(from var(--line-rgb) r g b / 0.08)',
    strong: 'rgb(from var(--line-rgb) r g b / 0.2)',
    accent: 'rgb(from var(--accent) r g b / 0.35)',
};

export function cardBorder(style: ThemeConfig['surface.border']): string | null {
    return BORDERS[style];
}

const SHADOWS: Record<ThemeConfig['surface.shadow'], string | null> = {
    none: 'none',
    default: null,
    soft: '0 6px 20px -12px rgb(0 0 0 / 0.45)',
    deep: '0 18px 40px -18px rgb(0 0 0 / 0.6)',
};

const rem = (px: number): string => `${Number((px / 16).toFixed(4))}rem`;

export function themeToCss(theme: ThemeConfig): string {
    const vars: Record<string, string> = {};

    const radius = theme['surface.radius'];

    if (radius !== THEME_DEFAULTS['surface.radius']) {
        vars['radius-lg'] = rem(radius * 0.5);
        vars['radius-xl'] = rem(radius * 0.75);
        vars['radius-2xl'] = rem(radius);
        vars['radius-3xl'] = rem(radius * 1.5);
        vars.radius = rem(radius * 1.5);
    }

    if (theme['surface.opacity'] !== 100) {
        vars['card-alpha'] = (theme['surface.opacity'] / 100).toFixed(2);
    }

    if (theme['surface.baseOpacity'] !== 100) {
        vars['base-alpha'] = (theme['surface.baseOpacity'] / 100).toFixed(2);
    }

    const shadow = SHADOWS[theme['surface.shadow']];

    if (shadow !== null) {
        vars['shadow-panel'] = shadow;
    }

    if (theme['background.image'] !== '') {
        vars['wallpaper-image'] = `url("${theme['background.image']}")`;
        vars['wallpaper-alpha'] = (theme['background.dim'] / 100).toFixed(3);
    }

    const body = Object.entries(vars)
        .map(([name, value]) => `--${name}:${value};`)
        .join('');

    let css = body ? `:root{${body}}` : '';

    if (theme['surface.fieldBorder']) {
        css += `:root{--field-edge:${FIELD_EDGE};}`;
    }

    if (theme['surface.opacity'] !== 100) {
        const alpha = (theme['surface.opacity'] / 100).toFixed(2);
        css += `${CARD_SELECTOR}{--tw-bg-opacity:${alpha};}`;
    }

    if (theme['surface.baseOpacity'] !== 100) {
        const alpha = (theme['surface.baseOpacity'] / 100).toFixed(2);
        css += `${BASE_SELECTOR}{--tw-bg-opacity:${alpha};}`;
    }

    if (theme['page.sidebarSolid']) {
        css +=
            '.app-sidebar{--tw-bg-opacity:1;--card-alpha:1;' +
            'backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:none;}';
    }

    const blur = theme['surface.blur'];

    if (blur > 0) {
        css += `${CARD_SELECTOR}{backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);}`;
    }

    css += iconsToCss(theme);

    const border = BORDERS[theme['surface.border']];

    if (border !== null) {
        css += `${BORDER_SELECTOR}:not([class*=border]){border:1px solid ${border};}`;
        css += `${MODAL_SELECTOR}{--tw-ring-color:${border};border-color:${border};}`;
    }

    if (theme['surface.opacity'] !== 100 || theme['surface.baseOpacity'] !== 100 || blur > 0) {
        css += CHROME_GUARD;
    }

    const imageBlur = theme['background.image'] === '' ? 0 : theme['background.blur'];

    if (imageBlur > 0) {
        css +=
            '.wallpaper-base,.wallpaper-card{background-image:none;position:relative;isolation:isolate;}' +
            ".wallpaper-base::before,.wallpaper-card::before{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;" +
            'background-image:linear-gradient(var(--wallpaper-veil),var(--wallpaper-veil)),var(--wallpaper-image);' +
            'background-size:cover;background-position:center;background-attachment:fixed;' +
            `filter:blur(${imageBlur}px);transform:scale(1.06);}`;
    }

    css += customRulesToCss(theme['css.rules']);

    return css;
}

const SELECTOR_PATTERN = /^[A-Za-z0-9 _\-.#[\]="':>+~,()]+$/;

const SELECTOR_RESERVED = ['*', 'html', 'body', ':root'];

export const SELECTOR_LIMIT = 200;

export const DECLARATION_LIMIT = 600;

export function cleanCssSelector(value: string): string | null {
    const selector = value.replace(/\s+/g, ' ').trim();

    if (selector === '' || selector.length > SELECTOR_LIMIT) {
        return null;
    }

    if (!SELECTOR_PATTERN.test(selector) || /dz-chrome|theme-editor|dz-pick/i.test(selector)) {
        return null;
    }

    return SELECTOR_RESERVED.includes(selector) ? null : selector;
}

export function cssDeclarationList(css: string): string[] {
    const parts: string[] = [];

    let buffer = '';
    let depth = 0;

    for (const char of css) {
        if (char === '(') {
            depth += 1;
        } else if (char === ')') {
            depth = Math.max(0, depth - 1);
        }

        if (char === ';' && depth === 0) {
            parts.push(buffer);
            buffer = '';

            continue;
        }

        buffer += char;
    }

    parts.push(buffer);

    return parts.map((part) => part.trim()).filter((part) => part !== '');
}

export function cleanCssDeclarations(value: string): string {
    const css = value.trim();

    if (css === '' || css.length > DECLARATION_LIMIT) {
        return '';
    }

    if (/[{}<>\\]/.test(css) || /@|\/\*|expression\s*\(|javascript\s*:|behaviou?r\s*:|-moz-binding/i.test(css)) {
        return '';
    }

    for (const one of css.match(/url\(\s*[^)]*\)/gi) ?? []) {
        const inside = one
            .replace(/^url\(\s*/i, '')
            .replace(/\)$/, '')
            .trim()
            .replace(/^["']|["']$/g, '');

        if (!/^(https:\/\/|data:image\/)/i.test(inside)) {
            return '';
        }
    }

    const parts = cssDeclarationList(css);

    return parts.length === 0 ? '' : `${parts.join('; ')};`;
}

export function customRulesToCss(rules: CssRule[]): string {
    let css = '';

    for (const rule of rules ?? []) {
        if (rule.enabled === false) {
            continue;
        }

        const selector = cleanCssSelector(rule.selector);
        const declarations = cssDeclarationList(cleanCssDeclarations(rule.css));

        if (selector === null || declarations.length === 0) {
            continue;
        }

        const body =
            rule.important === false
                ? declarations
                : declarations.map((one) => `${one.replace(/\s*!\s*important\s*$/i, '')} !important`);

        css += `:is(${selector}):not(.dz-chrome,.dz-chrome *){${body.join(';')};}`;
    }

    return css;
}

const ICON_SELECTOR = 'svg.lucide,svg.dz-icon';

export const STROKE_SETS: IconSet[] = ['lucide', 'tabler', 'hugeicons'];

export function iconStyle(
    family: IconFamily,
    weight: number,
    tint: number
): { strokeWidth: number; strokeLinecap?: 'butt'; strokeLinejoin?: 'miter'; fill?: string } {
    return {
        strokeWidth: Number(((2 * weight) / 100).toFixed(3)),
        ...(family.includes('sharp') ? ({ strokeLinecap: 'butt', strokeLinejoin: 'miter' } as const) : {}),
        ...(family.startsWith('duotone') ? { fill: `rgb(from currentColor r g b / ${(tint / 100).toFixed(2)})` } : {}),
    };
}

export function iconsToCss(theme: ThemeConfig): string {
    if (!STROKE_SETS.includes(theme['icons.set'])) {
        return '';
    }

    let body = '';

    if (theme['icons.weight'] !== 100) {
        body += `stroke-width:${Number(((2 * theme['icons.weight']) / 100).toFixed(3))};`;
    }

    if (theme['icons.family'].includes('sharp')) {
        body += 'stroke-linecap:butt;stroke-linejoin:miter;';
    }

    if (theme['icons.family'].startsWith('duotone')) {
        body += `fill:rgb(from currentColor r g b / ${(theme['icons.tint'] / 100).toFixed(2)});`;
    }

    return body === '' ? '' : `${ICON_SELECTOR}{${body}}`;
}

export const THEME_CSS_EVENT = 'dz:theme-css';

export function applyThemeDraft(theme: ThemeConfig | null): void {
    let style = document.getElementById(THEME_DRAFT_ID);

    if (!(style instanceof HTMLStyleElement)) {
        style = document.createElement('style');
        style.id = THEME_DRAFT_ID;
        document.head.appendChild(style);
    }

    const next = theme ? themeToCss(theme) : '';

    if (style.textContent !== next) {
        style.textContent = next;

        window.dispatchEvent(new CustomEvent(THEME_CSS_EVENT));
    }

    promoteStyles();
}

const CSS_ONLY_KEYS: (keyof ThemeConfig)[] = [
    'surface.radius',
    'surface.border',
    'surface.opacity',
    'surface.baseOpacity',
    'surface.blur',
    'surface.shadow',
    'background.image',
    'background.dim',
    'background.blur',
    'page.sidebarSolid',
    'icons.family',
    'icons.weight',
    'icons.tint',
    'css.rules',
];

export function rendersDifferently(a: ThemeConfig, b: ThemeConfig): boolean {
    for (const key of Object.keys(THEME_DEFAULTS) as (keyof ThemeConfig)[]) {
        if (CSS_ONLY_KEYS.includes(key)) {
            continue;
        }

        const left = a[key];
        const right = b[key];

        if (typeof left === 'object' || typeof right === 'object') {
            if (JSON.stringify(left) !== JSON.stringify(right)) {
                return true;
            }

            continue;
        }

        if (left !== right) {
            return true;
        }
    }

    return false;
}

export interface SidebarShell {
    aside: string;
    nav: string;
    main: string;
    page: string;
    forceRail: boolean;
    width: string;
}

const INSET_MAIN = 'lg:my-3 lg:mr-3 lg:rounded-2xl';

const FLUSH_MAIN = 'lg:my-0 lg:mr-0 lg:rounded-none';

const SIDEBAR_DESIGNS: Record<SidebarDesign, SidebarShell> = {
    classic: {
        aside: 'wallpaper-card bg-card',
        nav: 'px-3 py-2',
        main: INSET_MAIN,
        page: 'wallpaper-card bg-card',
        forceRail: false,
        width: 'w-64',
    },
    floating: {
        aside: 'wallpaper-card my-3 ml-3 rounded-2xl bg-card shadow-panel ring-1 ring-line-field',
        nav: 'px-2.5 py-2',
        main: INSET_MAIN,
        page: 'wallpaper-base bg-base',
        forceRail: false,
        width: 'w-64',
    },
    compact: {
        aside: 'wallpaper-card bg-card',
        nav: 'px-2 py-1 [&_a]:py-2 [&_span]:text-[13px]',
        main: INSET_MAIN,
        page: 'wallpaper-card bg-card',
        forceRail: false,
        width: 'w-56',
    },
    rail: {
        aside: 'wallpaper-card bg-card',
        nav: 'px-3 py-2',
        main: INSET_MAIN,
        page: 'wallpaper-card bg-card',
        forceRail: true,
        width: 'w-[4.75rem]',
    },
    bordered: {
        aside: 'wallpaper-card border-r border-line-field bg-card',
        nav: 'px-3 py-2',
        main: FLUSH_MAIN,
        page: 'wallpaper-card bg-card',
        forceRail: false,
        width: 'w-64',
    },
};

export function sidebarShell(design: SidebarDesign): SidebarShell {
    return SIDEBAR_DESIGNS[design] ?? SIDEBAR_DESIGNS.classic;
}

const MANAGER_SHELLS: Record<ManagerShell, string> = {
    rounded: INSET_MAIN,
    flat: FLUSH_MAIN,
};

export function managerShell(shell: ManagerShell): string {
    return MANAGER_SHELLS[shell] ?? MANAGER_SHELLS.rounded;
}

const CONTENT_WIDTHS: Record<ThemeConfig['page.width'], string> = {
    contained: 'max-w-7xl',
    wide: 'max-w-[110rem]',
    full: 'max-w-none',
};

export function contentWidth(width: ThemeConfig['page.width']): string {
    return CONTENT_WIDTHS[width] ?? CONTENT_WIDTHS.contained;
}

export interface ActiveStyle {
    link: string;
    icon: string;

    text: string;
    marker: 'bar' | 'dot' | 'underline' | null;
}

const ACTIVE_DESIGNS: Record<ActiveDesign, ActiveStyle> = {
    bar: { link: 'bg-accent/10 font-semibold text-ink', icon: 'text-accent', text: 'text-ink', marker: 'bar' },
    pill: { link: 'bg-accent/20 font-semibold text-ink', icon: 'text-accent', text: 'text-ink', marker: null },
    glow: {
        link: 'bg-accent/10 font-semibold text-ink ring-1 ring-accent/40',
        icon: 'text-accent',
        text: 'text-ink',
        marker: null,
    },
    underline: { link: 'font-semibold text-ink', icon: 'text-accent', text: 'text-ink', marker: 'underline' },
    solid: {
        link: 'bg-accent font-semibold text-ink-inverse',
        icon: 'text-ink-inverse',
        text: 'text-ink-inverse',
        marker: null,
    },
    dot: { link: 'font-semibold text-ink', icon: 'text-accent', text: 'text-ink', marker: 'dot' },
    gradient: {
        link: 'bg-gradient-to-r from-accent/25 to-transparent font-semibold text-ink',
        icon: 'text-accent',
        text: 'text-ink',
        marker: null,
    },
};

export function activeStyle(design: ActiveDesign): ActiveStyle {
    return ACTIVE_DESIGNS[design] ?? ACTIVE_DESIGNS.bar;
}

export function avatarSource(provider: AvatarProvider, hash: string): string | null {
    if (hash === '') {
        return null;
    }

    const gravatar = (fallback: string, force: boolean) =>
        `https://www.gravatar.com/avatar/${hash}?s=96&d=${fallback}${force ? '&f=y' : ''}`;

    switch (provider) {
        case 'gravatar':
            return gravatar('mp', false);
        case 'identicon':
            return gravatar('identicon', true);
        case 'retro':
            return gravatar('retro', true);
        case 'robohash':
            return gravatar('robohash', true);
        case 'dicebear':
            return `https://api.dicebear.com/9.x/thumbs/svg?seed=${hash}`;
        default:
            return null;
    }
}

export interface ConsoleLayout {
    grid: string;
    aside: string;
    tiles: string;
    tilesFirst: boolean;
}

const CONSOLE_LAYOUTS: Record<MetricsPosition, ConsoleLayout> = {
    right: {
        grid: 'xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start',
        aside: 'space-y-3',
        tiles: 'grid grid-cols-2 gap-3 xl:grid-cols-1',
        tilesFirst: false,
    },
    left: {
        grid: 'xl:grid-cols-[17rem_minmax(0,1fr)] xl:items-start',
        aside: 'space-y-3',
        tiles: 'grid grid-cols-2 gap-3 xl:grid-cols-1',
        tilesFirst: true,
    },
    above: {
        grid: 'grid-cols-1',
        aside: 'space-y-3',
        tiles: 'grid grid-cols-2 gap-3 sm:grid-cols-4',
        tilesFirst: true,
    },
    below: {
        grid: 'grid-cols-1',
        aside: 'space-y-3',
        tiles: 'grid grid-cols-2 gap-3 sm:grid-cols-4',
        tilesFirst: false,
    },
};

const ROW_ANIMATIONS: Record<RowAnimation, string> = {
    none: '',
    fade: 'dz-card-fade',
    rise: 'dz-card-rise',
    slide: 'dz-card-slide',
    zoom: 'dz-card-zoom',
};

export const ROW_STAGGER_MS = 45;

export const ROW_STAGGER_MAX = 10;

export function rowAnimation(animation: RowAnimation, design: RowDesign): string {
    if (animation === 'slide' && design === 'tile') {
        return 'dz-card-drop';
    }

    return ROW_ANIMATIONS[animation] ?? '';
}

export function consoleLayout(position: MetricsPosition): ConsoleLayout {
    return CONSOLE_LAYOUTS[position] ?? CONSOLE_LAYOUTS.right;
}

export function serverHeaderVisible(theme: ThemeConfig): boolean {
    if (theme['manager.mode'] === 'navbar') {
        return true;
    }

    const compact = theme['manager.logo'] && theme['manager.controls'] && theme['manager.address'];

    return theme['manager.header'] && !(theme['manager.mode'] === 'merged' && compact);
}

const BUTTON_ANIMATIONS: Record<ButtonAnimation, string> = {
    none: '',
    press: 'btn-anim btn-anim-press',
    lift: 'btn-anim btn-anim-lift',
    glint: 'btn-anim btn-anim-glint',
    pulse: 'btn-anim btn-anim-pulse',
    grow: 'btn-anim btn-anim-grow',
    slide: 'btn-anim btn-anim-slide',
};

export function buttonAnimation(animation: ButtonAnimation): string {
    return BUTTON_ANIMATIONS[animation] ?? BUTTON_ANIMATIONS.press;
}

const PAGE_TRANSITIONS: Record<PageTransition, string> = {
    none: '',
    fade: 'page-fade',
    rise: 'page-rise',
    slide: 'page-slide',
    scale: 'page-scale',
    blur: 'page-blur',
};

export function pageTransition(transition: PageTransition): string {
    return PAGE_TRANSITIONS[transition] ?? '';
}

const TOAST_POSITIONS: Record<Corner, string> = {
    'top-right': 'right-4 top-20 items-end sm:right-6',
    'top-left': 'left-4 top-20 items-start sm:left-6',
    'top-center': 'left-1/2 top-20 -translate-x-1/2 items-center',
    'bottom-right': 'bottom-4 right-4 items-end sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 items-start sm:bottom-6 sm:left-6',
};

export function toastPosition(position: Corner): string {
    return TOAST_POSITIONS[position] ?? TOAST_POSITIONS['top-right'];
}

export function toastSurface(glass: boolean): string {
    return glass ? 'bg-card/30 backdrop-blur-2xl' : 'bg-card/30 backdrop-blur-lg';
}

const AI_PLACEMENTS: Record<Exclude<AiPosition, 'off'>, AiPlacement> = {
    'bottom-right': { side: 'right', origin: 'origin-bottom-right' },
    'bottom-left': { side: 'left', origin: 'origin-bottom-left' },
};

export interface AiPlacement {
    side: 'left' | 'right';
    origin: string;
}

export function aiPlacement(position: AiPosition): AiPlacement {
    return AI_PLACEMENTS[position as Exclude<AiPosition, 'off'>] ?? AI_PLACEMENTS['bottom-right'];
}

const SEARCH_STYLES: Record<ThemeConfig['nav.searchStyle'], string> = {
    inline: 'lg:max-w-sm lg:flex-1',
    pill: 'lg:max-w-xs lg:flex-1 [&_input]:rounded-full',
    wide: 'lg:max-w-none lg:flex-1',
};

export function searchStyle(style: ThemeConfig['nav.searchStyle']): string {
    return SEARCH_STYLES[style] ?? SEARCH_STYLES.inline;
}

const AUTH_ART: Record<AuthLayoutStyle, AuthArt> = {
    split: 'beside',
    'split-reverse': 'beside',
    frame: 'beside',
    centered: 'behind',
    card: 'behind',
    hero: 'behind',
    stacked: 'above',
    minimal: 'none',
};

export function authArt(layout: AuthLayoutStyle): AuthArt {
    return AUTH_ART[layout] ?? 'beside';
}

const AUTH_CARDS: Record<AuthCard, string> = {
    plain: '',
    card: 'rounded-3xl bg-card p-6 shadow-panel sm:p-8',
    glass: 'rounded-3xl bg-card/60 p-6 shadow-panel ring-1 ring-line-field backdrop-blur-2xl sm:p-8',
    outline: 'rounded-3xl p-6 ring-1 ring-line-field sm:p-8',
    raised: 'rounded-3xl bg-raised p-6 shadow-panel sm:p-8',
};

export function authCardSurface(card: AuthCard, layout: AuthLayoutStyle): string {
    if (card === 'plain' && layout === 'card') {
        return AUTH_CARDS.card;
    }

    return AUTH_CARDS[card] ?? '';
}

export interface AuthMaskStyle {
    image: string;
    composite?: boolean;
}

const AUTH_MASKS_BESIDE: Record<AuthMask, AuthMaskStyle | undefined> = {
    diagonal: { image: 'var(--wall-mask)', composite: true },
    fade: { image: 'linear-gradient(100deg, transparent 0%, rgb(0 0 0 / 0.35) 22%, #000 46%)' },
    vignette: {
        image: 'radial-gradient(120% 100% at 68% 50%, #000 32%, rgb(0 0 0 / 0.55) 66%, transparent 92%)',
    },
    none: undefined,
};

const AUTH_MASKS_BEHIND: Record<AuthMask, AuthMaskStyle | undefined> = {
    diagonal: { image: 'linear-gradient(118deg, #000 18%, rgb(0 0 0 / 0.45) 62%, rgb(0 0 0 / 0.1) 100%)' },
    fade: {
        image: 'radial-gradient(130% 100% at 50% 24%, #000 26%, rgb(0 0 0 / 0.45) 70%, transparent 100%)',
    },
    vignette: {
        image: 'radial-gradient(100% 100% at 50% 50%, #000 38%, rgb(0 0 0 / 0.4) 76%, transparent 98%)',
    },
    none: undefined,
};

const AUTH_MASKS_ABOVE: Record<AuthMask, AuthMaskStyle | undefined> = {
    diagonal: { image: 'linear-gradient(190deg, #000 42%, transparent 100%)' },
    fade: { image: 'linear-gradient(#000 48%, rgb(0 0 0 / 0.4) 78%, transparent 100%)' },
    vignette: { image: 'radial-gradient(120% 130% at 50% 6%, #000 40%, transparent 96%)' },
    none: undefined,
};

export function authMask(mask: AuthMask, placement: AuthArt): AuthMaskStyle | undefined {
    switch (placement) {
        case 'behind':
            return AUTH_MASKS_BEHIND[mask];
        case 'above':
            return AUTH_MASKS_ABOVE[mask];
        default:
            return AUTH_MASKS_BESIDE[mask];
    }
}

const AUTH_FOCUS: Record<AuthFocus, string> = {
    center: 'center',
    top: 'center top',
    bottom: 'center bottom',
    left: 'left center',
    right: 'right center',
};

export function authFocus(focus: AuthFocus): string {
    return AUTH_FOCUS[focus] ?? 'center';
}

export function authVeil(dim: number): string {
    return `rgb(from var(--surface-base) r g b / ${(dim / 100).toFixed(3)})`;
}

const AUTH_GLOWS: Record<AuthGlow, string | null> = {
    none: null,
    top: 'left-1/2 top-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2',
    behind: 'left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2',
    corner: 'left-[-14rem] top-[-14rem] h-[36rem] w-[36rem]',
};

export function authGlow(glow: AuthGlow): string | null {
    return AUTH_GLOWS[glow] ?? null;
}

const AUTH_CONTROL_POSITIONS: Record<Corner, string> = {
    'top-right': 'right-4 top-4 sm:right-6 sm:top-6',
    'top-left': 'left-4 top-4 sm:left-6 sm:top-6',
    'top-center': 'left-1/2 top-4 -translate-x-1/2 sm:top-6',
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
};

export function authControlPosition(place: Corner): string {
    return AUTH_CONTROL_POSITIONS[place] ?? AUTH_CONTROL_POSITIONS['top-right'];
}

export function authWallArt(list: ThemeImage[]): string[] | null {
    const chosen = list.filter((entry) => entry.enabled && entry.url !== '').map((entry) => entry.url);

    return chosen.length === 0 ? null : chosen;
}

export interface NoticeTonePalette {
    surface: string;
    icon: string;
    edge: string;
    line: string;
    solid: string;

    inset: string;
}

export const NOTICE_TONES: Record<NoticeTone, NoticeTonePalette> = {
    info: {
        surface: 'bg-accent/10',
        icon: 'text-accent',
        edge: 'border-accent',
        line: 'border-accent/40',
        solid: 'bg-accent text-btn-ink hover:bg-accent/90',
        inset: 'notice-inset notice-tone-info',
    },
    success: {
        surface: 'bg-success/10',
        icon: 'text-success',
        edge: 'border-success',
        line: 'border-success/40',
        solid: 'bg-success text-white hover:bg-success/85',
        inset: 'notice-inset notice-tone-success',
    },
    warning: {
        surface: 'bg-warning/10',
        icon: 'text-warning',
        edge: 'border-warning',
        line: 'border-warning/40',
        solid: 'bg-warning text-white hover:bg-warning/85',
        inset: 'notice-inset notice-tone-warning',
    },
    danger: {
        surface: 'bg-danger/10',
        icon: 'text-danger',
        edge: 'border-danger',
        line: 'border-danger/40',
        solid: 'bg-danger text-white hover:bg-danger/85',
        inset: 'notice-inset notice-tone-danger',
    },
};

export function noticeSurface(design: NoticeDesign, tone: NoticeTonePalette): string {
    switch (design) {
        case 'edge':
            return `bg-card border-l-4 ${tone.edge}`;
        case 'outline':
            return `bg-card border ${tone.line} ${tone.inset}`;
        case 'plain':
            return 'bg-card';
        default:
            return tone.surface;
    }
}

const POWER_TONES = {
    start: {
        solid: 'border-0 bg-success text-white hover:bg-success/85',
        soft: 'border-0 bg-success/15 text-success hover:bg-success/25',
        outline: 'border border-success/50 bg-transparent text-success hover:bg-success/10',
    },
    restart: {
        solid: 'border-0 bg-warning text-white hover:bg-warning/85',
        soft: 'border-0 bg-warning/15 text-warning hover:bg-warning/25',
        outline: 'border border-warning/50 bg-transparent text-warning hover:bg-warning/10',
    },
    stop: {
        solid: 'border-0 bg-danger text-white hover:bg-danger/85',
        soft: 'border-0 bg-danger/15 text-danger hover:bg-danger/25',
        outline: 'border border-danger/50 bg-transparent text-danger hover:bg-danger/10',
    },
    kill: {
        solid: 'border-0 bg-ink/70 text-white hover:bg-ink/60',
        soft: 'border-0 bg-danger/10 text-danger hover:bg-danger/20',
        outline: 'border border-ink-faint/40 bg-transparent text-ink-muted hover:bg-overlay hover:text-ink',
    },
} as const;

export type PowerAction = keyof typeof POWER_TONES;

export function powerActionClass(style: PowerActionStyle, action: PowerAction): string {
    if (style === 'accent') {
        return action === 'kill'
            ? 'border-0 bg-accent/15 text-accent hover:bg-accent/25'
            : 'border-0 bg-accent text-btn-ink hover:bg-accent/90';
    }

    if (style === 'solid' || style === 'soft' || style === 'outline') {
        return POWER_TONES[action][style];
    }

    return '';
}
