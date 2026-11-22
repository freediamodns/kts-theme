import http from '@/api/http';
import { ChatCursor, Mood, StaffChatPage, StaffMessageEntry, StaffRequestSummary } from '@/api/server/support';
import { StaffPreset, StaffScope } from '@/dezerx/lib/staff';

export interface StaffRecordSummary {
    id: number;
    username: string;
    available: boolean;
    maxActive: number;
    notes: string;
    discord: string;
    taken: number;
    servers: number;
    resolved: number;
    declined: number;
    handedBack: number;
    expired: number;
    active: number;
    minutes: number;
    averageClaimSeconds: number | null;
    lastActive: string | null;
}

export interface StaffDashboard {
    record: StaffRecordSummary;
    queue: StaffRequestSummary[];
    mine: StaffRequestSummary[];
    history: StaffRequestSummary[];
    presets: StaffPreset[];
    admin: boolean;
    canAsk: boolean;
    all?: StaffRequestSummary[];
}

export interface BoardRow {
    staff: string;
    avatar: string;
    avatarUrl: string | null;
    sessions: number;
    resolved: number;
    happy: number;
    okay: number;
    sad: number;
}

export type Verdict = 'great' | 'okay' | 'poor' | 'none';

export interface Leaderboard {
    board: BoardRow[];
    summary: Record<Mood, number>;
    verdict: Verdict;
    month: string | null;
    months: string[];
}

export interface StaffBadges {
    queue: number;
    servers: Record<string, number>;
}

const base = '/api/client/dezerx/staff';

export const getStaffDashboard = async (done = false): Promise<StaffDashboard> =>
    (await http.get(base, { params: done ? { done: 1 } : {} })).data;

export const getStaffBadges = async (): Promise<StaffBadges> => (await http.get(`${base}/badges`)).data;

export const getLeaderboard = async (month: string | null = null): Promise<Leaderboard> =>
    (await http.get(`${base}/leaderboard`, { params: month === null ? {} : { month } })).data;

const act = async (request: string, action: string, body: object = {}): Promise<StaffRequestSummary> =>
    (await http.post(`${base}/${request}/${action}`, body)).data.request;

export const claimRequest = (request: string) => act(request, 'claim');

export const withdrawRequest = (request: string) => act(request, 'withdraw');

export const resignRequest = (request: string, note: string) => act(request, 'resign', { note });

export const declineRequest = (request: string, reason: string) => act(request, 'decline', { reason });

export const resolveRequest = (request: string, note: string) => act(request, 'resolve', { note });

export const askForMoreTime = (request: string, minutes: number, note: string) =>
    act(request, 'extension', { minutes, note });

export const adminRevokeRequest = (request: string, reason: string) => act(request, 'revoke', { reason });

export const askForAccess = async (payload: {
    server: string;
    reason: string;
    scope: StaffScope;
    openEnded: boolean;
    durationMinutes: number | null;
}): Promise<StaffRequestSummary> =>
    (
        await http.post(`${base}/ask`, {
            server: payload.server,
            reason: payload.reason,
            scope: payload.scope,
            open_ended: payload.openEnded,
            duration_minutes: payload.durationMinutes,
        })
    ).data.request;

export const setAvailability = async (value: boolean): Promise<boolean> =>
    (await http.post(`${base}/availability`, { value })).data.available === true;

export const getStaffMessages = async (request: string, cursor: ChatCursor = {}): Promise<StaffChatPage> =>
    (await http.get(`${base}/${request}/messages`, { params: cursor })).data;

export const sendStaffMessage = async (request: string, body: string): Promise<StaffMessageEntry> =>
    (await http.post(`${base}/${request}/messages`, { body })).data.message;
