import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/dezerx/lib/cn';

type Side = 'right' | 'left' | 'top' | 'bottom';

interface Placement {
    left: number;
    top: number;
    transform: string;
}

const GAP = 8;

function place(rect: DOMRect, side: Side): Placement {
    switch (side) {
        case 'left':
            return {
                left: rect.left - GAP,
                top: rect.top + rect.height / 2,
                transform: 'translate(-100%, -50%)',
            };
        case 'top':
            return {
                left: rect.left + rect.width / 2,
                top: rect.top - GAP,
                transform: 'translate(-50%, -100%)',
            };
        case 'bottom':
            return {
                left: rect.left + rect.width / 2,
                top: rect.bottom + GAP,
                transform: 'translate(-50%, 0)',
            };
        default:
            return {
                left: rect.right + GAP,
                top: rect.top + rect.height / 2,
                transform: 'translate(0, -50%)',
            };
    }
}

export function HoverTip({
    label,
    side = 'right',
    children,
    className,
    wrap = false,
}: {
    label: string;
    side?: Side;
    children: ReactNode;
    className?: string;
    wrap?: boolean;
}) {
    const anchor = useRef<HTMLSpanElement>(null);
    const [at, setAt] = useState<Placement | null>(null);

    const show = useCallback(() => {
        const node = anchor.current?.firstElementChild ?? anchor.current;

        if (node) {
            setAt(place(node.getBoundingClientRect(), side));
        }
    }, [side]);

    const hide = useCallback(() => setAt(null), []);

    return (
        <>
            <span
                ref={anchor}
                className={cn('contents', className)}
                onPointerEnter={show}
                onPointerLeave={hide}
                onFocusCapture={show}
                onBlurCapture={hide}
            >
                {children}
            </span>

            {at !== null &&
                createPortal(
                    <span
                        role={'tooltip'}
                        style={{ left: at.left, top: at.top, transform: at.transform }}
                        className={cn(
                            'pointer-events-none fixed z-[100] rounded-lg bg-ink px-2 py-1 text-xs font-medium text-card shadow-panel',
                            wrap ? 'w-max max-w-[18rem] whitespace-normal leading-relaxed' : 'whitespace-nowrap'
                        )}
                    >
                        {label}
                    </span>,
                    document.body
                )}
        </>
    );
}

export default HoverTip;
