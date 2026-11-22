import http from '@/api/http';

export type AddonKind = 'plugins' | 'mods';

export type AddonSource = 'modrinth' | 'spigot' | 'curseforge';

export interface InstalledAddon {
    file: string;
    name: string;
    size: number;
    modifiedAt: string | null;
    disabled: boolean;
    icon: string | null;
    url: string | null;
    source: AddonSource | null;
}

export interface AddonPayload {
    available: boolean;
    addons: InstalledAddon[];
    sources: AddonSource[];
    loaders: string[];
}

export interface SearchResult {
    source: AddonSource;
    id: string;
    name: string;
    description: string;
    author: string;
    authorUrl: string | null;
    downloads: number;
    stars: number | null;
    updatedAt: string | null;
    icon: string | null;
    url: string;
    installable: boolean;
    reason: string | null;
}

export interface AddonVersion {
    id: string;
    name: string;
    channel: string;
    gameVersions: string[];
    loaders: string[];
    downloads: number;
    publishedAt: string | null;
    size: number;
    installable: boolean;
    reason?: string;
}

export interface SearchPayload {
    results: SearchResult[];
    page: number;
    total: number | null;
    hasMore: boolean;

    maxPage?: number;

    error?: string | null;
}

const base = (uuid: string, kind: AddonKind) => `/api/client/servers/${uuid}/${kind}`;

export const getInstalled = async (uuid: string, kind: AddonKind): Promise<AddonPayload> =>
    (await http.get(base(uuid, kind))).data;

export const getGameVersions = async (uuid: string, kind: AddonKind): Promise<string[]> =>
    (await http.get(`${base(uuid, kind)}/game-versions`)).data.versions;

export const searchAddons = async (
    uuid: string,
    kind: AddonKind,
    params: { source: string; query: string; version?: string; loader?: string; page: number },
    signal?: AbortSignal
): Promise<SearchPayload> => (await http.get(`${base(uuid, kind)}/search`, { params, signal })).data;

export const getAddonVersions = async (
    uuid: string,
    kind: AddonKind,
    source: string,
    id: string,
    signal?: AbortSignal
): Promise<AddonVersion[]> =>
    (await http.get(`${base(uuid, kind)}/versions`, { params: { source, id }, signal })).data.versions;

export const installAddon = async (
    uuid: string,
    kind: AddonKind,
    source: string,
    id: string,
    versionId?: string,
    filters?: { loader?: string; version?: string },
    project?: { title?: string; icon?: string | null; url?: string }
): Promise<string> =>
    (
        await http.post(`${base(uuid, kind)}/install`, {
            source,
            id,
            versionId,
            loader: filters?.loader || undefined,
            version: filters?.version || undefined,
            title: project?.title || undefined,
            icon: project?.icon || undefined,
            projectUrl: project?.url || undefined,
        })
    ).data.file;

export const toggleAddon = async (uuid: string, kind: AddonKind, file: string): Promise<string> =>
    (await http.post(`${base(uuid, kind)}/toggle`, { file })).data.file;

export const deleteAddon = async (uuid: string, kind: AddonKind, file: string): Promise<void> => {
    await http.delete(base(uuid, kind), { data: { file } });
};

export type ModpackKind = 'server-zip' | 'installer' | 'mrpack' | 'none';

export type ModpackSource = 'curseforge' | 'modrinth' | 'ftb' | 'atlauncher' | 'technic';

export interface ModpackResult {
    source: ModpackSource;
    id: string;
    name: string;
    description: string;
    author: string;
    downloads: number;
    icon: string | null;
    url: string;
    kind: ModpackKind;
    installable: boolean;
}

export interface ModpackVersion {
    id: string;
    name: string;
    gameVersions: string[];
    loaders: string[];
    publishedAt: string | null;
    size: number;
}

export interface ModpackSearchPayload {
    results: ModpackResult[];
    page: number;
    total: number | null;
    hasMore: boolean;
    maxPage?: number;
}

const packs = (uuid: string) => `/api/client/servers/${uuid}/modpacks`;

export const getModpackSources = async (uuid: string): Promise<ModpackSource[]> =>
    (await http.get(packs(uuid))).data.sources;

export const searchModpacks = async (
    uuid: string,
    params: { source: string; query: string; page: number },
    signal?: AbortSignal
): Promise<ModpackSearchPayload> => (await http.get(`${packs(uuid)}/search`, { params, signal })).data;

export const getModpackVersions = async (
    uuid: string,
    source: string,
    id: string,
    signal?: AbortSignal
): Promise<ModpackVersion[]> =>
    (await http.get(`${packs(uuid)}/versions`, { params: { source, id }, signal })).data.versions;

export type ModpackState = 'idle' | 'stopping' | 'downloading' | 'installing' | 'done' | 'failed';

export interface ModpackStatus {
    state: ModpackState;
    message: string;
}

export const getModpackStatus = async (uuid: string): Promise<ModpackStatus> =>
    (await http.get(`${packs(uuid)}/status`)).data;

export const installModpack = async (
    uuid: string,
    source: string,
    id: string,
    versionId?: string,
    wipe = false
): Promise<{ file: string; kind: ModpackKind; message: string }> =>
    (await http.post(`${packs(uuid)}/install`, { source, id, versionId, wipe })).data;
