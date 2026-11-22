import { useCallback, useEffect, useState } from 'react';
import { useExternalStore } from '@/dezerx/lib/externalStore';

export type ThemeName = 'dark' | 'light';

export type TokenMap = Record<string, string>;

export interface ThemeTokens {
    dark: TokenMap;
    light: TokenMap;
}

export interface ColorPreset {
    id: string;
    label: string;
    swatch: string;
    dark: TokenMap;
    light: TokenMap;
}

export interface LogoConfig {
    mode: 'image' | 'text' | 'both';
    text: string;
    image: string;
    imageLight: string;
    mark: string | null;
    alt: string;
}

export interface FontChoices {
    sans: string;
    display: string;
    mono: string;
}

export interface AppearanceConfig {
    logo: LogoConfig;
    fonts: FontChoices;
    presets: ColorPreset[];
    defaultPreset: string;
    allowUserPresets: boolean;
}

export const PRESET_STORAGE_KEY = 'dezerx.preset';

const BASE_STYLE_ID = 'appearance-base';

const PRESET_STYLE_ID = 'appearance-preset';

const DRAFT_STYLE_IDS = {
    panel: 'appearance-draft',
    preset: 'appearance-draft-preset',
} as const;

export type DraftLayer = keyof typeof DRAFT_STYLE_IDS;

const STYLE_ORDER = [
    BASE_STYLE_ID,
    PRESET_STYLE_ID,
    DRAFT_STYLE_IDS.panel,
    DRAFT_STYLE_IDS.preset,
    'theme-base',
    'theme-draft',
];

export const THEMES: ThemeName[] = ['dark', 'light'];

export function promoteStyles(): void {
    STYLE_ORDER.forEach((id) => {
        const style = document.getElementById(id);

        if (style) {
            document.head.appendChild(style);
        }
    });
}

export const APPEARANCE_FALLBACK: AppearanceConfig = {
    logo: { mode: 'text', text: 'KTS Host', image: '', imageLight: '', mark: null, alt: '' },
    fonts: { sans: 'montserrat', display: 'montserrat', mono: 'system-mono' },
    presets: [],
    defaultPreset: 'default',
    allowUserPresets: false,
};

interface BootWindow extends Window {
    SiteConfiguration?: { dezerx?: { appearance?: Partial<AppearanceConfig> } };
}

function readBoot(): AppearanceConfig {
    if (typeof window === 'undefined') {
        return APPEARANCE_FALLBACK;
    }

    return { ...APPEARANCE_FALLBACK, ...((window as BootWindow).SiteConfiguration?.dezerx?.appearance ?? {}) };
}

let ambient: AppearanceConfig = readBoot();

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

function snapshot(): AppearanceConfig {
    return ambient;
}

export function publishAppearance(next: Partial<AppearanceConfig> | null): void {
    ambient = next ? { ...APPEARANCE_FALLBACK, ...next } : readBoot();

    for (const listener of listeners) {
        listener();
    }
}

export function useAppearance(): AppearanceConfig {
    return useExternalStore(subscribe, snapshot);
}

export function readStoredPreset(): string | null {
    try {
        return window.localStorage.getItem(PRESET_STORAGE_KEY);
    } catch {
        return null;
    }
}

export function applyPreset(preset: ColorPreset | null): void {
    const style = ensureStyle(PRESET_STYLE_ID);

    style.textContent = preset ? tokensToCss(preset) : '';
    promoteStyles();

/* 338529 */

    try {
        if (preset) {
            window.localStorage.setItem(PRESET_STORAGE_KEY, preset.id);
        } else {
            window.localStorage.removeItem(PRESET_STORAGE_KEY);
        }
    } catch {
    }
}

export function applyDraft(tokens: ThemeTokens | null, layer: DraftLayer = 'panel'): void {
    ensureStyle(DRAFT_STYLE_IDS[layer]).textContent = tokens ? tokensToCss(tokens) : '';

    promoteStyles();
}

export function tokensToCss(tokens: ThemeTokens): string {
    const blocks: [string, TokenMap][] = [
        [':root', tokens.dark],
        [':root.light', tokens.light],
    ];

    return blocks
        .map(([selector, values]) => {
            const body = Object.entries(values ?? {})
                .map(([name, value]) => `--${name}:${value};`)
                .join('');

            return body ? `${selector}{${body}}` : '';
        })
        .join('');
}

function ensureStyle(id: string): HTMLStyleElement {
    const existing = document.getElementById(id);

    if (existing instanceof HTMLStyleElement) {
        return existing;
    }

    const style = document.createElement('style');

    style.id = id;
    document.head.appendChild(style);

    return style;
}

export function useColorPreset(): {
    presets: ColorPreset[];
    active: ColorPreset | null;
    select: (preset: ColorPreset) => void;
} {
    const { presets, defaultPreset } = useAppearance();
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        const stored = readStoredPreset();
        const known = presets.some((preset) => preset.id === stored);

        setActiveId(known && stored ? stored : defaultPreset);
    }, [presets, defaultPreset]);

    const select = useCallback((preset: ColorPreset) => {
        applyPreset(preset);
        setActiveId(preset.id);
    }, []);

    return {
        presets,
        active: presets.find((preset) => preset.id === activeId) ?? null,
        select,
    };
}

export function readStylesheetDefaults(names: string[]): ThemeTokens {
    const root = document.documentElement;
    const overrides = [BASE_STYLE_ID, PRESET_STYLE_ID, DRAFT_STYLE_IDS.panel, DRAFT_STYLE_IDS.preset]
        .map((id) => document.getElementById(id))
        .filter((node): node is HTMLStyleElement => node instanceof HTMLStyleElement);

    const wasLight = root.classList.contains('light');

    overrides.forEach((node) => {
        node.disabled = true;
    });

    const read = (): TokenMap => {
        const computed = getComputedStyle(root);

        return Object.fromEntries(names.map((name) => [name, computed.getPropertyValue(`--${name}`).trim()]));
    };

    root.classList.remove('light');
    const dark = read();

    root.classList.add('light');
    const light = read();

    root.classList.toggle('light', wasLight);

    overrides.forEach((node) => {
        node.disabled = false;
    });

    return { dark, light };
}

export function toHex(value: string, fallback = '#000000'): string {
    const trimmed = value.trim();

    if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
        return trimmed.toLowerCase();
    }

    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
        const [, r, g, b] = trimmed;

        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }

    const parts = trimmed.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);

    if (!parts) {
        return fallback;
    }

    return `#${parts
        .slice(1, 4)
        .map((part) =>
            Math.min(255, Math.max(0, Number(part)))
                .toString(16)
                .padStart(2, '0')
        )
        .join('')}`;
}

export function toRgb(hex: string): string {
    const normalised = toHex(hex);

    const [r, g, b] = [1, 3, 5].map((start) => parseInt(normalised.slice(start, start + 2), 16));

    return `rgb(${r} ${g} ${b})`;
}
