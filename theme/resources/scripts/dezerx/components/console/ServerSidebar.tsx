import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Search } from 'lucide-react';
import { ServerContext } from '@/state/server';
import Logo from '@/dezerx/components/Logo';
import ServerNav from '@/dezerx/components/console/ServerNav';
import { PowerControls, ServerAddress } from '@/dezerx/components/console/ServerHeader';
import { cn } from '@/dezerx/lib/cn';
import { NavContextHandler } from '@/dezerx/lib/serverNav';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { resolveArt } from '@/dezerx/lib/serverArtwork';
import { useT } from '@/i18n';

export default function ServerSidebar({
    base,
    suspended,
    onItemContextMenu,
}: {
    base: string;
    suspended: boolean;
    onItemContextMenu?: NavContextHandler;
}) {
    const t = useT();
    const theme = usePanelTheme();
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const status = ServerContext.useStoreState((state) => state.status.value);
    const [query, setQuery] = useState('');

    const art = resolveArt(server, theme);

    const controls = theme['manager.controls'] ? <PowerControls disabled={suspended} compact /> : null;
    const atTop = theme['manager.controlsPlace'] === 'top';

    const address = theme['manager.address'];
    const addressUnderName = address && controls === null;

    return (
        <div className={'flex min-h-0 flex-1 flex-col'}>
            {theme['manager.logo'] && (
                <div className={'flex h-16 shrink-0 items-center px-[1.125rem]'}>
                    <Link
                        to={'/'}
                        aria-label={t('nav.account.dashboard')}
                        className={'flex h-9 w-auto max-w-[10.35rem] items-center'}
                    >
                        <Logo className={'max-h-9 max-w-[10.35rem]'} />
                    </Link>
                </div>
            )}

            <div className={cn('shrink-0 px-3', theme['manager.logo'] ? 'pb-2' : 'pb-2 pt-3')}>
                <Link
                    to={'/'}
                    className={
                        'mb-2 inline-flex items-center gap-1 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink'
                    }
                >
                    <ChevronLeft className={'h-3 w-3'} aria-hidden={'true'} />
                    {t('nav.account.dashboard')}
                </Link>

                <div className={'flex min-w-0 items-center gap-3'}>
                    <span
                        title={
                            suspended
                                ? t('status.unavailable')
                                : status
                                ? t(`status.${status}`)
                                : t('status.connecting')
                        }
                        className={cn(
                            'h-2.5 w-2.5 shrink-0 rounded-full',
                            suspended
                                ? 'bg-danger'
                                : status === 'running'
                                ? 'bg-success'
                                : status === 'offline'
                                ? 'bg-offline'
                                : status === null
                                ? 'animate-pulse bg-ink-faint'
                                : 'bg-warning'
                        )}
                    />

                    {art.logo && (
                        <img
                            src={art.logo}
                            alt={''}
                            aria-hidden={'true'}
                            width={32}
                            height={32}
                            className={'h-8 w-8 shrink-0 rounded-lg object-contain'}
                        />
                    )}

                    <div className={'min-w-0 flex-1'}>
                        <p className={'truncate text-sm font-semibold tracking-tight text-ink'}>{server.name}</p>
                        <p className={'truncate text-[11px] text-ink-faint'}>{server.node}</p>
                    </div>
                </div>

                {addressUnderName && (
                    <div className={'mt-3'}>
                        <ServerAddress compact />
                    </div>
                )}

                {atTop && controls && <div className={'mt-3'}>{controls}</div>}
            </div>

            <div className={'shrink-0 px-3 pb-2'}>
                <div className={'relative'}>
                    <Search
                        aria-hidden={'true'}
                        className={
                            'pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint'
                        }
                    />
                    <input
                        type={'search'}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('nav.searchSections')}
                        aria-label={t('nav.searchSections')}
                        className={cn(
                            'h-9 w-full rounded-xl bg-raised pl-8 pr-3 text-[13px] text-ink outline-none',
                            'ring-1 ring-line-field transition placeholder:text-ink-faint focus:ring-accent'
                        )}
                    />
                </div>
            </div>

            <div className={'min-h-0 flex-1 overflow-y-auto px-1'}>
                <ServerNav base={base} onItemContextMenu={onItemContextMenu} inSidebar query={query} />
            </div>

            {((address && !addressUnderName) || (controls && !atTop)) && (
                <div className={'shrink-0 space-y-2 border-t border-line-field p-3'}>
                    {address && !addressUnderName && <ServerAddress compact />}
                    {!atTop && controls}
                </div>
            )}
        </div>
    );
}
