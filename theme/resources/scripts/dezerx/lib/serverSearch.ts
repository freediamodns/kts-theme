import type { Server } from '@/api/server/getServer';

function haystack(value: string | null | undefined): string {
    return typeof value === 'string' ? value.toLowerCase() : '';
}

export function matchesServer(server: Server, needle: string): boolean {
    if (needle === '') {
        return true;
    }

    return (
        haystack(server.name).includes(needle) ||
        haystack(server.node).includes(needle) ||
        haystack(server.description).includes(needle)
    );
}

export default matchesServer;
