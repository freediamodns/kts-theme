import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
    applyNodeChanges,
    Background,
    Handle,
    Position,
    Edge,
    Node,
    NodeChange,
    NodeProps,
} from 'react-flow-renderer';
import { CalendarClock, Play, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Schedule, Task } from '@/api/server/schedules/getServerSchedules';
import createOrUpdateScheduleTask from '@/api/server/schedules/createOrUpdateScheduleTask';
import deleteScheduleTask from '@/api/server/schedules/deleteScheduleTask';
import { Button, Checkbox, Input, Select, useToast } from '@/dezerx/components/ui';
import { apiMessage } from '@/dezerx/components/console/Section';
import { cn } from '@/dezerx/lib/cn';
import { describeCron } from '@/dezerx/lib/cron';
import { formatRelative } from '@/dezerx/lib/format';
import { clearLayout, Layout, loadLayout, saveLayout, withoutTask, withTask } from '@/dezerx/lib/scheduleLayout';
import { useT } from '@/i18n';

const TASK_LIMIT = 10;

const POWER_ACTIONS = ['start', 'stop', 'restart', 'kill'] as const;

const ACTION_KEY: Record<string, string> = {
    command: 'schedules.actionCommand',
    power: 'schedules.actionPower',
    backup: 'schedules.actionBackup',
};

const ROW = 154;

const COLUMN = 320;

type Selection = { kind: 'schedule'; scheduleId: number } | { kind: 'task'; scheduleId: number; taskId: number } | null;

interface TriggerData {
    name: string;
    cron: string;
    active: boolean;
    processing: boolean;
}

interface TaskData {
    task: Task;
    scheduleId: number;
    position: number;
}

function TriggerNode({ data, selected }: NodeProps<TriggerData>) {
    const t = useT();
    return (
        <div
            className={cn(
                'w-64 cursor-grab rounded-2xl bg-card px-4 py-3 ring-1 transition-shadow active:cursor-grabbing',
                selected ? 'ring-2 ring-accent' : 'ring-line-field'
            )}
        >
            <div className={'flex items-center gap-2'}>
                <CalendarClock aria-hidden={'true'} className={'h-4 w-4 shrink-0 text-accent'} />
                <span className={'truncate text-sm font-medium text-ink'}>{data.name}</span>
            </div>

            <p className={'mt-1 truncate text-[11px] text-ink-muted'}>{data.cron}</p>

            <p className={'mt-0.5 text-[11px] text-ink-faint'}>
                {t(
                    data.processing
                        ? 'schedules.badgeRunning'
                        : data.active
                        ? 'scheduleMap.active'
                        : 'schedules.badgePaused'
                )}
            </p>

            <Handle type={'source'} position={Position.Bottom} className={'!h-2 !w-2 !border-0 !bg-accent'} />
        </div>
    );
}

function TaskNode({ data, selected }: NodeProps<TaskData>) {
    const t = useT();
    const { task, position } = data;

    const summary =
        task.action === 'backup' ? t('scheduleMap.backupSummary') : task.payload || t('scheduleMap.nothingSet');

    return (
        <div
            className={cn(
                'w-64 cursor-grab rounded-2xl bg-card px-4 py-3 ring-1 transition-shadow active:cursor-grabbing',
                selected ? 'ring-2 ring-accent' : 'ring-line-field hover:ring-line'
            )}
        >
            <Handle type={'target'} position={Position.Top} className={'!h-2 !w-2 !border-0 !bg-accent'} />

            <div className={'flex items-center justify-between gap-2'}>
                <span className={'truncate text-sm font-medium text-ink'}>
                    {ACTION_KEY[task.action] ? t(ACTION_KEY[task.action]!) : task.action}
                </span>
                <span className={'shrink-0 tabular-nums text-[11px] text-ink-faint'}>{`#${position}`}</span>
            </div>

            <p className={'mt-1 truncate font-mono text-[11px] text-ink-muted'}>{summary}</p>

            {task.continueOnFailure && (
                <p className={'mt-0.5 text-[11px] text-warning'}>{t('scheduleMap.continuesOnFailure')}</p>
            )}

            <Handle type={'source'} position={Position.Bottom} className={'!h-2 !w-2 !border-0 !bg-accent'} />
        </div>
    );
}

const NODE_TYPES = { trigger: TriggerNode, task: TaskNode };

function sorted(schedule: Schedule): Task[] {
    return [...schedule.tasks].sort((a, b) => a.sequenceId - b.sequenceId);
}

export default function ScheduleCanvas({
    uuid,
    schedules,
    canUpdate,
    canDelete,
    onTasks,
    onRun,
    onDelete,
}: {
    uuid: string;
    schedules: Schedule[];
    canUpdate: boolean;
    canDelete: boolean;
    onTasks: (scheduleId: number, tasks: Task[]) => void;
    onRun: (schedule: Schedule) => void;
    onDelete: (schedule: Schedule) => void;
}) {
    const t = useT();
    const { toast } = useToast();

    const [selection, setSelection] = useState<Selection>(null);
    const [drafting, setDrafting] = useState(false);
    const [busy, setBusy] = useState(false);

    const layout = useRef<Layout>(loadLayout(uuid));

    const columns = useMemo(() => schedules.map((schedule) => ({ schedule, tasks: sorted(schedule) })), [schedules]);

    const build = useCallback((): Node[] => {
        const built: Node[] = [];

        columns.forEach(({ schedule, tasks }, column) => {
            const triggerId = `s${schedule.id}`;

            built.push({
                id: triggerId,
                type: 'trigger',
                position: layout.current[triggerId] ?? { x: column * COLUMN, y: 0 },
                data: {
                    name: schedule.name,
                    cron: describeCron(schedule.cron),
                    active: schedule.isActive,
                    processing: schedule.isProcessing,
                } as TriggerData,
            });

            tasks.forEach((task, index) => {
                const id = `t${schedule.id}-${task.id}`;

                built.push({
                    id,
                    type: 'task',
                    position: layout.current[id] ?? { x: column * COLUMN, y: (index + 1) * ROW },
                    data: { task, scheduleId: schedule.id, position: index + 1 } as TaskData,
                });
            });
        });

        return built;
    }, [columns]);

    const [nodes, setNodes] = useState<Node[]>(build);

    const shape = useMemo(
        () =>
            JSON.stringify(
                columns.map(({ schedule, tasks }) => [
                    schedule.id,
                    schedule.name,
                    schedule.isActive,
                    schedule.isProcessing,
                    schedule.cron,
                    tasks.map((task) => [
                        task.id,
                        task.sequenceId,
                        task.action,
                        task.payload,
                        task.timeOffset,
                        task.continueOnFailure,
                    ]),
                ])
            ),
        [columns]
    );

    useEffect(() => {
        setNodes(build());
    }, [shape]); 

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((current) => applyNodeChanges(changes, current)),
        []
    );

    const onNodeDragStop = useCallback(
        (_: unknown, node: Node) => {
            layout.current = { ...layout.current, [node.id]: { x: node.position.x, y: node.position.y } };

            saveLayout(uuid, layout.current);
        },
        [uuid]
    );

    const resetLayout = () => {
        layout.current = {};
        clearLayout(uuid);
        setNodes(build());
    };

    const edges = useMemo<Edge[]>(() => {
        const built: Edge[] = [];

        for (const { schedule, tasks } of columns) {
            let previous = `s${schedule.id}`;

            for (const task of tasks) {
                const id = `t${schedule.id}-${task.id}`;

                built.push({
                    id: `${previous}->${id}`,
                    source: previous,
                    target: id,
                    type: 'default',
                    animated: schedule.isActive,
                    label: task.timeOffset === 0 ? 'immediately' : `after ${task.timeOffset}s`,
                    style: { stroke: 'var(--accent)', strokeWidth: 1.5 },
                    labelStyle: { fontSize: 11 },
                    labelBgPadding: [6, 3],
                    labelBgBorderRadius: 6,
                });

                previous = id;
            }
        }

        return built;
    }, [columns]);

    const save = useCallback(
        async (work: () => Promise<unknown>, failure: string) => {
            setBusy(true);

            try {
                await work();
            } catch (error) {
                console.error(error);
                toast(apiMessage(error, failure), { tone: 'error' });
            } finally {
                setBusy(false);
            }
        },
        [toast]
    );

    const chosen =
        selection === null ? null : schedules.find((schedule) => schedule.id === selection.scheduleId) ?? null;

    const chosenTask =
        chosen && selection?.kind === 'task'
            ? sorted(chosen).find((task) => task.id === selection.taskId) ?? null
            : null;

    return (
        <div className={'grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]'}>
            <div className={'h-[34rem] overflow-hidden rounded-2xl bg-card/40 ring-1 ring-line-field'}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={NODE_TYPES}
                    onNodesChange={onNodesChange}
                    onNodeDragStop={onNodeDragStop}
                    onNodeClick={(_, node) => {
                        setDrafting(false);

                        if (node.type === 'trigger') {
                            setSelection({ kind: 'schedule', scheduleId: Number(node.id.slice(1)) });

                            return;
                        }

                        const { task, scheduleId } = node.data as TaskData;

                        setSelection({ kind: 'task', scheduleId, taskId: task.id });
                    }}
                    onPaneClick={() => {
                        setDrafting(false);
                        setSelection(null);
                    }}
                    nodesConnectable={false}
                    fitView
                    fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
                >
                    <Background gap={18} size={1} color={'rgb(from var(--line-rgb) r g b / 0.25)'} />
                </ReactFlow>
            </div>

            {drafting && chosen ? (
                <TaskEditor
                    uuid={uuid}
                    schedule={chosen}
                    task={null}
                    busy={busy}
                    onSave={save}
                    onTasks={onTasks}
                    onDone={() => setDrafting(false)}
                />
            ) : chosenTask && chosen ? (
                <TaskEditor
                    key={chosenTask.id}
                    uuid={uuid}
                    schedule={chosen}
                    task={chosenTask}
                    busy={busy}
                    canDelete={canUpdate}
                    onSave={save}
                    onTasks={onTasks}
                    onDone={() => setSelection(null)}
                />
            ) : chosen ? (
                <SchedulePanel
                    schedule={chosen}
                    busy={busy}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    atLimit={chosen.tasks.length >= TASK_LIMIT}
                    onDraft={() => setDrafting(true)}
                    onRun={() => onRun(chosen)}
                    onDelete={() => onDelete(chosen)}
                />
            ) : (
                <aside className={'space-y-3 rounded-2xl bg-card p-4 ring-1 ring-line-field'}>
                    <p className={'text-sm font-medium text-ink'}>{t('scheduleMap.title')}</p>
                    <p className={'text-xs text-ink-muted'}>{t('scheduleMap.help')}</p>

                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        onClick={resetLayout}
                        icon={<RotateCcw className={'h-3.5 w-3.5'} />}
                    >
                        {t('scheduleMap.reset')}
                    </Button>
                </aside>
            )}
        </div>
    );
}

function SchedulePanel({
    schedule,
    busy,
    canUpdate,
    canDelete,
    atLimit,
    onDraft,
    onRun,
    onDelete,
}: {
    schedule: Schedule;
    busy: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    atLimit: boolean;
    onDraft: () => void;
    onRun: () => void;
    onDelete: () => void;
}) {
    const t = useT();
    return (
        <aside className={'space-y-3 rounded-2xl bg-card p-4 ring-1 ring-line-field'}>
            <div>
                <p className={'truncate text-sm font-medium text-ink'}>{schedule.name}</p>
                <p className={'mt-1 text-xs text-ink-muted'}>{describeCron(schedule.cron)}</p>
                {schedule.isActive && schedule.nextRunAt && (
                    <p className={'mt-0.5 text-xs text-ink-faint'}>
                        {t('scheduleMap.next', { when: formatRelative(schedule.nextRunAt) })}
                    </p>
                )}
            </div>

            {canUpdate &&
                (atLimit ? (
                    <p className={'text-xs text-warning'}>{t('scheduleMap.taskLimit', { count: TASK_LIMIT })}</p>
                ) : (
                    <Button
                        size={'sm'}
                        variant={'secondary'}
                        disabled={busy}
                        onClick={onDraft}
                        icon={<Plus className={'h-3.5 w-3.5'} />}
                    >
                        {t('schedules.addTask')}
                    </Button>
                ))}

            <div className={'flex items-center gap-2 border-t border-line-field pt-3'}>
                {canUpdate && (
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        disabled={busy}
                        onClick={onRun}
                        icon={<Play className={'h-3.5 w-3.5'} />}
                    >
                        {t('schedules.runNow')}
                    </Button>
                )}

                {canDelete && (
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        disabled={busy}
                        onClick={onDelete}
                        className={'text-danger hover:bg-danger/10 hover:text-danger'}
                        icon={<Trash2 className={'h-3.5 w-3.5'} />}
                    >
                        {t('common.delete')}
                    </Button>
                )}
            </div>
        </aside>
    );
}

function TaskEditor({
    uuid,
    schedule,
    task,
    busy,
    canDelete = true,
    onSave,
    onTasks,
    onDone,
}: {
    uuid: string;
    schedule: Schedule;
    task: Task | null;
    busy: boolean;
    canDelete?: boolean;
    onSave: (work: () => Promise<unknown>, failure: string) => Promise<void>;
    onTasks: (scheduleId: number, tasks: Task[]) => void;
    onDone: () => void;
}) {
    const t = useT();
    const places = schedule.tasks.length + (task ? 0 : 1);

    const [action, setAction] = useState(task?.action ?? 'command');
    const [payload, setPayload] = useState(task?.payload ?? '');
    const [offset, setOffset] = useState(String(task?.timeOffset ?? 0));
    const [place, setPlace] = useState(String(task?.sequenceId ?? places));
    const [continueOnFailure, setContinueOnFailure] = useState(task?.continueOnFailure ?? false);

    const changeAction = (next: string) => {
        setAction(next);

        if (next === 'power' && POWER_ACTIONS.indexOf(payload as never) < 0) {
            setPayload('restart');
        }

        if (next === 'backup') {
            setPayload('');
        }
    };

    const incomplete = action !== 'backup' && payload.trim() === '';

    const submit = () =>
        void onSave(async () => {
            const saved = await createOrUpdateScheduleTask(uuid, schedule.id, task?.id, {
                action,
                payload,
                timeOffset: Number(offset) || 0,
                continueOnFailure,
                sequenceId: Math.min(Math.max(Number(place) || 1, 1), places),
            });

            onTasks(schedule.id, withTask(schedule.tasks, saved));
            onDone();
        }, t(task ? 'scheduleMap.taskSaveFailed' : 'schedules.taskAddFailed'));

    const remove = () =>
        void onSave(async () => {
            await deleteScheduleTask(uuid, schedule.id, task?.id ?? 0);

            onTasks(schedule.id, withoutTask(schedule.tasks, task?.id ?? 0));
            onDone();
        }, t('schedules.taskRemoveFailed'));

    return (
        <aside className={'space-y-3 rounded-2xl bg-card p-4 ring-1 ring-line-field'}>
            <div>
                <p className={'text-sm font-medium text-ink'}>
                    {t(task ? 'scheduleMap.editTask' : 'schedules.addTask')}
                </p>
                <p className={'mt-0.5 truncate text-xs text-ink-faint'}>{schedule.name}</p>
            </div>

            <Select
                label={t('schedules.action')}
                value={action}
                onChange={changeAction}
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
                    options={POWER_ACTIONS.map((value) => ({ value, label: t(`power.${value}`) }))}
                />
            ) : action === 'command' ? (
                <Input
                    label={t('schedules.command')}
                    value={payload}
                    onChange={(event) => setPayload(event.target.value)}
                    placeholder={t('schedules.commandPlaceholder')}
                />
            ) : null}

            <Input
                type={'number'}
                min={0}
                max={900}
                label={t('schedules.delay')}
                value={offset}
                onChange={(event) => setOffset(event.target.value)}
                hint={t('scheduleMap.delayHint')}
            />

            <Input
                type={'number'}
                min={1}
                max={places}
                label={t('scheduleMap.position')}
                value={place}
                onChange={(event) => setPlace(event.target.value)}
                hint={t('scheduleMap.positionHint')}
            />

            <Checkbox
                checked={continueOnFailure}
                onChange={(event) => setContinueOnFailure(event.target.checked)}
                label={t('scheduleMap.continueOnFailure')}
            />

            <div className={'flex items-center gap-2'}>
                <Button size={'sm'} variant={'primary'} disabled={busy || incomplete} onClick={submit}>
                    {t(task ? 'common.save' : 'common.create')}
                </Button>

                {task && canDelete ? (
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        disabled={busy}
                        onClick={remove}
                        className={'text-danger hover:bg-danger/10 hover:text-danger'}
                        icon={<Trash2 className={'h-3.5 w-3.5'} />}
                    >
                        {t('common.delete')}
                    </Button>
                ) : (
                    <Button size={'sm'} variant={'ghost'} disabled={busy} onClick={onDone}>
                        {t('common.cancel')}
                    </Button>
                )}
            </div>
        </aside>
    );
}
