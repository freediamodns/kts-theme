import React, { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, History, Pencil, Plus, Trash2 } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { usePermissions } from '@/plugins/usePermissions';
import { Badge, BadgeTone, Button, Checkbox, Input, Notice, Select, Toggle, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { formatRelative } from '@/dezerx/lib/format';
import { cn } from '@/dezerx/lib/cn';
import { FIELD, Label, Segmented } from './common';
import {
    RustSeedMode,
    RustWipeFrequency,
    RustWipeRun,
    RustWipeSchedule,
    RustWipeSettings,
    RustWipeType,
    RustWipesIndex,
    cancelRustWipeRun,
    createRustWipe,
    deleteRustWipe,
    getRustWipes,
    runRustWipe,
    updateRustWipe,
} from '@/api/server/rustWipes';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TYPES: { value: RustWipeType; label: string; detail: string }[] = [
    { value: 'map', label: 'Map', detail: 'A new map. Blueprints and player data stay.' },
    { value: 'blueprints', label: 'Map and blueprints', detail: 'A new map, and everyone forgets what they learned.' },
    {
        value: 'full',
        label: 'Full',
        detail: 'Everything: map, blueprints, deaths, identities and Rust+ pairings.',
    },
];

const TYPE_LABEL: Record<RustWipeType, string> = { map: 'Map', blueprints: 'Blueprints', full: 'Full' };

const FREQUENCIES: { value: RustWipeFrequency; label: string }[] = [
    { value: 'weekly', label: 'Every week' },
    { value: 'biweekly', label: 'Every two weeks' },
    { value: 'monthly', label: 'Once a month' },
    { value: 'once', label: 'Once' },
];

const DELAYS = [
    { value: '0', label: 'Right away' },
    { value: '5', label: 'In 5 minutes' },
    { value: '15', label: 'In 15 minutes' },
    { value: '30', label: 'In 30 minutes' },
    { value: '60', label: 'In an hour' },
];

const STATUS: Record<RustWipeRun['status'], { label: string; tone: BadgeTone }> = {
    pending: { label: 'Counting down', tone: 'info' },
    stopping: { label: 'Stopping', tone: 'warning' },
    wiping: { label: 'Wiping', tone: 'warning' },
    starting: { label: 'Starting', tone: 'warning' },
    done: { label: 'Done', tone: 'success' },
    failed: { label: 'Failed', tone: 'danger' },
    cancelled: { label: 'Cancelled', tone: 'neutral' },
    missed: { label: 'Skipped', tone: 'warning' },
};

const STEPS: { status: RustWipeRun['status']; label: string }[] = [
    { status: 'pending', label: 'Warn players' },
    { status: 'stopping', label: 'Stop server' },
    { status: 'wiping', label: 'Delete files' },
    { status: 'starting', label: 'Start again' },
];

const localZone = (): string => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
};

const zones = (): string[] => {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    const list = supported ? supported('timeZone') : [];

    return Array.from(new Set(['UTC', localZone(), ...list]));
};

const today = (): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const blank = (): RustWipeSettings => ({
    name: '',
    enabled: true,
    frequency: 'weekly',
    weekday: 4,
    startsOn: today(),
    time: '19:00',
    timezone: localZone(),
    type: 'map',
    warnings: [60, 30, 10, 5, 1],
    message: '',
    seedMode: 'keep',
    seeds: [],
    worldSize: null,
    extraFiles: [],
    startAfter: true,
});

const PRESETS: { id: string; label: string; apply: Partial<RustWipeSettings> }[] = [
    {
        id: 'weekly',
        label: 'Weekly map wipe',
        apply: { name: 'Weekly map wipe', frequency: 'weekly', weekday: 4, type: 'map', seedMode: 'random' },
    },
    {
        id: 'biweekly',
        label: 'Fortnightly blueprint wipe',
        apply: { name: 'Fortnightly blueprint wipe', frequency: 'biweekly', type: 'blueprints', seedMode: 'random' },
    },
    {
        id: 'forced',
        label: 'Forced wipe',
        apply: {
            name: 'Forced wipe',
            frequency: 'monthly',
            weekday: 4,
            time: '19:00',
            timezone: 'Europe/London',
            type: 'blueprints',
            seedMode: 'random',
        },
    },
];

function weekdayOf(date: string | null): number | null {
    if (!date) return null;
    const [y, m, d] = date.split('-').map(Number);

    return y && m && d ? new Date(Date.UTC(y, m - 1, d)).getUTCDay() : null;
}

function formatDay(date: string | null): string {
    if (!date) return '';
    const [y, m, d] = date.split('-').map(Number);

    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

export function describeWipe(wipe: Pick<RustWipeSettings, 'frequency' | 'weekday' | 'startsOn' | 'time'>): string {
    const day = DAYS[wipe.weekday ?? 0];

    switch (wipe.frequency) {
        case 'once':
            return `Once, on ${formatDay(wipe.startsOn)} at ${wipe.time}`;
        case 'biweekly':
            return `Every other ${DAYS[weekdayOf(wipe.startsOn) ?? 0]} at ${wipe.time}, from ${formatDay(
                wipe.startsOn
            )}`;
        case 'monthly':
            return `The first ${day} of every month at ${wipe.time}`;
        default:
            return `Every ${day} at ${wipe.time}`;
    }
}

function when(unix: number): string {
    return new Date(unix * 1000).toLocaleString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function bytes(size: number): string {
    if (size < 1024) return `${size} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = size / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }

    return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

function countdown(seconds: number): string {
    const s = Math.max(0, Math.round(seconds));
    const m = Math.floor(s / 60);

    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(s % 60).padStart(2, '0')}`;
}

function minutes(value: number): string {
    return value >= 60 ? `${value / 60}h` : `${value}m`;
}

export default function RustWipesContainer() {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { toast } = useToast();
    const [canUpdate, canDeleteFiles, canStart, canStop, canStartup] = usePermissions([
        'schedule.update',
        'file.delete',
        'control.start',
        'control.stop',
        'startup.update',
    ]);
    const canManage = canUpdate && canDeleteFiles && canStart && canStop;

    const [index, setIndex] = useState<RustWipesIndex | null>(null);
    const [failed, setFailed] = useState<unknown>(null);
    const [creating, setCreating] = useState(false);
    const [wipeNow, setWipeNow] = useState(false);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    const load = useCallback(
        (quiet = false) =>
            getRustWipes(uuid)
                .then((data) => {
                    setIndex(data);
                    setFailed(null);
                })
                .catch((error) => {
                    if (quiet) return;
                    setFailed(error);
                    toast(apiMessage(error, 'The wipe schedules could not be loaded.'), { tone: 'error' });
                }),
        [uuid]
    );

    useEffect(() => {
        void load();
    }, [load]);

    const activeId = index?.active?.id;
    useEffect(() => {
        if (!activeId) return;
        const timer = window.setInterval(() => void load(true), 5000);

        return () => window.clearInterval(timer);
    }, [activeId, load]);

    const remove = (wipe: RustWipeSchedule) =>
        setDialog({
            title: `Delete ${wipe.name}?`,
            body: 'The schedule is removed. A wipe it has already started counting down is called off.',
            confirmLabel: 'Delete',
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteRustWipe(uuid, wipe.id);
                    await load(true);
                    toast(`${wipe.name} deleted.`, { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, 'The schedule could not be deleted.'), { tone: 'error' });
                    throw error;
                }
            },
        });

    const toggle = async (wipe: RustWipeSchedule) => {
        try {
            const { id: _id, nextRunAt: _next, lastRunAt: _last, ...settings } = wipe;
            await updateRustWipe(uuid, wipe.id, { ...settings, enabled: !wipe.enabled });
            await load(true);
            toast(wipe.enabled ? `${wipe.name} paused.` : `${wipe.name} is on.`, { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, 'The schedule could not be changed.'), { tone: 'error' });
        }
    };

    const cancel = async (run: RustWipeRun) => {
        try {
            await cancelRustWipeRun(uuid, run.id);
            await load(true);
            toast('The wipe was called off.', { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, 'The wipe could not be cancelled.'), { tone: 'error' });
            await load(true);
        }
    };

    return (
        <ServerContentBlock title={'Rust Wipes'}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            {index === null ? (
                failed === null ? (
                    <SectionSkeleton label={'Loading wipe schedules'} />
                ) : (
                    <Notice
                        tone={'danger'}
                        title={'The wipe schedules could not be loaded'}
                        action={
                            <Button size={'sm'} variant={'secondary'} onClick={() => void load()}>
                                Try again
                            </Button>
                        }
                    >
                        {apiMessage(failed, 'The panel did not answer.')}
                    </Notice>
                )
            ) : (
                <div className={'grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start'}>
                    <div className={'min-w-0 space-y-6'}>
                        {index.active && (
                            <ActiveWipe
                                run={index.active}
                                canCancel={canManage}
                                onCancel={() => cancel(index.active!)}
                            />
                        )}

                        <div className={'space-y-3'}>
                            <SectionHeader
                                title={'Wipe schedules'}
                                description={
                                    'Players are warned in chat as the time comes closer, then the server is stopped, wiped and started again.'
                                }
                                action={
                                    canManage && (
                                        <div className={'flex flex-wrap items-center gap-2'}>
                                            <Button
                                                size={'sm'}
                                                variant={'secondary'}
                                                disabled={!!index.active}
                                                onClick={() => setWipeNow(true)}
                                            >
                                                Wipe now
                                            </Button>
                                            <Button
                                                size={'sm'}
                                                variant={creating ? 'secondary' : 'primary'}
                                                disabled={!creating && index.wipes.length >= index.limits.schedules}
                                                onClick={() => setCreating((value) => !value)}
                                                icon={<Plus className={'h-3.5 w-3.5'} />}
                                            >
                                                {creating ? 'Cancel' : 'New schedule'}
                                            </Button>
                                        </div>
                                    )
                                }
                            />

                            {creating && (
                                <WipeForm
                                    uuid={uuid}
                                    index={index}
                                    canStartup={canStartup}
                                    onSaved={async () => {
                                        setCreating(false);
                                        await load(true);
                                    }}
                                    onCancel={() => setCreating(false)}
                                />
                            )}

                            {index.wipes.length === 0 ? (
                                !creating && (
                                    <SectionEmpty
                                        icon={CalendarClock}
                                        title={'No wipes scheduled'}
                                        body={
                                            canManage
                                                ? 'Add a schedule for your regular wipe, or wipe now.'
                                                : 'Nobody has scheduled a wipe on this server yet.'
                                        }
                                    />
                                )
                            ) : (
                                <div className={'space-y-3'}>
                                    {index.wipes.map((wipe) => (
                                        <WipeCard
                                            key={wipe.id}
                                            uuid={uuid}
                                            wipe={wipe}
                                            index={index}
                                            canManage={canManage}
                                            canStartup={canStartup}
                                            onToggle={() => void toggle(wipe)}
                                            onDelete={() => remove(wipe)}
                                            onSaved={() => load(true)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <RunHistory runs={index.runs} />
                    </div>

                    <WorldCard index={index} />
                </div>
            )}

            {index && (
                <WipeNowDialog
                    open={wipeNow}
                    onClose={() => setWipeNow(false)}
                    uuid={uuid}
                    index={index}
                    canSeed={canStartup && index.world.seedEditable && !index.world.customMap}
                    onStarted={() => load(true)}
                />
            )}
        </ServerContentBlock>
    );
}

function WorldCard({ index }: { index: RustWipesIndex }) {
    const next = index.wipes
        .filter((wipe) => wipe.enabled && wipe.nextRunAt)
        .sort((a, b) => (a.nextRunAt ?? 0) - (b.nextRunAt ?? 0))[0];

    const files = (bucket: { files: number; size: number }) =>
        !index.readable ? '-' : bucket.files === 0 ? 'None' : `${bucket.files} · ${bytes(bucket.size)}`;

    const rows: { label: string; value: ReactNode; title?: string }[] = [
        {
            label: 'Status',
            value: (
                <Badge tone={index.state === 'running' ? 'success' : 'neutral'} className={'rounded-md'}>
                    {index.state ? index.state[0].toUpperCase() + index.state.slice(1) : 'Unknown'}
                </Badge>
            ),
        },
        {
            label: 'Next wipe',
            value: next?.nextRunAt ? formatRelative(new Date(next.nextRunAt * 1000)) : 'None',
            title: next?.nextRunAt ? `${next.name}, ${when(next.nextRunAt)}` : undefined,
        },
        {
            label: 'Seed',
            value: index.world.customMap ? 'Custom map' : index.world.seed || 'Random',
        },
        { label: 'World size', value: index.world.customMap ? '-' : index.world.size ?? '-' },
        { label: 'Map files', value: files(index.buckets.map) },
        { label: 'Blueprints', value: files(index.buckets.blueprints) },
        { label: 'Player data', value: files(index.buckets.players) },
    ];

    return (
        <section className={'order-first overflow-hidden rounded-2xl bg-card ring-1 ring-line-field xl:order-none'}>
            <div className={'px-5 py-4'}>
                <h2 className={'text-sm font-semibold text-ink'}>World</h2>
                <p className={'mt-0.5 truncate font-mono text-[11px] text-ink-faint'}>{index.directory}</p>
            </div>
            <dl className={'overflow-hidden rounded-t-xl'}>
                {rows.map((row, i) => (
                    <div
                        key={row.label}
                        title={row.title}
                        className={cn('flex items-center justify-between gap-4 px-5 py-3', i % 2 === 1 && 'bg-raised')}
                    >
                        <dt className={'shrink-0 text-sm text-ink-muted'}>{row.label}</dt>
                        <dd className={'min-w-0 truncate text-right text-sm tabular-nums text-ink'}>{row.value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function ActiveWipe({ run, canCancel, onCancel }: { run: RustWipeRun; canCancel: boolean; onCancel: () => void }) {
    const [now, setNow] = useState(() => Date.now() / 1000);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now() / 1000), 1000);

        return () => window.clearInterval(timer);
    }, []);

    const left = run.scheduledFor - now;
    const step = STEPS.findIndex((entry) => entry.status === run.status);

    return (
        <section className={'space-y-4 rounded-2xl bg-card p-4 ring-1 ring-line-field'}>
            <div className={'flex flex-wrap items-start justify-between gap-3'}>
                <div className={'min-w-0'}>
                    <div className={'flex flex-wrap items-center gap-2'}>
                        <p className={'truncate text-sm font-semibold text-ink'}>{run.name}</p>
                        <Badge tone={STATUS[run.status].tone} className={'rounded-md'}>
                            {STATUS[run.status].label}
                        </Badge>
                        <Badge className={'rounded-md'}>{TYPE_LABEL[run.type]}</Badge>
                    </div>
                    <p className={'mt-1 text-xs text-ink-faint'}>
                        {run.status === 'pending'
                            ? left > 0
                                ? `Wipes at ${when(run.scheduledFor)}.`
                                : 'Starting within a minute.'
                            : 'The server is being wiped. This page follows along.'}
                    </p>
                </div>

                <div className={'flex items-center gap-3'}>
                    {run.status === 'pending' && left > 0 && (
                        <span className={'text-2xl font-semibold tabular-nums tracking-tight text-ink'}>
                            {countdown(left)}
                        </span>
                    )}
                    {canCancel && run.status === 'pending' && (
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            loading={busy}
                            onClick={() => {
                                setBusy(true);
                                Promise.resolve(onCancel()).finally(() => setBusy(false));
                            }}
                        >
                            Call it off
                        </Button>
                    )}
                </div>
            </div>

            <ol className={'grid grid-cols-2 gap-2 sm:grid-cols-4'}>
                {STEPS.map((entry, i) => (
                    <li
                        key={entry.status}
                        className={cn(
                            'rounded-xl px-3 py-2 text-xs',
                            i < step
                                ? 'bg-overlay/60 text-ink-muted'
                                : i === step
                                ? 'bg-raised text-ink ring-1 ring-line-field'
                                : 'bg-overlay/30 text-ink-faint'
                        )}
                    >
                        <span className={'mr-1.5 tabular-nums text-ink-faint'}>{i + 1}</span>
                        {entry.label}
                        {entry.status === 'pending' && run.warnings.length > 0 && (
                            <span className={'block truncate text-[10px] text-ink-faint'}>
                                {run.warnings
                                    .map((m) => (run.warned.includes(m) ? `${minutes(m)} sent` : minutes(m)))
                                    .join(' · ')}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </section>
    );
}

function WipeCard({
    uuid,
    wipe,
    index,
    canManage,
    canStartup,
    onToggle,
    onDelete,
    onSaved,
}: {
    uuid: string;
    wipe: RustWipeSchedule;
    index: RustWipesIndex;
    canManage: boolean;
    canStartup: boolean;
    onToggle: () => void;
    onDelete: () => void;
    onSaved: () => Promise<void>;
}) {
    const [editing, setEditing] = useState(false);

    const world = [
        wipe.seedMode === 'random'
            ? 'new random seed'
            : wipe.seedMode === 'list'
            ? `seed from a list of ${wipe.seeds.length}`
            : null,
        wipe.worldSize ? `size ${wipe.worldSize}` : null,
        wipe.extraFiles.length > 0
            ? `${wipe.extraFiles.length} extra file${wipe.extraFiles.length === 1 ? '' : 's'}`
            : null,
        wipe.warnings.length > 0 ? `warns at ${wipe.warnings.map(minutes).join(', ')}` : 'no warnings',
    ].filter(Boolean);

    return (
        <div className={'rounded-2xl bg-card p-4'}>
            <div className={'flex flex-wrap items-center justify-between gap-3'}>
                <div className={'min-w-0'}>
                    <div className={'flex flex-wrap items-center gap-2'}>
                        <p className={cn('truncate text-sm font-medium', wipe.enabled ? 'text-ink' : 'text-ink-faint')}>
                            {wipe.name}
                        </p>
                        <span className={'inline-flex overflow-hidden rounded-md'}>
                            <Badge className={'rounded-none'}>{TYPE_LABEL[wipe.type]}</Badge>
                            {!wipe.enabled && (
                                <Badge tone={'warning'} className={'rounded-none'}>
                                    Paused
                                </Badge>
                            )}
                        </span>
                    </div>
                    <p className={'mt-1 truncate text-xs text-ink-muted'} title={wipe.timezone}>
                        {describeWipe(wipe)} <span className={'text-ink-faint'}>({wipe.timezone})</span>
                    </p>
                    <p className={'mt-0.5 truncate text-xs text-ink-faint'}>
                        {wipe.enabled && wipe.nextRunAt ? (
                            <span title={when(wipe.nextRunAt)}>
                                Next {formatRelative(new Date(wipe.nextRunAt * 1000))}
                            </span>
                        ) : wipe.enabled ? (
                            'Already done'
                        ) : (
                            'Not running'
                        )}
                        {' · '}
                        {world.join(' · ')}
                    </p>
                </div>

                {canManage && (
                    <div className={'flex shrink-0 items-center gap-1.5'}>
                        <Toggle
                            checked={wipe.enabled}
                            onChange={onToggle}
                            label={wipe.enabled ? `Pause ${wipe.name}` : `Turn on ${wipe.name}`}
                            className={'mr-1.5'}
                        />
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            onClick={() => setEditing((value) => !value)}
                            icon={<Pencil className={'h-3.5 w-3.5'} />}
                        >
                            {editing ? 'Cancel' : 'Edit'}
                        </Button>
                        <Button
                            size={'sm'}
                            variant={'danger'}
                            onClick={onDelete}
                            icon={<Trash2 className={'h-3.5 w-3.5'} />}
                        >
                            Delete
                        </Button>
                    </div>
                )}
            </div>

            {editing && (
                <div className={'mt-4'}>
                    <WipeForm
                        uuid={uuid}
                        index={index}
                        wipe={wipe}
                        canStartup={canStartup}
                        onSaved={async () => {
                            setEditing(false);
                            await onSaved();
                        }}
                        onCancel={() => setEditing(false)}
                    />
                </div>
            )}
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
    return (
        <div className={'space-y-2'}>
            <Label>{label}</Label>
            {children}
            {hint && <p className={'text-xs text-ink-faint'}>{hint}</p>}
        </div>
    );
}

function WipeForm({
    uuid,
    index,
    wipe,
    canStartup,
    onSaved,
    onCancel,
}: {
    uuid: string;
    index: RustWipesIndex;
    wipe?: RustWipeSchedule;
    canStartup: boolean;
    onSaved: () => Promise<void>;
    onCancel: () => void;
}) {
    const { toast } = useToast();
    const [form, setForm] = useState<RustWipeSettings>(() => {
        if (!wipe) return blank();
        const { id: _id, nextRunAt: _next, lastRunAt: _last, ...settings } = wipe;

        return { ...blank(), ...settings, startsOn: settings.startsOn ?? today(), weekday: settings.weekday ?? 4 };
    });
    const [seedText, setSeedText] = useState(form.seeds.join(', '));
    const [filesText, setFilesText] = useState(form.extraFiles.join('\n'));
    const [preset, setPreset] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const timezones = useMemo(() => {
        const list = zones();

        return (list.includes(form.timezone) ? list : [form.timezone, ...list]).map((zone) => ({
            value: zone,
            label: zone.replace(/_/g, ' '),
        }));
    }, []);

    const set = <K extends keyof RustWipeSettings>(key: K, value: RustWipeSettings[K]) =>
        setForm((current) => ({ ...current, [key]: value }));

    const worldLocked = index.world.customMap || !index.world.seedEditable || !canStartup;
    const sizeLocked = index.world.customMap || !index.world.sizeEditable || !canStartup;

    const applyPreset = (id: string, values: Partial<RustWipeSettings>) => {
        setPreset(id);
        setForm((current) => ({
            ...current,
            ...values,
            seedMode: worldLocked ? 'keep' : values.seedMode ?? current.seedMode,
        }));
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);

        const payload: RustWipeSettings = {
            ...form,
            name: form.name.trim(),
            seeds: seedText
                .split(/[\s,]+/)
                .map((seed) => seed.trim())
                .filter(Boolean),
            extraFiles: filesText
                .split('\n')
                .map((path) => path.trim())
                .filter(Boolean),
            weekday: form.frequency === 'weekly' || form.frequency === 'monthly' ? form.weekday : null,
            startsOn: form.frequency === 'once' || form.frequency === 'biweekly' ? form.startsOn : null,
        };

        try {
            if (wipe) {
                await updateRustWipe(uuid, wipe.id, payload);
            } else {
                await createRustWipe(uuid, payload);
            }
            toast(wipe ? 'Schedule saved.' : `${payload.name} scheduled.`, { tone: 'success' });
            await onSaved();
        } catch (error) {
            toast(apiMessage(error, 'The schedule could not be saved.'), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const usesDay = form.frequency === 'weekly' || form.frequency === 'monthly';

    return (
        <form onSubmit={submit} className={'space-y-5 rounded-2xl bg-card p-4'}>
            {!wipe && (
                <div className={'flex flex-wrap gap-2'}>
                    {PRESETS.map((entry) => (
                        <button
                            key={entry.id}
                            type={'button'}
                            aria-pressed={preset === entry.id}
                            onClick={() => applyPreset(entry.id, entry.apply)}
                            className={cn(
                                'rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                                preset === entry.id
                                    ? 'bg-accent/15 text-ink'
                                    : 'bg-overlay/60 text-ink-muted hover:text-ink'
                            )}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>
            )}

            <Input
                required
                maxLength={64}
                value={form.name}
                onChange={(event) => set('name', event.target.value)}
                label={'Name'}
                placeholder={'Weekly wipe'}
            />

            <Field label={'What to wipe'}>
                <div className={'grid gap-2 sm:grid-cols-3'}>
                    {TYPES.map((type) => {
                        const counted =
                            type.value === 'map'
                                ? [index.buckets.map]
                                : type.value === 'blueprints'
                                ? [index.buckets.map, index.buckets.blueprints]
                                : [index.buckets.map, index.buckets.blueprints, index.buckets.players];
                        const total = counted.reduce((sum, bucket) => sum + bucket.files, 0);

                        return (
                            <button
                                key={type.value}
                                type={'button'}
                                aria-pressed={form.type === type.value}
                                onClick={() => set('type', type.value)}
                                className={cn(
                                    'flex flex-col items-start justify-start rounded-xl p-3 text-left transition-colors',
                                    form.type === type.value ? 'bg-accent/15' : 'bg-overlay/40 hover:bg-overlay/70'
                                )}
                            >
                                <span className={'block text-sm font-medium text-ink'}>{type.label}</span>
                                <span className={'mt-0.5 block text-xs text-ink-faint'}>{type.detail}</span>
                                {index.readable && (
                                    <span className={'mt-auto block pt-2 text-[10px] tabular-nums text-ink-faint'}>
                                        {total === 0
                                            ? 'Nothing to delete yet'
                                            : `${total} file${total === 1 ? '' : 's'} now`}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </Field>

            <Field label={'When'} hint={`${describeWipe(form)}, ${form.timezone.replace(/_/g, ' ')} time.`}>
                <div className={'grid gap-2 sm:grid-cols-2 lg:grid-cols-4'}>
                    <Select
                        value={form.frequency}
                        onChange={(value) => set('frequency', value as RustWipeFrequency)}
                        options={FREQUENCIES}
                    />
                    {usesDay ? (
                        <Select
                            value={String(form.weekday ?? 4)}
                            onChange={(value) => set('weekday', Number(value))}
                            options={DAYS.map((day, i) => ({
                                value: String(i),
                                label: form.frequency === 'monthly' ? `First ${day}` : day,
                            }))}
                        />
                    ) : (
                        <Input
                            type={'date'}
                            required
                            aria-label={form.frequency === 'once' ? 'Date' : 'First wipe'}
                            value={form.startsOn ?? ''}
                            onChange={(event) => set('startsOn', event.target.value)}
                        />
                    )}
                    <Input
                        type={'time'}
                        required
                        aria-label={'Time'}
                        value={form.time}
                        onChange={(event) => set('time', event.target.value)}
                    />
                    <Select value={form.timezone} onChange={(value) => set('timezone', value)} options={timezones} />
                </div>
            </Field>

            <Field
                label={'Warn players'}
                hint={
                    <>
                        Sent with <span className={'font-mono'}>say</span>.{' '}
                        <span className={'font-mono'}>{'{time}'}</span> becomes the time left, such as &ldquo;5
                        minutes&rdquo;.
                    </>
                }
            >
                <div className={'flex flex-wrap items-center gap-2'}>
                    {index.limits.warnings.map((step) => {
                        const on = form.warnings.includes(step);

                        return (
                            <button
                                key={step}
                                type={'button'}
                                aria-pressed={on}
                                onClick={() =>
                                    set(
                                        'warnings',
                                        on ? form.warnings.filter((value) => value !== step) : [...form.warnings, step]
                                    )
                                }
                                className={cn(
                                    'rounded-xl px-3 py-1.5 text-xs font-medium tabular-nums transition-colors',
                                    on ? 'bg-accent/15 text-ink' : 'bg-overlay/60 text-ink-muted hover:text-ink'
                                )}
                            >
                                {step === 60 ? '1 hour' : `${step} min`}
                            </button>
                        );
                    })}
                </div>
                <Input
                    maxLength={120}
                    value={form.message}
                    onChange={(event) => set('message', event.target.value)}
                    placeholder={index.defaultMessage}
                    aria-label={'Warning message'}
                />
            </Field>

            <Field
                label={'New world'}
                hint={
                    index.world.customMap
                        ? 'This server loads a custom map from MAP_URL, so the seed and size are not used.'
                        : !index.world.seedEditable
                        ? "This server's egg does not let the seed be changed."
                        : !canStartup
                        ? 'Changing the seed or size needs the startup permission.'
                        : form.seedMode === 'list'
                        ? 'Each wipe takes the seed after the one in use, and goes round when the list runs out.'
                        : `Currently seed ${index.world.seed || 'random'}, size ${index.world.size ?? '-'}.`
                }
            >
                <div className={'flex flex-wrap items-center gap-3'}>
                    <Segmented<RustSeedMode>
                        tall
                        label={'Seed'}
                        value={form.seedMode}
                        onChange={(value) => !worldLocked && set('seedMode', value)}
                        options={[
                            { value: 'keep', label: 'Keep seed' },
                            { value: 'random', label: 'Random seed' },
                            { value: 'list', label: 'From a list' },
                        ]}
                        className={cn(worldLocked && 'pointer-events-none opacity-50')}
                    />
                    <div className={'w-full sm:w-40'}>
                        <Input
                            type={'number'}
                            min={index.limits.minSize}
                            max={index.limits.maxSize}
                            step={1}
                            disabled={sizeLocked}
                            value={form.worldSize ?? ''}
                            onChange={(event) =>
                                set('worldSize', event.target.value === '' ? null : Number(event.target.value))
                            }
                            placeholder={`Size: ${index.world.size ?? 'keep'}`}
                            aria-label={'World size'}
                        />
                    </div>
                </div>
                {form.seedMode === 'list' && (
                    <Input
                        value={seedText}
                        disabled={worldLocked}
                        onChange={(event) => setSeedText(event.target.value)}
                        placeholder={'1234567, 7654321, 1337420'}
                        aria-label={'Seeds'}
                    />
                )}
            </Field>

            <Field
                label={'Also delete'}
                hint={
                    'Plugin data to reset, one path per line from the server root. Folders work too. Paths that do not exist are skipped.'
                }
            >
                <textarea
                    rows={3}
                    value={filesText}
                    onChange={(event) => setFilesText(event.target.value)}
                    placeholder={'oxide/data/Kits_Data.json\noxide/data/Backpacks'}
                    aria-label={'Extra files to delete'}
                    className={cn(FIELD, 'resize-y font-mono text-xs')}
                />
            </Field>

            <div className={'flex flex-wrap gap-4'}>
                <Checkbox
                    checked={form.startAfter}
                    onChange={(event) => set('startAfter', event.target.checked)}
                    label={'Start the server again afterwards, if it was running'}
                />
                <Checkbox
                    checked={form.enabled}
                    onChange={(event) => set('enabled', event.target.checked)}
                    label={'Enabled'}
                />
            </div>

            <div className={'flex justify-end gap-2'}>
                <Button type={'button'} size={'sm'} variant={'ghost'} onClick={onCancel}>
                    Cancel
                </Button>
                <Button type={'submit'} size={'sm'} loading={busy} disabled={form.name.trim() === ''}>
                    {wipe ? 'Save changes' : 'Create schedule'}
                </Button>
            </div>
        </form>
    );
}

function RunHistory({ runs }: { runs: RustWipeRun[] }) {
    const [open, setOpen] = useState<number | null>(null);

    return (
        <div className={'space-y-3'}>
            <SectionHeader title={'History'} description={'The last wipes on this server, newest first.'} />

            {runs.length === 0 ? (
                <SectionEmpty icon={History} title={'No wipes yet'} body={'Each wipe is listed here once it starts.'} />
            ) : (
                <div className={'space-y-0.5 rounded-2xl bg-card p-2'}>
                    {runs.map((run) => {
                        const expanded = open === run.id;
                        const at = run.finishedAt ?? run.startedAt ?? run.scheduledFor;

                        return (
                            <div key={run.id} className={'rounded-xl'}>
                                <button
                                    type={'button'}
                                    onClick={() => setOpen(expanded ? null : run.id)}
                                    aria-expanded={expanded}
                                    className={
                                        'flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-raised/60'
                                    }
                                >
                                    <span className={'min-w-0 flex-1'}>
                                        <span className={'flex items-center gap-2'}>
                                            <span className={'truncate text-sm font-medium text-ink'}>{run.name}</span>
                                            <Badge tone={STATUS[run.status].tone} className={'shrink-0 rounded-md'}>
                                                {STATUS[run.status].label}
                                            </Badge>
                                        </span>
                                        <span className={'block truncate text-[11px] text-ink-faint'}>
                                            {TYPE_LABEL[run.type]} · {when(at)}
                                            {run.seed && ` · seed ${run.seed}`}
                                            {run.deleted.length > 0 &&
                                                ` · ${run.deleted.length} file${run.deleted.length === 1 ? '' : 's'}`}
                                        </span>
                                    </span>
                                    <span className={'hidden text-xs text-ink-faint sm:block'}>
                                        {formatRelative(new Date(at * 1000))}
                                    </span>
                                </button>

                                {expanded && (
                                    <div className={'space-y-2 px-2 pb-3 pt-1 text-xs'}>
                                        {run.error && (
                                            <p className={run.status === 'failed' ? 'text-danger' : 'text-ink-muted'}>
                                                {run.error}
                                            </p>
                                        )}
                                        {run.deleted.length > 0 ? (
                                            <ul className={'space-y-0.5 font-mono text-[11px] text-ink-muted'}>
                                                {run.deleted.map((path) => (
                                                    <li key={path} className={'truncate'}>
                                                        {path}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            !run.error && <p className={'text-ink-faint'}>Nothing was deleted.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function WipeNowDialog({
    open,
    onClose,
    uuid,
    index,
    canSeed,
    onStarted,
}: {
    open: boolean;
    onClose: () => void;
    uuid: string;
    index: RustWipesIndex;
    canSeed: boolean;
    onStarted: () => Promise<void>;
}) {
    const { toast } = useToast();
    const [type, setType] = useState<RustWipeType>('map');
    const [delay, setDelay] = useState('5');
    const [newSeed, setNewSeed] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setType('map');
            setDelay(index.state === 'running' ? '5' : '0');
            setNewSeed(canSeed);
        }
    }, [open]);

    const submit = async () => {
        setBusy(true);
        try {
            await runRustWipe(uuid, { type, delay: Number(delay), seedMode: canSeed && newSeed ? 'random' : 'keep' });
            await onStarted();
            onClose();
            toast(delay === '0' ? 'Wiping within a minute.' : 'Wipe scheduled. Players are being warned.', {
                tone: 'success',
            });
        } catch (error) {
            toast(apiMessage(error, 'The wipe could not be started.'), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <DialogShell
            open={open}
            onClose={onClose}
            width={'md'}
            title={'Wipe now'}
            body={'The server is stopped, its save files are deleted and it is started again. This cannot be undone.'}
        >
            <div className={'mt-5 space-y-4'}>
                <Field label={'What to wipe'}>
                    <Segmented<RustWipeType>
                        label={'What to wipe'}
                        value={type}
                        onChange={setType}
                        options={TYPES.map((entry) => ({ value: entry.value, label: entry.label }))}
                    />
                    <p className={'text-xs text-ink-faint'}>{TYPES.find((entry) => entry.value === type)?.detail}</p>
                </Field>

                <Field label={'When'}>
                    <Select value={delay} onChange={setDelay} options={DELAYS} />
                </Field>

                {canSeed && (
                    <Checkbox
                        checked={newSeed}
                        onChange={(event) => setNewSeed(event.target.checked)}
                        label={'Generate a new map with a random seed'}
                    />
                )}
            </div>

            <DialogFooter>
                <Button variant={'secondary'} onClick={onClose} disabled={busy}>
                    Cancel
                </Button>
                <Button variant={'danger'} loading={busy} onClick={() => void submit()}>
                    Wipe
                </Button>
            </DialogFooter>
        </DialogShell>
    );
}
