import http from '@/api/http';

export interface PalworldMod {
    file: string;
    name: string;
    size: number;
    modifiedAt: string | null;
    disabled: boolean;
    archive: boolean;
}

export interface PalworldModPayload {
    available: boolean;
    directory: string;
    extensions: string[];
    mods: PalworldMod[];
}

export interface PalworldSearchHit {
    id: string;
    name: string;
    description: string;
    author: string;
    category: string;
    downloads: number;
    icon: string | null;
    url: string;
}

export interface PalworldSearchPayload {
    results: PalworldSearchHit[];
    page: number;
    total: number;
    hasMore: boolean;
    error: string | null;
}

export interface PalworldModFile {
    id: string;
    name: string;
    filename: string;
    size: number;
    releasedAt: string | null;
}

export const searchPalworldMods = async (
    uuid: string,
    query: string,
    page = 1
): Promise<PalworldSearchPayload> =>
    (await http.get(`/api/client/servers/${uuid}/palworld-mods/search`, { params: { query, page } })).data;

export const getPalworldModFiles = async (uuid: string, mod: string): Promise<{ files: PalworldModFile[] }> =>
    (await http.get(`/api/client/servers/${uuid}/palworld-mods/versions`, { params: { mod } })).data;

export const installPalworldModFile = async (
    uuid: string,
    mod: string,
    file: string
): Promise<{ file: string; archive: boolean }> =>
    (await http.post(`/api/client/servers/${uuid}/palworld-mods/install`, { mod, file })).data;

export const getPalworldMods = async (uuid: string): Promise<PalworldModPayload> =>
    (await http.get(`/api/client/servers/${uuid}/palworld-mods`)).data;

export const togglePalworldMod = async (uuid: string, file: string): Promise<{ file: string }> =>
    (await http.post(`/api/client/servers/${uuid}/palworld-mods/toggle`, { file })).data;

export const unpackPalworldMod = async (uuid: string, file: string): Promise<{ file: string }> =>
    (await http.post(`/api/client/servers/${uuid}/palworld-mods/unpack`, { file })).data;

export const deletePalworldMod = async (uuid: string, file: string): Promise<void> => {
    await http.delete(`/api/client/servers/${uuid}/palworld-mods`, { data: { file } });
};
