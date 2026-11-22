import http from '@/api/http';

export interface DatabaseTransferSummary {
    tables: number | null;
    size: number | null;
    maxUploadKb: number;
}

export interface DatabaseImportResult {
    statements: number;
    dropped: number;
    failed: string[];
}

const TRANSFER_TIMEOUT = 600000;

export const getDatabaseTransfer = async (uuid: string, id: string): Promise<DatabaseTransferSummary> =>
    (await http.get(`/api/client/servers/${uuid}/databases/${id}/transfer`)).data;

export const exportDatabase = async (uuid: string, id: string, name: string): Promise<void> => {
    let response;

    try {
        response = await http.get(`/api/client/servers/${uuid}/databases/${id}/export`, {
            responseType: 'blob',
            timeout: TRANSFER_TIMEOUT,
        });
    } catch (error) {
        throw await unpackBlobError(error);
    }

    const disposition = String(response.headers['content-disposition'] ?? '');
    const match = disposition.match(/filename="?([^"]+)"?/);
    const url = window.URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = match?.[1] ?? `${name}.sql`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => window.URL.revokeObjectURL(url), 30000);
};

export const importDatabase = async (
    uuid: string,
    id: string,
    file: File,
    wipe: boolean
): Promise<DatabaseImportResult> => {
    const body = new FormData();

    body.append('file', file);
    body.append('wipe', wipe ? '1' : '0');

    return (
        await http.post(`/api/client/servers/${uuid}/databases/${id}/import`, body, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: TRANSFER_TIMEOUT,
        })
    ).data;
};

async function unpackBlobError(error: unknown): Promise<unknown> {
    const response = (error as { response?: { data?: unknown } })?.response;

    if (!response || !(response.data instanceof Blob)) {
        return error;
    }

    try {
        response.data = JSON.parse(await response.data.text());
    } catch {
        response.data = undefined;
    }

    return error;
}
