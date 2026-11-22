import http from '@/api/http';

export interface HytaleMod {
    file: string;
    name: string;
    size: number;
    modifiedAt: string | null;
    disabled: boolean;
}

export interface HytaleModPayload {
    available: boolean;
    directory: string;
    extensions: string[];
    mods: HytaleMod[];
}

export interface HytaleSearchHit {
    id: string;
    name: string;
    description: string;
    author: string;
    downloads: number;
    icon: string | null;
    url: string;
}

export interface HytaleSearchPayload {
    results: HytaleSearchHit[];
    page: number;
    total: number;
    hasMore: boolean;
    error: string | null;
}

export interface HytaleModFile {
    id: string;
    name: string;
    filename: string;
    size: number;
    releasedAt: string | null;
}

export const searchHytaleMods = async (
    uuid: string,
    query: string,
    page = 1
): Promise<HytaleSearchPayload> =>
    (await http.get(`/api/client/servers/${uuid}/hytale-mods/search`, { params: { query, page } })).data;

export const getHytaleModFiles = async (uuid: string, mod: string): Promise<{ files: HytaleModFile[] }> =>
    (await http.get(`/api/client/servers/${uuid}/hytale-mods/versions`, { params: { mod } })).data;

export const installHytaleModFile = async (
    uuid: string,
    mod: string,
    file: string
): Promise<{ file: string }> =>
    (await http.post(`/api/client/servers/${uuid}/hytale-mods/install`, { mod, file })).data;

export const getHytaleMods = async (uuid: string): Promise<HytaleModPayload> =>
    (await http.get(`/api/client/servers/${uuid}/hytale-mods`)).data;

export const toggleHytaleMod = async (uuid: string, file: string): Promise<{ file: string }> =>
    (await http.post(`/api/client/servers/${uuid}/hytale-mods/toggle`, { file })).data;

export const deleteHytaleMod = async (uuid: string, file: string): Promise<void> => {
    await http.delete(`/api/client/servers/${uuid}/hytale-mods`, { data: { file } });
};
