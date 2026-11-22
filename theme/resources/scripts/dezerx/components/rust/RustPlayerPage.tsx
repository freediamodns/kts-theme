import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Flame, UserRound } from 'lucide-react';
import {
    RustPlayerProfile,
    RustPlayerSummary,
    executePlayerAction,
    getRustPlayer,
    savePlayerNotes,
} from '@/api/server/rustPlayers';
import { Button, Input, Select, Skeleton, SkeletonRegion, Toggle, useToast } from '@/dezerx/components/ui';
import { SectionEmpty } from '@/dezerx/components/console/Section';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import FileDialog, { FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { cn } from '@/dezerx/lib/cn';
import {
    FIELD,
    Fact,
    Label,
    Hidden,
    Meter,
    OnlineDot,
    OwnerCrown,
    Panel,
    PingBars,
    Segmented,
    SnowflakeIcon,
    SoftButton,
    SteamAvatar,
    Tag,
    errorMessage,
    formatDate,
    formatSeconds,
    statusOf,
} from './common';
import RustInventoryGrid from './RustInventoryGrid';
import RustContainerInspector from './RustContainerInspector';
import RustTechTreeViewer from './RustTechTreeViewer';
import RustGiveItemModal from './RustGiveItemModal';

type Section = 'inventory' | 'bags' | 'cupboards' | 'blueprints' | 'notes';
type SlotTarget = { container: 'main' | 'belt' | 'wear'; slot: number } | null;

export const BAN_DURATIONS = [
    { value: '0', label: 'Permanent' },
    { value: '3600', label: '1 hour' },
    { value: '43200', label: '12 hours' },
    { value: '86400', label: '1 day' },
    { value: '259200', label: '3 days' },
    { value: '604800', label: '7 days' },
    { value: '2592000', label: '30 days' },
    { value: 'custom', label: 'Custom' },
];

export function banSeconds(choice: string, customHours: string): number {
    if (choice !== 'custom') return Number(choice);
    return Math.max(60, Math.round((parseFloat(customHours) || 1) * 3600));
}

export default function RustPlayerPage({
    uuid,
    steamId,
    summary,
    onBack,
    onChanged,
    toolbar,
    canControl = true,
}: {
    uuid: string;
    steamId: string;
    summary: RustPlayerSummary | null;
    onBack: () => void;
    onChanged: () => void;
    toolbar?: ReactNode;
    canControl?: boolean;
}) {
    const { toast } = useToast();
    const [profile, setProfile] = useState<RustPlayerProfile | null>(null);
    const [failed, setFailed] = useState(false);
    const [section, setSection] = useState<Section>('inventory');
    const [acting, setActing] = useState(false);
    const [notes, setNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const notesFor = useRef<string | null>(null);

    const [giveOpen, setGiveOpen] = useState(false);
    const [giveTarget, setGiveTarget] = useState<SlotTarget>(null);
    const [banOpen, setBanOpen] = useState(false);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    const load = (silent = true) =>
        getRustPlayer(uuid, steamId, silent)
            .then((res) => {
                setProfile(res.player);
                setFailed(false);
                if (notesFor.current !== steamId) {
                    notesFor.current = steamId;
                    setNotes(res.player.notes || '');
                }
            })
            .catch((err) => {
                if (!silent) {
                    setFailed(true);
                    toast(errorMessage(err, 'Could not read that player.'), { tone: 'error' });
                }
            });

    useEffect(() => {
        setProfile(null);
        notesFor.current = null;
        void load(false);
        const interval = window.setInterval(() => void load(true), 3000);
        return () => window.clearInterval(interval);
    }, [uuid, steamId]);

    const refresh = () => {
        void load(true);
        onChanged();
    };

    const act = async (action: string, payload: Record<string, any> = {}, done = 'Done.') => {
        setActing(true);
        try {
            await executePlayerAction(uuid, steamId, action, payload);
            toast(done, { tone: 'success' });
            window.setTimeout(refresh, 400);
        } catch (err) {
            toast(errorMessage(err, 'That did not go through.'), { tone: 'error' });
            throw err;
        } finally {
            setActing(false);
        }
    };

    const saveNotes = async () => {
        setSavingNotes(true);
        try {
            await savePlayerNotes(uuid, steamId, notes);
            toast('Notes saved.', { tone: 'success' });
        } catch (err) {
            toast(errorMessage(err, 'Could not save the notes.'), { tone: 'error' });
        } finally {
            setSavingNotes(false);
        }
    };

    const back = (
        <button
            type={'button'}
            onClick={onBack}
            className={
                'mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink'
            }
        >
            <ChevronLeft className={'h-3.5 w-3.5'} aria-hidden={'true'} />
            All players
        </button>
    );

    if (profile === null) {
        return (
            <div>
                {back}
                {failed ? (
                    <SectionEmpty
                        icon={UserRound}
                        title={'Player not found'}
                        body={'The server has nothing on this SteamID yet.'}
                    />
                ) : (
                    <SkeletonRegion label={'Loading player'}>
                        <Skeleton className={'h-24 w-full'} />
                        <Skeleton className={'mt-3 h-[22rem] w-full'} />
                    </SkeletonRegion>
                )}
            </div>
        );
    }

    const name = profile.name || summary?.name || steamId;
    const status = statusOf(profile);
    const ping = summary?.ping ?? (profile as any).ping ?? 0;
    const teamId = summary?.teamId ?? (profile as any).teamId ?? 0;
    const banHistory = profile.banHistory ?? [];

    return (
        <div>
            {back}

            <div className={'grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start'}>
                <div className={'min-w-0 space-y-4'}>
                    <div className={'flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl bg-card p-4'}>
                        <div className={'flex min-w-[11rem] flex-1 items-center gap-4'}>
                            <SteamAvatar src={profile.avatar} className={'h-16 w-16 rounded-xl'} />
                            <div className={'min-w-0'}>
                                <p className={'flex items-center gap-2 text-lg font-semibold tracking-tight text-ink'}>
                                    {profile.isConnected && <OnlineDot />}
                                    <span className={'truncate'}>{name}</span>
                                    {profile.isOwner && <OwnerCrown />}
                                </p>
                                <div className={'mt-1 flex flex-wrap items-center gap-1.5'}>
                                    {!profile.isConnected && (
                                        <span
                                            className={
                                                'shrink-0 rounded-full bg-overlay px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted'
                                            }
                                        >
                                            {status}
                                        </span>
                                    )}
                                    {profile.isModerator && <Tag>Moderator</Tag>}
                                    {profile.isGod && <Tag>God mode</Tag>}
                                    {profile.isFrozen && <Tag>Frozen</Tag>}
                                </div>
                                {canControl && (
                                    <div className={'mt-2.5 flex gap-2'}>
                                        <SoftButton
                                            className={'px-4 py-1.5'}
                                            disabled={acting || !profile.isConnected}
                                            title={
                                                profile.isConnected ? undefined : 'Only online players can be kicked'
                                            }
                                            onClick={() =>
                                                setDialog({
                                                    title: `Kick ${name}`,
                                                    body: 'They are disconnected and can join again straight away.',
                                                    confirmLabel: 'Kick',
                                                    destructive: true,
                                                    input: { label: 'Reason', initial: 'Kicked by an administrator' },
                                                    onConfirm: (reason) => act('kick', { reason }, `${name} kicked.`),
                                                })
                                            }
                                        >
                                            Kick
                                        </SoftButton>
                                        {profile.isBanned ? (
                                            <SoftButton
                                                solidDanger
                                                className={'px-4 py-1.5'}
                                                disabled={acting}
                                                onClick={() => void act('unban', {}, `${name} unbanned.`)}
                                            >
                                                Unban
                                            </SoftButton>
                                        ) : (
                                            <SoftButton
                                                solidDanger
                                                className={'px-4 py-1.5'}
                                                disabled={acting}
                                                onClick={() => setBanOpen(true)}
                                            >
                                                Ban
                                            </SoftButton>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div
                            className={
                                'grid w-full grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:w-[30rem] lg:flex-none'
                            }
                        >
                            <Meter label={'Health'} value={profile.health} max={profile.maxHealth || 100} />
                            <Meter label={'Calories'} value={profile.calories} max={500} />
                            <Meter label={'Hydration'} value={profile.hydration} max={250} />
                            <Meter label={'Radiation'} value={profile.radiation} max={500} unit={' rads'} />
                            <Meter
                                label={'Temperature'}
                                value={profile.temperature}
                                max={50}
                                unit={' °C'}
                                extra={
                                    profile.temperature <= 5 ? (
                                        <SnowflakeIcon className={'h-3.5 w-3.5 text-info'} label={'Too cold'} />
                                    ) : profile.temperature >= 35 ? (
                                        <Flame className={'h-3.5 w-3.5 text-danger'} aria-label={'Too hot'} />
                                    ) : null
                                }
                            />
                            <Meter
                                label={'Scrap'}
                                value={profile.scrap}
                                max={Math.max(1000, profile.scrap)}
                                unit={''}
                            />
                        </div>
                    </div>

                    <Segmented<Section>
                        label={'Player sections'}
                        value={section}
                        onChange={setSection}
                        className={'w-fit'}
                        options={[
                            { value: 'inventory', label: 'Inventory' },
                            {
                                value: 'bags',
                                label: (
                                    <>
                                        Sleeping bags{' '}
                                        <span className={'ml-1 text-ink-faint'}>{profile.sleepingBags.length}</span>
                                    </>
                                ),
                            },
                            {
                                value: 'cupboards',
                                label: (
                                    <>
                                        Tool cupboards{' '}
                                        <span className={'ml-1 text-ink-faint'}>{profile.toolCupboards.length}</span>
                                    </>
                                ),
                            },
                            {
                                value: 'blueprints',
                                label: (
                                    <>
                                        Blueprints{' '}
                                        <span className={'ml-1 text-ink-faint'}>{profile.blueprints.length}</span>
                                    </>
                                ),
                            },
                            { value: 'notes', label: 'Notes' },
                        ]}
                    />

                    {section === 'inventory' && (
                        <RustInventoryGrid
                            uuid={uuid}
                            steamId={steamId}
                            playerName={name}
                            inventory={profile.inventory}
                            onRefresh={refresh}
                            onOpenGiveModal={(target) => {
                                setGiveTarget(target ?? null);
                                setGiveOpen(true);
                            }}
                            confirm={setDialog}
                            readOnly={!canControl}
                        />
                    )}

                    {section === 'bags' && (
                        <Panel title={'Sleeping bags and beds'} description={'Where this player can respawn.'}>
                            {profile.sleepingBags.length === 0 ? (
                                <p className={'text-xs text-ink-faint'}>No bags placed.</p>
                            ) : (
                                <div className={'space-y-1'}>
                                    {profile.sleepingBags.map((bag) => (
                                        <div
                                            key={bag.id}
                                            className={'flex items-center gap-3 rounded-xl bg-overlay/40 px-3 py-2'}
                                        >
                                            <span className={'min-w-0 flex-1'}>
                                                <span className={'block truncate text-xs font-medium text-ink'}>
                                                    {bag.name}
                                                </span>
                                                <span className={'block font-mono text-[10px] text-ink-faint'}>
                                                    {Math.round(bag.pos.x)}, {Math.round(bag.pos.z)}
                                                </span>
                                            </span>
                                            <span className={'w-12 text-right text-xs tabular-nums text-ink-muted'}>
                                                {bag.grid}
                                            </span>
                                            <span className={'w-20 text-right text-xs text-ink-muted'}>
                                                {bag.cooldown > 0 ? formatSeconds(bag.cooldown) : 'Ready'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Panel>
                    )}

                    {section === 'cupboards' && (
                        <RustContainerInspector
                            uuid={uuid}
                            steamId={steamId}
                            playerName={name}
                            toolCupboards={profile.toolCupboards}
                            onRefresh={refresh}
                        />
                    )}

                    {section === 'blueprints' && (
                        <RustTechTreeViewer
                            uuid={uuid}
                            steamId={steamId}
                            playerName={name}
                            unlockedBlueprints={profile.blueprints}
                            onRefresh={refresh}
                            confirm={setDialog}
                        />
                    )}

                    {section === 'notes' && (
                        <Panel
                            title={'Staff notes'}
                            description={'Private to the people who manage this server.'}
                            action={
                                <Button size={'sm'} loading={savingNotes} onClick={() => void saveNotes()}>
                                    Save notes
                                </Button>
                            }
                        >
                            <textarea
                                value={notes}
                                rows={6}
                                onChange={(event) => setNotes(event.target.value)}
                                placeholder={'Warnings, clan, reports, anything worth remembering.'}
                                className={cn(FIELD, 'resize-y')}
                            />
                        </Panel>
                    )}
                </div>

                <div className={'min-w-0 space-y-4'}>
                    <section className={'space-y-4 rounded-2xl bg-card p-4'}>
                        <div className={'flex items-end justify-between gap-3'}>
                            <div className={'min-w-0'}>
                                <span className={'flex items-center gap-1.5 text-ink-faint'}>
                                    <SteamMark className={'h-3 w-3'} />
                                    <Label>SteamID</Label>
                                </span>
                                <p className={'mt-0.5 truncate font-mono text-xs text-ink'}>
                                    <Hidden>{steamId}</Hidden>
                                </p>
                            </div>
                            <SoftButton
                                className={'shrink-0 py-1.5'}
                                onClick={() => {
                                    void navigator.clipboard?.writeText(steamId);
                                    toast('SteamID copied.', { tone: 'success' });
                                }}
                            >
                                Copy
                            </SoftButton>
                        </div>
                        <dl className={'grid grid-cols-2 gap-3 text-xs'}>
                            <Fact label={'Grid'} value={profile.grid || '-'} />
                            <Fact
                                label={'Position'}
                                value={`${Math.round(profile.pos.x)}, ${Math.round(profile.pos.z)}`}
                            />
                            <Fact label={'Team'} value={teamId ? `#${teamId}` : 'Solo'} />
                            <Fact
                                label={'Ping'}
                                value={
                                    profile.isConnected ? (
                                        <span className={'inline-flex items-center gap-1.5'}>
                                            <PingBars ping={ping} />
                                            {ping} ms
                                        </span>
                                    ) : (
                                        '-'
                                    )
                                }
                            />
                        </dl>
                    </section>

                    {toolbar}

                    {canControl && (
                        <>
                            <Panel title={'Control'}>
                                <div className={'grid grid-cols-2 gap-2'}>
                                    <SoftButton
                                        disabled={acting || profile.isDead}
                                        onClick={() => void act('heal', {}, `${name} healed.`)}
                                    >
                                        Heal
                                    </SoftButton>
                                    <SoftButton
                                        disabled={acting || profile.isDead}
                                        onClick={() => void act('feed', {}, `${name} fed.`)}
                                    >
                                        Feed
                                    </SoftButton>
                                    <SoftButton
                                        disabled={acting}
                                        onClick={() => void act('resurrect', {}, `${name} resurrected.`)}
                                    >
                                        Resurrect
                                    </SoftButton>
                                    <SoftButton
                                        danger
                                        disabled={acting || profile.isDead}
                                        onClick={() =>
                                            setDialog({
                                                title: `Kill ${name}?`,
                                                body: 'They drop everything they are carrying where they stand.',
                                                confirmLabel: 'Kill',
                                                destructive: true,
                                                onConfirm: () => act('kill', {}, `${name} killed.`),
                                            })
                                        }
                                    >
                                        Kill
                                    </SoftButton>
                                </div>

                                <div className={'space-y-1.5'}>
                                    <SwitchRow
                                        label={'God mode'}
                                        checked={profile.isGod}
                                        disabled={acting}
                                        onChange={() =>
                                            void act('godmode', {}, profile.isGod ? 'God mode off.' : 'God mode on.')
                                        }
                                    />
                                    <SwitchRow
                                        label={'Frozen in place'}
                                        checked={!!profile.isFrozen}
                                        disabled={acting}
                                        onChange={(on) =>
                                            void act(
                                                on ? 'freeze' : 'unfreeze',
                                                {},
                                                on ? `${name} frozen.` : `${name} unfrozen.`
                                            )
                                        }
                                    />
                                </div>
                            </Panel>
                        </>
                    )}

                    {banHistory.length > 0 && (
                        <Panel title={'Ban history'}>
                            <div className={'space-y-1.5'}>
                                {banHistory.slice(0, 5).map((ban, index) => (
                                    <div key={ban.id ?? index} className={'rounded-xl bg-overlay/40 px-3 py-2'}>
                                        <p className={'truncate text-xs text-ink'}>{ban.reason}</p>
                                        <p className={'text-[10px] text-ink-faint'}>
                                            {formatDate(ban.bannedAt)} ·{' '}
                                            {ban.active
                                                ? ban.expiresAt
                                                    ? `until ${formatDate(ban.expiresAt)}`
                                                    : 'permanent'
                                                : 'lifted'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    )}

                    <Panel title={'Connection'}>
                        <dl className={'grid grid-cols-2 gap-3 text-xs'}>
                            <Fact label={'Status'} value={status} />
                            <Fact
                                label={'IP address'}
                                value={
                                    profile.isConnected && (summary?.ip || (profile as any).ip) ? (
                                        <Hidden>{summary?.ip || (profile as any).ip}</Hidden>
                                    ) : (
                                        '-'
                                    )
                                }
                            />
                            <Fact label={'Wounded'} value={profile.isWounded ? 'Yes' : 'No'} />
                            <Fact
                                label={'Profile'}
                                value={
                                    <a
                                        className={'hover:text-ink'}
                                        href={`https://steamcommunity.com/profiles/${steamId}`}
                                        target={'_blank'}
                                        rel={'noreferrer'}
                                    >
                                        Steam
                                    </a>
                                }
                            />
                        </dl>
                    </Panel>
                </div>
            </div>

            <RustGiveItemModal
                uuid={uuid}
                steamId={steamId}
                playerName={name}
                isOpen={giveOpen}
                targetSlot={giveTarget}
                onClose={() => setGiveOpen(false)}
                onGiven={refresh}
            />

            <BanDialog
                open={banOpen}
                name={name}
                onClose={() => setBanOpen(false)}
                onBan={(reason, duration) => act('ban', { reason, duration, name }, `${name} banned.`)}
            />

            <FileDialog request={dialog} onClose={() => setDialog(null)} />
        </div>
    );
}

function SteamMark({ className }: { className?: string }) {
    return (
        <svg viewBox={'0 0 24 24'} fill={'currentColor'} aria-hidden={'true'} className={className}>
            <path
                d={
                    'M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z'
                }
            />
        </svg>
    );
}

function SwitchRow({
    label,
    checked,
    disabled,
    onChange,
}: {
    label: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (on: boolean) => void;
}) {
    return (
        <div className={'flex items-center justify-between gap-3 rounded-xl bg-overlay/40 px-3 py-2'}>
            <span className={'truncate text-xs font-medium text-ink'}>{label}</span>
            <Toggle checked={checked} disabled={disabled} onChange={onChange} label={label} />
        </div>
    );
}

export function BanDialog({
    open,
    name,
    onClose,
    onBan,
}: {
    open: boolean;
    name: string;
    onClose: () => void;
    onBan: (reason: string, duration: number) => Promise<void>;
}) {
    const [reason, setReason] = useState('Violating server rules');
    const [duration, setDuration] = useState('0');
    const [hours, setHours] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setReason('Violating server rules');
            setDuration('0');
            setHours('');
        }
    }, [open]);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);
        try {
            await onBan(reason.trim() || 'Violating server rules', banSeconds(duration, hours));
            onClose();
        } catch {
        } finally {
            setBusy(false);
        }
    };

    return (
        <DialogShell
            open={open}
            onClose={() => !busy && onClose()}
            title={`Ban ${name}`}
            body={'They are kicked now and refused until the ban runs out.'}
            width={'md'}
        >
            <form onSubmit={(event) => void submit(event)} className={'mt-4 space-y-3'}>
                <Input label={'Reason'} value={reason} onChange={(event) => setReason(event.target.value)} autoFocus />
                <Select label={'Length'} value={duration} onChange={setDuration} options={BAN_DURATIONS} />
                {duration === 'custom' && (
                    <Input
                        label={'Hours'}
                        inputMode={'decimal'}
                        value={hours}
                        onChange={(event) => setHours(event.target.value)}
                    />
                )}

                <DialogFooter>
                    <Button type={'button'} size={'sm'} variant={'ghost'} onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                    <Button type={'submit'} size={'sm'} variant={'danger'} loading={busy}>
                        Ban
                    </Button>
                </DialogFooter>
            </form>
        </DialogShell>
    );
}
