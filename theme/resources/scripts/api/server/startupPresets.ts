import http from '@/api/http';

export interface StartupPreset {
    id: string;
    label: string;
    description: string;
    command: string;
}

export function getStartupPresets(uuid: string): Promise<StartupPreset[]> {
    return http
        .get(`/api/client/servers/${uuid}/startup/presets`)
        .then(({ data }) => (data.presets ?? []) as StartupPreset[]);
}

export function applyStartupPreset(uuid: string, preset: string): Promise<{ message: string }> {
    return http
        .post(`/api/client/servers/${uuid}/startup/presets`, { preset })
        .then(({ data }) => data as { message: string });
}
