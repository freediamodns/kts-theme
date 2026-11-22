import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

const ShellWidthContext = createContext<number | null>(null);

export const ShellWidthProvider = ShellWidthContext.Provider;

export const WIDE = 880;

export const MID = 640;

export function useShellWidth(): number {
    const measured = useContext(ShellWidthContext);
    const [fallback, setFallback] = useState(() =>
        typeof window === 'undefined' ? WIDE : window.innerWidth
    );

    useEffect(() => {
        if (measured !== null || typeof window === 'undefined') {
            return;
        }

        const onResize = () => setFallback(window.innerWidth);

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, [measured]);

    return measured ?? fallback;
}

export interface ShellSize {
    width: number;
    
    wide: boolean;
    
    mid: boolean;
}

export function useShellSize(): ShellSize {
    const width = useShellWidth();

    return { width, wide: width >= WIDE, mid: width >= MID };
}

export function useMeasuredWidth(element: HTMLElement | null): number | null {
    const [width, setWidth] = useState<number | null>(null);

    useLayoutEffect(() => {
        if (!element || typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];

            if (entry) {
                setWidth(Math.round(entry.contentRect.width));
            }
        });

        observer.observe(element);
        setWidth(Math.round(element.getBoundingClientRect().width));

        return () => observer.disconnect();
    }, [element]);

    return width;
}
