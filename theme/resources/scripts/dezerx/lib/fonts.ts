export interface FontOption {
    id: string;
    label: string;
    stack: string;
    href: string | null;
    slots: string[];
}

export type FontSlot = 'sans' | 'display' | 'mono';

export const FONT_SLOTS: FontSlot[] = ['sans', 'display', 'mono'];

const SHEET_ATTRIBUTE = 'data-font-preview';

export function loadFontSheet(href: string | null): void {
    if (!href || typeof document === 'undefined') {
        return;
    }

    if (document.head.querySelector(`link[${SHEET_ATTRIBUTE}="${CSS.escape(href)}"]`)) {
        return;
    }

    const link = document.createElement('link');

    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(SHEET_ATTRIBUTE, href);
    document.head.appendChild(link);
}

export function previewFont(slot: FontSlot, font: FontOption | null): void {
    if (typeof document === 'undefined') {
        return;
    }

    const property = `--font-${slot}`;

    if (!font) {
        document.documentElement.style.removeProperty(property);

        return;
    }

    loadFontSheet(font.href);
    document.documentElement.style.setProperty(property, font.stack);
}

export function clearFontPreview(): void {
    if (typeof document === 'undefined') {
        return;
    }

    for (const slot of FONT_SLOTS) {
        document.documentElement.style.removeProperty(`--font-${slot}`);
    }
}

export function fontsForSlot(catalogue: FontOption[], slot: FontSlot): FontOption[] {
    return catalogue.filter((font) => font.slots.includes(slot));
}

export function findFont(catalogue: FontOption[], id: string): FontOption | null {
    return catalogue.find((font) => font.id === id) ?? null;
}
