import { Task } from '@/api/server/schedules/getServerSchedules';

export interface Point {
    x: number;
    y: number;
}

export type Layout = Record<string, Point>;

const KEY = 'dezerx.schedule-layout';
const VIEW_KEY = 'dezerx.schedule-advanced';

function all(): Record<string, Layout> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const stored = window.localStorage.getItem(KEY);

        return stored ? (JSON.parse(stored) as Record<string, Layout>) : {};
    } catch {
        return {};
    }
}

export function loadLayout(uuid: string): Layout {
    return all()[uuid] ?? {};
}

export function saveLayout(uuid: string, layout: Layout): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(KEY, JSON.stringify({ ...all(), [uuid]: layout }));
    } catch {
    }
}

export function clearLayout(uuid: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const stored = all();

        delete stored[uuid];
        window.localStorage.setItem(KEY, JSON.stringify(stored));
    } catch {
    }
}

export function loadAdvanced(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        return window.localStorage.getItem(VIEW_KEY) === '1';
    } catch {
        return false;
    }
}

export function saveAdvanced(advanced: boolean): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(VIEW_KEY, advanced ? '1' : '0');
    } catch {
    }
}

export function withTask(tasks: Task[], saved: Task): Task[] {
    const others = tasks.filter((task) => task.id !== saved.id).sort((a, b) => a.sequenceId - b.sequenceId);

    const index = Math.min(Math.max(saved.sequenceId - 1, 0), others.length);

    others.splice(index, 0, saved);

    return others.map((task, position) => ({ ...task, sequenceId: position + 1 }));
}

export function withoutTask(tasks: Task[], taskId: number): Task[] {
    return tasks
        .filter((task) => task.id !== taskId)
        .sort((a, b) => a.sequenceId - b.sequenceId)
        .map((task, position) => ({ ...task, sequenceId: position + 1 }));
}
