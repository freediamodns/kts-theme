import { useCallback, useEffect, useRef, useState } from 'react';
import http from '@/api/http';

export interface HistoryEntry {
    id: number;
    command: string;
    at: string | null;
}

export interface CommandHistory {
    items: HistoryEntry[];
    loading: boolean;
    keepDays: number;
    record: (command: string) => void;
    clear: () => Promise<void>;
}

export function useCommandHistory(uuid: string, enabled: boolean): CommandHistory {
    const [items, setItems] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(enabled);
    const [keepDays, setKeepDays] = useState(90);

    const live = useRef(true);

    useEffect(() => {
        live.current = true;

        return () => {
            live.current = false;
        };
    }, []);

    useEffect(() => {
        if (!enabled) {
            setItems([]);
            setLoading(false);

            return;
        }

        setLoading(true);

        http.get(`/api/client/servers/${uuid}/console/history`)
            .then(({ data }) => {
                if (!live.current) {
                    return;
                }

                setItems((data?.items ?? []) as HistoryEntry[]);

                if (typeof data?.keepDays === 'number') {
                    setKeepDays(data.keepDays);
                }
            })
            .catch(() => {
                if (live.current) {
                    setItems([]);
                }
            })
            .finally(() => {
                if (live.current) {
                    setLoading(false);
                }
            });
    }, [uuid, enabled]);

    const record = useCallback(
        (command: string) => {
            if (!enabled) {
                return;
            }

            setItems((current) => [
                { id: Date.now(), command, at: new Date().toISOString() },
                ...current.filter((entry) => entry.command !== command),
            ]);

            void http.post(`/api/client/servers/${uuid}/console/history`, { command }).catch(() => undefined);
        },
        [uuid, enabled]
    );

    const clear = useCallback(async () => {
        setItems([]);

        await http.delete(`/api/client/servers/${uuid}/console/history`);
    }, [uuid]);

    return { items, loading, keepDays, record, clear };
}
