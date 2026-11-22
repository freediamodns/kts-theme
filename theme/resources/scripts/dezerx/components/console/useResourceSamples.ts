import { useEffect, useRef, useState } from 'react';
import { ServerContext } from '@/state/server';
import { SocketEvent, SocketRequest } from '@/components/server/events';
import useWebsocketEvent from '@/plugins/useWebsocketEvent';
import { bytesToMb } from '@/dezerx/lib/format';

const WINDOW = 60;

export const SAMPLE_WINDOW = WINDOW;

export interface ResourceSample {
    cpu: number;
    memoryMb: number;
    diskMb: number;
    rxBps: number;
    txBps: number;
    uptimeMs: number;
}

export interface ResourceStats {
    samples: ResourceSample[];
    latest: ResourceSample | null;
}

interface RawFrame {
    rx: number;
    tx: number;
    at: number;
}

export function useResourceSamples(): ResourceStats {
    const [samples, setSamples] = useState<ResourceSample[]>([]);
    const previous = useRef<RawFrame | null>(null);

    const connected = ServerContext.useStoreState((state) => state.socket.connected);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);

    useEffect(() => {
        setSamples([]);
        previous.current = null;
    }, [uuid]);

    useEffect(() => {
        if (!connected || !instance) {
            return;
        }

        instance.send(SocketRequest.SEND_STATS);
    }, [instance, connected]);

    useWebsocketEvent(SocketEvent.STATS, (data) => {
        let frame: Record<string, any>;

        try {
            frame = JSON.parse(data);
        } catch {
            return;
        }

        const at = Date.now();
        const rx = Number(frame.network?.rx_bytes ?? 0);
        const tx = Number(frame.network?.tx_bytes ?? 0);
        const last = previous.current;

        const elapsed = last ? Math.max((at - last.at) / 1000, 0.001) : 0;

        const sample: ResourceSample = {
            cpu: Number(frame.cpu_absolute ?? 0),
            memoryMb: bytesToMb(Number(frame.memory_bytes ?? 0)),
            diskMb: bytesToMb(Number(frame.disk_bytes ?? 0)),
            rxBps: last && rx >= last.rx ? (rx - last.rx) / elapsed : 0,
            txBps: last && tx >= last.tx ? (tx - last.tx) / elapsed : 0,
            uptimeMs: Number(frame.uptime ?? 0),
        };

        previous.current = { rx, tx, at };

        setSamples((history) => [...history, sample].slice(-WINDOW));
    });

    return { samples, latest: samples.length > 0 ? samples[samples.length - 1]! : null };
}
