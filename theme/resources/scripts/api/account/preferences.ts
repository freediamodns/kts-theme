import http from '@/api/http';

export type CategoryColour = 'accent' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'pink' | 'teal';

export interface ServerCategory {
    id: string;
    name: string;
    icon?: string;
    colour?: CategoryColour | null;
    servers: string[];
}

export const getCategories = async (): Promise<ServerCategory[]> =>
    (await http.get('/api/client/dezerx/preferences')).data.categories;

export const saveCategories = async (categories: ServerCategory[]): Promise<ServerCategory[]> =>
    (await http.put('/api/client/dezerx/preferences', { categories })).data.categories;

export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export const AVATAR_MAX_BYTES = 3 * 1024 * 1024;

export const uploadAvatar = async (file: File): Promise<string | null> => {
    const body = new FormData();

    body.append('avatar', file);

    return (
        (
            await http.post('/api/client/dezerx/preferences/avatar', body, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
        ).data.avatar ?? null
    );
};

export const removeAvatar = async (): Promise<null> => {
    await http.delete('/api/client/dezerx/preferences/avatar');

    return null;
};
