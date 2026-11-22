import http from '@/api/http';

export type DriveState = 'idle' | 'running' | 'done' | 'failed';

export interface DriveStatus {
    configured: boolean;
    connected: boolean;
    account: string | null;
    intervalHours: number;
    keep: number;
    lastRunAt: string | null;
    lastState: DriveState;
    lastMessage: string | null;
    connectUrl: string | null;
}

const base = (uuid: string) => `/api/client/servers/${uuid}/drive`;

export const getDrive = async (uuid: string): Promise<DriveStatus> => (await http.get(base(uuid))).data;

export const saveDrive = async (
    uuid: string,
    intervalHours: number,
    keep: number
): Promise<{ intervalHours: number; keep: number }> => (await http.put(base(uuid), { intervalHours, keep })).data;

export const runDrive = async (uuid: string): Promise<{ message: string }> =>
    (await http.post(`${base(uuid)}/run`)).data;

export const disconnectDrive = async (uuid: string): Promise<void> => {
    await http.delete(base(uuid));
};
