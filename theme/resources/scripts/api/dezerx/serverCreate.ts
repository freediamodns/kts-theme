import http from '@/api/http';

export type CreateRefusal = 'unavailable' | 'demo' | 'totp' | 'discord' | 'young' | 'limit' | 'full';

export interface CreateDiscord {
    required: boolean;
    joinsGuild: boolean;
    linked: boolean;
    username: string | null;
    avatar: string | null;
    canUnlink: boolean;
}

export interface CreateResources {
    cpu: number;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    databases: number;
    allocations: number;
    backups: number;
}

export interface CreateLocation {
    id: number;
    name: string;
    description: string;
    room: boolean;
    slots: number;
    total: number;
    servers: number;
    hint: string;
}

export interface CreateVariable {
    name: string;
    description: string;
    env: string;
    default: string;
    required: boolean;
    options: string[];
}

export interface CreateEgg {
    uuid: string;
    name: string;
    description: string;
    nest: string;
    image: string;
    variables: CreateVariable[];
}

export interface RenewalRules {
    enabled: boolean;
    every: number;
    unit: 'hours' | 'days' | 'weeks' | 'months';
    period: string;
    windowHours: number;
    graceHours: number;
    action: 'suspend' | 'delete';
    purgeDays: number;
}

export interface FreeServerEntry {
    uuid: string;
    identifier: string;
    name: string;
    renewAt: string | null;
    lastRenewedAt: string | null;
    renewals: number;
    renewable: boolean;
    overdue: boolean;
    suspended: boolean;
}

export interface ResourceBounds {
    min: number;
    max: number;
    default: number;
    left: number | null;
}

export type ChosenResources = Partial<
    Record<'cpu' | 'memory' | 'disk' | 'databases' | 'allocations' | 'backups', number>
>;

export type CpuUnit = 'percent' | 'cores';

export type SizeUnit = 'mb' | 'gb';

export interface CreateUnits {
    cpu: CpuUnit;
    memory: SizeUnit;
    disk: SizeUnit;
}

export interface CreatePage {
    enabled: boolean;
    available: boolean;
    refusal: CreateRefusal | null;
    remaining: number | null;
    held: number;
    perUser: number;
    namePrefix: string;
    requireTotp: boolean;
    discord: CreateDiscord;
    minAccountAgeHours: number;
    resources: CreateResources;
    custom: boolean;
    units: CreateUnits;
    limits: Record<string, ResourceBounds> | null;
    demoServer: string | null;
    startsOnCreation: boolean;
    locations: CreateLocation[];
    eggs: CreateEgg[];
    renewals: RenewalRules;
}

export interface CreateSummary {
    enabled: boolean;
    available: boolean;
    refusal: CreateRefusal | null;
    remaining: number | null;
    held: number;
    renewals: RenewalRules;
    servers: FreeServerEntry[];
}

export interface CreatedServer {
    uuid: string;
    identifier: string;
    name: string;
}

export function getCreatePage(): Promise<CreatePage> {
    return http.get('/api/client/dezerx/server-create').then(({ data }) => data as CreatePage);
}

export function getCreateSummary(): Promise<CreateSummary> {
    return http.get('/api/client/dezerx/server-create/summary').then(({ data }) => data as CreateSummary);
}

export function createServer(payload: {
    egg: string;
    location: number;
    name: string;
    environment: Record<string, string>;
    resources?: ChosenResources;
}): Promise<CreatedServer> {
    return http.post('/api/client/dezerx/server-create', payload).then(({ data }) => data as CreatedServer);
}

export interface FreeServerManage {
    resizable: boolean;
    units: CreateUnits;
    current: Record<'cpu' | 'memory' | 'disk' | 'databases' | 'allocations' | 'backups', number>;
    limits: Record<string, ResourceBounds> | null;
}

export function getFreeServer(server: string): Promise<FreeServerManage> {
    return http.get(`/api/client/dezerx/server-create/${server}/manage`).then(({ data }) => data as FreeServerManage);
}

export function resizeFreeServer(server: string, resources: ChosenResources): Promise<FreeServerManage> {
    return http
        .post(`/api/client/dezerx/server-create/${server}/resize`, { resources })
        .then(({ data }) => data as FreeServerManage);
}

export function unlinkDiscord(): Promise<void> {
    return http.delete('/api/client/dezerx/server-create/discord').then(() => undefined);
}

export function deleteFreeServer(server: string): Promise<void> {
    return http.delete(`/api/client/dezerx/server-create/${server}`).then(() => undefined);
}

export function renewServer(server: string): Promise<FreeServerEntry> {
    return http.post(`/api/client/dezerx/server-create/${server}/renew`).then(({ data }) => data as FreeServerEntry);
}

export function getServerRenewal(server: string): Promise<FreeServerEntry> {
    return http.get(`/api/client/dezerx/server-create/${server}/renewal`).then(({ data }) => data as FreeServerEntry);
}
