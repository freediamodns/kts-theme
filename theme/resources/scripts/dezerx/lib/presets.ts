import { toRgb, type FontChoices, type TokenMap } from '@/dezerx/lib/appearance';
import { THEME_DEFAULTS, type ThemeConfig } from '@/dezerx/lib/panelTheme';

export const PRESET_KEYS: (keyof ThemeConfig)[] = [
    'surface.radius',
    'surface.border',
    'surface.fieldBorder',
    'surface.opacity',
    'surface.baseOpacity',
    'surface.blur',
    'surface.shadow',
    'modal.design',
    'modal.fused',
    'background.image',
    'background.dim',
    'background.blur',
    'page.width',
    'page.sidebarSolid',
    'sidebar.design',
    'sidebar.active',
    'sidebar.user',
    'sidebar.avatar',
    'nav.search',
    'nav.searchStyle',
    'manager.rows',
    'manager.mode',
    'manager.shell',
    'manager.logo',
    'manager.controls',
    'manager.controlsPlace',
    'manager.address',
    'manager.addressBlur',
    'manager.actions',
    'manager.actionsJoined',
    'manager.design',
    'manager.active',
    'manager.header',
    'activity.blurIps',
    'addons.cards',
    'console.metrics',
    'console.charts',
    'console.chartStyle',
    'console.graph',
    'console.address',
    'servers.animation',
    'servers.artwork',
    'servers.quickLinks',
    'servers.activity',
    'icons.set',
    'icons.family',
    'icons.weight',
    'icons.tint',
    'auth.layout',
    'auth.card',
    'auth.align',
    'auth.width',
    'auth.backdrop',

    'auth.focus',
    'auth.dim',
    'auth.blur',
    'auth.mask',
    'auth.grid',
    'auth.noise',
    'auth.glow',
    'auth.wallColumns',
    'auth.wallSpeed',
    'auth.wallTilt',
    'auth.logo',
    'auth.pitch',
    'auth.controls',
    'auth.controlsPlace',
    'button.animation',
    'page.transition',
    'toast.glass',
    'toast.position',
    'notice.design',
];

export interface ThemePreset {
    id: string;
    label: string;

    blurb: string;

    tags: string[];

    mode: 'dark' | 'light';
    theme: Partial<ThemeConfig>;
    tokens: { dark: TokenMap; light: TokenMap };
    fonts: FontChoices;

    stock?: boolean;

    preview?: { dark: TokenMap; light: TokenMap };
}

interface PaletteSpec {
    base: string;
    card: string;
    raised: string;
    overlay: string;
    ink: string;
    muted: string;
    faint: string;
    inverse: string;
    accent: string;
    accentAlt: string;
    accentGlow?: string;
    cardActive?: string;
    glow?: string;
    line?: string;
    btn?: string;
    btnInk?: string;
    promo?: string;
    promoInk?: string;
    success?: string;
    warning?: string;
    danger?: string;
    offline?: string;
    chart1?: string;
    chart2?: string;
}

function palette(spec: PaletteSpec): TokenMap {
    const pick = (value: string | undefined, fallback: string) => toRgb(value ?? fallback);

    return {
        'surface-base': toRgb(spec.base),
        'surface-card': toRgb(spec.card),
        'surface-raised': toRgb(spec.raised),
        'surface-overlay': toRgb(spec.overlay),

        ink: toRgb(spec.ink),
        'ink-muted': toRgb(spec.muted),
        'ink-faint': toRgb(spec.faint),
        'ink-inverse': toRgb(spec.inverse),

        accent: toRgb(spec.accent),
        'accent-alt': toRgb(spec.accentAlt),
        'accent-glow': pick(spec.accentGlow, spec.accentAlt),
        'card-active': pick(spec.cardActive, spec.accent),
        glow: pick(spec.glow, spec.accent),

        'line-rgb': pick(spec.line, spec.ink),

        btn: pick(spec.btn, spec.accent),
        'btn-ink': pick(spec.btnInk, spec.inverse),
        promo: pick(spec.promo, spec.accent),
        'promo-ink': pick(spec.promoInk, spec.inverse),

        success: pick(spec.success, '#22c55e'),
        warning: pick(spec.warning, '#f59e0b'),
        danger: pick(spec.danger, '#ef4444'),
        'status-offline': pick(spec.offline, spec.faint),

        'chart-1': pick(spec.chart1, spec.accent),
        'chart-2': pick(spec.chart2, spec.accentAlt),
    };
}

const WALL = '/dezerx/presets';

export const THEME_PRESETS: ThemePreset[] = [
    {
        id: 'default',
        label: 'Default',
        blurb: 'The panel as it ships: dark slate, one blue, and nothing overridden anywhere.',
        tags: ['Shipped', 'Dark slate', 'No wallpaper'],
        mode: 'dark',
        stock: true,
        fonts: { sans: 'montserrat', display: 'montserrat', mono: 'system-mono' },
        theme: {},
        tokens: { dark: {}, light: {} },
        preview: {
            dark: palette({
                base: '#0b0d12',
                card: '#0f1219',
                raised: '#161a23',
                overlay: '#1e232e',
                ink: '#e2e8f0',
                muted: '#94a3b8',
                faint: '#a9abad',
                inverse: '#12202c',
                accent: '#47a5e7',
                accentAlt: '#8b5cf6',
                accentGlow: '#e879f9',
                line: '#ffffff',
                btnInk: '#0b0d12',
                promoInk: '#ffffff',
                success: '#a3e635',
                warning: '#fbbf24',
                danger: '#f43f5e',
                offline: '#64748b',
                chart1: '#3d93d4',
                chart2: '#16a34a',
            }),
            light: palette({
                base: '#ffffff',
                card: '#f4f6f9',
                raised: '#f1f3f7',
                overlay: '#e2e7ee',
                ink: '#0f172a',
                muted: '#475569',
                faint: '#64748b',
                inverse: '#ffffff',
                accent: '#47a5e7',
                accentAlt: '#7c3aed',
                accentGlow: '#c026d3',
                cardActive: '#1d76bd',
                line: '#0f172a',
                btn: '#5db4fb',
                btnInk: '#ffffff',
                promo: '#5db4fb',
                promoInk: '#ffffff',
                success: '#22c55e',
                warning: '#b45309',
                danger: '#e11d48',
                offline: '#e11d48',
                chart1: '#2a78d6',
                chart2: '#0f8f5f',
            }),
        },
    },
    {
        id: 'vercel',
        label: 'Vercel',
        blurb: 'Pure black, hairline borders, no colour anywhere but the state pills.',
        tags: ['Monochrome', 'Top server bar', 'Flat'],
        mode: 'dark',
        fonts: { sans: 'inter', display: 'inter', mono: 'jetbrains-mono' },
        theme: {
            'surface.radius': 8,
            'page.width': 'wide',
            'sidebar.design': 'bordered',
            'sidebar.active': 'solid',
            'nav.searchStyle': 'wide',
            'manager.mode': 'navbar',
            'manager.design': 'bordered',
            'manager.active': 'bar',
            'manager.shell': 'flat',
            'manager.rows': 'tile',
            'manager.actions': 'accent',
            'manager.actionsJoined': true,
            'servers.animation': 'fade',
            'icons.weight': 90,
            'button.animation': 'none',
            'page.transition': 'fade',
            'notice.design': 'outline',
            'auth.layout': 'centered',
            'auth.card': 'outline',
            'auth.align': 'center',
            'auth.backdrop': 'grid',
            'auth.mask': 'none',
        },
        tokens: {
            dark: palette({
                base: '#000000',
                card: '#0a0a0a',
                raised: '#161616',
                overlay: '#232323',
                ink: '#ededed',
                muted: '#a1a1a1',
                faint: '#6f6f6f',
                inverse: '#000000',
                accent: '#ffffff',
                accentAlt: '#a1a1a1',
                line: '#ffffff',
                btn: '#ffffff',
                btnInk: '#000000',
                success: '#0cce6b',
                warning: '#f5a623',
                danger: '#ff4d4f',
                offline: '#666666',
                chart1: '#ffffff',
                chart2: '#666666',
            }),
            light: palette({
                base: '#ffffff',
                card: '#fafafa',
                raised: '#f2f2f2',
                overlay: '#ebebeb',
                ink: '#000000',
                muted: '#666666',
                faint: '#8f8f8f',
                inverse: '#ffffff',
                accent: '#000000',
                accentAlt: '#666666',
                line: '#000000',
                btn: '#000000',
                btnInk: '#ffffff',
                success: '#0a8f4b',
                warning: '#b06f00',
                danger: '#d92d20',
                offline: '#8f8f8f',
                chart1: '#000000',
                chart2: '#8f8f8f',
            }),
        },
    },

    {
        id: 'tidal',
        label: 'Tidal',
        blurb: 'Deep water and slow waves, under a floating sidebar and frosted cards.',
        tags: ['Wallpaper', 'Floating sidebar', 'Glass'],
        mode: 'dark',
        fonts: { sans: 'manrope', display: 'sora', mono: 'jetbrains-mono' },
        theme: {
            'surface.radius': 20,
            'surface.opacity': 72,
            'surface.baseOpacity': 74,
            'surface.blur': 18,
            'background.image': `${WALL}/waves.webp`,
            'background.dim': 42,
            'sidebar.design': 'floating',
            'sidebar.active': 'pill',
            'manager.design': 'floating',
            'manager.active': 'pill',
            'manager.actions': 'soft',
            'console.charts': 'below',
            'servers.animation': 'rise',
            'icons.weight': 95,
            'button.animation': 'lift',
            'page.transition': 'fade',
            'toast.glass': true,
            'auth.layout': 'split',
            'auth.card': 'glass',
            'auth.backdrop': 'wallpaper',
            'auth.dim': 20,
            'auth.mask': 'fade',
            'auth.glow': 'behind',
            'auth.grid': false,
        },
        tokens: {
            dark: palette({
                base: '#060b14',
                card: '#0b1220',
                raised: '#131c2e',
                overlay: '#1c2942',
                ink: '#e2eaf5',
                muted: '#93a7c4',
                faint: '#64789a',
                inverse: '#04121f',
                accent: '#38a0ff',
                accentAlt: '#22d3ee',
                accentGlow: '#7dd3fc',
                line: '#cfe6ff',
                success: '#34d399',
                warning: '#fbbf24',
                danger: '#fb7185',
                chart1: '#38a0ff',
                chart2: '#22d3ee',
            }),
            light: palette({
                base: '#f6fafe',
                card: '#ffffff',
                raised: '#eef4fb',
                overlay: '#dfe9f6',
                ink: '#0b1a2b',
                muted: '#43607f',
                faint: '#6b8199',
                inverse: '#ffffff',
                accent: '#0b76d1',
                accentAlt: '#0891b2',
                line: '#0b1a2b',
                success: '#0f9d58',
                warning: '#b45309',
                danger: '#e11d48',
                chart1: '#0b76d1',
                chart2: '#0891b2',
            }),
        },
    },
    {
        id: 'nebula',
        label: 'Nebula',
        blurb: 'Violet cloud behind heavy frosted glass, flush to every edge, with the server tabs folded into the sidebar.',
        tags: ['Merged sidebar', 'Heavy glass', 'Flush'],
        mode: 'dark',
        fonts: { sans: 'figtree', display: 'sora', mono: 'ibm-plex-mono' },
        theme: {
            'surface.radius': 17,
            'surface.opacity': 62,
            'surface.baseOpacity': 66,
            'surface.blur': 24,
            'background.image': `${WALL}/nebula.webp`,
            'background.dim': 44,
            'background.blur': 2,
            'sidebar.design': 'bordered',
            'sidebar.active': 'gradient',
            'sidebar.avatar': 'generated',
            'manager.mode': 'merged',
            'manager.design': 'bordered',
            'manager.active': 'gradient',
            'manager.actions': 'accent',
            'manager.controlsPlace': 'top',
            'manager.shell': 'flat',
            'console.charts': 'below',
            'servers.animation': 'rise',
            'icons.family': 'duotone',
            'icons.weight': 90,
            'icons.tint': 18,
            'button.animation': 'lift',
            'page.transition': 'blur',
            'toast.glass': true,
            'auth.layout': 'split-reverse',
            'auth.card': 'glass',
            'auth.backdrop': 'aurora',
            'auth.glow': 'behind',
            'auth.noise': true,
        },
        tokens: {
            dark: palette({
                base: '#0a0918',
                card: '#120f26',
                raised: '#1b1737',
                overlay: '#272050',
                ink: '#ece8ff',
                muted: '#a79fd0',
                faint: '#7a72a6',
                inverse: '#ffffff',
                accent: '#8b5cf6',
                accentAlt: '#ec4899',
                accentGlow: '#f0abfc',
                line: '#d9d0ff',
                promoInk: '#ffffff',
                success: '#34d399',
                warning: '#fbbf24',
                danger: '#fb7185',
                offline: '#6f679a',
                chart1: '#8b5cf6',
                chart2: '#ec4899',
            }),
            light: palette({
                base: '#fdfbff',
                card: '#ffffff',
                raised: '#f5f0fe',
                overlay: '#e9defd',
                ink: '#1d1440',
                muted: '#5c4e8f',
                faint: '#7e73ad',
                inverse: '#ffffff',
                accent: '#7c3aed',
                accentAlt: '#db2777',
                line: '#1d1440',
                success: '#0f9d58',
                warning: '#b45309',
                danger: '#e11d48',
                chart1: '#7c3aed',
                chart2: '#db2777',
            }),
        },
    },
    {
        id: 'lava',
        label: 'Lava',
        blurb: 'A molten floor under near-black panels, with the accent set alight.',
        tags: ['Wallpaper', 'Glow links', 'Duotone icons'],
        mode: 'dark',
        fonts: { sans: 'figtree', display: 'montserrat', mono: 'fira-code' },
        theme: {
            'surface.radius': 12,
            'surface.opacity': 88,
            'surface.baseOpacity': 88,
            'surface.blur': 10,
            'background.image': `${WALL}/lava.webp`,
            'background.dim': 58,
            'sidebar.active': 'gradient',
            'manager.active': 'glow',
            'manager.actions': 'solid',
            'manager.actionsJoined': true,
            'console.metrics': 'below',
            'console.charts': 'below',
            'console.graph': 'under',
            'servers.animation': 'zoom',
            'icons.family': 'duotone',
            'icons.weight': 105,
            'icons.tint': 25,
            'button.animation': 'glint',
            'page.transition': 'scale',
            'toast.glass': true,
            'notice.design': 'edge',
            'auth.layout': 'hero',
            'auth.card': 'glass',
            'auth.align': 'center',
            'auth.backdrop': 'wallpaper',
            'auth.dim': 30,
            'auth.mask': 'vignette',
            'auth.glow': 'top',
            'auth.noise': true,
        },
        tokens: {
            dark: palette({
                base: '#0a0605',
                card: '#14090a',
                raised: '#1f0f0e',
                overlay: '#2c1614',
                ink: '#f5e7e2',
                muted: '#c1a09a',
                faint: '#8e6f6a',
                inverse: '#180703',
                accent: '#ff5e1a',
                accentAlt: '#f43f5e',
                accentGlow: '#fbbf24',
                line: '#ffd9c9',
                success: '#a3e635',
                warning: '#fbbf24',
                danger: '#f43f5e',
                offline: '#7c6a66',
                chart1: '#ff5e1a',
                chart2: '#fbbf24',
            }),
            light: palette({
                base: '#fffaf7',
                card: '#ffffff',
                raised: '#fdefe8',
                overlay: '#fadbcd',
                ink: '#2a1109',
                muted: '#7a4634',
                faint: '#9c6a58',
                inverse: '#ffffff',
                accent: '#e04a10',
                accentAlt: '#dc2626',
                line: '#2a1109',
                success: '#4d7c0f',
                warning: '#b45309',
                danger: '#dc2626',
                chart1: '#e04a10',
                chart2: '#b45309',
            }),
        },
    },
    {
        id: 'carbon',
        label: 'Carbon',
        blurb: 'Brushed graphite and one amber warning light, on an icon rail with nothing wasted.',
        tags: ['Icon rail', 'Full width', 'Dense'],
        mode: 'dark',
        fonts: { sans: 'rubik', display: 'outfit', mono: 'source-code-pro' },
        theme: {
            'surface.radius': 17,
            'surface.opacity': 92,
            'surface.baseOpacity': 90,
            'surface.blur': 6,
            'background.image': `${WALL}/carbon.webp`,
            'background.dim': 66,
            'page.width': 'full',
            'page.sidebarSolid': true,
            'sidebar.design': 'rail',
            'nav.searchStyle': 'wide',
            'manager.design': 'bordered',
            'manager.shell': 'flat',
            'manager.rows': 'tile',
            'manager.actions': 'outline',
            'manager.actionsJoined': true,
            'manager.controlsPlace': 'top',
            'console.metrics': 'above',
            'console.charts': 'below',
            'console.graph': 'under',
            'console.address': false,
            'servers.animation': 'slide',
            'addons.cards': 'tiles',
            'icons.family': 'sharp',
            'icons.weight': 95,
            'button.animation': 'slide',
            'page.transition': 'slide',
            'notice.design': 'plain',
            'auth.layout': 'frame',
            'auth.card': 'raised',
            'auth.backdrop': 'wallpaper',
            'auth.dim': 40,
            'auth.glow': 'corner',
        },
        tokens: {
            dark: palette({
                base: '#0b0b0d',
                card: '#111114',
                raised: '#17171b',
                overlay: '#202026',
                ink: '#e7e7ea',
                muted: '#a0a0a8',
                faint: '#71717a',
                inverse: '#17120a',
                accent: '#f59e0b',
                accentAlt: '#a1a1aa',
                accentGlow: '#fbbf24',
                line: '#e4e4e7',
                success: '#22c55e',
                warning: '#f59e0b',
                danger: '#ef4444',
                offline: '#71717a',
                chart1: '#f59e0b',
                chart2: '#a1a1aa',
            }),
            light: palette({
                base: '#fafafa',
                card: '#ffffff',
                raised: '#f4f4f5',
                overlay: '#e4e4e7',
                ink: '#18181b',
                muted: '#52525b',
                faint: '#71717a',
                inverse: '#ffffff',
                accent: '#b45309',
                accentAlt: '#52525b',
                line: '#18181b',
                success: '#15803d',
                warning: '#b45309',
                danger: '#dc2626',
                chart1: '#b45309',
                chart2: '#52525b',
            }),
        },
    },
    {
        id: 'paper',
        label: 'Paper',
        blurb: 'A light panel that reads like print: warm paper, one ink, and rules instead of shadows.',
        tags: ['Light', 'Editorial', 'Bordered'],
        mode: 'light',
        fonts: { sans: 'plex-sans', display: 'plex-sans', mono: 'ibm-plex-mono' },
        theme: {
            'surface.radius': 10,
            'sidebar.design': 'bordered',
            'manager.design': 'bordered',
            'manager.shell': 'flat',
            'manager.actions': 'soft',
            'console.graph': 'under',
            'servers.animation': 'fade',
            'icons.weight': 92,
            'page.transition': 'fade',
            'notice.design': 'edge',
            'auth.layout': 'stacked',
            'auth.card': 'card',
            'auth.align': 'center',
            'auth.backdrop': 'solid',
            'auth.mask': 'fade',
        },
        tokens: {
            dark: palette({
                base: '#14120f',
                card: '#1b1815',
                raised: '#24201c',
                overlay: '#302b25',
                ink: '#f0ebe3',
                muted: '#b3a99c',
                faint: '#857c70',
                inverse: '#14120f',
                accent: '#f97316',
                accentAlt: '#2dd4bf',
                line: '#f0ebe3',
                success: '#84cc16',
                warning: '#fbbf24',
                danger: '#f87171',
                chart1: '#f97316',
                chart2: '#2dd4bf',
            }),
            light: palette({
                base: '#fbfaf7',
                card: '#ffffff',
                raised: '#f4f2ed',
                overlay: '#e8e4db',
                ink: '#1c1a17',
                muted: '#57534e',
                faint: '#8a8378',
                inverse: '#fffbf5',
                accent: '#9a3412',
                accentAlt: '#115e59',
                line: '#1c1917',
                success: '#15803d',
                warning: '#a16207',
                danger: '#b91c1c',
                offline: '#a8a29e',
                chart1: '#9a3412',
                chart2: '#115e59',
            }),
        },
    },
];

const SHARED: Partial<ThemeConfig> = {
    'surface.border': 'subtle',
    'surface.shadow': 'soft',
    'toast.position': 'top-right',
};

for (const preset of THEME_PRESETS) {
    if (preset.stock !== true) {
        preset.theme = { ...preset.theme, ...SHARED };
    }
}

export function themeWithPreset(current: ThemeConfig, preset: ThemePreset): ThemeConfig {
    const next = { ...current };

    for (const key of PRESET_KEYS) {
        const chosen = preset.theme[key];

        (next as Record<string, unknown>)[key] = chosen === undefined ? THEME_DEFAULTS[key] : chosen;
    }

    return next;
}

export function presetPalette(preset: ThemePreset): TokenMap {
    return (preset.preview ?? preset.tokens)[preset.mode];
}

export function presetSwatches(preset: ThemePreset): string[] {
    const tokens = presetPalette(preset);

    return [tokens.accent, tokens['accent-alt'], tokens['surface-raised'], tokens['surface-base']];
}

function sameTokens(a: TokenMap, b: TokenMap): boolean {
    const names = Object.keys(a);

    return names.length === Object.keys(b).length && names.every((name) => a[name] === b[name]);
}

export function matchingPreset(theme: ThemeConfig, tokens: { dark: TokenMap; light: TokenMap }): string | null {
    for (const preset of THEME_PRESETS) {
        const wanted = themeWithPreset(theme, preset);

        const shape = PRESET_KEYS.every((key) => {
            const left = theme[key];
            const right = wanted[key];

            return typeof left === 'object' || typeof right === 'object'
                ? JSON.stringify(left) === JSON.stringify(right)
                : left === right;
        });

        if (shape && sameTokens(tokens.dark, preset.tokens.dark) && sameTokens(tokens.light, preset.tokens.light)) {
            return preset.id;
        }
    }

    return null;
}
