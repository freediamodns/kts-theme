import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { t } from '@/i18n';

export interface DemoConfig {
    enabled: boolean;
    username: string;
    password: string;
}

interface BootWindow extends Window {
    SiteConfiguration?: { dezerx?: { demo?: Partial<DemoConfig> } };
}

export function demoCredentials(): { username: string; password: string } | null {
    const saved = (window as BootWindow).SiteConfiguration?.dezerx?.demo;

    if (saved?.enabled !== true || !saved.username || !saved.password) {
        return null;
    }

    return { username: saved.username, password: saved.password };
}

export function isDemoUser(): boolean {
    return (window as unknown as { PterodactylUser?: { demo?: boolean } }).PterodactylUser?.demo === true;
}

export function useDemo(): boolean {
    return useStoreState((state: ApplicationStore) => state.user.data?.demo) === true;
}

export function demoRefusal(): string {
    return t('demo.refusal');
}
