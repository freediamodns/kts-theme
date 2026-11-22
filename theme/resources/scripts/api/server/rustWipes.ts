import http from '@/api/http';

export type RustWipeType = 'map' | 'blueprints' | 'full';
export type RustWipeFrequency = 'once' | 'weekly' | 'biweekly' | 'monthly';
export type RustSeedMode = 'keep' | 'random' | 'list';
export type RustWipeStatus =
    | 'pending'
    | 'stopping'
    | 'wiping'
    | 'starting'
    | 'done'
    | 'failed'
    | 'cancelled'
    | 'missed';

export interface RustWipeSettings {
    name: string;
    enabled: boolean;
    frequency: RustWipeFrequency;
    weekday: number | null;
    startsOn: string | null;
    time: string;
    timezone: string;
    type: RustWipeType;
    warnings: number[];
    message: string;
    seedMode: RustSeedMode;
    seeds: string[];
    worldSize: number | null;
    extraFiles: string[];
    startAfter: boolean;
}

export interface RustWipeSchedule extends RustWipeSettings {
    id: number;
    nextRunAt: number | null;
    lastRunAt: number | null;
}

export interface RustWipeRun {
    id: number;
    wipeId: number | null;
    name: string;
    trigger: 'schedule' | 'manual';
    status: RustWipeStatus;
    type: RustWipeType;
    warnings: number[];
    warned: number[];
    scheduledFor: number;
    startedAt: number | null;
    finishedAt: number | null;
    seed: string | null;
    deleted: string[];
    error: string | null;
}

export interface RustWipeBucket {
    files: number;
    size: number;
}

export interface RustWipesIndex {
    directory: string;
    readable: boolean;
    state: string | null;
    buckets: Record<'map' | 'blueprints' | 'players', RustWipeBucket>;
    world: {
        seed: string | null;
        size: number | null;
        seedEditable: boolean;
        sizeEditable: boolean;
        customMap: boolean;
    };
    limits: {
        warnings: number[];
        schedules: number;
        extraFiles: number;
        seeds: number;
        minSize: number;
        maxSize: number;
    };
    defaultMessage: string;
    wipes: RustWipeSchedule[];
    active: RustWipeRun | null;
    runs: RustWipeRun[];
}

const base = (uuid: string) => `/api/client/servers/${uuid}/rust-wipes`;

export const getRustWipes = async (uuid: string): Promise<RustWipesIndex> => (await http.get(base(uuid))).data;

export const createRustWipe = async (uuid: string, settings: RustWipeSettings): Promise<RustWipeSchedule> =>
    (await http.post(base(uuid), settings)).data;

export const updateRustWipe = async (uuid: string, id: number, settings: RustWipeSettings): Promise<RustWipeSchedule> =>
    (await http.put(`${base(uuid)}/${id}`, settings)).data;

export const deleteRustWipe = async (uuid: string, id: number): Promise<void> => {
    await http.delete(`${base(uuid)}/${id}`);
};

export const runRustWipe = async (
    uuid: string,
    options: { type: RustWipeType; delay: number; seedMode: 'keep' | 'random' }
): Promise<RustWipeRun> => (await http.post(`${base(uuid)}/run`, options)).data;

export const cancelRustWipeRun = async (uuid: string, id: number): Promise<RustWipeRun> =>
    (await http.post(`${base(uuid)}/runs/${id}/cancel`)).data;
