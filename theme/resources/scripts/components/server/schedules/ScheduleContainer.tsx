import React, { FormEvent, Suspense, lazy, useEffect, useState } from 'react';
import { CalendarClock, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { usePermissions } from '@/plugins/usePermissions';
import getServerSchedules, { Schedule, Task } from '@/api/server/schedules/getServerSchedules';
import createOrUpdateSchedule from '@/api/server/schedules/createOrUpdateSchedule';
import deleteSchedule from '@/api/server/schedules/deleteSchedule';
import triggerScheduleExecution from '@/api/server/schedules/triggerScheduleExecution';
import createOrUpdateScheduleTask from '@/api/server/schedules/createOrUpdateScheduleTask';
import deleteScheduleTask from '@/api/server/schedules/deleteScheduleTask';
import { Badge, Button, Checkbox, Input, Select, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { cn } from '@/dezerx/lib/cn';
import { describeCron } from '@/dezerx/lib/cron';
import { formatRelative } from '@/dezerx/lib/format';
import { loadAdvanced, saveAdvanced } from '@/dezerx/lib/scheduleLayout';
import { useT } from '@/i18n';

const ScheduleCanvas = lazy(() => import('@/dezerx/components/schedules/ScheduleCanvas'));

const BLANK = {
    minute: '0',
    hour: '*/6',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
};

const ACTION_KEY: Record<string, string> = {
    command: 'schedules.actionCommand',
    power: 'schedules.actionPower',
    backup: 'schedules.actionBackup',
};

interface SchedulePreset {
    id: string;
    labelKey: string;
    cron: typeof BLANK;
    task: { action: string; payload: string; timeOffset: number; continueOnFailure: boolean };
}

const PRESETS: SchedulePreset[] = [
    {
        id: 'nightly-restart',
        labelKey: 'schedules.presetNightlyRestart',
        cron: { minute: '0', hour: '0', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
        task: { action: 'power', payload: 'restart', timeOffset: 0, continueOnFailure: false },
    },
    {
        id: 'six-hourly-restart',
        labelKey: 'schedules.presetSixHourlyRestart',
        cron: { minute: '0', hour: '*/6', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
        task: { action: 'power', payload: 'restart', timeOffset: 0, continueOnFailure: false },
    },
    {
        id: 'daily-backup',
        labelKey: 'schedules.presetDailyBackup',
        cron: { minute: '0', hour: '3', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
        task: { action: 'backup', payload: '', timeOffset: 0, continueOnFailure: false },
    },
    {
        id: 'weekly-backup',
        labelKey: 'schedules.presetWeeklyBackup',
        cron: { minute: '0', hour: '4', dayOfMonth: '*', month: '*', dayOfWeek: '0' },
        task: { action: 'backup', payload: '', timeOffset: 0, continueOnFailure: false },
    },
];

const ScheduleContainer = () => {
    const t = useT();
    const { toast } = useToast();
    const { scheduleId: editId } = useParams<{ scheduleId?: string }>();

    const history = useHistory();
    const { pathname } = useLocation();

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const schedules = ServerContext.useStoreState((state) => state.schedules.data);
    const setSchedules = ServerContext.useStoreActions((actions) => actions.schedules.setSchedules);
    const appendSchedule = ServerContext.useStoreActions((actions) => actions.schedules.appendSchedule);
    const removeSchedule = ServerContext.useStoreActions((actions) => actions.schedules.removeSchedule);

    const [canCreate, canUpdate, canDelete] = usePermissions(['schedule.create', 'schedule.update', 'schedule.delete']);

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [advanced, setAdvanced] = useState(loadAdvanced);

    useEffect(() => saveAdvanced(advanced), [advanced]);

    const showCanvas = advanced && !editId;

    const selectView = (mode: boolean) => {
        setAdvanced(mode);

        if (mode && editId) {
            const trimmed = pathname.replace(/\/+$/, '');

            history.replace(trimmed.slice(0, trimmed.length - editId.length - 1));
        }
    };

    useEffect(() => {
        getServerSchedules(uuid)
            .then((schedules) => setSchedules(schedules))
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('schedules.loadFailed')), { tone: 'error' });
            })
            .then(() => setLoading(false));
    }, []);

    const applyTasks = (schedule: Schedule, tasks: Task[]) => appendSchedule({ ...schedule, tasks });

    const remove = (schedule: Schedule) =>
        setDialog({
            title: t('schedules.deleteTitle', { name: schedule.name }),
            body: t('schedules.deleteBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteSchedule(uuid, schedule.id);

                    removeSchedule(schedule.id);
                    toast(t('schedules.deleted', { name: schedule.name }), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('schedules.deleteFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    const run = async (schedule: Schedule) => {
        try {
            await triggerScheduleExecution(uuid, schedule.id);
            toast(t('schedules.queued', { name: schedule.name }), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('schedules.runFailed')), { tone: 'error' });
        }
    };

    return (
        <ServerContentBlock title={t('schedules.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            {loading && schedules.length === 0 ? (
                <SectionSkeleton label={t('schedules.loading')} />
            ) : (
                <div className={'space-y-4'}>
                    <SectionHeader
                        title={t('schedules.title')}
                        description={t('schedules.description')}
                        action={
                            <div className={'flex items-center gap-2'}>
                                <div
                                    role={'tablist'}
                                    aria-label={t('schedules.viewLabel')}
                                    className={'flex items-center gap-1 rounded-2xl bg-card p-1'}
                                >
                                    {[false, true].map((mode) => (
                                        <button
                                            key={String(mode)}
                                            type={'button'}
                                            role={'tab'}
                                            aria-selected={advanced === mode}
                                            onClick={() => selectView(mode)}
                                            className={cn(
                                                'rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                                                advanced === mode
                                                    ? 'bg-overlay text-ink'
                                                    : 'text-ink-muted hover:text-ink'
                                            )}
                                        >
                                            {t(mode ? 'schedules.viewMap' : 'schedules.viewList')}
                                        </button>
                                    ))}
                                </div>

                                {canCreate && (
                                    <Button
                                        size={'sm'}
                                        variant={creating ? 'secondary' : 'primary'}
                                        onClick={() => setCreating((value) => !value)}
                                        icon={<Plus className={'h-3.5 w-3.5'} />}
                                    >
                                        {t(creating ? 'common.cancel' : 'schedules.newSchedule')}
                                    </Button>
                                )}
                            </div>
                        }
                    />

                    {creating && (
                        <ScheduleForm
                            uuid={uuid}
                            onSaved={(schedule) => {
                                appendSchedule(schedule);
                                setCreating(false);
                            }}
                        />
                    )}

                    {schedules.length === 0 ? (
                        <SectionEmpty
                            icon={CalendarClock}
                            title={t('schedules.emptyTitle')}
                            body={t('schedules.emptyBody')}
                        />
                    ) : showCanvas ? (
                        <Suspense fallback={<SectionSkeleton label={t('schedules.loadingMap')} rows={2} />}>
                            <ScheduleCanvas
                                uuid={uuid}
                                schedules={schedules}
                                canUpdate={canUpdate}
                                canDelete={canDelete}
                                onTasks={(scheduleId, tasks) => {
                                    const schedule = schedules.find((candidate) => candidate.id === scheduleId);

                                    if (schedule) {
                                        applyTasks(schedule, tasks);
                                    }
                                }}
                                onRun={(schedule) => void run(schedule)}
                                onDelete={remove}
                            />
                        </Suspense>
                    ) : (
                        <div className={'space-y-3'}>
                            {schedules.map((schedule) => (
                                <ScheduleCard
                                    key={schedule.id}
                                    uuid={uuid}
                                    schedule={schedule}
                                    defaultEditing={editId === String(schedule.id)}
                                    canUpdate={canUpdate}
                                    canDelete={canDelete}
                                    onSaved={appendSchedule}
                                    onTasks={(tasks) => applyTasks(schedule, tasks)}
                                    onRun={() => void run(schedule)}
                                    onDelete={() => remove(schedule)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </ServerContentBlock>
    );
};

function ScheduleForm({
    uuid,
    schedule,
    onSaved,
    onCancel,
}: {
    uuid: string;
    schedule?: Schedule;
    onSaved: (schedule: Schedule) => void;
    onCancel?: () => void;
}) {
    const t = useT();
    const { toast } = useToast();

    const [name, setName] = useState(schedule?.name ?? '');
    const [cron, setCron] = useState(schedule?.cron ?? BLANK);
    const [isActive, setActive] = useState(schedule?.isActive ?? true);
    const [onlyWhenOnline, setOnlyWhenOnline] = useState(schedule?.onlyWhenOnline ?? false);
    const [preset, setPreset] = useState<SchedulePreset | null>(null);
    const [busy, setBusy] = useState(false);

    const applyPreset = (entry: SchedulePreset) => {
        if (preset?.id === entry.id) {
            setPreset(null);

            return;
        }

        setPreset(entry);
        setName(t(entry.labelKey));
        setCron(entry.cron);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);

        createOrUpdateSchedule(uuid, { id: schedule?.id, name, cron, isActive, onlyWhenOnline })
            .then(async (saved) => {
                if (preset === null) {
                    return saved;
                }

                try {
                    const task = await createOrUpdateScheduleTask(uuid, saved.id, undefined, preset.task);

                    return { ...saved, tasks: [...saved.tasks, task] };
                } catch (error) {
                    console.error(error);
                    toast(apiMessage(error, t('schedules.presetTaskFailed')), { tone: 'error' });

                    return saved;
                }
            })
            .then((saved) => {
                toast(schedule ? t('common.success') : t('schedules.created', { name }), { tone: 'success' });
                onSaved(saved);
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, schedule ? t('common.error') : t('schedules.createFailed')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    const fields: { key: keyof typeof BLANK; label: string }[] = [
        { key: 'minute', label: t('schedules.cron.minute') },
        { key: 'hour', label: t('schedules.cron.hour') },
        { key: 'dayOfMonth', label: t('schedules.cron.dayOfMonth') },
        { key: 'month', label: t('schedules.cron.month') },
        { key: 'dayOfWeek', label: t('schedules.cron.dayOfWeek') },
    ];

    return (
        <form onSubmit={submit} className={'space-y-4 rounded-2xl bg-card p-4'}>
            {!schedule && (
                <div>
                    <p className={'text-xs font-medium text-ink-muted'}>{t('schedules.presetsLabel')}</p>

                    <div className={'mt-2 flex flex-wrap gap-2'}>
                        {PRESETS.map((entry) => (
                            <button
                                key={entry.id}
                                type={'button'}
                                aria-pressed={preset?.id === entry.id}
                                onClick={() => applyPreset(entry)}
                                className={cn(
                                    'rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                                    preset?.id === entry.id
                                        ? 'bg-accent/15 text-ink ring-1 ring-accent/40'
                                        : 'bg-overlay/60 text-ink-muted hover:text-ink'
                                )}
                            >
                                {t(entry.labelKey)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <Input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                label={t('common.name')}
                placeholder={t('schedules.namePlaceholder')}
            />

            <div>
                <div className={'grid grid-cols-2 gap-2 sm:grid-cols-5'}>
                    {fields.map((field) => (
                        <Input
                            key={field.key}
                            value={cron[field.key]}
                            onChange={(event) => setCron({ ...cron, [field.key]: event.target.value })}
                            label={field.label}
                        />
                    ))}
                </div>
                <p className={'mt-2 text-xs text-ink-faint'}>{describeCron(cron)}</p>
            </div>

            <div className={'flex flex-wrap gap-4'}>
                <Checkbox
                    checked={isActive}
                    onChange={(event) => setActive(event.target.checked)}
                    label={t('schedules.enabled')}
                />
                <Checkbox
                    checked={onlyWhenOnline}
                    onChange={(event) => setOnlyWhenOnline(event.target.checked)}
                    label={t('schedules.onlyWhenOnline')}
                />
            </div>

            <div className={'flex justify-end gap-2'}>
                {onCancel && (
                    <Button type={'button'} size={'sm'} variant={'ghost'} onClick={onCancel}>
                        {t('common.cancel')}
                    </Button>
                )}
                <Button type={'submit'} size={'sm'} variant={'primary'} loading={busy} disabled={name.trim() === ''}>
                    {t(schedule ? 'scheduleEdit.saveChanges' : 'schedules.createSchedule')}
                </Button>
            </div>
        </form>
    );
}

function ScheduleCard({
    uuid,
    schedule,
    defaultEditing,
    canUpdate,
    canDelete,
    onSaved,
    onTasks,
    onRun,
    onDelete,
}: {
    uuid: string;
    schedule: Schedule;
    defaultEditing: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    onSaved: (schedule: Schedule) => void;
    onTasks: (tasks: Task[]) => void;
    onRun: () => void;
    onDelete: () => void;
}) {
    const t = useT();
    const { toast } = useToast();
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(defaultEditing && canUpdate);

    const removeTask = async (task: Task) => {
        try {
            await deleteScheduleTask(uuid, schedule.id, task.id);

            onTasks(schedule.tasks.filter((candidate) => candidate.id !== task.id));
            toast(t('schedules.taskRemoved'), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('schedules.taskRemoveFailed')), { tone: 'error' });
        }
    };

    return (
        <div className={'rounded-2xl bg-card p-4'}>
            <div className={'flex flex-wrap items-center justify-between gap-3'}>
                <div className={'min-w-0'}>
                    <div className={'flex flex-wrap items-center gap-2'}>
                        <p className={'truncate text-sm font-medium text-ink'}>{schedule.name}</p>

                        {schedule.isProcessing ? (
                            <Badge tone={'warning'}>{t('schedules.badgeRunning')}</Badge>
                        ) : schedule.isActive ? (
                            <Badge tone={'success'}>{t('schedules.enabled')}</Badge>
                        ) : (
                            <Badge>{t('schedules.badgePaused')}</Badge>
                        )}

                        {schedule.onlyWhenOnline && <Badge tone={'info'}>{t('schedules.badgeOnlineOnly')}</Badge>}
                    </div>

                    <p
                        className={'mt-1 truncate text-xs text-ink-faint'}
                        title={schedule.nextRunAt ? schedule.nextRunAt.toLocaleString() : undefined}
                    >
                        {describeCron(schedule.cron)}
                        {schedule.isActive &&
                            schedule.nextRunAt &&
                            ` · ${t('schedules.next', { when: formatRelative(schedule.nextRunAt) })}`}
                    </p>
                </div>

                <div className={'flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto'}>
                    {canUpdate && (
                        <Button size={'sm'} variant={'ghost'} onClick={onRun} icon={<Play className={'h-3.5 w-3.5'} />}>
                            {t('schedules.runNow')}
                        </Button>
                    )}

                    {canUpdate && (
                        <Button
                            size={'sm'}
                            variant={'ghost'}
                            onClick={() => setEditing((value) => !value)}
                            icon={<Pencil className={'h-3.5 w-3.5'} />}
                        >
                            {t(editing ? 'common.cancel' : 'common.edit')}
                        </Button>
                    )}

                    {canDelete && (
                        <Button
                            size={'sm'}
                            variant={'ghost'}
                            onClick={onDelete}
                            className={'text-danger hover:bg-danger/10 hover:text-danger'}
                            icon={<Trash2 className={'h-3.5 w-3.5'} />}
                        >
                            {t('common.delete')}
                        </Button>
                    )}
                </div>
            </div>

            {editing && (
                <div className={'mt-4'}>
                    <ScheduleForm
                        uuid={uuid}
                        schedule={schedule}
                        onSaved={(saved) => {
                            onSaved(saved);
                            setEditing(false);
                        }}
                        onCancel={() => setEditing(false)}
                    />
                </div>
            )}

            <div className={'mt-4 space-y-2'}>
                {schedule.tasks.length === 0 ? (
                    <p className={'text-xs text-ink-faint'}></p>
                ) : (
                    schedule.tasks.map((task) => (
                        <div
                            key={task.id}
                            className={
                                'flex items-center justify-between gap-3 rounded-xl border border-line bg-raised px-3 py-2'
                            }
                        >
                            <div className={'min-w-0'}>
                                <p className={'truncate text-xs font-medium text-ink'}>
                                    {ACTION_KEY[task.action] ? t(ACTION_KEY[task.action]!) : task.action}
                                    {task.payload && <span className={'ml-2 text-ink-muted'}>{task.payload}</span>}
                                </p>
                                <p className={'mt-0.5 text-[11px] text-ink-faint'}>
                                    {task.timeOffset === 0
                                        ? t('schedules.runsImmediately')
                                        : t('schedules.waits', { seconds: task.timeOffset })}
                                </p>
                            </div>

                            {canUpdate && (
                                <button
                                    type={'button'}
                                    onClick={() => void removeTask(task)}
                                    aria-label={t('schedules.removeTask')}
                                    className={
                                        'shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:bg-overlay hover:text-danger'
                                    }
                                >
                                    <Trash2 aria-hidden={'true'} className={'h-3.5 w-3.5'} />
                                </button>
                            )}
                        </div>
                    ))
                )}

                {canUpdate &&
                    (adding ? (
                        <TaskForm
                            uuid={uuid}
                            scheduleId={schedule.id}
                            onCreated={(task) => {
                                setAdding(false);
                                onTasks([...schedule.tasks, task]);
                            }}
                            onCancel={() => setAdding(false)}
                        />
                    ) : (
                        <Button
                            size={'sm'}
                            variant={'ghost'}
                            onClick={() => setAdding(true)}
                            icon={<Plus className={'h-3.5 w-3.5'} />}
                        >
                            {t('schedules.addTask')}
                        </Button>
                    ))}
            </div>
        </div>
    );
}

function TaskForm({
    uuid,
    scheduleId,
    onCreated,
    onCancel,
}: {
    uuid: string;
    scheduleId: number;
    onCreated: (task: Task) => void;
    onCancel: () => void;
}) {
    const t = useT();
    const { toast } = useToast();

    const [action, setAction] = useState('command');
    const [payload, setPayload] = useState('');
    const [offset, setOffset] = useState('0');
    const [busy, setBusy] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);

        createOrUpdateScheduleTask(uuid, scheduleId, undefined, {
            action,
            payload,
            timeOffset: Number(offset) || 0,
            continueOnFailure: false,
        })
            .then((task) => {
                toast(t('schedules.taskAdded'), { tone: 'success' });
                onCreated(task);
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('schedules.taskAddFailed')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    return (
        <form onSubmit={submit} className={'space-y-3 rounded-xl bg-raised p-3'}>
            <div className={'grid gap-2 sm:grid-cols-3'}>
                <Select
                    label={t('schedules.action')}
                    value={action}
                    onChange={(value) => {
                        setAction(value);
                        setPayload('');
                    }}
                    options={[
                        { label: t('schedules.actionCommand'), value: 'command' },
                        { label: t('schedules.actionPower'), value: 'power' },
                        { label: t('schedules.actionBackup'), value: 'backup' },
                    ]}
                />

                {action === 'power' ? (
                    <Select
                        label={t('schedules.signal')}
                        value={payload || 'restart'}
                        onChange={setPayload}
                        options={[
                            { label: t('power.start'), value: 'start' },
                            { label: t('power.stop'), value: 'stop' },
                            { label: t('power.restart'), value: 'restart' },
                            { label: t('power.kill'), value: 'kill' },
                        ]}
                    />
                ) : (
                    <Input
                        label={t(action === 'command' ? 'schedules.command' : 'schedules.filesToIgnore')}
                        value={payload}
                        onChange={(event) => setPayload(event.target.value)}
                        placeholder={action === 'command' ? t('schedules.commandPlaceholder') : t('common.optional')}
                    />
                )}

                <Input
                    type={'number'}
                    min={0}
                    max={900}
                    label={t('schedules.delay')}
                    value={offset}
                    onChange={(event) => setOffset(event.target.value)}
                />
            </div>

            <div className={'flex justify-end gap-2'}>
                <Button type={'button'} size={'sm'} variant={'ghost'} onClick={onCancel}>
                    {t('common.cancel')}
                </Button>
                <Button type={'submit'} size={'sm'} variant={'primary'} loading={busy}>
                    {t('schedules.addTask')}
                </Button>
            </div>
        </form>
    );
}

export default ScheduleContainer;
