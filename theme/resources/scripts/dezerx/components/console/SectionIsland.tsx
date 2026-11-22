import React, { ComponentType, PointerEvent as ReactPointerEvent, Suspense, useEffect, useRef, useState } from 'react';
import { Route } from 'react-router-dom';
import { ArrowUpRight, GripHorizontal, X } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { cardBorder, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { SkeletonRegion, Skeleton } from '@/dezerx/components/ui';
import { useT } from '@/i18n';

export interface IslandRequest {
    id: string;
    label: string;
    to: string;
    exact: boolean;
    icon: ComponentType<{ className?: string }>;
    component: ComponentType;
}

const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;
const EDGE_GAP = 8;

const CASCADE = 28;

type Gesture = 'move' | 'resize';

function clamp(value: number, low: number, high: number): number {
    return Math.min(Math.max(value, low), high);
}

function initialBox(index: number) {
    const width = Math.min(620, window.innerWidth - EDGE_GAP * 2);
    const height = Math.min(460, window.innerHeight - EDGE_GAP * 2 - 40);

    return {
        width,
        height,
        left: clamp(window.innerWidth - width - 40 + index * CASCADE, EDGE_GAP, window.innerWidth - width - EDGE_GAP),
        top: clamp(96 + index * CASCADE, EDGE_GAP, Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP)),
    };
}

export default function SectionIsland({
    request,
    index,
    onOpen,
    onClose,
    onFocus,
}: {
    request: IslandRequest;
    index: number;
    onOpen: () => void;
    onClose: () => void;
    onFocus: () => void;
}) {
    const t = useT();
    const [box, setBox] = useState(() => initialBox(index));

    const border = cardBorder(usePanelTheme()['surface.border']);

    const gesture = useRef<{ mode: Gesture; x: number; y: number; box: typeof box } | null>(null);

    const start = (mode: Gesture) => (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) {
            return;
        }

        if ((event.target as HTMLElement).closest('button') !== null) {
            return;
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        gesture.current = { mode, x: event.clientX, y: event.clientY, box };
        onFocus();
    };

    const move = (event: ReactPointerEvent<HTMLElement>) => {
        const current = gesture.current;

        if (!current) {
            return;
        }

        const dx = event.clientX - current.x;
        const dy = event.clientY - current.y;

        if (current.mode === 'move') {
            setBox({
                ...current.box,
                left: clamp(current.box.left + dx, EDGE_GAP - current.box.width + 120, window.innerWidth - 120),
                top: clamp(current.box.top + dy, EDGE_GAP, window.innerHeight - 48),
            });

            return;
        }

        setBox({
            ...current.box,
            width: clamp(
                current.box.width + dx,
                MIN_WIDTH,
                Math.max(MIN_WIDTH, window.innerWidth - current.box.left - EDGE_GAP)
            ),
            height: clamp(
                current.box.height + dy,
                MIN_HEIGHT,
                Math.max(MIN_HEIGHT, window.innerHeight - current.box.top - EDGE_GAP)
            ),
        });
    };

    const end = (event: ReactPointerEvent<HTMLElement>) => {
        if (gesture.current === null) {
            return;
        }

        gesture.current = null;

        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    useEffect(() => {
        const onResize = () =>
            setBox((current) => ({
                width: Math.min(current.width, window.innerWidth - EDGE_GAP * 2),
                height: Math.min(current.height, window.innerHeight - EDGE_GAP * 2),
                left: clamp(current.left, EDGE_GAP - current.width + 120, Math.max(EDGE_GAP, window.innerWidth - 120)),
                top: clamp(current.top, EDGE_GAP, Math.max(EDGE_GAP, window.innerHeight - 48)),
            }));

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const Icon = request.icon;
    const Section = request.component;

    return (
        <section
            role={'dialog'}
            aria-label={request.label}
            onPointerDown={onFocus}
            style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                zIndex: 61 + Math.min(index, 8),
                ...(border ? { border: `1px solid ${border}` } : {}),
            }}
            className={'fixed flex flex-col overflow-hidden rounded-2xl bg-base shadow-panel'}
        >
            <header
                onPointerDown={start('move')}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                className={
                    'flex shrink-0 cursor-grab touch-none select-none items-center gap-2 border-b border-line-field px-3 py-2 active:cursor-grabbing'
                }
            >
                <GripHorizontal className={'h-4 w-4 shrink-0 text-ink-faint'} aria-hidden={'true'} />
                <Icon className={'h-4 w-4 shrink-0 text-ink-muted'} aria-hidden={'true'} />

                <p className={'min-w-0 flex-1 truncate text-sm font-medium text-ink'}>{request.label}</p>

                <button
                    type={'button'}
                    onClick={onOpen}
                    aria-label={t('island.goTo', { label: request.label })}
                    title={t('island.goTo', { label: request.label })}
                    className={
                        'shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                    }
                >
                    <ArrowUpRight className={'h-4 w-4'} aria-hidden={'true'} />
                </button>

                <button
                    type={'button'}
                    onClick={onClose}
                    aria-label={t('island.close', { label: request.label })}
                    title={t('common.close')}
                    className={
                        'shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                    }
                >
                    <X className={'h-4 w-4'} aria-hidden={'true'} />
                </button>
            </header>

            <div className={'min-h-0 flex-1 overflow-auto p-4'}>
                <Suspense fallback={<IslandSkeleton />}>
                    <Route
                        path={request.to}
                        exact={request.exact}
                        location={{ pathname: request.to, search: '', hash: '', state: undefined }}
                        render={() => <Section />}
                    />
                </Suspense>
            </div>

            <span
                role={'presentation'}
                title={t('island.resize')}
                onPointerDown={start('resize')}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                className={
                    'absolute bottom-0 right-0 z-10 flex h-6 w-6 cursor-nwse-resize touch-none items-center justify-center text-ink-faint transition-colors hover:text-ink'
                }
            >
                <svg
                    viewBox={'0 0 10 10'}
                    aria-hidden={'true'}
                    strokeWidth={1.5}
                    strokeLinecap={'round'}
                    className={'h-2.5 w-2.5 stroke-current'}
                >
                    <path d={'M9 3 3 9M9 7l-2 2'} />
                </svg>
            </span>
        </section>
    );
}

function IslandSkeleton() {
    const t = useT();

    return (
        <SkeletonRegion label={t('common.loading')}>
            <div className={'space-y-3'}>
                <Skeleton className={'h-4 w-40'} />
                <Skeleton className={'h-24 w-full rounded-2xl'} />
                <Skeleton className={'h-24 w-full rounded-2xl'} />
            </div>
        </SkeletonRegion>
    );
}

export { SectionIsland };
