import http from '@/api/http';
import { t } from '@/i18n';

export interface AiStep {
    tool: string;
    input: Record<string, unknown>;
    ok: boolean;
    summary: string;
}

export interface AiPending {
    token: string;
    tool: string;
    kind: 'approval' | 'question';
    summary: string;
    input: Record<string, unknown>;
}

export interface AiAllowance {
    messages: number;
    minutes: number;
    remaining: number;
    resetsIn: number;
}

export interface AiAnswer {
    text: string;
    steps: AiStep[];
    truncated: boolean;
    pending: AiPending[];
    stopped?: boolean;
    allowance?: AiAllowance;
}

export interface AiTurn {
    role: 'user' | 'assistant';
    content: string;
}

export interface AiConfig {
    keyMode: 'panel' | 'user' | 'choice';
    hasOwnKey: boolean;
    hasPanelKey: boolean;
    ready: boolean;
    canBringKey: boolean;
    provider: string;
    model: string;
    providerLabels: Record<string, string>;
    userProviders: string[];
    ownProvider: string;
    ownModel: string;
    own: boolean;
    defaultModels: Record<string, string>;
    keylessProviders: string[];
    writes: boolean;
    askFirst: boolean;
    limit: { messages: number; minutes: number };
}

interface BootWindow extends Window {
    SiteConfiguration?: { dezerx?: { ai?: AiConfig | null } };
}

export function aiConfig(): AiConfig | null {
    if (typeof window === 'undefined') {
        return null;
    }

    return (window as BootWindow).SiteConfiguration?.dezerx?.ai ?? null;
}

export const MAX_MESSAGE = 24_000;

export const MAX_TURNS = 40;

class AiError extends Error {
    constructor(message: string, public readonly needsKey = false, public readonly allowance?: AiAllowance) {
        super(message);
    }
}

export { AiError };

function csrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

interface AskOptions {
    messages: AiTurn[];
    approve?: string[];
    run: string;
    server?: string | null;
    onStep: (step: AiStep) => void;
    signal?: AbortSignal;
}

export async function askAssistant({ messages, approve, run, server, onStep, signal }: AskOptions): Promise<AiAnswer> {
    const response = await fetch('/api/client/dezerx/ai/chat', {
        method: 'POST',
        credentials: 'same-origin',
        signal,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/x-ndjson, application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': csrfToken(),
        },
        body: JSON.stringify({ run, server: server ?? null, messages, approve: approve ?? [] }),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));

        throw new AiError(body.message ?? t('companion.unreachableShort'), body.needsKey === true, body.allowance);
    }

    if (!response.body) {
        throw new AiError(t('companion.noStreaming'));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    const result: { answer: AiAnswer | null } = { answer: null };

    const handle = (line: string) => {
        if (line.trim() === '') {
            return;
        }

        let event: Record<string, any>;

        try {
            event = JSON.parse(line);
        } catch {
            return;
        }

        if (event.type === 'step' && event.step) {
            onStep(event.step as AiStep);
        } else if (event.type === 'error') {
            throw new AiError(event.message ?? t('companion.couldNotAnswer'));
        } else if (event.type === 'stopped') {
            result.answer = { text: '', steps: [], truncated: true, pending: [], stopped: true };
        } else if (event.type === 'done') {
            result.answer = {
                text: event.text ?? '',
                steps: event.steps ?? [],
                truncated: event.truncated === true,
                pending: event.pending ?? [],
                allowance: event.allowance,
            };
        }
    };

    for (;;) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            handle(line);
        }
    }

    handle(buffer);

    if (result.answer === null) {
        throw new AiError(t('companion.cutOff'));
    }

    return result.answer;
}

export async function stopAssistant(run: string): Promise<void> {
    await http.post(`/api/client/dezerx/ai/chat/${encodeURIComponent(run)}/stop`);
}

export async function saveAiKey(payload: {
    key: string;
    provider: string;
    model: string;
    own: boolean;
    remove?: boolean;
}): Promise<void> {
    await http.post('/api/client/dezerx/ai/key', payload);
}

export async function setAskFirst(askFirst: boolean): Promise<void> {
    await http.post('/api/client/dezerx/ai/mode', { askFirst });
}

export interface AiModelList {
    models: string[];
    live: boolean;
    error: string | null;
    hasKey: boolean;
}

export async function fetchModels(provider: string, key = '', fresh = false): Promise<AiModelList> {
    const { data } = await http.post('/api/client/dezerx/ai/models', { provider, key, fresh });

    return data;
}

export async function fetchAllowance(): Promise<AiAllowance> {
    const { data } = await http.get('/api/client/dezerx/ai/allowance');

    return data.allowance;
}
