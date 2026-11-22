import http from '@/api/http';

export interface World {
    name: string;
    path: string;
    hasPlayers: boolean;
    hasNether: boolean;
    hasEnd: boolean;
    modifiedAt: string | null;
    active: boolean;
}

export interface WorldsPayload {
    available: boolean;
    active: string | null;
    worlds: World[];
}

export interface Dimension {
    name: string;
    path: string;
}

export interface LevelSummary {
    name: string | null;
    version: string | null;
    seed: string | null;
    hardcore: boolean;
    difficulty: string | null;
    gameType: number | null;
    spawn: { x: number; y: number; z: number } | null;
    lastPlayed: string | null;
}

export interface WorldDetails {
    dimensions: Dimension[];
    size: number;
    regions: number;
    players: number;
    level: LevelSummary | null;
}

export interface RegionEntry {
    name: string;
    file: string;
    x: number;
    z: number;
    size: number;
    modifiedAt: string | null;
}

export interface ChunkEntry {
    index: number;
    x: number;
    z: number;
    offset: number;
    sectors: number;
    bytes: number;
    modifiedAt: string | null;
}

export interface BlueMapStatus {
    supported: boolean;
    message?: string;
    platform?: string;
    minecraft?: string | null;
    directory?: string;
    installed?: string | null;
    version?: string | null;
    filename?: string | null;
    port?: number | null;
    token?: string | null;
    owner?: boolean;
}

export interface CatalogueWorld {
    id: string;
    name: string;
    summary: string;
    author: string;
    downloads: number;
    icon: string | null;
    screenshot: string | null;
    url: string;
    categories: string[];
    gameVersions: string[];
    updatedAt: string | null;
}

export interface CataloguePayload {
    results: CatalogueWorld[];
    page: number;
    total: number;
    hasMore: boolean;
    error: string | null;
}

export interface CatalogueFile {
    id: string;
    name: string;
    filename: string;
    gameVersions: string[];
    size: number;
    releasedAt: string | null;
    releaseType: number;
}

export interface CatalogueInfo {
    available: boolean;
    categories: { id: number; name: string }[];
}

export interface InstallStatus {
    state: 'idle' | 'downloading' | 'unpacking' | 'placing' | 'done' | 'failed';
    message?: string;
    world?: string;
    file?: string;
}

export const getCatalogue = async (uuid: string): Promise<CatalogueInfo> =>
    (await http.get(`/api/client/servers/${uuid}/worlds/catalogue`)).data;

export const searchWorlds = async (
    uuid: string,
    query: string,
    page = 1,
    category?: number,
    sort = 'popular',
    signal?: AbortSignal
): Promise<CataloguePayload> =>
    (
        await http.get(`/api/client/servers/${uuid}/worlds/search`, {
            params: { query, page, category, sort },
            signal,
        })
    ).data;

export const getWorldFiles = async (uuid: string, id: string): Promise<CatalogueFile[]> =>
    (await http.get(`/api/client/servers/${uuid}/worlds/files`, { params: { id } })).data.files;

export const installWorld = async (
    uuid: string,
    id: string,
    fileId?: string,
    name?: string,
    activate = false
): Promise<InstallStatus> =>
    (await http.post(`/api/client/servers/${uuid}/worlds/install`, { id, fileId, name, activate })).data;

export const getInstallStatus = async (uuid: string): Promise<InstallStatus> =>
    (await http.get(`/api/client/servers/${uuid}/worlds/install/status`)).data;

export const getViewerWorlds = async (uuid: string): Promise<WorldsPayload> =>
    (await http.get(`/api/client/servers/${uuid}/world-viewer/worlds`)).data;

export const getBlueMapStatus = async (uuid: string): Promise<BlueMapStatus> =>
    (await http.get(`/api/client/servers/${uuid}/world-viewer/bluemap`)).data;

export const installBlueMap = async (uuid: string): Promise<{ message?: string }> =>
    (await http.post(`/api/client/servers/${uuid}/world-viewer/bluemap`)).data;

export const blueMapUrl = (token: string): string => `/world-viewer/${token}/`;

export const getNbt = async (
    uuid: string,
    file: string
): Promise<{ file: string; compression: string; tree: unknown }> =>
    (await http.get(`/api/client/servers/${uuid}/world-viewer/nbt`, { params: { file } })).data;

export const saveNbt = async (uuid: string, file: string, compression: string, tree: unknown): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/world-viewer/nbt`, { file, compression, tree });
};

export const getDimensions = async (uuid: string, path: string): Promise<Dimension[]> =>
    (await http.get(`/api/client/servers/${uuid}/world-viewer/dimensions`, { params: { path } })).data.dimensions;

export const getRegions = async (uuid: string, path: string): Promise<RegionEntry[]> =>
    (await http.get(`/api/client/servers/${uuid}/world-viewer/regions`, { params: { path } })).data.regions;

export const getChunks = async (uuid: string, file: string, signal?: AbortSignal): Promise<ChunkEntry[]> =>
    (await http.get(`/api/client/servers/${uuid}/world-viewer/chunks`, { params: { file }, signal })).data.chunks;

export const getChunk = async (
    uuid: string,
    file: string,
    offset: number,
    sectors: number
): Promise<{ compression: string; tree: unknown }> =>
    (await http.get(`/api/client/servers/${uuid}/world-viewer/chunk`, { params: { file, offset, sectors } })).data;

export const getRegionMap = async (
    uuid: string,
    file: string,
    signal?: AbortSignal
): Promise<{ ready: boolean; image?: string }> =>
    (await http.get(`/api/client/servers/${uuid}/world-viewer/map`, { params: { file }, signal })).data;

export const deleteChunks = async (uuid: string, file: string, indexes: number[]): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/world-viewer/chunks/delete`, { file, indexes });
};
