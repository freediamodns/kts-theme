import http from '@/api/http';

export const SUBDOMAIN_NAME = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export interface SubdomainClaim {
    id: number;
    name: string;
    type: string;
    target: string;
    port: number | null;
}

export interface SubdomainAllocation {
    id: number;
    host: string;
    ip: string;
    port: number;
    primary: boolean;
}

export interface SubdomainPayload {
    available: boolean;
    max: number;
    anyDomains: boolean;
    domains: { id: number; domain: string; recordType: string }[];
    allocations: SubdomainAllocation[];
    records: SubdomainClaim[];
}

interface BootWindow extends Window {
    SiteConfiguration?: { dezerx?: { subdomains?: { available?: boolean } } };
}

export function subdomainsAvailable(): boolean {
    return (window as BootWindow).SiteConfiguration?.dezerx?.subdomains?.available === true;
}

export const getSubdomains = async (uuid: string): Promise<SubdomainPayload> =>
    (await http.get(`/api/client/servers/${uuid}/subdomains`)).data;

export const claimSubdomain = async (
    uuid: string,
    payload: { subdomain: string; domain: number; allocation: number }
): Promise<{ message: string; records: SubdomainClaim[] }> =>
    (await http.post(`/api/client/servers/${uuid}/subdomains`, payload)).data;

export const releaseSubdomain = async (
    uuid: string,
    record: number
): Promise<{ records: SubdomainClaim[] }> =>
    (await http.delete(`/api/client/servers/${uuid}/subdomains/${record}`)).data;
