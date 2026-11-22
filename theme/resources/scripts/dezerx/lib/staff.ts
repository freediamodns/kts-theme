import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';

export type StaffScope = 'read_only' | 'standard' | 'full';

export type StaffStatus =
    | 'pending'
    | 'claimed'
    | 'active'
    | 'declined'
    | 'cancelled'
    | 'expired'
    | 'resolved'
    | 'revoked';

export type StaffDirection = 'owner_invite' | 'staff_request';

export interface StaffPreset {
    key: StaffScope;
    label: string;
    hint: string;
    permissions: string[];
}

export interface StaffConfig {
    enabled: boolean;
    staff: boolean;
    admin: boolean;
    queue: boolean;
    named: boolean;
    staffRequests: boolean;
    openEnded: boolean;
    defaultDuration: number;
    maxDuration: number;
    minDuration: number;
    autoAcceptDefault: boolean;
    autoAccept: boolean;
    maxExtensions: number;
    extensionMax: number;
    reminderMinutes: number;
    seatsPerServer: number;
    reasonMin: number;
    messageMax: number;
    presets: StaffPreset[];
}

interface BootWindow extends Window {
    SiteConfiguration?: { dezerx?: { staff?: StaffConfig | null } };
}

export function staffConfig(): StaffConfig | null {
    if (typeof window === 'undefined') {
        return null;
    }

    return (window as BootWindow).SiteConfiguration?.dezerx?.staff ?? null;
}

export function staffEnabled(): boolean {
    return staffConfig() !== null;
}

export function useStaffConfig(): StaffConfig | null {
    return staffConfig();
}

export function useIsStaff(): boolean {
    const staff = useStoreState((state: ApplicationStore) => state.user.data?.staff) === true;
    const admin = useStoreState((state: ApplicationStore) => state.user.data?.rootAdmin) === true;

    return staffEnabled() && (staff || admin);
}

export function durationChoices(config: StaffConfig): number[] {
    const wanted = [15, 30, 60, 120, 240, 480, 720, 1440];
    const allowed = wanted.filter((minutes) => minutes >= config.minDuration && minutes <= config.maxDuration);

    if (!allowed.includes(config.defaultDuration) && config.defaultDuration <= config.maxDuration) {
        allowed.push(config.defaultDuration);
    }

    if (allowed.length === 0) {
        allowed.push(config.maxDuration);
    }

    return [...new Set(allowed)].sort((a, b) => a - b);
}
