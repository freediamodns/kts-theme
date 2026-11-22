import React from 'react';
import { ServerContext } from '@/state/server';
import ServerNavMenus from '@/dezerx/components/console/ServerNavMenus';
import { PowerControls, ServerAddress, StatusDot } from '@/dezerx/components/console/ServerHeader';
import { formatUptime } from '@/dezerx/lib/format';
import { NavContextHandler } from '@/dezerx/lib/serverNav';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { resolveArt } from '@/dezerx/lib/serverArtwork';

export default function ServerTopBar({
    base,
    uptimeMs,
    suspended,
    statusLabel,
    onItemContextMenu,
}: {
    base: string;
    uptimeMs: number;
    suspended: boolean;
    statusLabel?: string;
    onItemContextMenu?: NavContextHandler;
}) {
    const theme = usePanelTheme();
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const status = ServerContext.useStoreState((state) => state.status.value);

    const art = resolveArt(server, theme);
    const artwork = theme['servers.artwork'];

    return (
        <div className={'group relative z-20 rounded-2xl bg-card'}>
            {artwork && (
                <span aria-hidden={'true'} className={'pointer-events-none absolute inset-0 overflow-hidden rounded-2xl'}>
                    <img
                        src={art.image}
                        alt={''}
                        className={'absolute inset-0 h-full w-full scale-[1.03] object-cover opacity-20 [.light_&]:hidden'}
                    />
                    <img
                        src={art.imageLight}
                        alt={''}
                        className={
                            'absolute inset-0 hidden h-full w-full scale-[1.03] object-cover opacity-70 [.light_&]:block'
                        }
                    />
                    <span
                        className={
                            'absolute inset-0 bg-gradient-to-t from-card via-card/85 to-card/40 [.light_&]:from-card/70 [.light_&]:via-card/40 [.light_&]:to-transparent'
                        }
                    />
                </span>
            )}

            <div className={'relative z-[3] flex flex-wrap items-center gap-x-5 gap-y-3 px-4 pt-3.5'}>
                <div className={'flex shrink-0 items-center gap-2.5'}>
                    <StatusDot status={status} suspended={suspended} statusLabel={statusLabel} />

                    {art.logo && (
                        <img
                            src={art.logo}
                            alt={''}
                            aria-hidden={'true'}
                            width={36}
                            height={36}
                            className={'h-9 w-9 shrink-0 rounded-lg object-contain'}
                        />
                    )}
                </div>

                <div className={'min-w-0 flex-1'}>
                    <div className={'flex min-w-0 flex-wrap items-center gap-2'}>
                        <h1 className={'truncate font-akira text-base tracking-tight text-ink'}>{server.name}</h1>
                    </div>

                    <p className={'mt-0.5 truncate text-[11px] text-ink-faint'}>
                        {uptimeMs > 0 && ` · up ${formatUptime(uptimeMs)}`}
                    </p>

                    {theme['manager.address'] && (
                        <div className={'mt-1.5'}>
                            <ServerAddress />
                        </div>
                    )}
                </div>

                <PowerControls disabled={suspended} />
            </div>

            <div className={'relative z-[3] mt-3 border-t border-line-field px-1.5 py-1.5'}>
                <ServerNavMenus base={base} onItemContextMenu={onItemContextMenu} />
            </div>
        </div>
    );
}
