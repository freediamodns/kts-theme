import { action, Action } from 'easy-peasy';
import { AppearanceConfig } from '@/dezerx/lib/appearance';
import { ThemeConfig } from '@/dezerx/lib/panelTheme';

export interface SiteSettings {
    name: string;
    locale: string;
    recaptcha: {
        enabled: boolean;
        provider: 'recaptcha' | 'turnstile';
        siteKey: string;
    };
    dezerx?: {
        theme: Partial<ThemeConfig>;
        appearance: Partial<AppearanceConfig>;
    };
}

export interface SettingsStore {
    data?: SiteSettings;
    setSettings: Action<SettingsStore, SiteSettings>;
}

const settings: SettingsStore = {
    data: undefined,

    setSettings: action((state, payload) => {
        state.data = payload;
    }),
};

export default settings;
