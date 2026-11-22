import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Play, Power, RotateCw, Square } from 'lucide-react';
import { ServerContext, ServerStatus } from '@/state/server';
import { SocketRequest } from '@/components/server/events';
import { usePermissions } from '@/plugins/usePermissions';
import { ip } from '@/lib/formatters';
import { Badge, BadgeTone, Button, Skeleton } from '@/dezerx/components/ui';
import type { ButtonVariant } from '@/dezerx/components/ui/Button';
import { cn } from '@/dezerx/lib/cn';
import { formatUptime } from '@/dezerx/lib/format';
import { resolveArt } from '@/dezerx/lib/serverArtwork';
import { powerActionClass, usePanelTheme, type PowerAction } from '@/dezerx/lib/panelTheme';
import { isDemoUser } from '@/dezerx/lib/demo';
import DemoGate from '@/dezerx/components/DemoGate';
import NodeFlag from '@/dezerx/components/NodeFlag';
import RenewChip from '@/dezerx/components/create/RenewChip';
import { useT } from '@/i18n';

type LiveStatus = Exclude<ServerStatus, null>;

const STATE_TONE: Record<LiveStatus, BadgeTone> = {
    running: 'success',
    starting: 'warning',
    stopping: 'warning',
    offline: 'neutral',
};

export const STATE_EDGE: Record<LiveStatus, string> = {
    running: '[--edge-color:var(--success)]',
    starting: '[--edge-color:var(--warning)]',
    stopping: '[--edge-color:var(--warning)]',
    offline: '[--edge-color:var(--status-offline)]',
};

const STATE_KEY: Record<LiveStatus, string> = {
    running: 'status.running',
    starting: 'status.starting',
    stopping: 'status.stopping',
    offline: 'status.offline',
};

export default function ServerHeader({
    uptimeMs,
    suspended,
    statusLabel,
}: {
    uptimeMs: number;
    suspended: boolean;
    statusLabel?: string;
}) {
    const theme = usePanelTheme();
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const status = ServerContext.useStoreState((state) => state.status.value);

    const art = resolveArt(server, theme);
    const artwork = theme['servers.artwork'];

    return (
        <article
            className={cn(
                'edge-fade group relative overflow-hidden rounded-2xl bg-card',
                suspended
                    ? '[--edge-color:var(--danger)]'
                    : status
                    ? STATE_EDGE[status]
                    : '[--edge-color:var(--line-rgb)]'
            )}
        >
            {artwork && (
                <>
                    <img
                        src={art.image}
                        alt={''}
                        aria-hidden={'true'}
                        className={
                            'absolute inset-0 h-full w-full scale-[1.03] object-cover opacity-20 [.light_&]:hidden'
                        }
                    />
                    <img
                        src={art.imageLight}
                        alt={''}
                        aria-hidden={'true'}
                        className={
                            'absolute inset-0 hidden h-full w-full scale-[1.03] object-cover opacity-70 [.light_&]:block'
                        }
                    />
                    <span
                        aria-hidden={'true'}
                        className={
                            'absolute inset-0 bg-gradient-to-t from-card via-card/85 to-card/40 [.light_&]:from-card/70 [.light_&]:via-card/40 [.light_&]:to-transparent'
                        }
                    />
                </>
            )}

            <div className={'relative flex flex-wrap items-center gap-x-6 gap-y-4 p-4 sm:p-5'}>
                {art.logo && (
                    <img
                        src={art.logo}
                        alt={''}
                        aria-hidden={'true'}
                        width={44}
                        height={44}
                        className={'h-11 w-11 shrink-0 rounded-xl object-contain'}
                    />
                )}

                <div className={'min-w-0 flex-1'}>
                    <div className={'flex flex-wrap items-center gap-2.5'}>
                        <h1 className={'truncate font-akira text-lg font-black tracking-tight text-ink sm:text-xl'}>
                            {server.name}
                        </h1>

                        <StatusBadge status={status} suspended={suspended} statusLabel={statusLabel} />
                    </div>

                    <div className={'mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5'}>
                        <p className={'flex min-w-0 items-center gap-1.5 truncate text-xs text-ink-faint'}>
                            <NodeFlag node={server.node} />
                            <span className={'truncate'}>
                                {server.node}
                                {uptimeMs > 0 && ` · up ${formatUptime(uptimeMs)}`}
                            </span>
                        </p>

                        <ServerAddress />
                    </div>
                </div>

                <PowerControls disabled={suspended} />
            </div>
        </article>
    );
}

export function StatusBadge({
    status,
    suspended,
    statusLabel,
}: {
    status: ServerStatus;
    suspended: boolean;
    statusLabel?: string;
}) {
    const t = useT();

    if (statusLabel) {
        return (
            <Badge tone={'warning'} dot>
                {statusLabel}
            </Badge>
        );
    }

    if (suspended) {
        return (
            <Badge tone={'danger'} dot>
                {t('status.suspended')}
            </Badge>
        );
    }

    if (!status) {
        return <Skeleton className={'h-5 w-20 rounded-full'} />;
    }

    return (
        <Badge tone={STATE_TONE[status]} dot>
            {t(STATE_KEY[status])}
        </Badge>
    );
}

const DOT_TONE: Record<LiveStatus, string> = {
    running: 'bg-success',
    starting: 'bg-warning',
    stopping: 'bg-warning',
    offline: 'bg-ink-faint/50',
};

export function StatusDot({
    status,
    suspended,
    statusLabel,
}: {
    status: ServerStatus;
    suspended: boolean;
    statusLabel?: string;
}) {
    const t = useT();

    const label =
        statusLabel ?? (suspended ? t('status.suspended') : status ? t(STATE_KEY[status]) : t('common.unknown'));

    const colour = suspended || statusLabel ? 'bg-danger' : status ? DOT_TONE[status] : 'bg-ink-faint/30';

    return (
        <span title={label} aria-label={label} role={'status'} className={'relative flex h-2.5 w-2.5 shrink-0'}>
            {status === 'running' && !suspended && !statusLabel && (
                <span
                    aria-hidden={'true'}
                    className={
                        'absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden'
                    }
                />
            )}
            <span aria-hidden={'true'} className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', colour)} />
        </span>
    );
}

const PEEK_MS = 2000;

export function ServerAddress({ compact = false }: { compact?: boolean }) {
    const t = useT();
    const masks = usePanelTheme()['manager.addressBlur'];
    const allocation = ServerContext.useStoreState((state) =>
        state.server.data!.allocations.find((candidate) => candidate.isDefault)
    );

    const [shown, setShown] = useState(false);
    const [copied, setCopied] = useState(false);
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            for (const timer of [resetTimer, peekTimer]) {
                if (timer.current !== null) {
                    clearTimeout(timer.current);
                }
            }
        },
        []
    );

    if (!allocation) {
        return null;
    }

    const host = allocation.alias || ip(allocation.ip);
    const address = `${host}:${allocation.port}`;

    const peek = () => {
        setShown(true);

        if (peekTimer.current !== null) {
            clearTimeout(peekTimer.current);
        }

        peekTimer.current = setTimeout(() => {
            peekTimer.current = null;
            setShown(false);
        }, PEEK_MS);
    };

    const copy = () => {
        void navigator.clipboard?.writeText(address).then(() => {
            setCopied(true);

            if (resetTimer.current !== null) {
                clearTimeout(resetTimer.current);
            }

            resetTimer.current = setTimeout(() => {
                resetTimer.current = null;
                setCopied(false);
            }, 1500);
        });
    };

    const copyButton = (
        <button
            type={'button'}
            onClick={copy}
            aria-label={t('consolePage.copyAddressValue', { address })}
            title={copied ? t('common.copied') : t('consolePage.copyAddress')}
            className={cn(
                'shrink-0 rounded-lg p-1.5 transition-colors hover:bg-overlay',
                copied ? 'text-success' : 'text-ink-faint hover:text-ink'
            )}
        >
            {copied ? (
                <Check className={'h-3.5 w-3.5'} aria-hidden={'true'} />
            ) : (
                <Copy className={'h-3.5 w-3.5'} aria-hidden={'true'} />
            )}
        </button>
    );

    if (compact) {
        return (
            <div
                onMouseEnter={peek}
                onFocus={peek}
                className={
                    'flex min-w-0 items-center gap-1 rounded-lg bg-overlay/70 py-0.5 pl-2 pr-0.5 ring-1 ring-line-field'
                }
            >
                <span
                    title={address}
                    className={cn(
                        'min-w-0 flex-1 truncate text-xs text-ink transition-[filter] duration-200',
                        masks && !shown && 'select-none blur-[4px]'
                    )}
                >
                    {address}
                </span>

                {copyButton}
            </div>
        );
    }

    return (
        <div onMouseEnter={peek} onFocus={peek} className={'flex flex-wrap items-center gap-1.5'}>
            <AddressBox label={t('consolePage.ip')} value={host} masked={masks && !shown} />
            <AddressBox label={t('consolePage.port')} value={String(allocation.port)} masked={masks && !shown} />

            {copyButton}
        </div>
    );
}

function AddressBox({ label, value, masked }: { label: string; value: string; masked: boolean }) {
    return (
        <span
            className={
                'inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-overlay/70 px-2 py-1 ring-1 ring-line-field'
            }
        >
            <span className={'text-[10px] font-medium uppercase tracking-wider text-ink-faint'}>{label}</span>
            <span
                className={cn(
                    'truncate font-mono text-xs text-ink transition-[filter] duration-200',
                    masked && 'select-none blur-[4px]'
                )}
            >
                {value}
            </span>
        </span>
    );
}

export function PowerControls({ disabled, compact = false }: { disabled: boolean; compact?: boolean }) {
    const t = useT();
    const theme = usePanelTheme();
    const style = theme['manager.actions'];
    const joined = theme['manager.actionsJoined'] && !compact;
    const iconOnly = compact && theme['manager.actionsIcons'];
    const status = ServerContext.useStoreState((state) => state.status.value);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);
    const [canStart, canRestart, canStop] = usePermissions(['control.start', 'control.restart', 'control.stop']);

    const [confirmingKill, setConfirmingKill] = useState(false);

    const offline = status === 'offline';
    const unknown = status === null;

    const act = (action: 'start' | 'stop' | 'restart' | 'kill') => {
        setConfirmingKill(false);
        instance?.send(SocketRequest.SET_STATE, action);
    };

    useEffect(() => {
        if (offline) {
            setConfirmingKill(false);
        }
    }, [offline]);

    const iconSize = iconOnly ? 'h-5 w-5' : 'h-3.5 w-3.5';

    const tone = (action: PowerAction, fallback: ButtonVariant): ButtonVariant | undefined =>
        style === 'default' ? fallback : undefined;

    const skin = (action: PowerAction) =>
        cn(
            powerActionClass(style, action),
            joined && 'rounded-none border-0 first:rounded-l-2xl last:rounded-r-2xl',
            iconOnly && 'h-10 flex-1 !px-0'
        );

    const label = (text: string) => (iconOnly ? undefined : text);

    const buttons = (
        <>
            {canStart && (
                <Button
                    size={'sm'}
                    variant={tone('start', 'primary')}
                    className={skin('start')}
                    fullWidth={compact && !iconOnly}
                    disabled={disabled || unknown || !offline}
                    onClick={() => act('start')}
                    icon={<Play className={iconSize} />}
                    aria-label={t('power.start')}
                    title={iconOnly ? t('power.start') : undefined}
                >
                    {label(t('power.start'))}
                </Button>
            )}

            {canRestart && (
                <Button
                    size={'sm'}
                    variant={tone('restart', 'secondary')}
                    className={skin('restart')}
                    fullWidth={compact && !iconOnly}
                    disabled={disabled || unknown || offline}
                    onClick={() => act('restart')}
                    icon={<RotateCw className={iconSize} />}
                    aria-label={t('power.restart')}
                    title={iconOnly ? t('power.restart') : undefined}
                >
                    {label(t('power.restart'))}
                </Button>
            )}

            {canStop && (
                <>
                    <Button
                        size={'sm'}
                        variant={tone('stop', 'secondary')}
                        className={skin('stop')}
                        fullWidth={compact && !iconOnly}
                        disabled={disabled || unknown || offline}
                        onClick={() => act('stop')}
                        icon={<Square className={iconSize} />}
                        aria-label={t('power.stop')}
                        title={iconOnly ? t('power.stop') : undefined}
                    >
                        {label(t('power.stop'))}
                    </Button>

                    <Button
                        size={'sm'}
                        fullWidth={compact && !iconOnly}
                        variant={confirmingKill ? 'danger' : tone('kill', 'ghost')}
                        className={confirmingKill ? cn(iconOnly && 'h-10 flex-1 !px-0') : skin('kill')}
                        disabled={disabled || unknown || offline}
                        onClick={() => (confirmingKill ? act('kill') : setConfirmingKill(true))}
                        onBlur={() => setConfirmingKill(false)}
                        icon={<Power className={iconSize} />}
                        aria-label={confirmingKill ? t('common.areYouSure') : t('power.kill')}
                        title={iconOnly ? (confirmingKill ? t('common.areYouSure') : t('power.kill')) : undefined}
                    >
                        {label(confirmingKill ? t('common.areYouSure') : t('power.kill'))}
                    </Button>
                </>
            )}
        </>
    );

    if (!canStart && !canRestart && !canStop) {
        return null;
    }

    const gated = isDemoUser() ? <DemoGate>{buttons}</DemoGate> : buttons;

    if (compact) {
        return (
            <div className={cn(iconOnly ? 'flex items-stretch justify-center gap-1.5' : 'grid grid-cols-2 gap-1.5')}>
                {gated}
            </div>
        );
    }

    return (
        <div className={'flex shrink-0 flex-wrap items-center gap-2'}>
            {joined ? (
                <div
                    className={
                        'flex shrink-0 items-center overflow-hidden rounded-2xl border border-line-field divide-x divide-line-field'
                    }
                >
                    {gated}
                </div>
            ) : (
                gated
            )}

            <RenewChip />
        </div>
    );
}
