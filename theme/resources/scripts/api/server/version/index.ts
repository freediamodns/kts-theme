import http from '@/api/http';

export interface Platform {
    id: string;
    label: string;
    icon: string;
    color: string;
    description: string;
    group: string;
    groupLabel: string;
    experimental: boolean;
    deprecated: boolean;
    versionCount: number;
    builds: number;
}

export interface Entry {
    id: string;
    label: string;
    stable: boolean;
    java?: number;
}

export interface Installed {
    platform: string | null;
    label: string | null;
    version: string | null;
    build: string | null;
    buildLabel: string | null;
    java: number;
    source: 'panel' | 'files';
}

export interface Launch {
    argfile: string | null;
    jar: string;
    image: string | null;
}

export interface InstalledPayload {
    installed: Installed | null;
    launch: Launch;
}

export type ApplyState = 'idle' | 'queued' | 'stopping' | 'applying' | 'done' | 'failed';

export interface ApplyStatus {
    state: ApplyState;
    message: string;

    at?: number;
}

const base = (uuid: string) => `/api/client/servers/${uuid}/version`;

export const getPlatforms = async (uuid: string): Promise<Platform[]> => (await http.get(base(uuid))).data.platforms;

export const getInstalled = async (uuid: string, signal?: AbortSignal): Promise<InstalledPayload> =>
    (await http.get(`${base(uuid)}/installed`, { signal })).data;

export const getVersions = async (uuid: string, platform: string, signal?: AbortSignal): Promise<Entry[]> =>
    (await http.get(`${base(uuid)}/${platform}/versions`, { signal })).data.versions;

export const getBuilds = async (
    uuid: string,
    platform: string,
    version: string,
    signal?: AbortSignal
): Promise<Entry[]> =>
    (await http.get(`${base(uuid)}/${platform}/builds`, { params: { version }, signal })).data.builds;

export const applyVersion = async (
    uuid: string,
    body: { platform: string; version: string; build: string | null; wipe: boolean; eula: boolean },
    signal?: AbortSignal
): Promise<void> => {
    await http.post(`${base(uuid)}/apply`, body, { signal });
};

export const getApplyStatus = async (uuid: string): Promise<ApplyStatus> =>
    (await http.get(`${base(uuid)}/status`)).data;
