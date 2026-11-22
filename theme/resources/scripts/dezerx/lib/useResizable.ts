import { KeyboardEvent, PointerEvent, useCallback, useEffect, useState } from 'react';

export interface Resizable {
    size: number;
    handleProps: {
        role: 'separator';
        tabIndex: 0;
        'aria-orientation': 'vertical' | 'horizontal';
        'aria-valuenow': number;
        'aria-valuemin': number;
        'aria-valuemax': number;
        onPointerDown: (event: PointerEvent) => void;
        onKeyDown: (event: KeyboardEvent) => void;
        onDoubleClick: () => void;
    };
    dragging: boolean;
}

const STEP = 24;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function useResizable({
    axis,
    initial,
    min,
    max,
    storageKey,
}: {
    axis: 'x' | 'y';
    initial: number;
    min: number;
    max: number;
    storageKey: string;
}): Resizable {
    const [size, setSize] = useState(initial);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        try {
            const stored = Number(window.localStorage.getItem(storageKey));

            if (Number.isFinite(stored) && stored > 0) {
                setSize(clamp(stored, min, max));
            }
        } catch {
        }
    }, [storageKey, min, max]);

    const persist = useCallback(
        (value: number) => {
            try {
                window.localStorage.setItem(storageKey, String(Math.round(value)));
            } catch {
                return;
            }
        },
        [storageKey]
    );

    const onPointerDown = (event: PointerEvent) => {
        event.preventDefault();

        const origin = axis === 'x' ? event.clientX : event.clientY;
        let latest = size;

        setDragging(true);

        const move = (moved: globalThis.PointerEvent) => {
            const delta = (axis === 'x' ? moved.clientX : moved.clientY) - origin;

            latest = clamp(size + delta, min, max);
            setSize(latest);
        };

        const release = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', release);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            setDragging(false);
            persist(latest);
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', release);

        document.body.style.userSelect = 'none';
        document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
    };

    const onKeyDown = (event: KeyboardEvent) => {
        const grow = axis === 'x' ? 'ArrowRight' : 'ArrowDown';
        const shrink = axis === 'x' ? 'ArrowLeft' : 'ArrowUp';

        if (event.key !== grow && event.key !== shrink) {
            return;
        }

        event.preventDefault();

        const next = clamp(size + (event.key === grow ? STEP : -STEP), min, max);

        setSize(next);
        persist(next);
    };

    const reset = () => {
        setSize(initial);
        persist(initial);
    };

    return {
        size,
        dragging,
        handleProps: {
            role: 'separator',
            tabIndex: 0,
            'aria-orientation': axis === 'x' ? 'vertical' : 'horizontal',
            'aria-valuenow': Math.round(size),
            'aria-valuemin': min,
            'aria-valuemax': max,
            onPointerDown,
            onKeyDown,
            onDoubleClick: reset,
        },
    };
}

export default useResizable;
