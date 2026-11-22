
export interface LocaleMeta {
    code: string;
    name: string;
    english: string;
    flag: string;
    dir: 'ltr' | 'rtl';
    coverage: number;
}

export type Catalogue = Record<string, unknown>;

export const REFERENCE_LOCALE = 'en';

interface LocaleSettings {
    default: string;
    enabled: string[];
    picker: boolean;
    account: boolean;
}

interface BootWindow extends Window {
    SiteConfiguration?: {
        dezerx?: {
            theme?: {
                'locale.default'?: string;
                'locale.enabled'?: string[];
                'locale.picker'?: boolean;
                'locale.account'?: boolean;
            };
        };
    };
}

function settings(): LocaleSettings {
    const theme = typeof window === 'undefined' ? undefined : (window as BootWindow).SiteConfiguration?.dezerx?.theme;

    return {
        default: typeof theme?.['locale.default'] === 'string' ? theme['locale.default'] : REFERENCE_LOCALE,
        enabled: Array.isArray(theme?.['locale.enabled']) ? theme!['locale.enabled']! : [],
        picker: theme?.['locale.picker'] !== false,
        account: theme?.['locale.account'] !== false,
    };
}

export const LOCALE_SETTINGS = settings();

const RTL = new Set(['ar', 'arc', 'ckb', 'dv', 'fa', 'he', 'ku', 'nqo', 'pa-Arab', 'ps', 'sd', 'ug', 'ur', 'yi']);

const HOME_COUNTRY: Record<string, string> = {
    ar: 'sa',
    be: 'by',
    bn: 'bd',
    ca: 'es-ct',
    cs: 'cz',
    da: 'dk',
    el: 'gr',
    en: 'gb',
    et: 'ee',
    fa: 'ir',
    he: 'il',
    hi: 'in',
    ja: 'jp',
    kk: 'kz',
    ko: 'kr',
    ms: 'my',
    nb: 'no',
    nn: 'no',
    pa: 'in',
    sl: 'si',
    sr: 'rs',
    sv: 'se',
    sq: 'al',
    ta: 'lk',
    uk: 'ua',
    ur: 'pk',
    vi: 'vn',
    zh: 'cn',
};

function languageOf(code: string): string {
    return code.split(/[-_]/)[0]!.toLowerCase();
}

function regionOf(code: string): string | undefined {
    const region = code.split(/[-_]/).slice(1).find((part) => /^[A-Za-z]{2}$/.test(part) || /^\d{3}$/.test(part));

    return region?.toLowerCase();
}

function endonym(code: string): string {
    try {
        const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);

        if (name && name.toLowerCase() !== code.toLowerCase()) {
            return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
        }
    } catch {
    }

    return code;
}

function englishName(code: string): string {
    try {
        return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code;
    } catch {
        return code;
    }
}

function countKeys(value: unknown): number {
    if (typeof value === 'string') {
        return 1;
    }

    if (value && typeof value === 'object') {
        return Object.entries(value as Catalogue)
            .filter(([key]) => key !== '$meta')
            .reduce((total, [, child]) => total + countKeys(child), 0);
    }

    return 0;
}

function countCovered(reference: unknown, subject: unknown): number {
    if (typeof reference === 'string') {
        return typeof subject === 'string' && subject.trim() !== '' ? 1 : 0;
    }

    if (reference && typeof reference === 'object') {
        const source = (subject && typeof subject === 'object' ? subject : {}) as Catalogue;

        return Object.entries(reference as Catalogue)
            .filter(([key]) => key !== '$meta')
            .reduce((total, [key, child]) => total + countCovered(child, source[key]), 0);
    }

    return 0;
}

interface DeclaredMeta {
    name?: string;
    english?: string;
    flag?: string;
    dir?: 'ltr' | 'rtl';
}

const context = require.context('./locales', false, /\.json$/);

const catalogues: Record<string, Catalogue> = {};

for (const file of context.keys()) {
    const code = file.replace(/^\.\//, '').replace(/\.json$/, '');
    const loaded = context(file) as Catalogue;

    catalogues[code] = ((loaded as { default?: Catalogue }).default ?? loaded) as Catalogue;
}

const reference = catalogues[REFERENCE_LOCALE] ?? {};
const referenceSize = countKeys(reference);

function describe(code: string, catalogue: Catalogue): LocaleMeta {
    const declared = (catalogue.$meta ?? {}) as DeclaredMeta;
    const language = languageOf(code);

    return {
        code,
        name: declared.name || endonym(code),
        english: declared.english || englishName(code),
        flag: (declared.flag || regionOf(code) || HOME_COUNTRY[language] || language).toLowerCase(),
        dir: declared.dir || (RTL.has(language) ? 'rtl' : 'ltr'),
        coverage:
            code === REFERENCE_LOCALE || referenceSize === 0
                ? 1
                : countCovered(reference, catalogue) / referenceSize,
    };
}

export const ALL_LOCALES: LocaleMeta[] = Object.entries(catalogues)
    .map(([code, catalogue]) => describe(code, catalogue))
    .sort((a, b) => {
        if (a.code === REFERENCE_LOCALE) return -1;
        if (b.code === REFERENCE_LOCALE) return 1;

        return a.name.localeCompare(b.name);
    });

export const DEFAULT_LOCALE: string = ALL_LOCALES.some(
    (locale) => locale.code === LOCALE_SETTINGS.default
)
    ? LOCALE_SETTINGS.default
    : REFERENCE_LOCALE;

export const LOCALES: LocaleMeta[] = ALL_LOCALES.filter(
    (locale) =>
        LOCALE_SETTINGS.enabled.length === 0 ||
        LOCALE_SETTINGS.enabled.includes(locale.code) ||
        locale.code === DEFAULT_LOCALE
).sort((a, b) => {
    if (a.code === DEFAULT_LOCALE) return -1;
    if (b.code === DEFAULT_LOCALE) return 1;

    return a.name.localeCompare(b.name);
});

export const RESOURCES = Object.entries(catalogues).reduce(
    (all, [code, catalogue]) => ({ ...all, [code]: { translation: catalogue } }),
    {} as Record<string, { translation: Catalogue }>
);

export function isKnownLocale(code: string | null | undefined): code is string {
    return !!code && LOCALES.some((locale) => locale.code === code);
}

export function resolveLocale(tag: string | null | undefined): string | undefined {
    if (!tag) {
        return undefined;
    }

    const normalised = tag.replace('_', '-');

    if (isKnownLocale(normalised)) {
        return normalised;
    }

    const language = languageOf(normalised);

    if (isKnownLocale(language)) {
        return language;
    }

    return LOCALES.find((locale) => languageOf(locale.code) === language)?.code;
}

export function localeMeta(code: string): LocaleMeta {
    return ALL_LOCALES.find((locale) => locale.code === code) ?? describe(code, catalogues[code] ?? {});
}
