import React, {
    CSSProperties,
    ReactNode,
    Suspense,
    createContext,
    lazy,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { useStoreState } from 'easy-peasy';
import { ChevronDown, ExternalLink, Menu, Settings, X } from 'lucide-react';
import { ApplicationStore } from '@/state';
import { cn } from '@/dezerx/lib/cn';
import { linkIcon } from '@/dezerx/lib/linkIcons';
import {
    NAV_EXACT,
    navLabel,
    PRIMARY_NAV_KEYS,
    activeStyle,
    contentWidth,
    managerShell,
    searchStyle,
    sidebarShell,
    usePanelTheme,
    type ActiveDesign,
} from '@/dezerx/lib/panelTheme';
import {
    EDITOR_WIDTH,
    setPreviewWidth,
    useEditorOpen,
    useEditorSection,
    usePreviewWidth,
} from '@/dezerx/components/editor/store';
import { AuthPreviewContent } from '@/dezerx/components/editor/Previews';
import { ActiveMarker, LeadingDot } from '@/dezerx/components/NavMarker';
import { NavCount } from '@/dezerx/components/NavCount';
import AccountBar, { AccountDrawerActions } from '@/dezerx/components/AccountBar';
import ServerSwitcher from '@/dezerx/components/ServerSwitcher';
import Logo from '@/dezerx/components/Logo';
import UserAvatar from '@/dezerx/components/UserAvatar';
import ThemeEditor from '@/dezerx/components/editor/ThemeEditor';
import { PresetsLauncher } from '@/dezerx/components/editor/Presets';
import DemoWelcome from '@/dezerx/components/DemoWelcome';
import { useDemo } from '@/dezerx/lib/demo';
import { useIsStaff } from '@/dezerx/lib/staff';
import { useStaffQueueBadge } from '@/dezerx/lib/staffBadges';
import { ShellWidthProvider, useMeasuredWidth } from '@/dezerx/lib/useShellWidth';
import { aiConfig } from '@/dezerx/lib/ai';
import { discordBotAvailable } from '@/dezerx/lib/addons';
import { useT } from '@/i18n';

const Companion = lazy(() => import(/* webpackChunkName: "companion" */ '@/dezerx/components/ai/Companion'));

const COLLAPSE = 'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

const SearchContext = createContext<{ query: string; setQuery: (value: string) => void }>({
    query: '',
    setQuery: () => undefined,
});

export function useLayoutSearch(): string {
    return useContext(SearchContext).query;
}

const SidebarSlotContext = createContext<HTMLElement | null>(null);

export function useSidebarSlot(): HTMLElement | null {
    return useContext(SidebarSlotContext);
}

interface NavItem {
    label: string;
    to: string;
    icon: string;
    exact: boolean;
    badge?: number;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

interface PanelLayoutProps {
    children: ReactNode;
    rail?: boolean;
    actions?: ReactNode;
    fullWidth?: boolean;
    inServer?: boolean;
}

export default function PanelLayout({
    children,
    rail = false,
    actions,
    fullWidth = false,
    inServer = false,
}: PanelLayoutProps) {
    const t = useT();
    const location = useLocation();
    const path = location.pathname;
    const theme = usePanelTheme();
    const [query, setQuery] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);

    const editorOpen = useEditorOpen();
    const editorSection = useEditorSection();
    const preview = usePreviewWidth();
    const deviceWidth = editorOpen ? preview : null;

    const authPreview = editorOpen && editorSection === 'auth';

    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data?.rootAdmin) === true;

    const demo = useDemo();
    const staffMember = useIsStaff();
    const staffWaiting = useStaffQueueBadge();
    const [editorUsed, setEditorUsed] = useState(editorOpen);

    useEffect(() => {
        if (editorOpen) {
            setEditorUsed(true);
        }
    }, [editorOpen]);

    const hasAssistant = useMemo(() => aiConfig() !== null, []);
    const hasDiscordBot = useMemo(() => discordBotAvailable(), []);

    const shell = sidebarShell(theme['sidebar.design']);

    const railed = rail || shell.forceRail;

    const merged = inServer && theme['manager.mode'] === 'merged';
    const [slot, setSlot] = useState<HTMLElement | null>(null);

    const [measure, setMeasure] = useState<HTMLElement | null>(null);
    const shellWidth = useMeasuredWidth(measure);

    const mainShell = merged ? managerShell(theme['manager.shell']) : shell.main;

    const width = fullWidth ? 'max-w-none' : contentWidth(theme['page.width']);

    const { primary, groups } = useMemo(() => {
        const items = theme['sidebar.nav'].filter((item) => item.enabled);

        const toNavItem = (item: typeof items[number]): NavItem => ({
            label: navLabel(t, item.key, item.label),
            to: item.route,
            icon: item.icon,
            exact: NAV_EXACT[item.key] ?? false,
        });

        const rest = items.filter((item) => !PRIMARY_NAV_KEYS.includes(item.key));
        const links = theme['sidebar.links'].filter((link) => link.enabled);

        const built: NavGroup[] = [];

        const accountItems = rest.map(toNavItem);

        if (hasDiscordBot && !accountItems.some((item) => item.to === '/account/discord')) {
            accountItems.push({ label: navLabel(t, 'discord'), to: '/account/discord', icon: 'discord', exact: true });
        }

        if (accountItems.length > 0) {
            built.push({ label: t('nav.groups.Account'), items: accountItems });
        }

        if (staffMember) {
            built.push({
                label: t('nav.groups.Support'),
                items: [
                    {
                        label: navLabel(t, 'staff'),
                        to: '/staff',
                        icon: 'support',
                        exact: true,
                        badge: staffWaiting,
                    },
                ],
            });
        }

        if (links.length > 0) {
            built.push({
                label: t('nav.groups.Links'),
                items: links.map((link) => ({
                    label: link.label,
                    to: link.url,
                    icon: link.icon,
                    exact: false,
                })),
            });
        }

        return {
            primary: items.filter((item) => PRIMARY_NAV_KEYS.includes(item.key)).map(toNavItem),
            groups: built,
        };
    }, [theme, t, staffMember, staffWaiting, hasDiscordBot]);

    useEffect(() => {
        setQuery('');
        setDrawerOpen(false);
    }, [path]);

    useEffect(() => {
        if (!drawerOpen) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setDrawerOpen(false);
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [drawerOpen]);

    const design: ActiveDesign = theme['sidebar.active'];

    return (
        <SearchContext.Provider value={{ query, setQuery }}>
            <SidebarSlotContext.Provider value={merged ? slot : null}>
                {deviceWidth !== null && <div aria-hidden={'true'} className={'dz-preview-backdrop'} />}

                <div
                    style={
                        {
                            '--editor-width': EDITOR_WIDTH,
                            '--editor-inset': editorOpen ? EDITOR_WIDTH : '0px',
                            ...(deviceWidth === null
                                ? {}
                                : {
                                      width: `${deviceWidth}px`,
                                      left: `calc(${EDITOR_WIDTH} + (100vw - ${EDITOR_WIDTH}) / 2)`,
                                  }),
                        } as CSSProperties
                    }
                    className={cn(
                        'dz-scope panel-shell editor-inset min-h-screen font-sans text-ink lg:h-screen lg:overflow-hidden',
                        deviceWidth !== null && 'dz-preview-frame',
                        shell.page
                    )}
                >
                    <div aria-hidden={'true'} className={'glow-overlay pointer-events-none fixed inset-0 z-30'} />

                    {authPreview ? (
                        <div className={'h-full min-h-screen overflow-y-auto lg:min-h-0'}>
                            <AuthPreviewContent />
                        </div>
                    ) : (
                        <div className={'flex h-full min-h-screen lg:min-h-0'}>
                            <aside
                                className={cn(
                                    'app-sidebar hidden min-h-0 shrink-0 flex-col lg:flex',
                                    shell.aside,
                                    COLLAPSE,
                                    merged ? 'w-64' : railed ? 'w-[4.75rem]' : shell.width
                                )}
                            >
                                {merged ? (
                                    <div ref={setSlot} className={'flex min-h-0 flex-1 flex-col'} />
                                ) : (
                                    <>
                                        <div className={'flex h-16 shrink-0 items-center px-[1.125rem]'}>
                                            <Link
                                                to={'/'}
                                                aria-label={t('nav.account.dashboard')}
                                                className={cn(
                                                    'flex items-center',
                                                    COLLAPSE,
                                                    railed
                                                        ? 'h-9 w-10 justify-center overflow-hidden'
                                                        : 'h-9 w-auto max-w-[10.35rem]'
                                                )}
                                            >
                                                <Logo
                                                    compact={railed}
                                                    className={cn(
                                                        'max-h-9',
                                                        railed ? 'max-w-none' : 'max-w-[10.35rem]'
                                                    )}
                                                />
                                            </Link>
                                        </div>

                                        <nav className={cn('flex-1 space-y-1 overflow-y-auto', shell.nav)}>
                                            {primary.map((item) => (
                                                <NavLink key={item.to} item={item} rail={railed} design={design} />
                                            ))}

                                            {groups.map((group) => (
                                                <NavSection
                                                    key={group.label}
                                                    group={group}
                                                    rail={railed}
                                                    design={design}
                                                />
                                            ))}
                                        </nav>

                                        {theme['sidebar.user'] && <SidebarUser rail={railed} />}
                                    </>
                                )}
                            </aside>

                            <MobileDrawer
                                open={drawerOpen}
                                onClose={() => setDrawerOpen(false)}
                                primary={primary}
                                groups={groups}
                                design={design}
                                showUser={theme['sidebar.user']}
                            />

                            <main
                                className={cn(
                                    'wallpaper-base flex min-w-0 flex-1 flex-col bg-base lg:overflow-hidden',
                                    mainShell
                                )}
                            >
                                <header className={'shrink-0 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6 xl:px-14'}>
                                    <div
                                        className={cn(
                                            'mx-auto flex min-h-14 w-full flex-wrap items-center gap-3 lg:min-h-16 lg:gap-4',
                                            width
                                        )}
                                    >
                                        <button
                                            type={'button'}
                                            onClick={() => setDrawerOpen(true)}
                                            aria-label={t('nav.openMenu')}
                                            aria-expanded={drawerOpen}
                                            className={
                                                'app-menu-button order-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-3xl bg-raised text-ink-muted transition-colors hover:bg-overlay hover:text-ink max-lg:inline-flex'
                                            }
                                        >
                                            <Menu className={'h-5 w-5'} aria-hidden={'true'} />
                                        </button>

                                        <Link
                                            to={'/'}
                                            aria-label={t('nav.account.dashboard')}
                                            className={
                                                'app-mobile-logo order-1 hidden h-8 w-auto max-w-[8.5rem] shrink-0 items-center max-lg:flex'
                                            }
                                        >
                                            <Logo className={'max-h-8 max-w-[8.5rem]'} />
                                        </Link>

                                        <div className={'order-2 ml-auto flex items-center gap-2 lg:order-3 lg:gap-3'}>
                                            {actions}

                                            <Link
                                                to={'/account'}
                                                aria-label={t('nav.accountSettings')}
                                                title={t('nav.accountSettings')}
                                                className={
                                                    'hidden h-10 w-10 shrink-0 items-center justify-center rounded-3xl bg-raised text-ink-muted transition-colors hover:bg-overlay hover:text-ink max-lg:inline-flex'
                                                }
                                            >
                                                <Settings className={'h-4 w-4'} aria-hidden={'true'} />
                                            </Link>

                                            <AccountBar />
                                        </div>

                                        {theme['nav.search'] && (
                                            <div
                                                className={cn(
                                                    'order-3 w-full min-w-0 pb-1 lg:order-2 lg:w-auto lg:pb-0',
                                                    searchStyle(theme['nav.searchStyle'])
                                                )}
                                            >
                                                <ServerSwitcher query={query} onQueryChange={setQuery} />
                                            </div>
                                        )}
                                    </div>
                                </header>

                                <div
                                    className={
                                        'flex-1 px-4 pb-8 pt-2 sm:px-6 lg:overflow-y-auto lg:px-8 lg:pt-2 xl:px-14'
                                    }
                                >
                                    <div ref={setMeasure} className={cn('mx-auto w-full', width)}>
                                        <ShellWidthProvider value={shellWidth}>{children}</ShellWidthProvider>
                                    </div>
                                    <PageFooter className={width} />
                                </div>
                            </main>
                        </div>
                    )}
                </div>

                {deviceWidth !== null && <PreviewHandles width={deviceWidth} />}

                {(rootAdmin || demo) && editorUsed && <ThemeEditor />}

                {(rootAdmin || demo) && theme['presets.button'] && (
                    <PresetsLauncher beside={hasAssistant && theme['ai.position'] === 'bottom-right'} />
                )}

                <DemoWelcome />

                {hasAssistant && (
                    <Suspense fallback={null}>
                        <Companion />
                    </Suspense>
                )}
            </SidebarSlotContext.Provider>
        </SearchContext.Provider>
    );
}

function PreviewHandles({ width }: { width: number }) {
    const [dragging, setDragging] = useState<'left' | 'right' | null>(null);

    const start = (side: 'left' | 'right') => (event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();

        const from = event.clientX;
        const was = width;

        setDragging(side);

        const move = (moved: PointerEvent) => {
            const delta = (moved.clientX - from) * 2;

            setPreviewWidth(side === 'right' ? was + delta : was - delta);
        };

        const stop = () => {
            setDragging(null);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
    };

    const middle = `calc(${EDITOR_WIDTH} + (100vw - ${EDITOR_WIDTH}) / 2)`;

    return (
        <>
            {(['left', 'right'] as const).map((side) => (
                <div
                    key={side}
                    role={'separator'}
                    aria-orientation={'vertical'}
                    aria-label={'Resize the preview'}
                    data-dragging={dragging === side}
                    onPointerDown={start(side)}
                    style={{
                        top: '3.5rem',
                        bottom: '1.25rem',
                        left: `calc(${middle} ${side === 'right' ? '+' : '-'} ${width / 2}px)`,
                    }}
                    className={'dz-preview-handle'}
                />
            ))}
        </>
    );
}

function PageFooter({ className }: { className?: string }) {
    const t = useT();
    const theme = usePanelTheme();

    const credit = theme['footer.pterodactyl'];
    const powered = theme['footer.powered'];
    const note = theme['footer.note'].trim();

    if (!credit && !powered && note === '') {
        return null;
    }

    return (
        <footer className={cn('mx-auto mt-10 w-full pt-2 text-left', className)}>
            {credit && (
                <p className={'text-xs text-ink-faint'}>
                    <a
                        href={'https://pterodactyl.io'}
                        target={'_blank'}
                        rel={'noreferrer noopener'}
                        className={'transition-colors hover:text-ink-muted'}
                    >
                        {'KTS Host'}
                    </a>
                    {` \u00a9 2015 - ${new Date().getFullYear()}`}
                </p>
            )}

            {powered && (
                <p className={cn('text-[11px] text-ink-faint', credit && 'mt-1')}>
                    {`${t('nav.poweredBy')} `}
                    <a
                        href={'https://ktshost.asia'}
                        target={'_blank'}
                        rel={'noreferrer noopener'}
                        className={'transition-colors hover:text-ink-muted'}
                    >
                        {'ktshost.asia'}
                    </a>
                </p>
            )}

            {note !== '' && <p className={cn('text-[11px] text-ink-faint', (credit || powered) && 'mt-1')}>{note}</p>}
        </footer>
    );
}

function SidebarUser({ rail }: { rail: boolean }) {
    const user = useStoreState((state: ApplicationStore) => state.user.data);

    if (!user) {
        return null;
    }

    return (
        <div className={'shrink-0 p-3'}>
            <Link
                to={'/account'}
                title={rail ? user.username : undefined}
                className={cn(
                    'flex items-center rounded-2xl hover:bg-raised',
                    COLLAPSE,
                    rail ? 'justify-center gap-0 p-1.5' : 'gap-3 p-2'
                )}
            >
                <UserAvatar />

                <div
                    className={cn(
                        'min-w-0 flex-1 overflow-hidden',
                        COLLAPSE,
                        rail ? 'max-w-0 opacity-0' : 'max-w-[9rem] opacity-100'
                    )}
                >
                    <p className={'truncate text-sm font-medium leading-tight text-ink'}>{user.username}</p>
                    <p className={'truncate text-xs leading-tight text-ink-faint'}>{user.email}</p>
                </div>
            </Link>
        </div>
    );
}

function MobileDrawer({
    open,
    onClose,
    primary,
    groups,
    design,
    showUser,
}: {
    open: boolean;
    onClose: () => void;
    primary: NavItem[];
    groups: NavGroup[];
    design: ActiveDesign;
    showUser: boolean;
}) {
    const t = useT();

    return (
        <div
            className={cn('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}
            aria-hidden={!open}
        >
            <button
                type={'button'}
                tabIndex={open ? 0 : -1}
                aria-label={t('nav.closeMenu')}
                onClick={onClose}
                className={cn(
                    'absolute inset-0 bg-black/60 transition-opacity duration-200',
                    open ? 'opacity-100' : 'opacity-0'
                )}
            />

            <div
                role={'dialog'}
                aria-modal={open || undefined}
                aria-label={t('nav.menu')}
                className={cn(
                    'wallpaper-card absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-panel',
                    'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                    open ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className={'flex h-16 shrink-0 items-center justify-between gap-2 px-4'}>
                    <Link
                        to={'/'}
                        aria-label={t('nav.account.dashboard')}
                        className={'flex h-9 w-auto max-w-[9.5rem] items-center'}
                    >
                        <Logo className={'max-h-9 max-w-[9.5rem]'} />
                    </Link>

                    <button
                        type={'button'}
                        tabIndex={open ? 0 : -1}
                        onClick={onClose}
                        aria-label={t('nav.closeMenu')}
                        className={
                            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-3xl bg-raised text-ink-muted transition-colors hover:bg-overlay hover:text-ink'
                        }
                    >
                        <X className={'h-4 w-4'} aria-hidden={'true'} />
                    </button>
                </div>

                <nav className={'flex-1 space-y-1 overflow-y-auto px-3 py-2'}>
                    {primary.map((item) => (
                        <NavLink key={item.to} item={item} rail={false} design={design} />
                    ))}

                    {groups.map((group) => (
                        <NavSection key={group.label} group={group} rail={false} design={design} />
                    ))}
                </nav>

                {showUser && <SidebarUser rail={false} />}

                <AccountDrawerActions />
            </div>
        </div>
    );
}

function NavLink({ item, rail, design }: { item: NavItem; rail: boolean; design: ActiveDesign }) {
    const style = activeStyle(design);
    const Icon = linkIcon(item.icon);
    const external = /^https?:\/\//.test(item.to);
    const path = useLocation().pathname;
    const active = !external && (item.exact ? path === item.to : path.startsWith(item.to));

    const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

    const showTip = (event: { currentTarget: HTMLElement }) => {
        if (!rail) {
            return;
        }

        const box = event.currentTarget.getBoundingClientRect();

        setTip({ top: box.top + box.height / 2, left: box.right + 8 });
    };

    const hideTip = () => setTip(null);

    useEffect(() => {
        if (!rail) {
            setTip(null);
        }
    }, [rail]);

    const classes = cn(
        'group relative flex items-center rounded-2xl py-2.5 text-sm',
        COLLAPSE,
        rail ? 'justify-center gap-0 px-0' : 'gap-3 px-3',
        active ? style.link : 'text-ink-muted hover:bg-raised hover:text-ink'
    );

    const inner = (
        <>
            {active && <LeadingDot design={design} rail={rail} />}

            <Icon className={cn('h-[18px] w-[18px] shrink-0', active && style.icon)} aria-hidden={'true'} />

            <span
                className={cn(
                    'min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left',
                    COLLAPSE,
                    rail ? 'max-w-0 opacity-0' : 'max-w-[9rem] opacity-100'
                )}
            >
                {item.label}
            </span>

            <NavCount total={item.badge ?? 0} rail={rail} />

            {external && !rail && (
                <ExternalLink
                    aria-hidden={'true'}
                    className={'h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60'}
                />
            )}

            {active && <ActiveMarker design={design} />}

            {tip !== null &&
                createPortal(
                    <span
                        role={'tooltip'}
                        style={{ top: tip.top, left: tip.left }}
                        className={
                            'pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-xl bg-overlay px-2.5 py-1.5 text-xs font-medium text-ink shadow-panel'
                        }
                    >
                        {item.label}
                    </span>,
                    document.body
                )}
        </>
    );

    if (external) {
        return (
            <a
                href={item.to}
                target={'_blank'}
                rel={'noreferrer noopener'}
                className={classes}
                onMouseEnter={showTip}
                onMouseLeave={hideTip}
                onFocus={showTip}
                onBlur={hideTip}
            >
                {inner}
            </a>
        );
    }

    return (
        <RouterNavLink
            to={item.to}
            exact={item.exact}
            className={classes}
            aria-current={active ? 'page' : undefined}
            onMouseEnter={showTip}
            onMouseLeave={hideTip}
            onFocus={showTip}
            onBlur={hideTip}
        >
            {inner}
        </RouterNavLink>
    );
}

function NavSection({ group, rail, design }: { group: NavGroup; rail: boolean; design: ActiveDesign }) {
    const [open, setOpen] = useState(true);

    const visible = rail || open;

    return (
        <div className={'pt-4'}>
            <button
                type={'button'}
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-hidden={rail || undefined}
                tabIndex={rail ? -1 : undefined}
                className={cn(
                    'flex w-full items-center justify-between gap-2 overflow-hidden px-3',
                    'text-[11px] font-semibold uppercase tracking-wider text-ink-faint hover:text-ink-muted',
                    COLLAPSE,
                    rail ? 'pointer-events-none h-0 opacity-0' : 'h-5 pb-1 opacity-100'
                )}
            >
                <span>{group.label}</span>
                <ChevronDown
                    aria-hidden={'true'}
                    className={cn('h-4 w-4 shrink-0 transition-transform', !open && '-rotate-90')}
                />
            </button>

            <span
                aria-hidden={'true'}
                className={cn('mx-3 block h-px bg-line-field', COLLAPSE, rail ? 'mb-2 opacity-100' : 'mb-0 opacity-0')}
            />

            {visible && (
                <div className={'space-y-1'}>
                    {group.items.map((item) => (
                        <NavLink key={item.to} item={item} rail={rail} design={design} />
                    ))}
                </div>
            )}
        </div>
    );
}

export { PanelLayout };
