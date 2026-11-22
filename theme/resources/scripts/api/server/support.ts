import http from '@/api/http';
import { StaffDirection, StaffScope, StaffStatus } from '@/dezerx/lib/staff';

export interface StaffTimelineEntry {
    action: string;
    actor: string | null;
    note: string | null;
    at: string | null;
}

export interface StaffRequestSummary {
    uuid: string;
    status: StaffStatus;
    direction: StaffDirection;
    scope: StaffScope;
    scopeLabel: string;
    reason: string;
    permissions: string[];
    server: { identifier: string; name: string; egg: { uuid: string; name: string } | null } | null;
    owner: string | null;
    ownerAvatar: string;
    ownerAvatarUrl: string | null;
    staff: string | null;
    staffAvatar: string;
    staffAvatarUrl: string | null;
    target: string | null;
    openedBy: string | null;
    openEnded: boolean;
    durationMinutes: number | null;
    remainingMinutes: number | null;
    secondsLeft: number | null;
    requiresConfirmation: boolean;
    extensions: number;
    handoffs: number;
    extensionAsk: { minutes: number; note: string } | null;
    declineReason: string | null;
    resolution: string | null;
    createdAt: string | null;
    claimedAt: string | null;
    startedAt: string | null;
    expiresAt: string | null;
    endedAt: string | null;
    feedback: SessionFeedback | null;
    canReview: boolean;
    canChat: boolean;
    canPost: boolean;
    unread: number;
    mine: boolean;
    timeline?: StaffTimelineEntry[];
}

export type Mood = 'happy' | 'okay' | 'sad';

export interface SessionFeedback {
    mood: Mood;
    note: string;
    at: string | null;
}

export interface SupportState {
    seats: number;
    seatsLeft: number;
    autoAccept: boolean;
    requests: StaffRequestSummary[];
}

export interface StaffMessageEntry {
    id: number;
    author: string | null;
    avatar: string;
    avatarUrl: string | null;
    own: boolean;
    read: boolean;
    body: string;
    at: string | null;
}

export interface ChatCursor {
    after?: number;
    before?: number;
}

export interface StaffChatPage {
    messages: StaffMessageEntry[];
    canPost: boolean;
    more: boolean;
}

export interface OpenRequestPayload {
    reason: string;
    scope: StaffScope;
    username?: string;
    openEnded: boolean;
    durationMinutes: number | null;
    permissions?: string[];
    autoAccept?: boolean;
}

const base = (uuid: string) => `/api/client/servers/${uuid}/support`;

export const getSupport = async (uuid: string): Promise<SupportState> => (await http.get(base(uuid))).data;

export const openSupportRequest = async (uuid: string, payload: OpenRequestPayload): Promise<StaffRequestSummary> =>
    (
        await http.post(base(uuid), {
            reason: payload.reason,
            scope: payload.scope,
            username: payload.username ?? '',
            open_ended: payload.openEnded,
            duration_minutes: payload.durationMinutes,
            permissions: payload.permissions ?? [],
            auto_accept: payload.autoAccept,
        })
    ).data.request;

const act = async (uuid: string, request: string, action: string, body: object = {}): Promise<StaffRequestSummary> =>
    (await http.post(`${base(uuid)}/${request}/${action}`, body)).data.request;

export const allowSupportRequest = (uuid: string, request: string) => act(uuid, request, 'allow');

export const denySupportRequest = (uuid: string, request: string, reason: string) =>
    act(uuid, request, 'deny', { reason });

export const cancelSupportRequest = (uuid: string, request: string) => act(uuid, request, 'cancel');

export const revokeSupportAccess = (uuid: string, request: string, reason: string) =>
    act(uuid, request, 'revoke', { reason });

export const extendSupportAccess = (uuid: string, request: string, minutes?: number) =>
    act(uuid, request, 'extend', minutes === undefined ? {} : { minutes });

export const refuseSupportExtension = (uuid: string, request: string) => act(uuid, request, 'extension/deny');

export const trimSupportAccess = (uuid: string, request: string, permissions: string[]) =>
    act(uuid, request, 'trim', { permissions });

export const leaveSupportFeedback = (uuid: string, request: string, mood: Mood, note: string) =>
    act(uuid, request, 'feedback', { mood, note });

export const setSupportAutoAccept = async (uuid: string, value: boolean): Promise<boolean> =>
    (await http.post(`${base(uuid)}/auto-accept`, { value })).data.autoAccept === true;

export const getSupportMessages = async (
    uuid: string,
    request: string,
    cursor: ChatCursor = {}
): Promise<StaffChatPage> => (await http.get(`${base(uuid)}/${request}/messages`, { params: cursor })).data;

export const sendSupportMessage = async (uuid: string, request: string, body: string): Promise<StaffMessageEntry> =>
    (await http.post(`${base(uuid)}/${request}/messages`, { body })).data.message;
