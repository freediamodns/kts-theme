import http from '@/api/http';

export interface RustMetrics {
    fps: number;
    ents: number;
    players: number;
    sleeping: number;
    maxPlayers: number;
    uptime: number;
    serverGodmode: boolean;
}

export interface RustPlayerSummary {
    steamId: string;
    name: string;
    avatar?: string;
    health: number;
    maxHealth: number;
    ping: number;
    ip: string;
    isConnected: boolean;
    isSleeping: boolean;
    isDead: boolean;
    isWounded: boolean;
    isGod: boolean;
    isFrozen?: boolean;
    isOwner: boolean;
    isModerator: boolean;
    isBanned?: boolean;
    teamId: number;
    rotation?: number;
    grid: string;
    pos: { x: number; y: number; z: number };
}

export interface RustItemSlot {
    slot: number;
    id?: number | string;
    shortname: string;
    name: string;
    amount: number;
    condition?: number;
    maxCondition?: number;
    skin?: number;
}

export interface RustSleepingBag {
    id: number;
    name: string;
    grid: string;
    pos: { x: number; y: number; z: number };
    cooldown: number;
}

export interface RustToolCupboard {
    id: number;
    grid: string;
    upkeepMinutes: number;
    authorizedCount: number;
    authorized: { steamId: string; name: string }[];
    inventory: RustItemSlot[];
}

export interface RustPlayerProfile {
    steamId: string;
    name: string;
    avatar?: string;
    health: number;
    maxHealth: number;
    calories: number;
    hydration: number;
    temperature: number;
    radiation: number;
    scrap: number;
    isConnected: boolean;
    isSleeping: boolean;
    isDead: boolean;
    isWounded: boolean;
    isGod: boolean;
    isFrozen?: boolean;
    isOwner?: boolean;
    isModerator?: boolean;
    isBanned?: boolean;
    banHistory?: RustBanRecord[];
    grid: string;
    pos: { x: number; y: number; z: number };
    inventory: {
        main: RustItemSlot[];
        belt: RustItemSlot[];
        wear: RustItemSlot[];
    };
    sleepingBags: RustSleepingBag[];
    toolCupboards: RustToolCupboard[];
    blueprints: string[];
    notes: string;
}

export interface RustTechTreeNode {
    id: string;
    shortname: string;
    name: string;
    cost: number;
    parents: string[];
    x: number;
    y: number;
}

export interface RustTechTree {
    name: string;
    nodes: RustTechTreeNode[];
}

export interface RustItemDef {
    id: string;
    shortname: string;
    name: string;
    category: string;
    stack: number;
    tier?: number;
}

export interface RustAutoModConfig {
    enabled: boolean;
    action: string;
    bannedWords: string[];
}

export interface RustPlayersIndexResponse {
    ok: boolean;
    state: string;
    hasBridge: boolean;
    metrics: RustMetrics;
    players: RustPlayerSummary[];
}

export async function getRustPlayers(uuid: string, silent = false): Promise<RustPlayersIndexResponse> {
    const { data } = await http.get(`/api/client/servers/${uuid}/rust-players`, {
        headers: silent ? { 'X-Silent': '1' } : {},
    });
    return data;
}

export async function getRustPlayer(uuid: string, steamId: string, silent = false): Promise<{ ok: boolean; player: RustPlayerProfile }> {
    const { data } = await http.get(`/api/client/servers/${uuid}/rust-players/player/${steamId}`, {
        headers: silent ? { 'X-Silent': '1' } : {},
    });
    return data;
}

export async function executePlayerAction(
    uuid: string,
    steamId: string,
    action: string,
    payload: Record<string, any> = {}
): Promise<{ ok: boolean; message: string; ran?: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/player/${steamId}/action`, {
        action,
        ...payload,
    });
    return data;
}

export async function executeInventoryAction(
    uuid: string,
    steamId: string,
    action: string,
    payload: Record<string, any> = {}
): Promise<{ ok: boolean; message: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/player/${steamId}/inventory`, {
        action,
        ...payload,
    });
    return data;
}

export async function executeTechTreeAction(
    uuid: string,
    steamId: string,
    action: string,
    payload: Record<string, any> = {}
): Promise<{ ok: boolean; message: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/player/${steamId}/techtree`, {
        action,
        ...payload,
    });
    return data;
}

export async function getTechTreeDefinitions(uuid: string): Promise<{ ok: boolean; trees: Record<string, RustTechTree> }> {
    const { data } = await http.get(`/api/client/servers/${uuid}/rust-players/techtree`);
    return data;
}

export async function getItemDefinitions(uuid: string): Promise<{ ok: boolean; categories: string[]; items: RustItemDef[] }> {
    const { data } = await http.get(`/api/client/servers/${uuid}/rust-players/items`);
    return data;
}

export async function executeGodToolsAction(
    uuid: string,
    action: string,
    payload: Record<string, any> = {}
): Promise<{ ok: boolean; message: string; ran?: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/god-tools`, {
        action,
        ...payload,
    });
    return data;
}

export async function installBridgePlugin(uuid: string): Promise<{ ok: boolean; message: string; path: string; version: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/plugin/install`);
    return data;
}

export async function checkBridgePlugin(uuid: string): Promise<{ ok: boolean; installed: boolean; version: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/plugin/check`);
    return data;
}

export async function getAutoModConfig(uuid: string): Promise<{ ok: boolean; config: RustAutoModConfig }> {
    const { data } = await http.get(`/api/client/servers/${uuid}/rust-players/automod`);
    return data;
}

export async function saveAutoModConfig(uuid: string, config: RustAutoModConfig): Promise<{ ok: boolean; config: RustAutoModConfig; message: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/automod`, config);
    return data;
}

export async function getPlayerNotes(uuid: string, steamId: string): Promise<{ ok: boolean; notes: string }> {
    const { data } = await http.get(`/api/client/servers/${uuid}/rust-players/notes/${steamId}`);
    return data;
}

export async function savePlayerNotes(uuid: string, steamId: string, notes: string): Promise<{ ok: boolean; notes: string; message: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/notes/${steamId}`, { notes });
    return data;
}

export interface RustRatesConfig {
    enabled: boolean;
    gather: number;
    pickup: number;
    quarry: number;
    survey: number;
    loot: number;
    stackSize: number;
    recyclerSpeed: number;
    craftingSpeed: number;
    smeltingSpeed: number;
    categoryStacks: Record<string, number>;
}

export interface RustConvar {
    name: string;
    category: string;
    description: string;
    type: 'boolean' | 'integer' | 'float' | 'string';
    value: string;
    defaultValue: string;
}

export interface RustDemo {
    name: string;
    path: string;
    size: number;
    modified: number;
}

export async function getRustRates(uuid: string): Promise<{ ok: boolean; rates: RustRatesConfig }> {
    const { data } = await http.get(`/api/client/servers/${uuid}/rust-players/rates`);
    return data;
}

export async function saveRustRates(uuid: string, rates: RustRatesConfig): Promise<{ ok: boolean; rates: RustRatesConfig; message: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/rates`, { rates });
    return data;
}

export async function getRustConvars(uuid: string): Promise<{ ok: boolean; convars: RustConvar[] }> {
    const { data } = await http.get(`/api/client/servers/${uuid}/rust-players/convars`);
    return data;
}

export async function saveRustConvar(uuid: string, convar: string, value: string): Promise<{ ok: boolean; convar: string; value: string; message: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/convars`, { convar, value });
    return data;
}

export async function getRustDemos(uuid: string): Promise<{ ok: boolean; recording: boolean; demos: RustDemo[] }> {
    const { data } = await http.get(`/api/client/servers/${uuid}/rust-players/demos`);
    return data;
}

export async function executeRustDemoAction(
    uuid: string,
    action: string,
    payload: Record<string, any> = {}
): Promise<{ ok: boolean; recording?: boolean; name?: string; message: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/demos/action`, { action, ...payload });
    return data;
}

export interface RustBanRecord {
    id?: string;
    steamId: string;
    name: string;
    avatar?: string;
    reason: string;
    duration: number;
    bannedAt: number;
    expiresAt: number;
    active?: boolean;
    unbannedAt?: number | null;
    source?: string;
}

export interface RustBansResponse {
    ok: boolean;
    activeBans: RustBanRecord[];
    history: RustBanRecord[];
}

export async function getRustBans(uuid: string): Promise<RustBansResponse> {
    const { data } = await http.get(`/api/client/servers/${uuid}/rust-players/bans`);
    return data;
}

export async function createRustBan(
    uuid: string,
    payload: { steamId: string; name?: string; reason?: string; duration?: number }
): Promise<{ ok: boolean; message: string; ban: RustBanRecord }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/bans`, payload);
    return data;
}

export async function unbanRustPlayer(uuid: string, steamId: string): Promise<{ ok: boolean; message: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/bans/unban`, { steamId });
    return data;
}

export interface RustMapMonument {
    name: string;
    rawName?: string;
    grid: string;
    pos: { x: number; y: number; z: number };
    tier: number;
    isSafezone?: boolean;
    hasRad: boolean;
}

export interface RustMapBaseBlock {
    x: number;
    y: number;
    z: number;
    grade: 'twigs' | 'wood' | 'stone' | 'metal' | 'toptier' | string;
    type: string;
    rot?: number;
}

export interface RustMapBaseTC {
    id: number;
    grid: string;
    pos: { x: number; y: number; z: number };
    upkeepMinutes: number;
    isDecaying: boolean;
    authorizedCount: number;
    authorized: { steamId: string; name: string }[];
    inventory: RustItemSlot[];
    blocks?: RustMapBaseBlock[];
}

export interface RustMapWorldEvent {
    id: number;
    type: 'patrol_heli' | 'cargo_ship' | 'bradley_apc' | 'supply_drop' | 'locked_crate';
    name: string;
    grid: string;
    pos: { x: number; y: number; z: number };
    rotation?: number;
    health?: number;
    maxHealth?: number;
    isLanded?: boolean;
    hackSeconds?: number;
    isFullyHacked?: boolean;
}

export interface RustMapCombatEvent {
    steamId: string;
    name: string;
    weapon: string;
    from: { x: number; y: number; z: number };
    to: { x: number; y: number; z: number };
    time: number;
}

export interface RustKillEvent {
    killer: string;
    killerSteamId: string;
    killerAvatar?: string;
    victim: string;
    victimSteamId: string;
    victimAvatar?: string;
    weapon: string;
    distance: number;
    hitbox: string;
    isHeadshot: boolean;
    pos: { x: number; y: number; z: number };
    killerPos?: { x: number; y: number; z: number } | null;
    grid: string;
    time: number;
}

export interface RustExplosionEvent {
    id: number;
    type: 'c4' | 'rocket' | 'mlrs' | 'satchel' | 'grenade' | string;
    name: string;
    initiatorName: string;
    initiatorSteamId: string;
    pos: { x: number; y: number; z: number };
    grid: string;
    radius: number;
    time: number;
}

export interface RustPlusInfo {
    enabled: boolean;
    configured: boolean;
    port: number;
    ip: string;
    pairUrl?: string | null;
}

export interface RustLiveMapAdminConfig {
    allow3D: boolean;
    defaultView: string;
    refreshInterval: number;
    allowGod: boolean;
}

export interface RustMapData {
    ok: boolean;
    state: string;
    hasBridge: boolean;
    rustPlus?: RustPlusInfo;
    worldSize: number;
    renderSize?: number;
    seed: number;
    level: string;
    serverName: string;
    envTime: number;
    hasMapImage?: boolean;
    mapImageUrl?: string | null;
    metrics: RustMetrics;
    players: (RustPlayerSummary & { rotation?: number })[];
    monuments: RustMapMonument[];
    bases: RustMapBaseTC[];
    events: RustMapWorldEvent[];
    combat?: RustMapCombatEvent[];
    kills?: RustKillEvent[];
    explosions?: RustExplosionEvent[];
    addonConfig?: RustLiveMapAdminConfig;
}

export async function getRustMap(uuid: string, silent = true): Promise<RustMapData> {
    const { data } = await http.get(`/api/client/servers/${uuid}/rust-players/map`, {
        headers: silent ? { 'X-Silent': '1' } : {},
    });
    return data;
}

export async function executeRustMapAction(
    uuid: string,
    action: string,
    payload: Record<string, any> = {}
): Promise<{ ok: boolean; message: string; ran?: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/map/action`, {
        action,
        ...payload,
    });
    return data;
}

export async function renderRustMapImage(uuid: string): Promise<{ ok: boolean; message: string }> {
    const { data } = await http.post(`/api/client/servers/${uuid}/rust-players/map/render`);
    return data;
}


