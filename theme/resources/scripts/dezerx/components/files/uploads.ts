import axios from 'axios';
import { FileObject } from '@/api/server/files/loadDirectory';
import createDirectory from '@/api/server/files/createDirectory';
import getFileUploadUrl from '@/api/server/files/getFileUploadUrl';
import { join } from '@/dezerx/components/files/paths';


export interface UploadFile {
    file: File;
    rest: string;
}

export interface UploadEntry {
    name: string;
    isFile: boolean;
    files: UploadFile[];
    folders: string[];
    size: number;
    modifiedAt: Date | null;
}

export type Resolution = 'skip' | 'overwrite' | 'rename';

export interface Named {
    name: string;
    isFile: boolean;
}

export interface Conflict<T extends Named = UploadEntry> {
    entry: T;
    existing: FileObject;
}

export function looksLikeFolder(file: File): boolean {
    return !file.type && (!file.size || file.size === 4096);
}

function build(files: { file: File; path: string }[], folders: string[]): UploadEntry[] {
    const entries = new Map<string, UploadEntry>();

    const entryFor = (top: string, isFile: boolean): UploadEntry => {
        let entry = entries.get(top);

        if (!entry) {
            entry = { name: top, isFile, files: [], folders: isFile ? [] : [''], size: 0, modifiedAt: null };
            entries.set(top, entry);
        }

        return entry;
    };

    for (const folder of folders) {
        const [top, ...rest] = folder.split('/');

        if (top) {
            const entry = entryFor(top, false);
            const inner = rest.join('/');

            if (entry.folders.indexOf(inner) < 0) {
                entry.folders.push(inner);
            }
        }
    }

    for (const { file, path } of files) {
        const [top, ...rest] = path.split('/').filter(Boolean);

        if (!top) {
            continue;
        }

        const entry = entryFor(top, rest.length === 0);

        entry.files.push({ file, rest: rest.join('/') });
        entry.size += file.size;

        const modified = new Date(file.lastModified);

        if (entry.modifiedAt === null || modified > entry.modifiedAt) {
            entry.modifiedAt = modified;
        }
    }

    return [...entries.values()];
}

export function fromFileList(list: File[]): UploadEntry[] {
    return build(
        list.map((file) => ({ file, path: file.webkitRelativePath || file.name })),
        []
    );
}

function readBatch(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

function fileOf(entry: FileSystemFileEntry): Promise<File> {
    return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function walk(
    entry: FileSystemEntry,
    path: string,
    files: { file: File; path: string }[],
    folders: string[]
): Promise<void> {
    if (entry.isFile) {
        files.push({ file: await fileOf(entry as FileSystemFileEntry), path });

        return;
    }

    folders.push(path);

    const reader = (entry as FileSystemDirectoryEntry).createReader();

    for (;;) {
        const batch = await readBatch(reader);

        if (batch.length === 0) {
            break;
        }

        for (const child of batch) {
            await walk(child, `${path}/${child.name}`, files, folders);
        }
    }
}

export function fromDataTransfer(transfer: DataTransfer): Promise<UploadEntry[] | null> {
    const items = Array.from(transfer.items ?? []).filter((item) => item.kind === 'file');
    const roots = items.map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null));

    if (roots.length === 0 || roots.some((root) => root === null)) {
        const plain = Array.from(transfer.files);

        return Promise.resolve(plain.some(looksLikeFolder) ? null : fromFileList(plain));
    }

    return (async () => {
        const files: { file: File; path: string }[] = [];
        const folders: string[] = [];

        for (const root of roots as FileSystemEntry[]) {
            await walk(root, root.name, files, folders);
        }

        return build(files, folders);
    })();
}

export function findConflicts<T extends Named>(entries: T[], listing: FileObject[]): Conflict<T>[] {
    const byName = new Map(listing.map((file) => [file.name, file]));

    return entries.reduce<Conflict<T>[]>((found, entry) => {
        const existing = byName.get(entry.name);

        if (existing) {
            found.push({ entry, existing });
        }

        return found;
    }, []);
}

export function canOverwrite(conflict: Conflict<Named>): boolean {
    return conflict.entry.isFile === conflict.existing.isFile;
}

export function freeName(name: string, isFile: boolean, taken: Set<string>): string {
    const dot = isFile ? name.lastIndexOf('.') : -1;
    const [stem, extension] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];

    for (let index = 1; ; index++) {
        const candidate = `${stem} (${index})${extension}`;

        if (!taken.has(candidate)) {
            return candidate;
        }
    }
}

export function resolve<T extends Named>(
    entries: T[],
    listing: { name: string }[],
    choices: Record<string, Resolution>
): T[] {
    const taken = new Set([...listing.map((file) => file.name), ...entries.map((entry) => entry.name)]);

    return entries.reduce<T[]>((kept, entry) => {
        const choice = choices[entry.name];

        if (choice === 'skip') {
            return kept;
        }

        if (choice === 'rename') {
            const name = freeName(entry.name, entry.isFile, taken);

            taken.add(name);
            kept.push({ ...entry, name });

            return kept;
        }

        kept.push(entry);

        return kept;
    }, []);
}

const BATCH_FILES = 40;
const BATCH_BYTES = 64 * 1024 * 1024;

const RETRIES = 3;

const PARALLEL = 4;

export class UploadFailure extends Error {
    constructor(
        public readonly failed: { name: string; error: unknown }[],
        public readonly sent: number,
        public readonly total: number
    ) {
        super(`${failed.length} of ${total} files could not be uploaded`);
    }
}

function ancestors(rest: string): string[] {
    const parts = rest.split('/').slice(0, -1);

    return ['', ...parts.map((_, index) => parts.slice(0, index + 1).join('/'))];
}

function place(directory: string, path: string): { folder: string; name: string } {
    const cut = path.lastIndexOf('/');

    return cut < 0
        ? { folder: directory, name: path }
        : { folder: join(directory, path.slice(0, cut)), name: path.slice(cut + 1) };
}

export async function sendUploads(
    uuid: string,
    directory: string,
    entries: UploadEntry[],
    onProgress: (fraction: number, done: number, total: number) => void
): Promise<number> {
    for (const entry of entries) {
        const filled = new Set(entry.files.flatMap(({ rest }) => ancestors(rest)));

        for (const folder of entry.folders.filter((inner) => !filled.has(inner))) {
            const target = place(directory, folder === '' ? entry.name : `${entry.name}/${folder}`);

            await createDirectory(uuid, target.folder, target.name);
        }
    }

    const jobs = entries.flatMap((entry) =>
        entry.files.map(({ file, rest }) => ({
            file,
            ...place(directory, rest === '' ? entry.name : `${entry.name}/${rest}`),
        }))
    );

    const total = jobs.reduce((sum, job) => sum + job.file.size, 0) || 1;

    const batches: { folder: string; jobs: typeof jobs; size: number }[] = [];
    const open = new Map<string, typeof batches[number]>();

    for (const job of jobs) {
        let batch = open.get(job.folder);

        if (!batch || batch.jobs.length >= BATCH_FILES || batch.size + job.file.size > BATCH_BYTES) {
            batch = { folder: job.folder, jobs: [], size: 0 };
            batches.push(batch);
            open.set(job.folder, batch);
        }

        batch.jobs.push(job);
        batch.size += job.file.size;
    }

    const sent = batches.map(() => 0);

    let next = 0;
    let finished = 0;
    const failed: { name: string; error: unknown }[] = [];

    const report = () =>
        onProgress(Math.min(0.99, sent.reduce((sum, value) => sum + value, 0) / total), finished, jobs.length);

    const post = async (index: number) => {
        const batch = batches[index]!;

        for (let attempt = 1; ; attempt++) {
            const form = new FormData();

            batch.jobs.forEach((job) => form.append('files', job.file, job.name));

            try {
                await axios.post(await getFileUploadUrl(uuid), form, {
                    params: { directory: batch.folder },
                    onUploadProgress: (event) => {
                        sent[index] = Math.min(batch.size, event.loaded);
                        report();
                    },
                });

                return;
            } catch (error) {
                const status = (error as { response?: { status?: number } })?.response?.status;

                if (attempt >= RETRIES || (status !== 404 && status !== 429)) {
                    throw error;
                }

                sent[index] = 0;
                await new Promise((wait) => setTimeout(wait, status === 429 ? 5000 * attempt : 500));
            }
        }
    };

    report();

    const worker = async () => {
        while (next < batches.length) {
            const index = next++;
            const batch = batches[index]!;

            try {
                await post(index);
                finished += batch.jobs.length;
            } catch (error) {
                batch.jobs.forEach((job) => failed.push({ name: job.name, error }));
            }

            sent[index] = batch.size;
            report();
        }
    };

    await Promise.all(Array.from({ length: Math.min(PARALLEL, batches.length) }, worker));

    if (failed.length > 0) {
        throw new UploadFailure(failed, finished, jobs.length);
    }

    onProgress(1, jobs.length, jobs.length);

    return jobs.length;
}
