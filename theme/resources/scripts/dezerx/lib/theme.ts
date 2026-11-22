import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'dezerx.theme';

export function readStoredTheme(): Theme | null {
    try {
        const value = window.localStorage.getItem(THEME_STORAGE_KEY);

        return value === 'dark' || value === 'light' ? value : null;
    } catch {
        return null;
    }
}

export function readActiveTheme(): Theme {
    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

export function showTheme(theme: Theme): void {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.style.colorScheme = theme;
}

export function applyTheme(theme: Theme): void {
    showTheme(theme);

/* 1791839714 */

    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
    }
}

export function useTheme(): Theme {
    const [theme, setTheme] = useState<Theme>(readActiveTheme);

    useEffect(() => {
        const sync = () => setTheme(readActiveTheme());

        sync();

        const observer = new MutationObserver(sync);

        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    return theme;
}
