import http from '@/api/http';

export type DayZSide = 'client' | 'server';

export interface DayZWorkshopItem {
    id: string;
    title: string;
    description: string;
    preview: string | null;
    size: number;
    updatedAt: number | null;
    subscriptions: number;
    tags: string[];
    url: string;
}

export interface DayZMod {
    raw: string;
    side: DayZSide | null;
    folder: string | null;
    kind: 'workshop' | 'upload' | 'unknown';
    workshopId?: string | null;
    name?: string;
    preview?: string | null;
    size?: number | null;
    url?: string | null;
    updatedAt?: number | null;
    subscriptions?: number | null;
    known?: boolean;
    onDisk?: boolean;
    folderModifiedAt?: number | null;
    updateAvailable?: boolean;
    keys?: string[] | null;
    missingKeys?: string[];
    cut?: 'breaks' | 'after' | null;
}

export interface DayZModsPayload {
    available: boolean;
    editable?: Record<DayZSide, boolean>;
    downloads?: boolean;
    orderHonoured?: Record<DayZSide, boolean>;
    search?: 'api' | 'pages';
    state?: string | null;
    lists?: Record<DayZSide, DayZMod[]>;
    modFile?: { name: string; mods: DayZMod[] } | null;
    unloaded?: DayZMod[];
}

export interface DayZSearchPayload {
    results: DayZWorkshopItem[];
    page: number;
    hasMore: boolean;
    error: string | null;
}

export interface DayZItemPayload {
    item: DayZWorkshopItem | null;
    collection: { id: string; items: DayZWorkshopItem[] } | null;
    requires: DayZWorkshopItem[];
}

const base = (uuid: string) => `/api/client/servers/${uuid}/dayz-mods`;

export const getDayZMods = async (uuid: string): Promise<DayZModsPayload> => (await http.get(base(uuid))).data;

export const searchDayZMods = async (uuid: string, query: string, page = 1): Promise<DayZSearchPayload> =>
    (await http.get(`${base(uuid)}/search`, { params: { query, page } })).data;

export const getDayZItem = async (uuid: string, id: string): Promise<DayZItemPayload> =>
    (await http.get(`${base(uuid)}/item`, { params: { id } })).data;

export const addDayZMods = async (uuid: string, ids: string[], side: DayZSide): Promise<{ added: string[] }> =>
    (await http.post(base(uuid), { ids, side })).data;

export const loadDayZFolder = async (uuid: string, folder: string, side: DayZSide): Promise<{ added: string[] }> =>
    (await http.post(`${base(uuid)}/load`, { folder, side })).data;

export const orderDayZMods = async (uuid: string, side: DayZSide, order: string[]): Promise<void> => {
    await http.post(`${base(uuid)}/order`, { side, order });
};

export const moveDayZMod = async (uuid: string, folder: string, to: DayZSide): Promise<void> => {
    await http.post(`${base(uuid)}/move`, { folder, to });
};

export const removeDayZMod = async (uuid: string, raw: string, side: DayZSide): Promise<void> => {
    await http.delete(base(uuid), { data: { raw, side } });
};

export const syncDayZKeys = async (uuid: string): Promise<{ copied: string[] }> =>
    (await http.post(`${base(uuid)}/keys`)).data;

export const deleteDayZFolder = async (uuid: string, folder: string): Promise<void> => {
    await http.delete(`${base(uuid)}/folder`, { data: { folder } });
};
