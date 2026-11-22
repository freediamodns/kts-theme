import { useCallback, useEffect, useRef, useState } from 'react';

export function useCopied(hold = 1500): [boolean, (value: string) => void] {
    const [copied, setCopied] = useState(false);
    const timer = useRef<number | null>(null);

    const stop = useCallback(() => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
    }, []);

    useEffect(() => stop, [stop]);

    const copy = useCallback(
        (value: string) => {
            void navigator.clipboard?.writeText(value).then(
                () => {
                    stop();
                    setCopied(true);

                    timer.current = window.setTimeout(() => {
                        timer.current = null;
                        setCopied(false);
                    }, hold);
                },
                () => setCopied(false)
            );
        },
        [hold, stop]
    );

    return [copied, copy];
}
