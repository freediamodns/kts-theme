
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import type { TOptions } from 'i18next';
import {
    ALL_LOCALES,
    DEFAULT_LOCALE,
    LOCALES,
    LOCALE_SETTINGS,
    REFERENCE_LOCALE,
    RESOURCES,
    localeMeta,
    resolveLocale,
} from './registry';

export { ALL_LOCALES, DEFAULT_LOCALE, LOCALES, LOCALE_SETTINGS, REFERENCE_LOCALE, localeMeta };
export type { LocaleMeta } from './registry';

const STORAGE_KEY = 'dezerx:locale';

function stored(): string | undefined {
    try {
        return window.localStorage.getItem(STORAGE_KEY) ?? undefined;
    } catch {
        return undefined;
    }
}

function remember(code: string): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
    }
}

function initialLocale(): string {
    const account = LOCALE_SETTINGS.account
        ? (window as { PterodactylUser?: { language?: string } }).PterodactylUser?.language
        : undefined;

    const browser = !LOCALE_SETTINGS.picker
        ? []
        : typeof navigator === 'undefined'
        ? []
        : navigator.languages ?? [navigator.language];

    const candidates = LOCALE_SETTINGS.picker ? [stored(), account, ...browser] : [account];

    for (const candidate of candidates) {
        const resolved = resolveLocale(candidate);

        if (resolved) {
            return resolved;
        }
    }

    return DEFAULT_LOCALE;
}

function describeDocument(code: string): void {
    const { dir } = localeMeta(code);

    document.documentElement.lang = code;
    document.documentElement.dir = dir;
}

const startingLocale = initialLocale();

i18n.use(initReactI18next).init({
    debug: process.env.DEBUG === 'true',
    lng: startingLocale,

    fallbackLng: DEFAULT_LOCALE === REFERENCE_LOCALE ? REFERENCE_LOCALE : [DEFAULT_LOCALE, REFERENCE_LOCALE],
    supportedLngs: ALL_LOCALES.map((locale) => locale.code),
    resources: RESOURCES,
    ns: ['translation'],
    defaultNS: 'translation',
    keySeparator: '.',
    nsSeparator: false,
    returnEmptyString: false,
    interpolation: {
        escapeValue: false,
    },
    react: {
        useSuspense: false,
    },
});

describeDocument(startingLocale);
i18n.on('languageChanged', describeDocument);

export type TranslateFn = (key: string, options?: TOptions) => string;

export function useT(): TranslateFn {
    return useTranslation().t as unknown as TranslateFn;
}

export function useLocale(): import('./registry').LocaleMeta {
    const { i18n: instance } = useTranslation();

    return localeMeta(resolveLocale(instance.language) ?? DEFAULT_LOCALE);
}

export const t: TranslateFn = (key, options) => i18n.t(key, options) as unknown as string;

export function currentLocale(): string {
    return resolveLocale(i18n.language) ?? DEFAULT_LOCALE;
}

export function setLocale(code: string): void {
    const resolved = resolveLocale(code) ?? DEFAULT_LOCALE;

    remember(resolved);
    void i18n.changeLanguage(resolved);
}

export default i18n;
