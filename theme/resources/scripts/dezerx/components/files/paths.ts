export const FILE_MOVE_TYPE = 'application/x-dezerx-file-move';

export function join(directory: string, name: string): string {
    return directory === '/' ? `/${name}` : `${directory}/${name}`;
}

export function parentOf(path: string): string {
    const cut = path.lastIndexOf('/');

    return cut <= 0 ? '/' : path.slice(0, cut);
}

export function basename(path: string): string {
    return path.split('/').pop() ?? path;
}

export function normalisePath(path: string): string {
    const absolute = `/${path.trim().replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/');
    const trimmed = absolute.replace(/\/+$/, '');

    return trimmed === '' ? '/' : trimmed;
}

export function isWithin(path: string, root: string): boolean {
    return path === root || path.startsWith(root === '/' ? '/' : `${root}/`);
}

export function relativeTo(path: string, directory: string): string {
    return directory === '/' ? path.replace(/^\//, '') : path.slice(directory.length + 1);
}

const WORLD_FOLDER = /^world(_nether|_the_end)?$/;

export function isWorldFolder(entry: { name: string; isFile: boolean }): boolean {
    return !entry.isFile && WORLD_FOLDER.test(entry.name);
}
