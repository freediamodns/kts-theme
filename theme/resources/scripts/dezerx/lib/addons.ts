export const PLAYER_MANAGER = 'player-manager';

export const PLUGIN_MANAGER = 'plugin-manager';

export const MOD_MANAGER = 'mod-manager';

export const MODPACK_MANAGER = 'modpack-manager';

export const VERSION_CHANGER = 'version-changer';

export const PROPERTIES_EDITOR = 'properties-editor';

export const DRIVE_BACKUPS = 'drive-backups';

export const HYTALE_MOD_MANAGER = 'hytale-mod-manager';

export const PALWORLD_MOD_MANAGER = 'palworld-mod-manager';

export const WORLD_MANAGER = 'world-manager';

export const WORLD_VIEWER = 'world-viewer';

export const FIVEM_UTILS = 'fivem-utils';

export const EGG_SWITCHER = 'egg-switcher';

export const RECYCLE_BIN = 'recycle-bin';

export const SERVER_IMPORTER = 'server-importer';

export const DISCORD_BOT = 'discord-bot';

export const RUST_PLAYER_MANAGER = 'rust-players';

export const RUST_PLUGIN_MANAGER = 'rust-plugins';

export const RUST_WIPE_SCHEDULER = 'rust-wipes';

export const DAYZ_MOD_MANAGER = 'dayz-mods';

interface AddonConfig {
    enabled: boolean;
    eggs: string[];
    sources?: string[];
    scope?: { eggs?: string[]; nodes?: number[] };
    name?: string;
    blurb?: string;
    icon?: string;
    mark?: string;
}

export interface AddonSummary {
    key: string;
    name: string;
    blurb: string;
    icon: string;
    mark: string;
    enabled: boolean;
    eggs: string[];
}

interface BootWindow extends Window {
    SiteConfiguration?: { dezerx?: { addons?: Record<string, Partial<AddonConfig>> } };
}

function config(addon: string): AddonConfig {
    const saved = (window as BootWindow).SiteConfiguration?.dezerx?.addons?.[addon] ?? {};

    return {
        enabled: saved.enabled === true,
        eggs: Array.isArray(saved.eggs) ? saved.eggs : [],
        sources: Array.isArray(saved.sources) ? saved.sources : undefined,
    };
}

export function discordBotAvailable(): boolean {
    return config(DISCORD_BOT).enabled;
}

export function modpackSources(): string[] {
    return config(MODPACK_MANAGER).sources ?? ['modrinth', 'ftb', 'atlauncher', 'technic'];
}

export function discordBotAppliesTo(egg: string | undefined, node: number | undefined): boolean {
    const saved = (window as BootWindow).SiteConfiguration?.dezerx?.addons?.[DISCORD_BOT] ?? {};
    const eggs = Array.isArray(saved.scope?.eggs) ? saved.scope!.eggs! : [];
    const nodes = Array.isArray(saved.scope?.nodes) ? saved.scope!.nodes! : [];

    return (
        saved.enabled === true &&
        (eggs.length === 0 || (egg !== undefined && eggs.includes(egg))) &&
        (nodes.length === 0 || (node !== undefined && nodes.includes(node)))
    );
}

export function addonAppliesTo(addon: string, egg: string | undefined, node?: number): boolean {
    if (addon === DISCORD_BOT) {
        return discordBotAppliesTo(egg, node);
    }

    const { enabled, eggs } = config(addon);

    return enabled && egg !== undefined && eggs.includes(egg);
}

export function allAddons(): AddonSummary[] {
    const saved = (window as BootWindow).SiteConfiguration?.dezerx?.addons ?? {};

    return Object.entries(saved)
        .map(([key, value]) => ({
            key,
            name: value.name ?? key,
            blurb: value.blurb ?? '',
            icon: value.icon ?? 'fa-puzzle-piece',
            mark: value.mark ?? '',
            enabled: value.enabled === true,
            eggs: Array.isArray(value.eggs) ? value.eggs : [],
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
