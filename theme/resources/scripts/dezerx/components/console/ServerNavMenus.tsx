import React, { Fragment, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Popover, Transition } from '@headlessui/react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { activeStyle, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { NavContextHandler, ServerNavGroup, ServerNavItem } from '@/dezerx/lib/serverNav';
import { ActiveMarker } from '@/dezerx/components/NavMarker';
import { NavCount } from '@/dezerx/components/NavCount';
import { useServerNav } from '@/dezerx/lib/useServerNav';
import { useShellSize } from '@/dezerx/lib/useShellWidth';
import { useT } from '@/i18n';
import { LOCKED_ROW, NavBadge } from '@/dezerx/components/console/NavBadge';
import { ServerContext } from '@/state/server';
import { useServerSupportBadge } from '@/dezerx/lib/staffBadges';

const MENU_HEADING = 'px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint first:pt-0';

const MENU_ITEM = 'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors';

function useSupportCount(key: string): number {
    const identifier = ServerContext.useStoreState((state) => state.server.data?.id ?? null);
    const waiting = useServerSupportBadge(identifier);

    return key === '/support' ? waiting : 0;
}

export default function ServerNavMenus({
    base,
    onItemContextMenu,
}: {
    base: string;
    onItemContextMenu?: NavContextHandler;
}) {
    const t = useT();
    const theme = usePanelTheme();
    const path = useLocation().pathname;
    const style = activeStyle(theme['manager.active']);
    const { mid } = useShellSize();

    const { groups, href } = useServerNav(base);

    const isActive = useCallback(
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

    const flat = groups.filter((group) => group.key === '' || !group.collapsible);
    const menus = groups.filter((group) => group.key !== '' && group.collapsible);

    const current = groups.flatMap((group) => group.items).find((item) => isActive(item, href(item)))?.label ?? null;

    if (!mid) {
        return (
            <nav aria-label={t('nav.serverSections')} className={'w-full'}>
                <Menu label={t('nav.sections')} current={current ?? undefined} active linkStyle={style.link} block>
                    {(close) => (
                        <>
                            {groups.map((group) => (
                                <Fragment key={group.key || '__loose'}>
                                    {group.key !== '' && <p className={MENU_HEADING}>{group.label}</p>}

                                    {group.items.map((item) => (
                                        <MenuItem
                                            key={item.key}
                                            item={item}
                                            to={href(item)}
                                            active={isActive(item, href(item))}
                                            iconStyle={style.icon}
                                            onSelect={close}
                                            onItemContextMenu={onItemContextMenu}
                                        />
                                    ))}
                                </Fragment>
                            ))}
                        </>
                    )}
                </Menu>
            </nav>
        );
    }

    return (
        <>
            <nav aria-label={t('nav.serverSections')} className={'flex w-full flex-wrap items-center gap-1'}>
                {flat.map((group) =>
                    group.items.map((item) => (
                        <BarItem
                            key={item.key}
                            item={item}
                            to={href(item)}
                            active={isActive(item, href(item))}
                            linkStyle={style.link}
                            iconStyle={style.icon}
                            onItemContextMenu={onItemContextMenu}
                        />
                    ))
                )}

                {menus.map((group) => (
                    <GroupMenu
                        key={group.key}
                        group={group}
                        href={href}
                        isActive={isActive}
                        linkStyle={style.link}
                        iconStyle={style.icon}
                        onItemContextMenu={onItemContextMenu}
                    />
                ))}
            </nav>
        </>
    );
}

function BarItem({
    item,
    to,
    active,
    linkStyle,
    iconStyle,
    onItemContextMenu,
}: {
    item: ServerNavItem;
    to: string;
    active: boolean;
    linkStyle: string;
    iconStyle: string;
    onItemContextMenu?: NavContextHandler;
}) {
    const theme = usePanelTheme();
    const Icon = item.icon;
    const waiting = useSupportCount(item.key);

    const className = cn(
        'relative flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors',
        active ? cn('font-semibold text-ink', linkStyle) : 'text-ink-muted hover:bg-raised hover:text-ink',
        item.locked && LOCKED_ROW
    );

    const body = (
        <>
            <Icon className={cn('h-[18px] w-[18px] shrink-0', active && iconStyle)} aria-hidden={'true'} />
            <span className={'truncate'}>{item.label}</span>
            <NavCount total={waiting} />
            {item.restriction && <NavBadge restriction={item.restriction} side={'bottom'} />}
            {item.external && <ExternalLink className={'h-3 w-3 shrink-0 opacity-50'} aria-hidden={'true'} />}
            {active && <ActiveMarker design={theme['manager.active']} horizontal />}
        </>
    );

    if (item.locked) {
        return (
            <span aria-disabled={'true'} className={className}>
                {body}
            </span>
        );
    }

    if (item.external) {
        return (
            <a href={to} target={'_blank'} rel={'noreferrer noopener'} className={className}>
                {body}
            </a>
        );
    }

    return (
        <NavLink
            to={to}
            exact={item.exact}
            aria-current={active ? 'page' : undefined}
            onContextMenu={(event) => onItemContextMenu?.(event, { label: item.label, href: to, item })}
            className={className}
        >
            {body}
        </NavLink>
    );
}

function MenuItem({
    item,
    to,
    active,
    iconStyle,
    onSelect,
    onItemContextMenu,
}: {
    item: ServerNavItem;
    to: string;
    active: boolean;
    iconStyle: string;
    onSelect: () => void;
    onItemContextMenu?: NavContextHandler;
}) {
    const Icon = item.icon;
    const waiting = useSupportCount(item.key);

    const body = (
        <>
            <Icon className={cn('h-[18px] w-[18px] shrink-0', active && iconStyle)} aria-hidden={'true'} />
            <span className={'flex-1 truncate'}>{item.label}</span>
            <NavCount total={waiting} />
            {item.restriction && <NavBadge restriction={item.restriction} side={'left'} />}
            {item.external && <ExternalLink className={'h-3.5 w-3.5 shrink-0 opacity-50'} aria-hidden={'true'} />}
        </>
    );

    if (item.locked) {
        return (
            <span aria-disabled={'true'} className={cn(MENU_ITEM, LOCKED_ROW)}>
                {body}
            </span>
        );
    }

    if (item.external) {
        return (
            <a
                href={to}
                target={'_blank'}
                rel={'noreferrer noopener'}
                onClick={onSelect}
                className={cn(MENU_ITEM, 'text-ink-muted hover:bg-raised hover:text-ink')}
            >
                {body}
            </a>
        );
    }

    return (
        <NavLink
            to={to}
            exact={item.exact}
            onClick={onSelect}
            aria-current={active ? 'page' : undefined}
            onContextMenu={(event) => onItemContextMenu?.(event, { label: item.label, href: to, item })}
            className={cn(
                MENU_ITEM,
                active ? 'bg-raised font-semibold text-ink' : 'text-ink-muted hover:bg-raised hover:text-ink'
            )}
        >
            {body}
        </NavLink>
    );
}

function GroupMenu({
    group,
    href,
    isActive,
    linkStyle,
    iconStyle,
    onItemContextMenu,
}: {
    group: ServerNavGroup;
    href: (item: ServerNavItem) => string;
    isActive: (item: ServerNavItem, to: string) => boolean;
    linkStyle: string;
    iconStyle: string;
    onItemContextMenu?: NavContextHandler;
}) {
    const current = group.items.find((item) => isActive(item, href(item))) ?? null;

    return (
        <Menu label={group.label} current={current?.label} active={current !== null} linkStyle={linkStyle}>
            {(close) =>
                group.items.map((item) => (
                    <MenuItem
                        key={item.key}
                        item={item}
                        to={href(item)}
                        active={isActive(item, href(item))}
                        iconStyle={iconStyle}
                        onSelect={close}
                        onItemContextMenu={onItemContextMenu}
                    />
                ))
            }
        </Menu>
    );
}

function Menu({
    label,
    current,
    active,
    linkStyle,
    block = false,
    children,
}: {
    label: string;
    current?: string;
    active: boolean;
    linkStyle: string;
    block?: boolean;
    children: (close: () => void) => React.ReactNode;
}) {
    const theme = usePanelTheme();

    return (
        <Popover className={cn('relative', block ? 'w-full' : 'shrink-0')}>
            {({ open, close }) => (
                <>
                    <Popover.Button
                        className={cn(
                            'relative flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors',
                            'focus-visible:outline-none',
                            block
                                ? 'w-full justify-between bg-raised text-left font-medium text-ink hover:bg-overlay'
                                : active
                                ? cn('font-semibold text-ink', linkStyle)
                                : 'text-ink-muted hover:bg-raised hover:text-ink',
                            open && !active && !block && 'bg-raised text-ink'
                        )}
                    >
                        <span className={'truncate'}>{current ?? label}</span>

                        {current !== undefined && !block && (
                            <span className={'hidden text-[10px] uppercase tracking-wider text-ink-faint sm:inline'}>
                                {label}
                            </span>
                        )}

                        <ChevronDown
                            className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')}
                            aria-hidden={'true'}
                        />

                        {active && !block && <ActiveMarker design={theme['manager.active']} horizontal />}
                    </Popover.Button>

                    <Transition
                        as={Fragment}
                        enter={'transition duration-100 ease-out'}
                        enterFrom={'scale-95 opacity-0'}
                        enterTo={'scale-100 opacity-100'}
                        leave={'transition duration-75 ease-in'}
                        leaveFrom={'scale-100 opacity-100'}
                        leaveTo={'scale-95 opacity-0'}
                    >
                        <Popover.Panel
                            className={cn(
                                'absolute left-0 top-full z-30 mt-1.5 max-h-[60vh] origin-top-left space-y-0.5 overflow-y-auto rounded-2xl bg-card/60 p-1.5 shadow-panel ring-1 ring-line-field backdrop-blur-xl',
                                block ? 'w-full' : 'w-56'
                            )}
                        >
                            {children(close)}
                        </Popover.Panel>
                    </Transition>
                </>
            )}
        </Popover>
    );
}

export { ServerNavMenus };
