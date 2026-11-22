import http from '@/api/http';

export interface FiveMBuild {
    build: string;
    ref: string;
    url: string;
    published: string | null;
}

export interface FiveMChannels {
    latest?: string;
    recommended?: string;
    critical?: string;
    optional?: string;
    latestTxAdmin?: string;
    recommendedTxAdmin?: string;
}

export interface FiveMTxAdmin {
    url: string | null;
    port: number;
    portSource: 'variable' | 'config' | 'default';
    portVariable: string | null;
    configured: boolean;
    supported: boolean;
    variable: string | null;
    editable: boolean;
    enabled: boolean | null;
}

export interface FiveMPayload {
    builds: FiveMBuild[];
    channels: FiveMChannels;
    error: string | null;
    installed: string | null;
    config: string | null;
    gameBuild: string | null;
    gameBuilds: string[];
    txAdmin: FiveMTxAdmin;
    cache?: string[];
}

export function getFiveM(uuid: string): Promise<FiveMPayload> {
    return http.get(`/api/client/servers/${uuid}/fivem`).then(({ data }) => data as FiveMPayload);
}

export function installArtifact(uuid: string, build: string): Promise<{ build: string; message: string }> {
    return http
        .post(`/api/client/servers/${uuid}/fivem/artifact`, { build })
        .then(({ data }) => data as { build: string; message: string });
}

export function setTxAdmin(uuid: string, enabled: boolean): Promise<{ txAdmin: FiveMTxAdmin }> {
    return http
        .post(`/api/client/servers/${uuid}/fivem/txadmin`, { enabled })
        .then(({ data }) => data as { txAdmin: FiveMTxAdmin });
}

export function setGameBuild(uuid: string, build: string): Promise<{ gameBuild: string | null; config: string }> {
    return http
        .post(`/api/client/servers/${uuid}/fivem/game-build`, { build })
        .then(({ data }) => data as { gameBuild: string | null; config: string });
}

export function clearCache(uuid: string): Promise<{ cleared: string[] }> {
    return http.post(`/api/client/servers/${uuid}/fivem/cache`).then(({ data }) => data as { cleared: string[] });
}
