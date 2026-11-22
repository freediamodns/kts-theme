import React, { Fragment, memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ExternalLink, RotateCcw } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { activeStyle, sidebarShell, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { useFoldedGroups, useServerNav } from '@/dezerx/lib/useServerNav';
import { useShellSize } from '@/dezerx/lib/useShellWidth';
import { NavContextHandler, ServerNavItem } from '@/dezerx/lib/serverNav';
import { PINNED_GROUP, useArrangeNav } from '@/dezerx/lib/navArrangement';
import { ActiveMarker, LeadingDot } from '@/dezerx/components/NavMarker';
import { NavCount } from '@/dezerx/components/NavCount';
import { useT } from '@/i18n';
import { LOCKED_ROW, NavBadge } from '@/dezerx/components/console/NavBadge';
import { ServerContext } from '@/state/server';
import { useServerSupportBadge } from '@/dezerx/lib/staffBadges';

interface Drop {
    group: string;
    before: string | null;
}

interface Marker {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface ServerNavProps {
    base: string;
    onItemContextMenu?: NavContextHandler;
    inSidebar?: boolean;
    query?: string;
}

const ROW = 'group relative flex shrink-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm transition-colors';

function ServerNav({ base, onItemContextMenu, inSidebar = false, query = '' }: ServerNavProps) {
    const t = useT();
    const theme = usePanelTheme();
    const path = useLocation().pathname;

    const { wide } = useShellSize();

    const navbar = !inSidebar && theme['manager.mode'] === 'navbar';
    const design = theme['manager.design'];
    const shell = sidebarShell(design);
    const style = activeStyle(theme['manager.active']);

    const upright = inSidebar || (!navbar && wide);

    const railed = upright && !inSidebar && shell.forceRail;

    const { groups, href } = useServerNav(base);
    const { folded, toggle } = useFoldedGroups();

    const identifier = ServerContext.useStoreState((state) => state.server.data?.id ?? null);
    const waiting = useServerSupportBadge(identifier);

    const { arranged, move, reset } = useArrangeNav(groups);

    const needle = query.trim().toLowerCase();
    const searching = needle !== '';

    const rearrangeable = theme['manager.arrange'] && !railed && !searching;

    const shown = useMemo(() => {
        if (!searching) {
            return groups;
        }

        return groups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => item.label.toLowerCase().includes(needle)),
            }))
            .filter((group) => group.items.length > 0);
    }, [groups, needle, searching]);

    const held = useRef<string | null>(null);
    const landing = useRef<Drop | null>(null);

    const [dragging, setDragging] = useState<string | null>(null);
    const [target, setTarget] = useState<Drop | null>(null);

    const forget = useCallback(() => {
        held.current = null;
        landing.current = null;
        setDragging(null);
        setTarget(null);
    }, []);

    const grab = useCallback((event: React.DragEvent, key: string, group: string) => {
        held.current = key;
        landing.current = { group, before: key };

        event.dataTransfer.effectAllowed = 'move';

        try {
            event.dataTransfer.setData('text/plain', key);
        } catch {}

        window.setTimeout(() => {
            if (held.current === key) {
                setDragging(key);
                setTarget({ group, before: key });
            }
        }, 0);
    }, []);

    const aim = useCallback((event: React.DragEvent, group: string, before: string | null) => {
        if (held.current === null) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';

        const current = landing.current;

        if (current !== null && current.group === group && current.before === before) {
            return;
        }

        landing.current = { group, before };
        setTarget({ group, before });
    }, []);

    const aimAtRow = useCallback(
        (event: React.DragEvent, group: string, key: string, next: string | null, vertical: boolean) => {
            const box = event.currentTarget.getBoundingClientRect();

            const past = vertical ? event.clientY > box.top + box.height / 2 : event.clientX > box.left + box.width / 2;

            aim(event, group, past ? next : key);
        },
        [aim]
    );

    const release = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            event.stopPropagation();

            const key = held.current;
            const to = landing.current;

            if (key !== null && to !== null && to.before !== key) {
                move({ key, group: to.group, before: to.before });
            }

            forget();
        },
        [move, forget]
    );

    const line = (group: string, before: string | null) => {
        if (dragging === null || target === null || target.group !== group || target.before !== before) {
            return null;
        }

        return (
            <div
                aria-hidden={'true'}
                className={cn(
                    'pointer-events-none shrink-0 rounded-full bg-accent',
                    upright ? '-my-0.5 h-0.5 w-full' : '-mx-0.5 h-full w-0.5'
                )}
            />
        );
    };

    const firstOf = (items: ServerNavItem[]) => items.find((entry) => entry.key !== dragging)?.key ?? null;

    const accordions = upright && !railed;

    const container = useRef<HTMLElement>(null);
    const [marker, setMarker] = useState<Marker | null>(null);

    const [settled, setSettled] = useState(false);

    const active = useCallback(
        (item: ServerNavItem, to: string) => {
            if (item.external) {
                return false;
            }

            const candidates = [
                to,
                ...item.aliases.map((alias) => `${base.replace(/\/+$/, '')}${alias === '/' ? '' : alias}` || '/'),
            ];

            return candidates.some((candidate) => (item.exact ? path === candidate : path.startsWith(candidate)));
        },
        [base, path]
    );

    const holdsActive = useMemo(
        () => new Set(groups.filter((group) => group.items.some((item) => active(item, href(item)))).map((g) => g.key)),
        [groups, href, active]
    );

    const shut = useCallback(
        (key: string, collapsible: boolean, open: boolean) =>
            accordions && collapsible && !holdsActive.has(key) && folded(key, collapsible, open),
        [accordions, holdsActive, folded]
    );

    const measure = useCallback(() => {
        const element = container.current?.querySelector<HTMLElement>('[aria-current="page"]') ?? null;

        if (!element) {
            setMarker((current) => (current === null ? current : null));

            return;
        }

        const next: Marker = {
            left: element.offsetLeft,
            top: element.offsetTop,
            width: element.offsetWidth,
            height: element.offsetHeight,
        };

        setMarker((current) =>
            current !== null &&
            current.left === next.left &&
            current.top === next.top &&
            current.width === next.width &&
            current.height === next.height
                ? current
                : next
        );
    }, []);

    useLayoutEffect(() => {
        measure();

        const frame = window.requestAnimationFrame(() => setSettled(true));
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);

        if (observer && container.current) {
            observer.observe(container.current);
        }

        return () => {
            window.cancelAnimationFrame(frame);
            observer?.disconnect();
        };
    }, [measure, path, groups, holdsActive]);

    return (
        <nav
            ref={container}
            aria-label={t('nav.serverSections')}
            onDragOver={(event) => {
                if (held.current !== null) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                }
            }}
            onDrop={release}
            className={cn(
                'relative flex gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                inSidebar
                    ? 'w-full flex-col px-2 py-1'
                    : navbar
                    ? 'w-full overflow-x-auto rounded-2xl bg-card p-1.5'
                    : upright
                    ? cn(
                          'sticky top-0 flex-col',
                          design === 'floating' && 'rounded-2xl bg-card p-2',
                          design === 'bordered' && 'border-r border-line-field pr-2',
                          design === 'compact' && '[&_a]:py-2'
                      )
                    :
                      '-mx-1 overflow-x-auto px-1 py-2'
            )}
        >
            {marker && (
                <span
                    aria-hidden={'true'}
                    style={{
                        transform: `translate(${marker.left}px, ${marker.top}px)`,
                        width: marker.width,
                        height: marker.height,
                    }}
                    className={cn(
                        'pointer-events-none absolute left-0 top-0 rounded-2xl',
                        style.link,
                        settled &&
                            'transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'
                    )}
                />
            )}

            {rearrangeable && dragging !== null && groups[0]?.key !== PINNED_GROUP && (
                <div
                    onDragEnter={(event) => aim(event, PINNED_GROUP, null)}
                    onDragOver={(event) => aim(event, PINNED_GROUP, null)}
                    onDrop={release}
                    className={cn(
                        'shrink-0 rounded-xl border border-dashed text-center text-[10px] font-semibold uppercase tracking-wider transition-colors',
                        upright ? 'w-full px-3 py-1.5' : 'px-4 py-1.5',
                        target?.group === PINNED_GROUP
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-line-field text-ink-faint'
                    )}
                >
                    {t('nav.pinHere')}
                </div>
            )}

            {line(PINNED_GROUP, null)}

            {searching && shown.length === 0 && (
                <p className={'px-3 py-6 text-center text-[13px] text-ink-faint'}>{t('nav.noSections')}</p>
            )}

            {shown.map((group) => {
                const closed = searching ? false : shut(group.key, group.collapsible, group.open);
                const heading = group.key !== '' && accordions && !navbar;

                return (
                    <Fragment key={group.key || '__loose'}>
                        {heading &&
                            (group.collapsible ? (
                                <button
                                    type={'button'}
                                    onClick={() => toggle(group.key, closed)}
                                    aria-expanded={!closed}
                                    onDragEnter={(event) => aim(event, group.key, firstOf(group.items))}
                                    onDragOver={(event) => aim(event, group.key, firstOf(group.items))}
                                    onDrop={release}
                                    className={cn(
                                        'flex w-full items-center gap-1.5 rounded-xl px-3 pb-1 pt-3 text-left text-[10px] font-semibold uppercase tracking-wider text-ink-faint transition-colors first:pt-0 hover:text-ink-muted',
                                        dragging !== null && target?.group === group.key && 'text-accent'
                                    )}
                                >
                                    <span className={'min-w-0 flex-1 truncate'}>{group.label}</span>

                                    <ChevronDown
                                        aria-hidden={'true'}
                                        className={cn(
                                            'h-3 w-3 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
                                            closed && '-rotate-90'
                                        )}
                                    />
                                </button>
                            ) : (
                                <p
                                    onDragEnter={(event) => aim(event, group.key, firstOf(group.items))}
                                    onDragOver={(event) => aim(event, group.key, firstOf(group.items))}
                                    onDrop={release}
                                    className={cn(
                                        'px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-faint first:pt-0',
                                        dragging !== null && target?.group === group.key && 'text-accent'
                                    )}
                                >
                                    {group.label}
                                </p>
                            ))}

                        {railed && group.key !== '' && (
                            <span aria-hidden={'true'} className={'my-1 block h-px w-full bg-line-field'} />
                        )}

                        {group.items.map((item, index) => {
                            const Icon = item.icon;
                            const lead = closed ? null : line(group.key, item.key);
                            const to = href(item);
                            const current = active(item, to);

                            const hidden = closed && 'hidden';

                            const body = (
                                <>
                                    {current && <LeadingDot design={theme['manager.active']} rail={railed} />}

                                    <Icon
                                        className={cn('h-[18px] w-[18px] shrink-0', current && style.icon)}
                                        aria-hidden={'true'}
                                    />

                                    <span className={cn('flex-1 truncate', railed && 'hidden')}>{item.label}</span>

                                    {item.key === '/support' && <NavCount total={waiting} rail={railed} />}

                                    {item.restriction && !railed && (
                                        <NavBadge restriction={item.restriction} side={upright ? 'right' : 'bottom'} />
                                    )}

                                    {item.external && (
                                        <ExternalLink
                                            aria-hidden={'true'}
                                            className={cn('h-3 w-3 shrink-0 opacity-50', railed && 'hidden')}
                                        />
                                    )}

                                    {current && <ActiveMarker design={theme['manager.active']} />}
                                </>
                            );

                            const shared = cn(
                                ROW,
                                upright && 'w-full shrink',
                                hidden,
                                current
                                    ? cn('font-semibold', style.text)
                                    : 'text-ink-muted hover:bg-raised hover:text-ink',
                                item.locked && LOCKED_ROW
                            );

                            const after = firstOf(group.items.slice(index + 1));

                            const away: React.CSSProperties | undefined =
                                dragging === item.key ? { opacity: 0.4 } : undefined;

                            const drag = rearrangeable
                                ? {
                                      draggable: true,
                                      onDragStart: (event: React.DragEvent) => grab(event, item.key, group.key),
                                      onDragEnd: forget,
                                      onDragEnter: (event: React.DragEvent) =>
                                          aimAtRow(event, group.key, item.key, after, upright),
                                      onDragOver: (event: React.DragEvent) =>
                                          aimAtRow(event, group.key, item.key, after, upright),
                                      onDrop: release,
                                  }
                                : {};

                            if (item.locked) {
                                return (
                                    <Fragment key={item.key}>
                                        {lead}
                                        <span
                                            aria-disabled={'true'}
                                            title={railed ? item.label : undefined}
                                            className={shared}
                                            style={away}
                                        >
                                            {body}
                                        </span>
                                    </Fragment>
                                );
                            }

                            if (item.external) {
                                return (
                                    <Fragment key={item.key}>
                                        {lead}
                                        <a
                                            href={to}
                                            target={'_blank'}
                                            rel={'noreferrer noopener'}
                                            title={railed ? item.label : undefined}
                                            onContextMenu={(event) =>
                                                onItemContextMenu?.(event, { label: item.label, href: to })
                                            }
                                            className={shared}
                                            style={away}
                                            {...drag}
                                        >
                                            {body}
                                        </a>
                                    </Fragment>
                                );
                            }

                            return (
                                <Fragment key={item.key}>
                                    {lead}
                                    <NavLink
                                        to={to}
                                        exact={item.exact}
                                        aria-current={current ? 'page' : undefined}
                                        title={railed ? item.label : undefined}
                                        onContextMenu={(event) =>
                                            onItemContextMenu?.(event, { label: item.label, href: to, item })
                                        }
                                        className={shared}
                                        style={away}
                                        {...drag}
                                    >
                                        {body}
                                    </NavLink>
                                </Fragment>
                            );
                        })}

                        {closed ? null : line(group.key, null)}

                        {rearrangeable && dragging !== null && !closed && (
                            <div
                                onDragEnter={(event) => aim(event, group.key, null)}
                                onDragOver={(event) => aim(event, group.key, null)}
                                onDrop={release}
                                className={cn('shrink-0', upright ? 'h-3 w-full' : 'h-full w-5')}
                            />
                        )}
                    </Fragment>
                );
            })}

            {rearrangeable && arranged && upright && dragging === null && (
                <button
                    type={'button'}
                    onClick={reset}
                    className={
                        'mt-1 flex w-full shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-left text-[11px] font-medium text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                    }
                >
                    <RotateCcw className={'h-3 w-3 shrink-0'} aria-hidden={'true'} />
                    {t('nav.resetOrder')}
                </button>
            )}
        </nav>
    );
}

export default memo(ServerNav);
