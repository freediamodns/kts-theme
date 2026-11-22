import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import createDirectory from '@/api/server/files/createDirectory';
import decompressFiles from '@/api/server/files/decompressFiles';
import deleteFiles from '@/api/server/files/deleteFiles';
import renameFiles from '@/api/server/files/renameFiles';
import { join, relativeTo } from '@/dezerx/components/files/paths';
import { freeName, Resolution } from '@/dezerx/components/files/uploads';


export const STAGE_PREFIX = '.stark-extract-';

export interface Staged {
    stage: string;
    stageName: string;
    entries: FileObject[];
}

export async function stageArchive(uuid: string, directory: string, archive: string): Promise<Staged> {
    const stageName = `${STAGE_PREFIX}${Date.now().toString(36)}`;
    const stage = join(directory, stageName);

    await createDirectory(uuid, directory, stageName);

    try {
        await decompressFiles(uuid, stage, `../${archive}`);
    } catch (error) {
        await deleteFiles(uuid, directory, [stageName]).catch(() => undefined);

        throw error;
    }

    return { stage, stageName, entries: await loadDirectory(uuid, stage) };
}

const fromRoot = (path: string) => relativeTo(path, '/');

async function move(uuid: string, pairs: { from: string; to: string }[]): Promise<void> {
    if (pairs.length > 0) {
        await renameFiles(
            uuid,
            '/',
            pairs.map(({ from, to }) => ({ from: fromRoot(from), to: fromRoot(to) }))
        );
    }
}

export async function mergeInto(uuid: string, from: string, to: string): Promise<void> {
    const [incoming, existing] = await Promise.all([loadDirectory(uuid, from), loadDirectory(uuid, to)]);
    const byName = new Map(existing.map((entry) => [entry.name, entry]));

    const replaced: string[] = [];
    const moved: string[] = [];
    const nested: string[] = [];

    for (const entry of incoming) {
        const there = byName.get(entry.name);

        if (!there) {
            moved.push(entry.name);
        } else if (!entry.isFile && !there.isFile) {
            nested.push(entry.name);
        } else {
            replaced.push(entry.name);
            moved.push(entry.name);
        }
    }

    if (replaced.length > 0) {
        await deleteFiles(uuid, to, replaced);
    }

    await move(
        uuid,
        moved.map((name) => ({ from: join(from, name), to: join(to, name) }))
    );

    for (const name of nested) {
        await mergeInto(uuid, join(from, name), join(to, name));
    }
}

export async function settle(
    uuid: string,
    directory: string,
    staged: Staged,
    listing: FileObject[],
    choices: Record<string, Resolution>
): Promise<number> {
    const existing = new Map(listing.map((entry) => [entry.name, entry]));
    const taken = new Set([...listing.map((entry) => entry.name), ...staged.entries.map((entry) => entry.name)]);

    const straight: { from: string; to: string }[] = [];
    const replace: string[] = [];
    const merge: string[] = [];

    for (const entry of staged.entries) {
        const choice = choices[entry.name];
        const from = join(staged.stage, entry.name);

        if (choice === 'skip') {
            continue;
        }

        if (choice === 'rename') {
            const name = freeName(entry.name, entry.isFile, taken);

            taken.add(name);
            straight.push({ from, to: join(directory, name) });
        } else if (choice === 'overwrite' && !entry.isFile && existing.get(entry.name)?.isFile === false) {
            merge.push(entry.name);
        } else {
            if (choice === 'overwrite') {
                replace.push(entry.name);
            }

            straight.push({ from, to: join(directory, entry.name) });
        }
    }

    if (replace.length > 0) {
        await deleteFiles(uuid, directory, replace);
    }

    await move(uuid, straight);

    for (const name of merge) {
        await mergeInto(uuid, join(staged.stage, name), join(directory, name));
    }

    await deleteFiles(uuid, directory, [staged.stageName]);

    return straight.length + merge.length;
}

export function discard(uuid: string, directory: string, staged: Staged): Promise<void> {
    return deleteFiles(uuid, directory, [staged.stageName]);
}
