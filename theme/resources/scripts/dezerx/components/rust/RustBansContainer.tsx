import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { ServerContext } from '@/state/server';
import { RustBanRecord, createRustBan, getRustBans, unbanRustPlayer } from '@/api/server/rustPlayers';
import { Button, Input, Select, Skeleton, SkeletonRegion, useToast } from '@/dezerx/components/ui';
import { SectionEmpty } from '@/dezerx/components/console/Section';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import FileDialog, { FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { Hidden, Label, Segmented, SteamAvatar, errorMessage, formatDate, formatSeconds, hasAvatar } from './common';
import { BAN_DURATIONS, banSeconds } from './RustPlayerPage';

type View = 'active' | 'history';

const REASONS = [
    'Cheating',
    'Toxicity or harassment',
    'Over the team limit',
    'Hate speech',
    'Exploit abuse',
    'Disrespecting staff',
    'Griefing outside raid hours',
];

function matches(ban: RustBanRecord, term: string): boolean {
    return (
        !term ||
        ban.name.toLowerCase().includes(term) ||
        ban.steamId.includes(term) ||
        (ban.reason || '').toLowerCase().includes(term)
    );
}

function lengthOf(ban: RustBanRecord): string {
    return !ban.duration ? 'Permanent' : formatSeconds(ban.duration);
}

export default function RustBansContainer({ onChanged }: { onChanged?: () => void }) {
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const { toast } = useToast();

    const [active, setActive] = useState<RustBanRecord[] | null>(null);
    const [history, setHistory] = useState<RustBanRecord[]>([]);
    const [view, setView] = useState<View>('active');
    const [query, setQuery] = useState('');
    const [banOpen, setBanOpen] = useState(false);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    const load = () => {
        if (!uuid) return;
        getRustBans(uuid)
            .then((res) => {
                setActive(res.activeBans || []);
                setHistory(res.history || []);
            })
            .catch((err) => {
                setActive((current) => current ?? []);
                toast(errorMessage(err, 'Could not load the ban list.'), { tone: 'error' });
            });
    };

    useEffect(load, [uuid]);

    const term = query.trim().toLowerCase();
    const visibleActive = useMemo(() => (active ?? []).filter((ban) => matches(ban, term)), [active, term]);
    const visibleHistory = useMemo(() => history.filter((ban) => matches(ban, term)), [history, term]);
    const withAvatars = (view === 'active' ? visibleActive : visibleHistory).some((ban) => hasAvatar(ban.avatar));

    const unban = (ban: RustBanRecord) =>
        setDialog({
            title: `Unban ${ban.name || ban.steamId}?`,
            body: `They were banned for "${ban.reason || 'no reason given'}". They can join again straight away.`,
            confirmLabel: 'Unban',
            onConfirm: async () => {
                if (!uuid) return;
                try {
                    const res = await unbanRustPlayer(uuid, ban.steamId);
                    toast(res.message || `${ban.name || ban.steamId} unbanned.`, { tone: 'success' });
                    load();
                    onChanged?.();
                } catch (err) {
                    toast(errorMessage(err, 'Could not lift the ban.'), { tone: 'error' });
                    throw err;
                }
            },
        });

    return (
        <div className={'space-y-3'}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <div className={'flex flex-wrap items-center gap-3'}>
                <Segmented<View>
                    tall
                    label={'Ban list'}
                    value={view}
                    onChange={setView}
                    options={[
                        {
                            value: 'active',
                            label: (
                                <>
                                    Active{' '}
                                    <span className={'ml-1 tabular-nums text-ink-faint'}>{active?.length ?? 0}</span>
                                </>
                            ),
                        },
                        {
                            value: 'history',
                            label: (
                                <>
                                    History <span className={'ml-1 tabular-nums text-ink-faint'}>{history.length}</span>
                                </>
                            ),
                        },
                    ]}
                />
                <div className={'w-full sm:w-72'}>
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={'Search name, SteamID or reason'}
                        aria-label={'Search bans'}
                        icon={<Search className={'h-4 w-4'} />}
                    />
                </div>
                <Button size={'sm'} variant={'secondary'} className={'sm:ml-auto'} onClick={() => setBanOpen(true)}>
                    Ban by SteamID
                </Button>
            </div>

            {active === null ? (
                <SkeletonRegion label={'Loading bans'}>
                    <div className={'space-y-1 rounded-2xl bg-card p-2'}>
                        {[0, 1, 2].map((row) => (
                            <Skeleton key={row} className={'h-12 w-full'} />
                        ))}
                    </div>
                </SkeletonRegion>
            ) : view === 'active' ? (
                visibleActive.length === 0 ? (
                    <SectionEmpty
                        icon={ShieldCheck}
                        title={term ? 'No bans match' : 'Nobody is banned'}
                        body={term ? 'Try another search.' : 'Bans made here, in game or from the roster show up here.'}
                    />
                ) : (
                    <div className={'rounded-2xl bg-card p-2'}>
                        <div className={'hidden items-center gap-3 px-2 pb-1.5 pt-1 sm:flex'}>
                            {withAvatars && <span className={'w-8'} />}
                            <span className={'flex-1'}>
                                <Label>Player</Label>
                            </span>
                            <span className={'w-40'}>
                                <Label>Expires</Label>
                            </span>
                            <span className={'w-[4.5rem]'} />
                        </div>
                        <div className={'space-y-0.5'}>
                            {visibleActive.map((ban) => (
                                <div key={ban.steamId} className={'flex items-center gap-3 rounded-xl p-2'}>
                                    <SteamAvatar src={ban.avatar} placeholder={withAvatars} className={'h-8 w-8'} />
                                    <span className={'min-w-0 flex-1'}>
                                        <span className={'block truncate text-sm font-medium text-ink'}>
                                            {ban.name || ban.steamId}
                                        </span>
                                        <span className={'block truncate text-[10px] text-ink-faint'}>
                                            {ban.reason || 'No reason given'} · <Hidden>{ban.steamId}</Hidden>
                                        </span>
                                    </span>
                                    <span className={'hidden w-40 text-xs text-ink-muted sm:block'}>
                                        {ban.expiresAt ? formatDate(ban.expiresAt) : 'Permanent'}
                                    </span>
                                    <Button
                                        size={'sm'}
                                        variant={'danger'}
                                        className={'w-[4.5rem] shrink-0'}
                                        onClick={() => unban(ban)}
                                    >
                                        Unban
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            ) : visibleHistory.length === 0 ? (
                <SectionEmpty
                    icon={ShieldCheck}
                    title={term ? 'No bans match' : 'No ban history'}
                    body={
                        term
                            ? 'Try another search.'
                            : 'Every ban on this server is kept here, including lifted and expired ones.'
                    }
                />
            ) : (
                <div className={'rounded-2xl bg-card p-2'}>
                    <div className={'hidden items-center gap-3 px-2 pb-1.5 pt-1 md:flex'}>
                        {withAvatars && <span className={'w-8'} />}
                        <span className={'flex-1'}>
                            <Label>Player</Label>
                        </span>
                        <span className={'w-24'}>
                            <Label>Length</Label>
                        </span>
                        <span className={'w-40'}>
                            <Label>Banned</Label>
                        </span>
                        <span className={'w-20'}>
                            <Label>Status</Label>
                        </span>
                    </div>
                    <div className={'space-y-0.5'}>
                        {visibleHistory.map((ban, index) => (
                            <div
                                key={ban.id ?? `${ban.steamId}-${index}`}
                                className={'flex items-center gap-3 rounded-xl p-2'}
                            >
                                <SteamAvatar src={ban.avatar} placeholder={withAvatars} className={'h-8 w-8'} />
                                <span className={'min-w-0 flex-1'}>
                                    <span className={'block truncate text-sm font-medium text-ink'}>
                                        {ban.name || ban.steamId}
                                    </span>
                                    <span className={'block truncate text-[10px] text-ink-faint'}>
                                        {ban.reason || 'No reason given'} · <Hidden>{ban.steamId}</Hidden>
                                    </span>
                                </span>
                                <span className={'hidden w-24 text-xs text-ink-muted md:block'}>{lengthOf(ban)}</span>
                                <span className={'hidden w-40 text-xs text-ink-muted md:block'}>
                                    {formatDate(ban.bannedAt)}
                                </span>
                                <span className={'w-20 text-xs text-ink-muted'}>
                                    {ban.active ? 'Active' : ban.unbannedAt ? 'Lifted' : 'Expired'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {uuid && (
                <ManualBanDialog
                    open={banOpen}
                    onClose={() => setBanOpen(false)}
                    onBan={async (payload) => {
                        try {
                            const res = await createRustBan(uuid, payload);
                            toast(res.message || 'Player banned.', { tone: 'success' });
                            load();
                            onChanged?.();
                        } catch (err) {
                            toast(errorMessage(err, 'Could not ban that player.'), { tone: 'error' });
                            throw err;
                        }
                    }}
                />
            )}
        </div>
    );
}

function ManualBanDialog({
    open,
    onClose,
    onBan,
}: {
    open: boolean;
    onClose: () => void;
    onBan: (payload: { steamId: string; name?: string; reason: string; duration: number }) => Promise<void>;
}) {
    const [steamId, setSteamId] = useState('');
    const [name, setName] = useState('');
    const [reason, setReason] = useState('');
    const [duration, setDuration] = useState('0');
    const [hours, setHours] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSteamId('');
        setName('');
        setReason('');
        setDuration('0');
        setHours('');
    }, [open]);

    const id = steamId.trim();
    const validId = /^7656\d{13}$/.test(id);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!validId) return;
        setBusy(true);
        try {
            await onBan({
                steamId: id,
                name: name.trim() || undefined,
                reason: reason.trim() || 'Violating server rules',
                duration: banSeconds(duration, hours),
            });
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
            title={'Ban by SteamID'}
            body={'Works for players who are offline or have never joined.'}
            width={'md'}
        >
            <form onSubmit={(event) => void submit(event)} className={'mt-4 space-y-3'}>
                <Input
                    label={'SteamID64'}
                    value={steamId}
                    placeholder={'76561198000000000'}
                    inputMode={'numeric'}
                    spellCheck={false}
                    autoFocus
                    onChange={(event) => setSteamId(event.target.value)}
                    error={id !== '' && !validId ? 'A SteamID64 is 17 digits and starts with 7656.' : undefined}
                />
                <Input
                    label={'Name'}
                    value={name}
                    placeholder={'Optional'}
                    onChange={(event) => setName(event.target.value)}
                />
                <div>
                    <Input
                        label={'Reason'}
                        value={reason}
                        placeholder={'Violating server rules'}
                        onChange={(event) => setReason(event.target.value)}
                    />
                    <div className={'mt-2 flex flex-wrap gap-1.5'}>
                        {REASONS.map((preset) => (
                            <button
                                key={preset}
                                type={'button'}
                                onClick={() => setReason(preset)}
                                className={
                                    'rounded-lg bg-overlay/60 px-2 py-1 text-[11px] text-ink-muted transition-colors hover:bg-raised hover:text-ink'
                                }
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                </div>
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
                    <Button type={'submit'} size={'sm'} variant={'danger'} loading={busy} disabled={!validId}>
                        Ban
                    </Button>
                </DialogFooter>
            </form>
        </DialogShell>
    );
}
