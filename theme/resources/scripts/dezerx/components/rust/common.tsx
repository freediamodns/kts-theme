import React, { ReactNode, useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import BlurredIp from '@/dezerx/components/BlurredIp';
import { cn } from '@/dezerx/lib/cn';
import { RustItemSlot, RustPlayerSummary } from '@/api/server/rustPlayers';
import RustItemImage from './RustItemImage';

export const DEFAULT_AVATAR = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';

export const FIELD =
    'dz-field dz-field-line w-full rounded-2xl border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint ' +
    'transition-colors duration-150 focus:border-accent/60 focus:outline-none';

export function Segmented<T extends string>({
    value,
    onChange,
    options,
    label,
    tall,
    className,
}: {
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: ReactNode }[];
    label: string;
    tall?: boolean;
    className?: string;
}) {
    return (
        <div
            role={'tablist'}
            aria-label={label}
            className={cn(
                'flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-card p-1',
                tall && 'h-11',
                className
            )}
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    type={'button'}
                    role={'tab'}
                    aria-selected={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        'shrink-0 whitespace-nowrap rounded-xl px-3 text-xs font-medium transition-colors',
                        tall ? 'flex h-9 items-center' : 'py-1.5',
                        value === option.value ? 'bg-overlay text-ink' : 'text-ink-muted hover:text-ink'
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export function Panel({
    title,
    description,
    action,
    children,
    className,
}: {
    title?: string;
    description?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('space-y-4 rounded-2xl bg-card p-4', className)}>
            {(title || action) && (
                <div className={'flex flex-wrap items-center justify-between gap-3'}>
                    <div className={'min-w-0'}>
                        {title && <h2 className={'text-sm font-semibold tracking-tight text-ink'}>{title}</h2>}
                        {description && <p className={'mt-1 text-xs text-ink-faint'}>{description}</p>}
                    </div>
                    {action && <div className={'flex shrink-0 flex-wrap items-center gap-2'}>{action}</div>}
                </div>
            )}
            {children}
        </section>
    );
}

export function Label({ children }: { children: ReactNode }) {
    return <p className={'text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>{children}</p>;
}

export function Fact({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className={'min-w-0'}>
            <dt className={'text-[10px] uppercase tracking-wider text-ink-faint'}>{label}</dt>
            <dd className={'truncate text-xs text-ink'}>{value}</dd>
        </div>
    );
}

export function SoftButton({
    children,
    onClick,
    disabled,
    danger,
    solidDanger,
    className,
    title,
}: {
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    solidDanger?: boolean;
    className?: string;
    title?: string;
}) {
    return (
        <button
            type={'button'}
            title={title}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'truncate rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                solidDanger
                    ? 'bg-danger text-white hover:bg-danger/85'
                    : danger
                    ? 'bg-overlay/60 text-ink-muted hover:bg-raised hover:text-danger'
                    : 'bg-overlay/60 text-ink-muted hover:bg-raised hover:text-ink',
                className
            )}
        >
            {children}
        </button>
    );
}

export function hasAvatar(src?: string): boolean {
    return !!src && src !== DEFAULT_AVATAR;
}

export function SteamAvatar({
    src,
    placeholder,
    className,
}: {
    src?: string;
    placeholder?: boolean;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);

    useEffect(() => setFailed(false), [src]);

    if (failed || !hasAvatar(src)) {
        return placeholder ? <span aria-hidden={'true'} className={cn('shrink-0', className)} /> : null;
    }

    return (
        <img
            src={src}
            alt={''}
            aria-hidden={'true'}
            loading={'lazy'}
            draggable={false}
            onError={() => setFailed(true)}
            className={cn('shrink-0 select-none rounded-lg bg-overlay object-cover', className)}
        />
    );
}

export function statusOf(
    player: Pick<RustPlayerSummary, 'isConnected' | 'isSleeping' | 'isDead' | 'isWounded' | 'isBanned'>
): string {
    if (player.isBanned) return 'Banned';
    if (player.isDead) return 'Dead';
    if (player.isWounded) return 'Wounded';
    if (player.isConnected) return 'Online';
    if (player.isSleeping) return 'Sleeping';
    return 'Offline';
}

export function OwnerCrown({ className }: { className?: string }) {
    return (
        <span title={'Owner'} className={cn('inline-flex shrink-0 text-warning', className)}>
            <Crown className={'h-3.5 w-3.5'} aria-label={'Owner'} />
        </span>
    );
}

export function SnowflakeIcon({ className, label }: { className?: string; label?: string }) {
    return (
        <svg
            viewBox={'0 0 24 24'}
            fill={'none'}
            stroke={'currentColor'}
            strokeWidth={2}
            strokeLinecap={'round'}
            strokeLinejoin={'round'}
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            className={className}
        >
            <line x1={'2'} x2={'22'} y1={'12'} y2={'12'} />
            <line x1={'12'} x2={'12'} y1={'2'} y2={'22'} />
            <path d={'m20 16-4-4 4-4'} />
            <path d={'m4 8 4 4-4 4'} />
            <path d={'m16 4-4 4-4-4'} />
            <path d={'m8 20 4-4 4 4'} />
        </svg>
    );
}

export function OnlineDot() {
    return <span aria-label={'Online'} title={'Online'} className={'h-2 w-2 shrink-0 rounded-full bg-success'} />;
}

export function Hidden({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <BlurredIp reveal className={className}>
            {children}
        </BlurredIp>
    );
}

export function Tag({ children }: { children: ReactNode }) {
    return (
        <span className={'shrink-0 rounded-md bg-overlay px-1.5 py-0.5 text-[10px] font-medium text-ink-muted'}>
            {children}
        </span>
    );
}

export function Meter({
    label,
    value,
    max,
    unit,
    extra,
}: {
    label: string;
    value: number;
    max: number;
    unit?: string;
    extra?: ReactNode;
}) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

    return (
        <div className={'min-w-0'}>
            <div className={'flex items-baseline justify-between gap-2'}>
                <span className={'min-w-0 truncate'}>
                    <Label>{label}</Label>
                </span>
                <span
                    className={
                        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs tabular-nums text-ink'
                    }
                >
                    {extra}
                    {Math.round(value)}
                    <span className={'text-ink-faint'}>{unit ?? ` / ${max}`}</span>
                </span>
            </div>
            <div className={'mt-1.5 h-1 overflow-hidden rounded-full bg-overlay'}>
                <div className={'h-full rounded-full bg-ink-muted/70'} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export function formatMinutes(minutes: number): string {
    const m = Math.max(0, Math.round(minutes));
    if (m <= 0) return 'Decaying';
    const d = Math.floor(m / 1440);
    const h = Math.floor((m % 1440) / 60);
    const rest = m % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${rest}m`;
    return `${rest}m`;
}

export function formatSeconds(seconds: number): string {
    const s = Math.max(0, Math.round(seconds));
    if (s < 60) return `${s}s`;
    return formatMinutes(s / 60);
}

export function formatDate(unix: number): string {
    if (!unix) return '-';
    return new Date(unix * 1000).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function ItemSlot({
    item,
    selected,
    onClick,
    rust,
    className,
}: {
    item?: RustItemSlot | null;
    selected?: boolean;
    onClick?: () => void;
    rust?: boolean;
    className?: string;
}) {
    const wear = item && item.maxCondition ? Math.max(0, Math.min(1, (item.condition ?? 0) / item.maxCondition)) : null;

    return (
        <button
            type={'button'}
            onClick={onClick}
            disabled={!onClick}
            title={item ? `${item.name} x${item.amount.toLocaleString()}` : 'Empty slot'}
            className={cn(
                'relative flex aspect-square min-w-0 items-center justify-center p-1.5 transition-colors disabled:cursor-default',
                rust
                    ? cn(
                          'rounded-none',
                          selected ? 'bg-[#3d6fa3]/70' : 'bg-[#f7ebe1]/[0.09]',
                          onClick && !selected && 'hover:bg-[#f7ebe1]/[0.16]'
                      )
                    : cn(
                          'rounded-xl bg-overlay/40',
                          onClick && 'hover:bg-raised',
                          selected && 'bg-raised ring-1 ring-accent/60'
                      ),
                className
            )}
        >
            {item && (
                <>
                    <RustItemImage
                        shortname={item.shortname}
                        alt={item.name}
                        className={'h-full w-full'}
                        fallbackClassName={rust ? 'h-full w-full text-[#f7ebe1]/60' : undefined}
                    />
                    {item.amount > 1 && (
                        <span
                            className={cn(
                                'absolute bottom-0.5 right-1 text-[10px] font-semibold tabular-nums',
                                rust ? 'text-[#f7ebe1] [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]' : 'text-ink'
                            )}
                        >
                            {rust ? 'x' : ''}
                            {item.amount > 9999 ? `${Math.floor(item.amount / 1000)}k` : item.amount}
                        </span>
                    )}
                    {wear !== null &&
                        (rust ? (
                            <span className={'absolute bottom-1 left-0.5 top-1 w-[3px] bg-black/30'}>
                                <span
                                    className={'absolute inset-x-0 bottom-0 bg-[#8db33a]'}
                                    style={{ height: `${wear * 100}%` }}
                                />
                            </span>
                        ) : (
                            <span
                                className={
                                    'absolute inset-x-1.5 bottom-1 h-0.5 overflow-hidden rounded-full bg-overlay'
                                }
                            >
                                <span className={'block h-full bg-ink-muted'} style={{ width: `${wear * 100}%` }} />
                            </span>
                        ))}
                </>
            )}
        </button>
    );
}

export function PingBars({ ping, online = true, className }: { ping: number; online?: boolean; className?: string }) {
    const filled = !online || ping <= 0 ? 0 : ping < 60 ? 4 : ping < 120 ? 3 : ping < 200 ? 2 : 1;

    return (
        <span
            role={'img'}
            aria-label={online ? `${ping} ms` : 'Offline'}
            className={cn('inline-flex h-3 items-end gap-[2px]', className)}
        >
            {[0, 1, 2, 3].map((bar) => (
                <span
                    key={bar}
                    className={cn('w-[3px] rounded-[1px]', bar < filled ? 'bg-ink' : 'bg-ink-faint/25')}
                    style={{ height: `${(bar + 1) * 25}%` }}
                />
            ))}
        </span>
    );
}

export function errorMessage(err: any, fallback: string): string {
    const data = err?.response?.data;
    if (err?.response?.status === 403 && !data?.error) return 'You do not have permission to do that on this server.';

    return data?.error || data?.errors?.[0]?.detail || data?.message || fallback;
}
