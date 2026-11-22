import { cn } from '@/dezerx/lib/cn';
import React, { ComponentType, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/i18n';

export interface ContextMenuItem {
    label: string;
    icon?: ComponentType<{ className?: string }>;
    hint?: string;
    disabled?: boolean;
    onSelect: () => void;
}

export interface ContextMenuRequest {
    x: number;
    y: number;
    title?: string;
    items: ContextMenuItem[];
}

const EDGE_GAP = 8;

export function ContextMenu({
    request,
    onClose,
}: {
    request: ContextMenuRequest | null;
    onClose: () => void;
}) {
    const t = useT();
    const menu = useRef<HTMLDivElement>(null);
    const [placement, setPlacement] = useState<{
        left: number;
        top: number;
        origin: string;
    } | null>(null);
    const [focused, setFocused] = useState(0);

    const enabled = request?.items.filter((item) => !item.disabled) ?? [];

    useLayoutEffect(() => {
        if (!request) {
            setPlacement(null);

            return;
        }

        const element = menu.current;

        if (!element) {
            return;
        }

        const { offsetWidth: width, offsetHeight: height } = element;
        const flipX = request.x + width + EDGE_GAP > window.innerWidth;
        const flipY = request.y + height + EDGE_GAP > window.innerHeight;

        setPlacement({
            left: Math.max(
                EDGE_GAP,
                flipX ? request.x - width : Math.min(request.x, window.innerWidth - width - EDGE_GAP),
            ),
            top: Math.max(
                EDGE_GAP,
                flipY ? request.y - height : Math.min(request.y, window.innerHeight - height - EDGE_GAP),
            ),
            origin: `${flipX ? 'right' : 'left'} ${flipY ? 'bottom' : 'top'}`,
        });
    }, [request]);

    useEffect(() => {
        setFocused(0);
    }, [request]);

    const select = useCallback(
        (item: ContextMenuItem) => {
            onClose();
            item.onSelect();
        },
        [onClose],
    );

    useEffect(() => {
        if (!request) {
            return;
        }

        const onPointerDown = (event: MouseEvent) => {
            if (!menu.current?.contains(event.target as Node)) {
                onClose();
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();

                return;
            }

            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setFocused((current) => {
                    const step = event.key === 'ArrowDown' ? 1 : -1;
                    const count = enabled.length;

                    return count === 0 ? 0 : (current + step + count) % count;
                });

                return;
            }

            if (event.key === 'Enter' || event.key === ' ') {
                const item = enabled[focused];

                if (item) {
                    event.preventDefault();
                    select(item);
                }
            }
        };

        window.addEventListener('mousedown', onPointerDown, true);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onClose);
        window.addEventListener('scroll', onClose, true);
        window.addEventListener('blur', onClose);

        return () => {
            window.removeEventListener('mousedown', onPointerDown, true);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onClose);
            window.removeEventListener('scroll', onClose, true);
            window.removeEventListener('blur', onClose);
        };
    }, [request, onClose, enabled, focused, select]);

    if (!request) {
        return null;
    }

    let cursor = -1;

    const rows = request.items.map((item) => {
        if (!item.disabled) {
            cursor += 1;
        }

        return { item, index: item.disabled ? -1 : cursor };
    });

    return createPortal(
        <div
            ref={menu}
            role="menu"
            aria-label={request.title ?? t('common.options')}
            style={{
                left: placement?.left ?? request.x,
                top: placement?.top ?? request.y,
                transformOrigin: placement?.origin ?? 'left top',
                visibility: placement ? 'visible' : 'hidden',
            }}
            className={cn(
                'animate-pop fixed z-[70] min-w-52 overflow-hidden rounded-2xl p-1',
                'bg-overlay/30 backdrop-blur-lg shadow-panel ring-1 ring-line-field',
                'motion-reduce:animate-none',
            )}
        >
            {request.title && (
                <p className="truncate px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                    {request.title}
                </p>
            )}

            {rows.map(({ item, index }) => {
                const { label, icon: Icon, hint, disabled } = item;
                const active = !disabled && index === focused;

                return (
                    <button
                        key={label}
                        type="button"
                        role="menuitem"
                        disabled={disabled}
                        onMouseEnter={disabled ? undefined : () => setFocused(index)}
                        onClick={() => select(item)}
                        className={cn(
                            'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                            disabled
                                ? 'cursor-not-allowed text-ink-faint'
                                : active
                                  ? 'bg-raised/30 border border-line text-ink'
                                  : 'text-ink-muted border border-transparent',
                        )}
                    >
                        {Icon && (
                            <Icon
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                        )}
                        <span className="flex-1 truncate">{label}</span>
                        {hint && (
                            <span className="shrink-0 text-[10px] text-ink-faint">
                                {hint}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>,
        document.body,
    );
}
