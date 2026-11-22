import http from '@/api/http';

export type BotMode = 'global' | 'personal';

export type BarStyle = 'squares' | 'circles' | 'blocks';

export type BotVisibility = 'private' | 'public' | 'choice';

export type PowerAction = 'start' | 'restart' | 'stop' | 'kill';

export const POWER_ACTIONS: PowerAction[] = ['start', 'restart', 'stop', 'kill'];

export interface BotDesign {
    accent: string;
    banner: boolean;
    logos: boolean;
    bars: BarStyle;
    footer: string;
    console_lines: number;
    bar_length: number;
    visibility: BotVisibility;
    console_image: boolean;
    console_font: number;
}

export interface BotCommand {
    name: string;
    group: string;
    emoji: string;
    description: string;
    available: boolean;
    enabled: boolean;
    stored: boolean;
    locked: boolean;
    roles: string[];
    actions?: PowerAction[];
}

export interface BotInfo {
    name: string;
    avatar: string;
    applicationId: string;
    personal: boolean;
    inviteUrl: string;
    userInstallUrl: string | null;
    endpointUrl: string | null;
    portalUrl: string | null;
    syncedAt: string | null;
    syncError: string | null;
    upToDate: boolean;
    owners: string[];
    users: BotUser[];
    keyActive: boolean | null;
    design: BotDesign;
}

export interface BotUser {
    id: string;
    name: string;
    username: string;
    avatar: string;
}

export interface BotMember {
    discordId: string;
    username: string;
    avatar: string;
    linkedAt: string | null;
    keyActive: boolean;
    keyIdentifier: string | null;
    keyLastUsedAt: string | null;
}

export interface BotAlert {
    id: number;
    server: { name: string; identifier: string | null };
    channelUrl: string;
    roleId: string | null;
    cpu: number | null;
    memory: number | null;
    disk: number | null;
    offline: boolean;
    cooldown: number;
    notifiedAt: string | null;
    lastError: string | null;
}

export interface BotServer {
    uuid: string;
    identifier: string;
    name: string;
    egg: string | null;
    logo: string | null;
    hidden: boolean;
}

export interface BotState {
    enabled: boolean;
    mode: BotMode;
    alerts: boolean;
    billing: boolean;
    consoleImages: boolean;
    oauth: { available: boolean; connectUrl: string };
    bot: BotInfo | null;
    commands: BotCommand[];
    member: BotMember | null;
    suggested: { username: string; avatar: string } | null;
    defaults: BotDesign;
    bars: BarStyle[];
    alertList: BotAlert[];
    servers: BotServer[];
    sync?: { ok: boolean; message: string; count: number };
}

export interface BotPreview {
    key: string;
    title: string;
    command: string;
    html: string;
}

export interface BotGuild {
    id: string;
    name: string;
    icon: string | null;
    roles: { id: string; name: string; color: string | null }[];
}

export type CommandSettings = Record<string, { enabled: boolean; roles: string[]; actions?: PowerAction[] }>;

const base = '/api/client/dezerx/discord-bot';

export const getBotState = async (): Promise<BotState> => (await http.get(base)).data;

export const linkVerified = async (): Promise<BotState> => (await http.post(`${base}/link`)).data;

export const reissueKey = async (): Promise<BotState> => (await http.post(`${base}/key`)).data;

export const unlinkBot = async (): Promise<BotState> => (await http.delete(`${base}/link`)).data;

export const saveOwnBot = async (token: string): Promise<BotState> => (await http.put(`${base}/bot`, { token })).data;

export const syncOwnBot = async (): Promise<BotState> => (await http.post(`${base}/bot/sync`)).data;

export const deleteOwnBot = async (): Promise<BotState> => (await http.delete(`${base}/bot`)).data;

export const saveBotSettings = async (
    design: BotDesign,
    commands: CommandSettings,
    users: string[]
): Promise<BotState> => (await http.put(`${base}/bot/settings`, { design, commands, users })).data;

export const getBotRoles = async (): Promise<BotGuild[]> => (await http.get(`${base}/bot/roles`)).data.guilds;

export const previewBot = async (
    design?: BotDesign,
    commands?: CommandSettings,
    signal?: AbortSignal
): Promise<{ css: string; previews: BotPreview[] }> =>
    (await http.post(`${base}/preview`, { design, commands }, { signal })).data;

export const saveHiddenServers = async (hidden: string[]): Promise<BotState> =>
    (await http.put(`${base}/hidden`, { hidden })).data;

export const deleteBotAlert = async (id: number): Promise<BotState> => (await http.delete(`${base}/alerts/${id}`)).data;
