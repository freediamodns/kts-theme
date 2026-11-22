import { applyDraft, publishAppearance } from '@/dezerx/lib/appearance';
import { applyFaviconPreview } from '@/dezerx/lib/favicon';
import { clearFontPreview, findFont, previewFont, type FontOption, type FontSlot } from '@/dezerx/lib/fonts';
import {
    THEME_DEFAULTS,
    applyThemeDraft,
    publishTheme,
    rendersDifferently,
    type ThemeConfig,
} from '@/dezerx/lib/panelTheme';
import type { EditorAppearance, TokenGroup } from '@/dezerx/components/editor/Appearance';
import type { Choice, EditorEgg } from '@/dezerx/components/editor/Controls';
import type { PermissionCatalogue } from '@/dezerx/components/editor/ServerTabs';

export interface OptionSpec {
    key: keyof ThemeConfig;
    type:
        | 'choice'
        | 'toggle'
        | 'range'
        | 'image'
        | 'images'
        | 'text'
        | 'links'
        | 'quickLinks'
        | 'navItems'
        | 'serverTabs'
        | 'overviewBlocks'
        | 'navGroups'
        | 'locales'
        | 'locale'
        | 'notices'
        | 'rules'
        | 'css'
        | 'eggArt';
    label: string;
    hint?: string;
    choices?: Choice[];
    preview?: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    placeholder?: string;
    multiline?: boolean;
    nodes?: boolean;
    when?: Record<string, (string | boolean)[]>;
    whenSet?: string[];
    whenBelow?: Record<string, number>;
}

export interface GroupSpec {
    id: string;
    label: string;
    options: OptionSpec[];
}

export interface SectionSpec {
    id: string;
    label: string;
    hint: string;
    icon: string;
    remote: 'appearance' | 'interface' | 'addons' | null;
    new?: boolean;
    groups: GroupSpec[];
}

export interface EditorNode {
    id: number;
    name: string;
}

export interface EditorData {
    schema: { sections: SectionSpec[]; defaults: ThemeConfig };
    nodes?: EditorNode[];
    theme: ThemeConfig;
    appearance: EditorAppearance;
    tokenGroups: Record<string, TokenGroup>;
    fontCatalogue: FontOption[];
    fontSlots: FontSlot[];
    eggs: EditorEgg[];
    permissions: PermissionCatalogue;
}

export const DEFAULT_SECTION = 'brand';

export interface EditorSession {
    fetched: boolean;
    data: EditorData | null;
    theme: ThemeConfig;
    saved: ThemeConfig | null;
    appearance: EditorAppearance | null;
    savedAppearance: EditorAppearance | null;
    dirty: boolean;
    section: string;
}

export const session: EditorSession = {
    fetched: false,
    data: null,
    theme: THEME_DEFAULTS,
    saved: null,
    appearance: null,
    savedAppearance: null,
    dirty: false,
    section: DEFAULT_SECTION,
};

const FONT_SLOTS: FontSlot[] = ['sans', 'display', 'mono'];

let published: ThemeConfig | null = null;

export function applySession(open: boolean): void {
    const theme = open ? session.theme : session.saved;
    const appearance = open ? session.appearance : session.savedAppearance;

    applyThemeDraft(theme);

    if (theme !== null && (published === null || rendersDifferently(published, theme))) {
        published = theme;
        publishTheme(theme);
    }

    applyDraft(appearance?.tokens ?? null);
    publishAppearance(appearance);

    applyFaviconPreview(theme === null ? null : theme['seo.favicon']);

    const catalogue = session.data?.fontCatalogue;

    if (!appearance || !catalogue) {
        clearFontPreview();

        return;
    }

    for (const slot of FONT_SLOTS) {
        previewFont(slot, findFont(catalogue, appearance.fonts[slot]));
    }
}
