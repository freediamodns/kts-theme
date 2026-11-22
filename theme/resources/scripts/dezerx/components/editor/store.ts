import { useCallback } from 'react';
import { useExternalStore } from '@/dezerx/lib/externalStore';

const KEY = 'dezerx.editor';

const listeners = new Set<() => void>();

let open = read();

function read(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        if (new URLSearchParams(window.location.search).has('editor')) {
            return true;
        }

        return window.sessionStorage.getItem(KEY) === '1';
    } catch {
        return false;
    }
}

function publish(): void {
    for (const listener of listeners) {
        listener();
    }
}

export function setEditorOpen(next: boolean): void {
    if (open === next) {
        return;
    }

    open = next;

    if (!next) {
        device = 'desktop';

        presets = false;

        for (const listener of presetListeners) {
            listener();
        }
    }

    try {
        if (next) {
            window.sessionStorage.setItem(KEY, '1');
        } else {
            window.sessionStorage.removeItem(KEY);
        }
    } catch {}

    applyPreview();
    publish();
}

export function isEditorOpen(): boolean {
    return open;
}

function subscribeOpen(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

function snapshotOpen(): boolean {
    return open;
}

export function useEditorOpen(): boolean {
    return useExternalStore(subscribeOpen, snapshotOpen);
}

let presets = false;

const presetListeners = new Set<() => void>();

export function setPresetsOpen(next: boolean): void {
    if (presets === next) {
        return;
    }

    presets = next;

    if (next) {
        setEditorOpen(true);
    }

    for (const listener of presetListeners) {
        listener();
    }
}

function subscribePresets(listener: () => void): () => void {
    presetListeners.add(listener);

    return () => {
        presetListeners.delete(listener);
    };
}

function snapshotPresets(): boolean {
    return presets;
}

export function usePresetsOpen(): boolean {
    return useExternalStore(subscribePresets, snapshotPresets);
}

let previewing = false;

const previewingListeners = new Set<() => void>();

export function setPreviewing(next: boolean): void {
    if (previewing === next) {
        return;
    }

    previewing = next;

    for (const listener of previewingListeners) {
        listener();
    }
}

export function isPreviewing(): boolean {
    return previewing;
}

function subscribePreviewing(listener: () => void): () => void {
    previewingListeners.add(listener);

    return () => {
        previewingListeners.delete(listener);
    };
}

function snapshotPreviewing(): boolean {
    return previewing;
}

export function usePreviewing(): boolean {
    return useExternalStore(subscribePreviewing, snapshotPreviewing);
}

let section = '';

const sectionListeners = new Set<() => void>();

export function setEditorSection(next: string): void {
    if (section === next) {
        return;
    }

    section = next;

    for (const listener of sectionListeners) {
        listener();
    }
}

function subscribeSection(listener: () => void): () => void {
    sectionListeners.add(listener);

    return () => {
        sectionListeners.delete(listener);
    };
}

function snapshotSection(): string {
    return section;
}

export function useEditorSection(): string {
    return useExternalStore(subscribeSection, snapshotSection);
}

let saving = false;

const savingListeners = new Set<() => void>();

const saveListeners = new Set<() => void>();

export function setEditorSaving(next: boolean): void {
    if (saving === next) {
        return;
    }

    saving = next;

    for (const listener of savingListeners) {
        listener();
    }
}

function subscribeSaving(listener: () => void): () => void {
    savingListeners.add(listener);

    return () => {
        savingListeners.delete(listener);
    };
}

function snapshotSaving(): boolean {
    return saving;
}

export function useEditorSaving(): boolean {
    return useExternalStore(subscribeSaving, snapshotSaving);
}

export function requestEditorSave(): void {
    for (const listener of saveListeners) {
        listener();
    }
}

export function onEditorSave(listener: () => void): () => void {
    saveListeners.add(listener);

    return () => {
        saveListeners.delete(listener);
    };
}

export const EDITOR_WIDTH = '36rem';

export type Device = 'desktop' | 'tablet' | 'mobile';

const EDITOR_PX = 576;

export const PREVIEW_MIN = 320;

export const PREVIEW_MAX = 1600;

export const DEVICE_WIDTHS: Record<Device, number> = {
    desktop: PREVIEW_MAX,
    tablet: 900,
    mobile: 420,
};

const SCREENS: [string, number][] = [
    ['sm', 640],
    ['md', 768],
    ['lg', 1024],
    ['xl', 1280],
    ['2xl', 1536],
];

function describePreview(width: number | null): void {
    if (typeof document === 'undefined') {
        return;
    }

    if (width === null) {
        document.documentElement.removeAttribute('data-preview');

        return;
    }

    document.documentElement.setAttribute(
        'data-preview',
        SCREENS.filter(([, at]) => width >= at)
            .map(([name]) => name)
            .join(' ')
    );
}

const deviceListeners = new Set<() => void>();

let device: Device = 'desktop';

export function setDevice(next: Device): void {
    if (device === next) {
        return;
    }

    device = next;

    applyPreview();
}

function clampWidth(next: number): number {
    const room =
        typeof window === 'undefined' ? PREVIEW_MAX : Math.max(PREVIEW_MIN, window.innerWidth - EDITOR_PX - 48);

    return Math.round(Math.min(PREVIEW_MAX, room, Math.max(PREVIEW_MIN, next)));
}

function applyPreview(): void {
    width = open ? clampWidth(DEVICE_WIDTHS[device]) : null;

    describePreview(width);

    for (const listener of deviceListeners) {
        listener();
    }
}

let width: number | null = null;

export function setPreviewWidth(next: number): void {
    if (!open) {
        return;
    }

    const clamped = clampWidth(next);

    if (width === clamped) {
        return;
    }

    width = clamped;

    describePreview(width);

    for (const listener of deviceListeners) {
        listener();
    }
}

function snapshotWidth(): number | null {
    return width;
}

export function usePreviewWidth(): number | null {
    return useExternalStore(subscribeDevice, snapshotWidth);
}

function subscribeDevice(listener: () => void): () => void {
    deviceListeners.add(listener);

    return () => {
        deviceListeners.delete(listener);
    };
}

function snapshotDevice(): Device {
    return device;
}

export function useDevice(): Device {
    return useExternalStore(subscribeDevice, snapshotDevice);
}

export function useOpenEditor(): () => void {
    return useCallback(() => setEditorOpen(true), []);
}

applyPreview();

if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
        if (open) {
            setPreviewWidth(device === 'desktop' ? PREVIEW_MAX : width ?? DEVICE_WIDTHS[device]);
        }
    });
}
