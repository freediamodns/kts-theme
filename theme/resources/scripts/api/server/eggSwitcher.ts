import http from '@/api/http';

export interface EggTarget {
    uuid: string;
    name: string;
    description: string;
    nest: string;
    images: string[];
}

export interface EggSwitchOptions {
    startup: 'force' | 'choose';
    reinstall: 'force' | 'choose';
    wipe: 'force' | 'choose' | 'denied';
}

export interface EggSwitchChoices {
    startup: boolean;
    reinstall: boolean;
    wipe: boolean;
}

export interface EggSwitcherPayload {
    current: { uuid: string; name: string; nest: string; image: string };
    targets: EggTarget[];
    offered: number;
    blocked: string | null;
    options: EggSwitchOptions;
}

export function getEggSwitcher(uuid: string): Promise<EggSwitcherPayload> {
    return http.get(`/api/client/servers/${uuid}/egg-switcher`).then(({ data }) => data as EggSwitcherPayload);
}

export function switchEgg(
    uuid: string,
    egg: string,
    choices: EggSwitchChoices
): Promise<{ egg: string; message: string; reinstalled: boolean }> {
    return http
        .post(`/api/client/servers/${uuid}/egg-switcher`, { egg, ...choices })
        .then(({ data }) => data as { egg: string; message: string; reinstalled: boolean });
}
