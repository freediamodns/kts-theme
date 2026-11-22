import React, { lazy } from 'react';
import { Redirect } from 'react-router-dom';
import ServerConsole from '@/components/server/console/ServerConsoleContainer';
import DatabasesContainer from '@/components/server/databases/DatabasesContainer';
import ScheduleContainer from '@/components/server/schedules/ScheduleContainer';
import UsersContainer from '@/components/server/users/UsersContainer';
import BackupContainer from '@/components/server/backups/BackupContainer';
import NetworkContainer from '@/components/server/network/NetworkContainer';
import StartupContainer from '@/components/server/startup/StartupContainer';
import FileManagerContainer from '@/components/server/files/FileManagerContainer';
import SettingsContainer from '@/components/server/settings/SettingsContainer';
import AccountOverviewContainer from '@/components/dashboard/AccountOverviewContainer';
import AccountApiContainer from '@/components/dashboard/AccountApiContainer';
import AccountSSHContainer from '@/components/dashboard/ssh/AccountSSHContainer';
import ActivityLogContainer from '@/components/dashboard/activity/ActivityLogContainer';
import ServerActivityLogContainer from '@/components/server/ServerActivityLogContainer';
import {
    HYTALE_MOD_MANAGER,
    PALWORLD_MOD_MANAGER,
    MOD_MANAGER,
    MODPACK_MANAGER,
    PLAYER_MANAGER,
    PLUGIN_MANAGER,
    PROPERTIES_EDITOR,
    VERSION_CHANGER,
    WORLD_MANAGER,
    WORLD_VIEWER,
    FIVEM_UTILS,
    EGG_SWITCHER,
    RECYCLE_BIN,
    SERVER_IMPORTER,
    RUST_PLAYER_MANAGER,
    RUST_PLUGIN_MANAGER,
    RUST_WIPE_SCHEDULER,
    DAYZ_MOD_MANAGER,
    DISCORD_BOT,
} from '@/dezerx/lib/addons';
import { subdomainsAvailable } from '@/api/server/subdomains';
import * as custom from '@/routers/routes.custom';

const FileEditContainer = lazy(() => import('@/components/server/files/FileEditContainer'));
const PlayersContainer = lazy(() => import('@/components/server/players/PlayersContainer'));
const PluginsContainer = lazy(() => import('@/components/server/addons/PluginsContainer'));
const ModsContainer = lazy(() => import('@/components/server/addons/ModsContainer'));
const ModpacksContainer = lazy(() => import('@/components/server/modpacks/ModpacksContainer'));
const VersionContainer = lazy(() => import('@/components/server/version/VersionContainer'));
const PropertiesContainer = lazy(() => import('@/components/server/properties/PropertiesContainer'));
const SubdomainsContainer = lazy(() => import('@/dezerx/components/subdomains/SubdomainsContainer'));
const HytaleModsContainer = lazy(() => import('@/dezerx/components/hytale/HytaleModsContainer'));
const PalworldModsContainer = lazy(() => import('@/dezerx/components/palworld/PalworldModsContainer'));
const RustPlayersContainer = lazy(() => import('@/dezerx/components/rust/RustPlayersContainer'));
const RustPluginsContainer = lazy(() => import('@/dezerx/components/rust/RustPluginsContainer'));
const RustWipesContainer = lazy(() => import('@/dezerx/components/rust/RustWipesContainer'));
const DayZModsContainer = lazy(() => import('@/dezerx/components/dayz/DayZModsContainer'));
const WorldManagerContainer = lazy(() => import('@/dezerx/components/worlds/WorldManagerContainer'));
const WorldViewerContainer = lazy(() => import('@/dezerx/components/worlds/WorldViewerContainer'));
const FiveMContainer = lazy(() => import('@/dezerx/components/fivem/FiveMContainer'));
const ImporterContainer = lazy(() => import('@/dezerx/components/importer/ImporterContainer'));
const EggSwitcherContainer = lazy(() => import('@/dezerx/components/eggs/EggSwitcherContainer'));
const RecycleBinContainer = lazy(() => import('@/dezerx/components/files/RecycleBinContainer'));
const OverviewContainer = lazy(() => import('@/dezerx/components/overview/OverviewContainer'));
const SupportContainer = lazy(() => import('@/dezerx/components/support/SupportContainer'));
const DiscordServerRedirect = () => React.createElement(Redirect, { to: '/account/discord' });

export interface RouteDefinition {
    path: string;

    name: string | undefined;
    component: React.ComponentType;
    exact?: boolean;
}

export interface ServerRouteDefinition extends RouteDefinition {
    permission: string | string[] | null;
    addon?: string;
}

export type AccountRouteDefinition = RouteDefinition;

interface Routes {
    account: RouteDefinition[];

    server: ServerRouteDefinition[];
}

export default {
    account: [
        {
            path: '/',
            name: 'Account',
            component: AccountOverviewContainer,
            exact: true,
        },
        {
            path: '/api',
            name: 'API Credentials',
            component: AccountApiContainer,
        },
        {
            path: '/ssh',
            name: 'SSH Keys',
            component: AccountSSHContainer,
        },
        {
            path: '/activity',
            name: 'Activity',
            component: ActivityLogContainer,
        },
        ...custom.account,
    ],
    server: [
        {
            path: '/overview',
            permission: null,
            name: 'Overview',
            component: OverviewContainer,
        },
        {
            path: '/',
            permission: null,
            name: 'Console',
            component: ServerConsole,
            exact: true,
        },
        {
            path: '/files',
            permission: 'file.*',
            name: 'Files',
            component: FileManagerContainer,
        },
        {
            path: '/files/:action(edit|new)',
            permission: 'file.*',
            name: undefined,
            component: FileEditContainer,
        },
        {
            path: '/databases',
            permission: 'database.*',
            name: 'Databases',
            component: DatabasesContainer,
        },
        {
            path: '/schedules',
            permission: 'schedule.*',
            name: 'Schedules',
            component: ScheduleContainer,
        },
        {
            path: '/schedules/:scheduleId',
            permission: 'schedule.*',
            name: undefined,
            component: ScheduleContainer,
        },
        {
            path: '/users',
            permission: 'user.*',
            name: 'Users',
            component: UsersContainer,
        },
        {
            path: '/support',
            permission: 'user.read',
            name: 'Support',
            component: SupportContainer,
        },
        {
            path: '/players',
            permission: 'file.read-content',
            name: 'Players',
            component: PlayersContainer,
            addon: PLAYER_MANAGER,
        },
        {
            path: '/plugins',
            permission: 'file.read',
            name: 'Plugins',
            component: PluginsContainer,
            addon: PLUGIN_MANAGER,
        },
        {
            path: '/mods',
            permission: 'file.read',
            name: 'Mods',
            component: ModsContainer,
            addon: MOD_MANAGER,
        },
        {
            path: '/modpacks',
            permission: 'file.read',
            name: 'Modpacks',
            component: ModpacksContainer,
            addon: MODPACK_MANAGER,
        },
        {
            path: '/version',
            permission: 'file.read',
            name: 'Version',
            component: VersionContainer,
            addon: VERSION_CHANGER,
        },
        {
            path: '/hytale-mods',
            permission: 'file.read',
            name: 'Hytale Mods',
            component: HytaleModsContainer,
            addon: HYTALE_MOD_MANAGER,
        },
        {
            path: '/palworld-mods',
            permission: 'file.read',
            name: 'Palworld Mods',
            component: PalworldModsContainer,
            addon: PALWORLD_MOD_MANAGER,
        },
        {
            path: '/rust-players',
            permission: 'file.read-content',
            name: 'Rust Players',
            component: RustPlayersContainer,
            addon: RUST_PLAYER_MANAGER,
        },
        {
            path: '/rust-plugins',
            permission: 'file.read',
            name: 'Rust Plugins',
            component: RustPluginsContainer,
            addon: RUST_PLUGIN_MANAGER,
        },
        {
            path: '/rust-wipes',
            permission: 'schedule.read',
            name: 'Rust Wipes',
            component: RustWipesContainer,
            addon: RUST_WIPE_SCHEDULER,
        },
        {
            path: '/dayz-mods',
            permission: 'file.read',
            name: 'DayZ Mods',
            component: DayZModsContainer,
            addon: DAYZ_MOD_MANAGER,
        },
        {
            path: '/worlds',
            permission: 'file.read-content',
            name: 'Worlds',
            component: WorldManagerContainer,
            addon: WORLD_MANAGER,
        },
        {
            path: '/recycle-bin',
            permission: 'file.delete',
            name: 'Recycle Bin',
            component: RecycleBinContainer,
            addon: RECYCLE_BIN,
        },
        {
            path: '/egg-switcher',
            permission: 'settings.reinstall',
            name: 'Switch egg',
            component: EggSwitcherContainer,
            addon: EGG_SWITCHER,
        },
        {
            path: '/import',
            permission: 'file.create',
            name: 'Import',
            component: ImporterContainer,
            addon: SERVER_IMPORTER,
        },
        {
            path: '/discord',
            permission: null,
            name: 'Discord',
            component: DiscordServerRedirect,
            addon: DISCORD_BOT,
        },
        {
            path: '/fivem',
            permission: 'file.read-content',
            name: 'FiveM',
            component: FiveMContainer,
            addon: FIVEM_UTILS,
        },
        {
            path: '/world-viewer',
            permission: 'file.read-content',
            name: 'World Viewer',
            component: WorldViewerContainer,
            addon: WORLD_VIEWER,
        },
        {
            path: '/properties',
            permission: 'file.read',
            name: 'Properties',
            component: PropertiesContainer,
            addon: PROPERTIES_EDITOR,
        },
        {
            path: '/backups',
            permission: 'backup.*',
            name: 'Backups',
            component: BackupContainer,
        },
        {
            path: '/network',
            permission: 'allocation.*',
            name: 'Network',
            component: NetworkContainer,
        },
        {
            path: '/startup',
            permission: 'startup.*',
            name: 'Startup',
            component: StartupContainer,
        },
        {
            path: '/settings',
            permission: ['settings.*', 'file.sftp'],
            name: 'Settings',
            component: SettingsContainer,
        },
        {
            path: '/activity',
            permission: 'activity.*',
            name: 'Activity',
            component: ServerActivityLogContainer,
        },
        ...(subdomainsAvailable()
            ? [
                  {
                      path: '/subdomains',
                      permission: 'allocation.read',
                      name: 'Subdomains',
                      component: SubdomainsContainer,
                  },
              ]
            : []),
        ...custom.server,
    ],
} as Routes;
