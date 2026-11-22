import http from '@/api/http';

export interface RecycledFile {
    id: number;
    name: string;
    root: string;
    path: string;
    isDirectory: boolean;
    size: number;
    deletedAt: Date;
    expiresAt: Date;
}

export interface RecycleBinPayload {
    retentionDays: number;
    items: RecycledFile[];
}

export async function getRecycleBin(uuid: string): Promise<RecycleBinPayload> {
    const { data } = await http.get(`/api/client/servers/${uuid}/recycle-bin`);

    return {
        retentionDays: data.retention_days,
        items: (data.items ?? []).map(
            (item: Record<string, never>): RecycledFile => ({
                id: item.id,
                name: item.name,
                root: item.root,
                path: item.path,
                isDirectory: item.is_directory,
                size: item.size,
                deletedAt: new Date(item.deleted_at),
                expiresAt: new Date(item.expires_at),
            })
        ),
    };
}

export async function restoreRecycled(uuid: string, id: number): Promise<string> {
    const { data } = await http.post(`/api/client/servers/${uuid}/recycle-bin/${id}/restore`);

    return data.path;
}

export async function restoreAllRecycled(uuid: string): Promise<{ restored: number; failed: number }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/recycle-bin/restore`);

    return data;
}

export async function purgeRecycled(uuid: string, id: number): Promise<void> {
    await http.delete(`/api/client/servers/${uuid}/recycle-bin/${id}`);
}

export async function emptyRecycleBin(uuid: string): Promise<number> {
    const { data } = await http.delete(`/api/client/servers/${uuid}/recycle-bin`);

    return data.deleted;
}
