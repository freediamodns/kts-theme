import { useCallback, useEffect, useRef, useState } from 'react';

export type PopupResult = 'connected' | 'blocked' | string;

export function useDiscordPopup(
    url: string,
    onResult: (status: PopupResult) => void
): { open: () => void; waiting: boolean } {
    const [waiting, setWaiting] = useState(false);
    const popup = useRef<Window | null>(null);
    const watch = useRef<number | null>(null);
    const handler = useRef(onResult);

    handler.current = onResult;

    const stop = useCallback(() => {
        if (watch.current !== null) {
            window.clearInterval(watch.current);
            watch.current = null;
        }
    }, []);

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            const result = event.data as { source?: string; status?: string } | null;

            if (event.origin !== window.location.origin || !result || result.source !== 'dezerx-discord') {
                return;
            }

            stop();
            popup.current?.close();
            popup.current = null;
            setWaiting(false);
            handler.current(result.status === 'linked' ? 'connected' : result.status ?? 'failed');
        };

        window.addEventListener('message', onMessage);

        return () => {
            window.removeEventListener('message', onMessage);
            stop();
        };
    }, [stop]);

    const open = useCallback(() => {
        if (popup.current !== null && !popup.current.closed) {
            popup.current.focus();

            return;
        }

        const width = 520;
        const height = 760;
        const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
        const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
        const opened = window.open(
            url,
            'dezerx-discord-bot',
            `popup=1,width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)}`
        );

        if (opened === null) {
            handler.current('blocked');

            return;
        }

        popup.current = opened;
        setWaiting(true);

        watch.current = window.setInterval(() => {
            if (popup.current?.closed === true) {
                stop();
                popup.current = null;
                setWaiting(false);
            }
        }, 500);
    }, [url, stop]);

    return { open, waiting };
}
