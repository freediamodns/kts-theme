import http from '@/api/http';
import { ActionPayload, Place } from '@/dezerx/components/mc/PlayerControls';
import { InventoryItem } from '@/dezerx/components/mc/Inventory';
import { Stats } from '@/dezerx/components/mc/PlayerStats';

export interface RosterEntry {
    uuid: string;
    name: string | null;
    lastSeen: string | null;
    hasData: boolean;
    online: boolean;
    op: boolean;
    banned: boolean;
    whitelisted: boolean;
}

export interface Player {
    uuid: string;
    name: string | null;
    hasData: boolean;
    respawn?: Place | null;
    lastDeath?: Place | null;
    health: number;
    maxHealth: number;
    absorption: number;
    food: number;
    saturation: number;
    xpLevel: number;
    xpProgress: number;
    xpTotal: number;
    score: number;
    gameMode: number;
    dimension: string;
    position: { x: number; y: number; z: number } | null;
    selectedSlot: number;
    armorPoints: number;
    inventory: InventoryItem[];
    enderChest: InventoryItem[];
}

export const getPlayers = async (uuid: string, signal?: AbortSignal): Promise<RosterEntry[]> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/players`, { signal });

    return data;
};

export const getPlayer = async (uuid: string, player: string, signal?: AbortSignal): Promise<Player> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/players/${player}`, { signal });

    return data;
};

export const getPlayerStats = async (uuid: string, player: string, signal?: AbortSignal): Promise<Stats> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/players/${player}/stats`, { signal });

    return data;
};

export interface ActionResult {
    ran: string;
    flushed: boolean;
    offline: boolean;
}

export const runPlayerAction = async (uuid: string, player: string, payload: ActionPayload): Promise<ActionResult> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/players/${player}/action`, payload);

    return data;
};

export const deletePlayerData = async (uuid: string, player: string): Promise<void> => {
    await http.delete(`/api/client/servers/${uuid}/players/${player}`);
};

export const playerAvatarUrl = (uuid: string, player: string): string =>
    `/api/client/servers/${uuid}/players/${player}/avatar`;

export interface PlayerSkin {
    image: Blob;
    slim: boolean | null;
    cape: boolean;
}

export const getPlayerSkin = async (uuid: string, player: string, signal?: AbortSignal): Promise<PlayerSkin> => {
    const { data, headers } = await http.get(`/api/client/servers/${uuid}/players/${player}/skin`, {
        responseType: 'blob',
        signal,
    });

    const model = headers['x-skin-model'];

    return {
        image: data,
        slim: model === 'slim' ? true : model === 'wide' ? false : null,
        cape: headers['x-skin-cape'] === 'yes',
    };
};

export const getPlayerCape = async (uuid: string, player: string, signal?: AbortSignal): Promise<Blob> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/players/${player}/cape`, {
        responseType: 'blob',
        signal,
    });

    return data;
};

export const playerTextureUrl = (uuid: string, hash: string): string =>
    `/api/client/servers/${uuid}/players/textures/${hash}`;

export type MapSpan = 128 | 256 | 512;

export interface MapRegion {
    x: number;
    z: number;
    state: 'ready' | 'rendering' | 'missing';
    version?: number;
    refreshing?: boolean;
}

export interface MapSky {
    time: number;
    raining: boolean;
    thundering: boolean;
}

export interface MapView {
    available: boolean;
    regions: MapRegion[];
    sky: MapSky | null;
}

export interface NearbyPlayer {
    uuid: string;
    name: string | null;
    x: number;
    z: number;
    online: boolean;
}

export const getPlayerMap = async (
    uuid: string,
    dimension: string,
    x: number,
    z: number,
    span: MapSpan,
    signal?: AbortSignal
): Promise<MapView> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/players/map`, {
        params: { dimension, x, z, span },
        signal,
    });

    return data;
};

export const getNearbyPlayers = async (
    uuid: string,
    dimension: string,
    x: number,
    z: number,
    span: MapSpan,
    signal?: AbortSignal
): Promise<NearbyPlayer[]> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/players/map/nearby`, {
        params: { dimension, x, z, span },
        signal,
    });

    return data.players;
};

export const mapTileUrl = (uuid: string, dimension: string, region: MapRegion): string =>
    `/api/client/servers/${uuid}/players/map/tile?${new URLSearchParams({
        dimension,
        x: String(region.x),
        z: String(region.z),
        v: String(region.version ?? 0),
    })}`;
