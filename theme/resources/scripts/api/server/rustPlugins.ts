import http from '@/api/http';

export type RustPluginSort = 'downloads' | 'latest_release_at' | 'created_at' | 'title' | 'watchers';

export interface InstalledRustPlugin {
    file: string;
    name: string;
    title: string;
    author: string | null;
    version: string | null;
    description: string;
    size: number;
    modifiedAt: string | null;
    disabled: boolean;
    config: string | null;
    icon: string | null;
    url: string | null;
    latest: string | null;
    updatable: boolean;
}

export interface RustPluginsIndex {
    framework: 'oxide' | 'carbon';
    configured: 'vanilla' | 'oxide' | 'carbon' | null;
    directory: string;
    available: boolean;
    running: boolean;
    installed: InstalledRustPlugin[];
}

export interface UModHit {
    id: string;
    name: string;
    description: string;
    author: string;
    icon: string | null;
    url: string;
    downloads: number;
    stars: number;
    updatedAt: string | null;
    version: string | null;
}

export interface UModSearch {
    results: UModHit[];
    page: number;
    pages: number;
    total: number;
}

const base = (uuid: string) => `/api/client/servers/${uuid}/rust-plugins`;

export const getRustPlugins = async (uuid: string): Promise<RustPluginsIndex> => {
    const { data } = await http.get(base(uuid));

    return {
        framework: data.framework,
        configured: data.configured,
        directory: data.directory,
        available: data.available,
        running: data.running,
        installed: data.plugins ?? [],
    };
};

export const searchUMod = async (
    uuid: string,
    params: { query: string; page: number; sort: RustPluginSort }
): Promise<UModSearch> => (await http.get(`${base(uuid)}/search`, { params })).data;

export const installRustPlugin = async (
    uuid: string,
    name: string
): Promise<{ installed: boolean; file: string; disabled: boolean }> =>
    (await http.post(`${base(uuid)}/install`, { name })).data;

export const toggleRustPlugin = async (uuid: string, file: string): Promise<{ file: string; disabled: boolean }> =>
    (await http.post(`${base(uuid)}/toggle`, { file })).data;

export const reloadRustPlugin = async (uuid: string, name: string): Promise<void> => {
    await http.post(`${base(uuid)}/reload`, { name });
};

export const deleteRustPlugin = async (uuid: string, file: string): Promise<void> => {
    await http.delete(base(uuid), { data: { file } });
};
