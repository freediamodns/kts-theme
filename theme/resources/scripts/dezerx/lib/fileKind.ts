import { FileObject } from '@/api/server/files/loadDirectory';

export type FileKind = 'directory' | 'text' | 'image' | 'binary';

const IMAGE = /^image\/(?!svg\+xml)/;

export function fileKind(file: FileObject): FileKind {
    if (!file.isFile) return 'directory';
    if (IMAGE.test(file.mimetype)) return 'image';

    return file.isEditable() ? 'text' : 'binary';
}

const ARCHIVE = /\.(zip|rar|7z|tar|tgz|gz|bz2|xz|zst|lz4)$/i;

export function isArchive(file: FileObject): boolean {
    return file.isFile && (file.isArchiveType() || ARCHIVE.test(file.name));
}
