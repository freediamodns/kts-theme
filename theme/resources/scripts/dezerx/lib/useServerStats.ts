import { useEffect, useRef, useState } from 'react';
import { Server } from '@/api/server/getServer';
import getServerResourceUsage, { ServerStats } from '@/api/server/getServerResourceUsage';

const POLL_INTERVAL = 15_000;

export interface ServerStatsResult {
    stats: Record<string, ServerStats>;
    unreachable: Record<string, true>;
}

export default function useServerStats(servers: Server[]): ServerStatsResult {
    const [stats, setStats] = useState<Record<string, ServerStats>>({});
    const [unreachable, setUnreachable] = useState<Record<string, true>>({});

    const limits = useRef<Record<string, Server['limits']>>({});
    limits.current = Object.fromEntries(servers.map((server) => [server.uuid, server.limits]));

    const key = servers
        .filter((server) => server.status !== 'suspended' && !server.isNodeUnderMaintenance)
        .map((server) => server.uuid)
        .join(',');

    useEffect(() => {
        const uuids = key.split(',').filter(Boolean);

        if (uuids.length === 0) {
            setStats({});
            setUnreachable({});

            return;
        }

        let alive = true;

        const load = () => {
            if (document.hidden) {
                return;
            }

            uuids.forEach((uuid) => {
                getServerResourceUsage(uuid, limits.current[uuid])
                    .then((data) => {
                        if (!alive) {
                            return;
                        }

                        setStats((current) => ({ ...current, [uuid]: data }));
                        setUnreachable((current) => {
                            if (!current[uuid]) {
                                return current;
                            }

                            const next = { ...current };
                            delete next[uuid];

                            return next;
                        });
                    })
                    .catch(() => {
                        if (alive) {
                            setUnreachable((current) => (current[uuid] ? current : { ...current, [uuid]: true }));
                        }
                    });
            });
        };

        load();

        const timer = window.setInterval(load, POLL_INTERVAL);

        return () => {
            alive = false;
            window.clearInterval(timer);
        };
    }, [key]);

    return { stats, unreachable };
}
