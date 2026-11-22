import http from '@/api/http';

export interface PropertyField {
    key: string;
    label: string;
    help?: string;
    type: 'toggle' | 'number' | 'choice' | 'text';
    group: 'presentation' | 'gameplay' | 'world' | 'access';
    options?: string[];
    min?: number;
    max?: number;
}

export interface PropertiesPayload {
    available: boolean;
    message?: string;
    fields?: PropertyField[];
    values?: Record<string, string>;
    running?: boolean;
}

export interface GeyserStatus {
    supported: boolean;
    message?: string;
    platform?: string | null;
    directory?: string;
    installed?: string | null;
    floodgate?: string | null;
    floodgateAvailable?: boolean;
    version?: string | null;
    port?: { ip: string; port: number } | null;
}

export type PropertyValue = string | number | boolean;

const base = (uuid: string) => `/api/client/servers/${uuid}/properties`;

export const getProperties = async (uuid: string): Promise<PropertiesPayload> => (await http.get(base(uuid))).data;

export const saveProperties = async (
    uuid: string,
    values: Record<string, PropertyValue>
): Promise<{ saved: string[]; running: boolean }> => (await http.put(base(uuid), { values })).data;

export const getServerIcon = async (uuid: string): Promise<string | null> =>
    (await http.get(`${base(uuid)}/icon`)).data.icon;

export const uploadServerIcon = async (uuid: string, file: File): Promise<string> => {
    const body = new FormData();

    body.append('icon', file);

    return (await http.post(`${base(uuid)}/icon`, body, { headers: { 'Content-Type': 'multipart/form-data' } })).data
        .icon;
};

export const deleteServerIcon = async (uuid: string): Promise<void> => {
    await http.delete(`${base(uuid)}/icon`);
};

export const getGeyser = async (uuid: string): Promise<GeyserStatus> => (await http.get(`${base(uuid)}/geyser`)).data;

export const installGeyser = async (uuid: string): Promise<{ message?: string }> =>
    (await http.post(`${base(uuid)}/geyser`)).data;
