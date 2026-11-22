import React from 'react';
import { cn } from '@/dezerx/lib/cn';
import { FileKind } from '@/dezerx/lib/fileKind';
import { useExternalStore } from '@/dezerx/lib/externalStore';

const ICON_BASE = '/dezerx/file-icons';

const PENDING_FILE = 'file';

interface Mapper {
    file: (path: string) => string;
}

let mapper: Mapper | null = null;
const listeners = new Set<() => void>();

void import(/* webpackChunkName: "file-icons" */ 'vscode-material-icons').then((module) => {
    mapper = { file: module.getIconForFilePath };

    for (const listener of listeners) {
        listener();
    }
});

const subscribeIcons = (listener: () => void) => {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
};

const iconsReady = () => mapper !== null;

export function useFileIcons(): boolean {
    return useExternalStore(subscribeIcons, iconsReady);
}

const EXTENSION_FALLBACKS: Record<string, string> = {
    yml: 'yaml',
    yaml: 'yaml',
    nbt: 'hex',
    mcfunction: 'minecraft',
    schematic: 'minecraft',
    litematic: 'minecraft',
    pid: 'console',
};

export function iconNameFor(name: string): string {
    const icon = mapper === null ? PENDING_FILE : mapper.file(name);

    if (icon !== PENDING_FILE) {
        return icon;
    }

    const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();

    return EXTENSION_FALLBACKS[extension] ?? PENDING_FILE;
}

export function FileIcon({ name, kind, className }: { name: string; kind: FileKind; className?: string }) {
    if (kind === 'directory') {
        return null;
    }

    return (
        <img
            src={`${ICON_BASE}/${iconNameFor(name)}.svg`}
            alt={''}
            aria-hidden={'true'}
            draggable={false}
            loading={'lazy'}
            decoding={'async'}
            onError={(event) => {
                const image = event.currentTarget;
                const fallback = `${ICON_BASE}/${PENDING_FILE}.svg`;

                if (!image.src.endsWith(fallback)) {
                    image.src = fallback;
                }
            }}
            className={cn('select-none object-contain grayscale', className)}
        />
    );
}
