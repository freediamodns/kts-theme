import React, { ComponentType, useState } from 'react';
import { Ban, Crown, Heart, ListChecks, MapPin, Skull, Soup, Trash2, UtensilsCrossed } from 'lucide-react';
import { Button, Input, Select } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { useT, type TranslateFn } from '@/i18n';

export type PlayerAction =
    | 'op'
    | 'ban'
    | 'whitelist'
    | 'gamemode'
    | 'kill'
    | 'heal'
    | 'feed'
    | 'starve'
    | 'teleport'
    | 'xp';

export interface ActionPayload {
    action: PlayerAction;
    on?: boolean;
    mode?: string;
    x?: number;
    y?: number;
    z?: number;
    dimension?: string;
    levels?: number;
    operation?: 'set' | 'add' | 'remove';
}

const dimensions = (t: TranslateFn) => [
    { value: 'minecraft:overworld', label: t('playerControls.overworld') },
    { value: 'minecraft:the_nether', label: t('playerControls.nether') },
    { value: 'minecraft:the_end', label: t('playerControls.theEnd') },
];

const modes = (t: TranslateFn) => [
    { value: 'survival', label: t('properties.options.survival') },
    { value: 'creative', label: t('properties.options.creative') },
    { value: 'adventure', label: t('properties.options.adventure') },
    { value: 'spectator', label: t('properties.options.spectator') },
];

const GAME_MODE_IDS = ['survival', 'creative', 'adventure', 'spectator'];

export interface Place {
    x: number;
    y: number;
    z: number;
    dimension: string;
}

export function PlayerControls({
    gameMode,
    xpLevel,
    op,
    banned,
    whitelisted,
    busy,
    onAction,
}: {
    gameMode: number;
    xpLevel: number;
    op: boolean;
    banned: boolean;
    whitelisted: boolean;
    busy: boolean;
    onAction: (payload: ActionPayload) => void;
}) {
    const t = useT();
    const [levels, setLevels] = useState(String(xpLevel));
    const [seen, setSeen] = useState(xpLevel);

    if (seen !== xpLevel) {
        setSeen(xpLevel);
        setLevels(String(xpLevel));
    }

    const validLevels = levels !== '' && Number.isInteger(Number(levels)) && Number(levels) >= 0;

    return (
        <div className={'space-y-4 rounded-2xl bg-card p-4'}>
            <Header title={t('playerControls.control')} />

            <Select
                label={t('properties.fields.gamemode.label')}
                value={GAME_MODE_IDS[gameMode] ?? 'survival'}
                onChange={(mode) => onAction({ action: 'gamemode', mode })}
                disabled={busy}
                options={modes(t)}
            />

            <div>
                <Input
                    label={t('playerControls.xpLevels')}
                    inputMode={'numeric'}
                    value={levels}
                    onChange={(event) => setLevels(event.target.value)}
                />

                <div className={'mt-2 grid grid-cols-3 gap-2'}>
                    <XpButton
                        label={`-${validLevels ? levels : 0}`}
                        title={t('playerControls.takeLevels')}
                        disabled={busy || !validLevels}
                        onClick={() => onAction({ action: 'xp', levels: Number(levels), operation: 'remove' })}
                    />
                    <XpButton
                        label={t('playerControls.set')}
                        title={t('playerControls.setLevels')}
                        primary
                        disabled={busy || !validLevels}
                        onClick={() => onAction({ action: 'xp', levels: Number(levels), operation: 'set' })}
                    />
                    <XpButton
                        label={`+${validLevels ? levels : 0}`}
                        title={t('playerControls.giveLevels')}
                        disabled={busy || !validLevels}
                        onClick={() => onAction({ action: 'xp', levels: Number(levels), operation: 'add' })}
                    />
                </div>
            </div>

            <div className={'grid grid-cols-2 gap-2'}>
                <Action
                    icon={Heart}
                    label={t('playerControls.heal')}
                    tone={'success'}
                    busy={busy}
                    onClick={() => onAction({ action: 'heal' })}
                />
                <Action
                    icon={Skull}
                    label={t('playerControls.kill')}
                    tone={'danger'}
                    busy={busy}
                    onClick={() => onAction({ action: 'kill' })}
                />
                <Action
                    icon={Soup}
                    label={t('playerControls.feed')}
                    tone={'success'}
                    busy={busy}
                    onClick={() => onAction({ action: 'feed' })}
                />
                <Action
                    icon={UtensilsCrossed}
                    label={t('playerControls.starve')}
                    tone={'danger'}
                    busy={busy}
                    onClick={() => onAction({ action: 'starve' })}
                />
            </div>

            <div className={'space-y-1.5'}>
                <Toggle
                    icon={Crown}
                    label={t('playerControls.operator')}
                    on={op}
                    busy={busy}
                    onChange={(on) => onAction({ action: 'op', on })}
                />
                <Toggle
                    icon={ListChecks}
                    label={t('playerControls.whitelisted')}
                    on={whitelisted}
                    busy={busy}
                    onChange={(on) => onAction({ action: 'whitelist', on })}
                />
                <Toggle
                    icon={Ban}
                    label={t('playerControls.banned')}
                    on={banned}
                    busy={busy}
                    danger
                    onChange={(on) => onAction({ action: 'ban', on })}
                />
            </div>
        </div>
    );
}

export function PlayerPlaces({
    position,
    respawn,
    lastDeath,
    dimension,
    busy,
    onAction,
}: {
    position: { x: number; y: number; z: number } | null;
    respawn: Place | null;
    lastDeath: Place | null;
    dimension: string;
    busy: boolean;
    onAction: (payload: ActionPayload) => void;
}) {
    const t = useT();
    const [x, setX] = useState(String(position?.x ?? 0));
    const [y, setY] = useState(String(position?.y ?? 64));
    const [z, setZ] = useState(String(position?.z ?? 0));
    const [where, setWhere] = useState(dimension);

    const teleport = (place?: Place) => {
        onAction({
            action: 'teleport',
            x: place ? place.x : Number(x),
            y: place ? place.y : Number(y),
            z: place ? place.z : Number(z),
            dimension: place ? place.dimension : where,
        });
    };

    const valid = [x, y, z].every((value) => value !== '' && !isNaN(Number(value)));

    return (
        <div className={'space-y-4 rounded-2xl bg-card p-4'}>
            <div>
                <p className={'mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>
                    {t('playerControls.currentPosition')}
                </p>

                <div className={'grid grid-cols-3 gap-2'}>
                    <div className={'min-w-0'}>
                        <Input label={'X'} value={x} onChange={(event) => setX(event.target.value)} />
                    </div>
                    <div className={'min-w-0'}>
                        <Input label={'Y'} value={y} onChange={(event) => setY(event.target.value)} />
                    </div>
                    <div className={'min-w-0'}>
                        <Input label={'Z'} value={z} onChange={(event) => setZ(event.target.value)} />
                    </div>
                </div>

                <div className={'mt-2'}>
                    <Select label={t('players.dimension')} value={where} onChange={setWhere} options={dimensions(t)} />
                </div>

                <Button
                    size={'sm'}
                    className={'mt-3 w-full'}
                    disabled={busy || !valid}
                    onClick={() => teleport()}
                    icon={<MapPin className={'h-3.5 w-3.5'} />}
                >
                    {t('playerControls.teleport')}
                </Button>
            </div>

            <div className={'grid grid-cols-2 gap-2'}>
                <PlaceRow
                    label={t('playerControls.respawnPoint')}
                    place={respawn}
                    empty={t('playerControls.noRespawn')}
                    busy={busy}
                    onTeleport={teleport}
                />

                <PlaceRow
                    label={t('playerControls.lastDeath')}
                    place={lastDeath}
                    empty={t('playerControls.noDeath')}
                    busy={busy}
                    onTeleport={teleport}
                />
            </div>
        </div>
    );
}

function PlaceRow({
    label,
    place,
    empty,
    busy,
    onTeleport,
}: {
    label: string;
    place: Place | null;
    empty: string;
    busy: boolean;
    onTeleport: (place: Place) => void;
}) {
    const t = useT();
    return (
        <div className={'flex min-w-0 flex-col rounded-xl bg-overlay/40 p-3'}>
            <p className={'truncate text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>{label}</p>

            {place ? (
                <>
                    <p className={'mt-1 truncate font-mono text-xs text-ink'}>{`${place.x}, ${place.y}, ${place.z}`}</p>
                    <p className={'mb-2 truncate text-[10px] text-ink-faint'}>
                        {place.dimension.replace('minecraft:', '')}
                    </p>
                    <Button
                        size={'sm'}
                        variant={'secondary'}
                        className={'mt-auto w-full'}
                        disabled={busy}
                        onClick={() => onTeleport(place)}
                    >
                        {t('playerControls.teleportHere')}
                    </Button>
                </>
            ) : (
                <p className={'mt-1 text-xs text-ink-faint'}>{empty}</p>
            )}
        </div>
    );
}

export function DangerZone({ online, busy, onDelete }: { online: boolean; busy: boolean; onDelete: () => void }) {
    const t = useT();
    return (
        <div className={'space-y-3 rounded-2xl bg-card p-4'}>
            <Header title={t('playerControls.dangerZone')} />

            <p className={'text-xs text-ink-muted'}>{t('playerControls.dangerBody')}</p>

            <Button
                size={'sm'}
                variant={'danger'}
                className={'w-full'}
                loading={busy}
                disabled={online}
                onClick={onDelete}
                icon={<Trash2 className={'h-3.5 w-3.5'} />}
            >
                {t(online ? 'playerControls.theyAreOnline' : 'playerControls.deletePlayerData')}
            </Button>
        </div>
    );
}

function XpButton({
    label,
    title,
    primary,
    disabled,
    onClick,
}: {
    label: string;
    title: string;
    primary?: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type={'button'}
            title={title}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'truncate rounded-xl px-2 py-2 text-xs font-medium transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                primary
                    ? 'bg-accent/15 text-accent hover:bg-accent/25'
                    : 'bg-overlay/60 text-ink-muted hover:bg-raised hover:text-ink'
            )}
        >
            {label}
        </button>
    );
}

function Header({ title }: { title: string }) {
    return <p className={'text-sm font-semibold tracking-tight text-ink'}>{title}</p>;
}

function Action({
    icon: Icon,
    label,
    tone,
    busy,
    onClick,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    tone: 'success' | 'danger';
    busy: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type={'button'}
            disabled={busy}
            onClick={onClick}
            className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                tone === 'success'
                    ? 'bg-success/15 text-success hover:bg-success/25'
                    : 'bg-danger/15 text-danger hover:bg-danger/25'
            )}
        >
            <Icon className={'h-3.5 w-3.5 shrink-0'} aria-hidden={'true'} />
            {label}
        </button>
    );
}

function Toggle({
    icon: Icon,
    label,
    on,
    busy,
    danger,
    onChange,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    on: boolean;
    busy: boolean;
    danger?: boolean;
    onChange: (on: boolean) => void;
}) {
    return (
        <button
            type={'button'}
            role={'switch'}
            aria-checked={on}
            disabled={busy}
            onClick={() => onChange(!on)}
            className={cn(
                'flex w-full items-center gap-2.5 rounded-xl bg-overlay/40 px-3 py-2 text-left transition-colors',
                'hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60'
            )}
        >
            <Icon
                className={cn('h-4 w-4 shrink-0', on ? (danger ? 'text-danger' : 'text-accent') : 'text-ink-faint')}
                aria-hidden={'true'}
            />

            <span className={'flex-1 truncate text-xs font-medium text-ink'}>{label}</span>

            <span
                className={cn(
                    'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                    on ? (danger ? 'bg-danger' : 'bg-accent') : 'bg-raised'
                )}
            >
                <span
                    className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full',
                        'transition-[left,background-color] duration-150 ease-out',
                        on ? 'left-[1.125rem]' : 'left-0.5',
                        on && !danger ? 'bg-accent-ink' : 'bg-white'
                    )}
                />
            </span>
        </button>
    );
}
