import axios, { AxiosInstance } from 'axios';

function csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

const adminApi: AxiosInstance = axios.create({
    withCredentials: true,
    timeout: 30000,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
    },
});

adminApi.interceptors.request.use((request) => {
    request.headers.set('X-CSRF-TOKEN', csrfToken());

    return request;
});

export default adminApi;

export const DEMO_EDITOR_ROUTE = '/api/client/dezerx/editor';

export const EDITOR_ROUTES = {
    editor: '/admin/dezerx/editor',
    update: '/admin/dezerx/editor',
    reset: '/admin/dezerx/editor/reset',
    export: '/admin/dezerx/editor/export',
    import: '/admin/dezerx/editor/import',
    background: '/admin/dezerx/editor/background',
    addons: '/admin/dezerx/editor/addons',
    tokens: '/admin/dezerx/appearance/tokens',
    logo: '/admin/dezerx/appearance/logo',
    logoUpload: '/admin/dezerx/appearance/logo/upload',
    presets: '/admin/dezerx/appearance/presets',
    fonts: '/admin/dezerx/interface/fonts',
} as const;
