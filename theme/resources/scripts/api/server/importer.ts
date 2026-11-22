import http from '@/api/http';

export type TransferMode = 'merge' | 'replace' | 'skip-existing';

export type Protocol = 'sftp' | 'ftp';

export type ImportState = 'idle' | 'connecting' | 'scanning' | 'copying' | 'done' | 'failed';

export interface ImportHost {
    id: string;
    label: string;
    host: string;
    port: number;
    mode: Protocol;
    path: string;
    lastUsedAt: string | null;
}

export interface ImportCredential {
    id: string;
    label: string;
    username: string;
    auth: 'password' | 'key';
    lastUsedAt: string | null;
}

export interface HostInput {
    label: string;
    host: string;
    port: number;
    mode: Protocol;
    path?: string;
}

export interface CredentialInput {
    label: string;
    username: string;
    secret?: string;
}

export interface ImportProgress {
    current: number;
    total: number | null;
    bytes: number;
}

export interface ImportStatus {
    state: ImportState;
    message: string;
    startedAt: number | null;
    updatedAt: number | null;
    progress: ImportProgress | null;
}

export interface ImporterPayload {
    hosts: ImportHost[];
    credentials: ImportCredential[];
    modes: Protocol[];
    transferModes: TransferMode[];
    disk: number;
    maxFiles: number;
    maxProfiles: number;
    status: ImportStatus;
}

export interface ImportLogin {
    host_profile?: string;
    credential_profile?: string;
    host?: string;
    port?: number;
    mode?: Protocol;
    username?: string;
    secret?: string;
    source: string;
}

export interface RemoteEntry {
    name: string;
    size: number;
    directory: boolean;
}

export interface TestResult {
    ok: boolean;
    error?: string | null;
    banner?: string | null;
    source?: string;
    entries?: RemoteEntry[] | null;
}

export interface PreviewResult {
    ok: boolean;
    error: string | null;
    files: number;
    bytes: number;
    truncated: boolean;
    sample: string[];
    fits: boolean;
}

const base = (uuid: string) => `/api/client/servers/${uuid}/importer`;

export const getImporter = async (uuid: string): Promise<ImporterPayload> => (await http.get(base(uuid))).data;

export const getImportStatus = async (uuid: string): Promise<ImportStatus> =>
    (await http.get(`${base(uuid)}/status`)).data;

export const createHost = async (uuid: string, body: HostInput): Promise<ImportHost> =>
    (await http.post(`${base(uuid)}/hosts`, body)).data.host;

export const updateHost = async (uuid: string, id: string, body: HostInput): Promise<ImportHost> =>
    (await http.post(`${base(uuid)}/hosts/${id}`, body)).data.host;

export const deleteHost = async (uuid: string, id: string): Promise<void> => {
    await http.delete(`${base(uuid)}/hosts/${id}`);
};

export const createCredential = async (uuid: string, body: CredentialInput): Promise<ImportCredential> =>
    (await http.post(`${base(uuid)}/credentials`, body)).data.credential;

export const updateCredential = async (uuid: string, id: string, body: CredentialInput): Promise<ImportCredential> =>
    (await http.post(`${base(uuid)}/credentials/${id}`, body)).data.credential;

export const deleteCredential = async (uuid: string, id: string): Promise<void> => {
    await http.delete(`${base(uuid)}/credentials/${id}`);
};

export const testImport = async (uuid: string, login: ImportLogin): Promise<TestResult> =>
    (await http.post(`${base(uuid)}/test`, login, { timeout: 30000 })).data;

export const previewImport = async (uuid: string, login: ImportLogin): Promise<PreviewResult> =>
    (await http.post(`${base(uuid)}/preview`, login, { timeout: 45000 })).data;

export const startImport = async (
    uuid: string,
    body: ImportLogin & {
        destination: string;
        transferMode: TransferMode;
    }
): Promise<{ message: string }> => (await http.post(`${base(uuid)}/start`, body)).data;
