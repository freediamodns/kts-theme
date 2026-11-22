import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
    Crown,
    Info,
    LucideIcon,
    Palette,
    Play,
    Power,
    RotateCcw,
    RotateCw,
    Save,
    Shield,
    Square,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { Badge, Button, HoverTip, Input, Select, Skeleton, Toggle, useToast } from '@/dezerx/components/ui';
import { apiMessage } from '@/dezerx/components/console/Section';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { CommandIcon } from '@/dezerx/components/discordbot/CommandList';
import PreviewPane from '@/dezerx/components/discordbot/PreviewPane';
import { cn } from '@/dezerx/lib/cn';
import {
    BotDesign,
    BotGuild,
    BotPreview,
    BotState,
    CommandSettings,
    POWER_ACTIONS,
    PowerAction,
    getBotRoles,
    previewBot,
    saveBotSettings,
} from '@/api/account/discordBot';
import { useT } from '@/i18n';

interface RoleOption {
    id: string;
    name: string;
    color: string | null;
    guild: string;
}

function Slider({
    value,
    min,
    max,
    onChange,
}: {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
}) {
    const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

    return (
        <div className={'relative mt-3 flex h-5 w-full items-center'}>
            <div className={'h-1.5 w-full rounded-full bg-overlay'} />
            <div className={'pointer-events-none absolute h-1.5 rounded-full bg-accent'} style={{ width: `${pct}%` }} />
            <div
                className={
                    'pointer-events-none absolute h-4 w-4 -translate-x-1/2 rounded-full bg-accent shadow-md ring-2 ring-card'
                }
                style={{ left: `${pct}%` }}
            />
            <input
                type={'range'}
                min={min}
                max={max}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className={'absolute inset-0 h-full w-full cursor-pointer opacity-0'}
            />
        </div>
    );
}

function RoleChip({
    role,
    id,
    onRemove,
    label,
}: {
    role?: RoleOption;
    id: string;
    onRemove: () => void;
    label: string;
}) {
    return (
        <span
            className={
                'dz-field inline-flex min-w-0 items-center gap-1.5 rounded-full py-0.5 pl-2 pr-1 text-xs text-ink'
            }
        >
            <span
                className={'h-2 w-2 shrink-0 rounded-full'}
                style={{ backgroundColor: role?.color ?? '#99aab5' }}
                aria-hidden={'true'}
            />
            <span className={'min-w-0 max-w-[7rem] truncate'}>{role ? role.name : id}</span>
            <button
                type={'button'}
                onClick={onRemove}
                aria-label={label}
                className={'shrink-0 rounded-full p-0.5 text-ink-faint hover:bg-overlay hover:text-ink'}
            >
                <X className={'h-3 w-3'} aria-hidden={'true'} />
            </button>
        </span>
    );
}

const MAX_USERS = 25;

const INLINE_ROLES = 2;

const POWER_ICONS: Record<PowerAction, LucideIcon> = {
    start: Play,
    restart: RotateCw,
    stop: Square,
    kill: Power,
};

function fromState(state: BotState): CommandSettings {
    const out: CommandSettings = {};

    state.commands.forEach((command) => {
        out[command.name] = {
            enabled: command.locked || command.stored,
            roles: command.roles,
            ...(command.actions ? { actions: command.actions } : {}),
        };
    });

    return out;
}

export default function Studio({ state, onChange }: { state: BotState; onChange: (state: BotState) => void }) {
    const t = useT();
    const { toast } = useToast();
    const initialDesign = state.bot!.design;
    const initialCommands = useMemo(() => fromState(state), [state]);
    const initialUsers = useMemo(() => state.bot!.users.map((user) => user.id), [state]);

    const [design, setDesign] = useState<BotDesign>(initialDesign);
    const [commands, setCommands] = useState<CommandSettings>(initialCommands);
    const [users, setUsers] = useState<string[]>(initialUsers);
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const [guilds, setGuilds] = useState<BotGuild[] | null>(null);
    const [rolesFailed, setRolesFailed] = useState(false);
    const [css, setCss] = useState('');
    const [previews, setPreviews] = useState<BotPreview[] | null>(null);
    const [drawing, setDrawing] = useState(false);
    const [rolesFor, setRolesFor] = useState<string | null>(null);
    const abort = useRef<AbortController | null>(null);

    useEffect(() => {
        setDesign(state.bot!.design);
        setCommands(fromState(state));
        setUsers(state.bot!.users.map((user) => user.id));
    }, [state]);

    useEffect(() => {
        getBotRoles()
            .then(setGuilds)
            .catch(() => {
                setGuilds([]);
                setRolesFailed(true);
            });
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            abort.current?.abort();
            const controller = new AbortController();
            abort.current = controller;
            setDrawing(true);

            previewBot(design, commands, controller.signal)
                .then((data) => {
                    setCss(data.css);
                    setPreviews(data.previews);
                })
                .catch((error) => {
                    if (!controller.signal.aborted) {
                        toast(apiMessage(error, t('discordBot.studio.previewFailed')), {
                            tone: 'error',
                        });
                    }
                })
                .finally(() => {
                    if (abort.current === controller) {
                        setDrawing(false);
                    }
                });
        }, 350);

        return () => window.clearTimeout(timer);
    }, [design, commands]);

    const roles: RoleOption[] = useMemo(
        () => (guilds ?? []).flatMap((guild) => guild.roles.map((role) => ({ ...role, guild: guild.name }))),
        [guilds]
    );

    const dirty =
        JSON.stringify(design) !== JSON.stringify(initialDesign) ||
        JSON.stringify(commands) !== JSON.stringify(initialCommands) ||
        JSON.stringify(users) !== JSON.stringify(initialUsers);

    const addUser = (event: FormEvent) => {
        event.preventDefault();
        const id = draft.trim();

        if (!/^\d{17,20}$/.test(id)) {
            toast(t('discordBot.access.invalid'), { tone: 'error' });
        } else if (state.bot!.owners.includes(id)) {
            toast(t('discordBot.access.isOwner'), { tone: 'error' });
        } else if (users.length >= MAX_USERS) {
            toast(t('discordBot.access.full', { count: MAX_USERS }), {
                tone: 'error',
            });
        } else {
            setUsers((current) => (current.includes(id) ? current : [...current, id]));
            setDraft('');
        }
    };

    const setCommand = (name: string, patch: Partial<CommandSettings[string]>) =>
        setCommands((current) => ({
            ...current,
            [name]: { ...current[name], ...patch },
        }));

    const save = async () => {
        setSaving(true);

        try {
            const next = await saveBotSettings(design, commands, users);
            onChange(next);
            toast(next.sync?.ok === false ? next.sync.message : t('discordBot.studio.saved'), {
                tone: next.sync?.ok === false ? 'error' : 'success',
            });
        } catch (error) {
            toast(apiMessage(error, t('discordBot.studio.saveFailed')), {
                tone: 'error',
            });
        } finally {
            setSaving(false);
        }
    };

    const roleOptions = (picked: string[]) => [
        { value: '', label: t('discordBot.commands.addRole') },
        ...roles
            .filter((role) => !picked.includes(role.id))
            .map((role) => ({
                value: role.id,
                label: (guilds ?? []).length > 1 ? `${role.name} · ${role.guild}` : role.name,
            })),
    ];

    const removeLabel = (id: string) =>
        t('discordBot.commands.removeRole', { role: roles.find((entry) => entry.id === id)?.name ?? id });

    const dialogRoles = rolesFor === null ? [] : commands[rolesFor]?.roles ?? [];

    return (
        <div className={'grid grid-cols-1 items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]'}>
            <DialogShell
                open={rolesFor !== null}
                onClose={() => setRolesFor(null)}
                width={'md'}
                title={t('discordBot.commands.rolesTitle', { command: rolesFor ?? '' })}
                body={t('discordBot.commands.rolesBody', { command: rolesFor ?? '' })}
            >
                {rolesFor !== null && (
                    <>
                        <div className={'mt-4 flex flex-wrap gap-1.5'}>
                            {dialogRoles.length === 0 ? (
                                <p className={'text-xs text-ink-faint'}>{t('discordBot.commands.onlyYou')}</p>
                            ) : (
                                dialogRoles.map((id) => (
                                    <RoleChip
                                        key={id}
                                        id={id}
                                        role={roles.find((entry) => entry.id === id)}
                                        label={removeLabel(id)}
                                        onRemove={() =>
                                            setCommand(rolesFor, {
                                                roles: dialogRoles.filter((entry) => entry !== id),
                                            })
                                        }
                                    />
                                ))
                            )}
                        </div>

                        {roleOptions(dialogRoles).length > 1 && (
                            <div className={'mt-4'}>
                                <Select
                                    size={'sm'}
                                    value={''}
                                    onChange={(id) =>
                                        id !== '' && setCommand(rolesFor, { roles: [...dialogRoles, id] })
                                    }
                                    options={roleOptions(dialogRoles)}
                                />
                            </div>
                        )}

                        <DialogFooter>
                            <Button size={'sm'} onClick={() => setRolesFor(null)}>
                                {t('common.close')}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogShell>

            <div className={'min-w-0 space-y-6'}>
                <div className={'space-y-3'}>
                    <div className={'overflow-hidden rounded-2xl bg-card ring-1 ring-line-field'}>
                        {state.commands.map((command, index) => {
                            const value = commands[command.name] ?? {
                                enabled: true,
                                roles: [],
                            };
                            const on = command.available && (command.locked || value.enabled);
                            const picked = value.roles;
                            const options = roleOptions(picked);
                            const actions = value.actions;
                            const description = t(`discordBot.command.${command.name}`, {
                                defaultValue: command.description,
                            });

                            return (
                                <div
                                    key={command.name}
                                    className={cn(
                                        'flex items-center gap-3 px-5 py-2.5 transition-colors',
                                        index % 2 === 1 && 'dz-on-raised bg-raised',
                                        on ? '' : 'opacity-60'
                                    )}
                                >
                                    <CommandIcon name={command.name} className={'h-8 w-8 rounded-lg bg-overlay/60'} />

                                    <div className={'flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1'}>
                                        <p className={'text-sm font-semibold text-ink'}>/{command.name}</p>
                                        <HoverTip label={description} side={'top'}>
                                            <button
                                                type={'button'}
                                                aria-label={description}
                                                className={'flex text-ink-faint transition-colors hover:text-ink'}
                                            >
                                                <Info className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                            </button>
                                        </HoverTip>

                                        {on && actions && (
                                            <div
                                                className={'flex items-center gap-1'}
                                                role={'group'}
                                                aria-label={t('discordBot.commands.actions')}
                                            >
                                                {POWER_ACTIONS.map((action) => {
                                                    const Icon = POWER_ICONS[action];
                                                    const active = actions.includes(action);
                                                    const last = active && actions.length === 1;
                                                    const label = t(`discordBot.commands.action_${action}`);

                                                    return (
                                                        <HoverTip
                                                            key={action}
                                                            side={'top'}
                                                            label={
                                                                last
                                                                    ? `${label} · ${t(
                                                                          'discordBot.commands.actionsLast'
                                                                      )}`
                                                                    : label
                                                            }
                                                        >
                                                            <button
                                                                type={'button'}
                                                                aria-label={label}
                                                                aria-pressed={active}
                                                                aria-disabled={last || undefined}
                                                                onClick={() =>
                                                                    !last &&
                                                                    setCommand(command.name, {
                                                                        actions: POWER_ACTIONS.filter((entry) =>
                                                                            entry === action
                                                                                ? !active
                                                                                : actions.includes(entry)
                                                                        ),
                                                                    })
                                                                }
                                                                className={cn(
                                                                    'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
                                                                    active
                                                                        ? 'bg-accent/15 text-accent'
                                                                        : 'text-ink-faint ring-1 ring-line-field hover:text-ink',
                                                                    last && 'cursor-not-allowed'
                                                                )}
                                                            >
                                                                <Icon className={'h-3 w-3'} aria-hidden={'true'} />
                                                            </button>
                                                        </HoverTip>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {command.locked ? (
                                        <Badge tone={'neutral'}>{t('discordBot.commands.alwaysOn')}</Badge>
                                    ) : (
                                        <div className={'flex shrink-0 items-center gap-2'}>
                                            {on && (
                                                <div className={'flex items-center gap-1.5'}>
                                                    <span
                                                        className={'flex shrink-0'}
                                                        title={
                                                            picked.length === 0
                                                                ? t('discordBot.commands.onlyYou')
                                                                : undefined
                                                        }
                                                    >
                                                        <Shield
                                                            className={'h-3.5 w-3.5 text-ink-faint'}
                                                            aria-hidden={'true'}
                                                        />
                                                    </span>

                                                    {picked.slice(0, INLINE_ROLES).map((id) => (
                                                        <RoleChip
                                                            key={id}
                                                            id={id}
                                                            role={roles.find((entry) => entry.id === id)}
                                                            label={removeLabel(id)}
                                                            onRemove={() =>
                                                                setCommand(command.name, {
                                                                    roles: picked.filter((entry) => entry !== id),
                                                                })
                                                            }
                                                        />
                                                    ))}

                                                    {picked.length > INLINE_ROLES && (
                                                        <button
                                                            type={'button'}
                                                            onClick={() => setRolesFor(command.name)}
                                                            className={
                                                                'shrink-0 rounded-full bg-overlay/60 px-2 py-0.5 text-xs font-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink'
                                                            }
                                                        >
                                                            {t('discordBot.commands.moreRoles', {
                                                                count: picked.length - INLINE_ROLES,
                                                            })}
                                                        </button>
                                                    )}

                                                    {guilds === null ? (
                                                        <span className={'text-xs text-ink-faint'}>
                                                            {t('discordBot.commands.rolesLoading')}
                                                        </span>
                                                    ) : options.length > 1 ? (
                                                        <div className={'w-36'}>
                                                            <Select
                                                                size={'sm'}
                                                                value={''}
                                                                className={'h-8 pl-2.5 pr-8 text-xs'}
                                                                onChange={(id) =>
                                                                    id !== '' &&
                                                                    setCommand(command.name, {
                                                                        roles: [...picked, id],
                                                                    })
                                                                }
                                                                options={options}
                                                            />
                                                        </div>
                                                    ) : roles.length === 0 ? (
                                                        <span className={'max-w-[12rem] text-xs text-ink-faint'}>
                                                            {t(
                                                                rolesFailed
                                                                    ? 'discordBot.commands.rolesFailed'
                                                                    : 'discordBot.commands.noServers'
                                                            )}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            )}

                                            <Toggle
                                                checked={on}
                                                disabled={!command.available}
                                                label={`/${command.name}`}
                                                onChange={(checked) => setCommand(command.name, { enabled: checked })}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={'rounded-2xl bg-card p-5 ring-1 ring-line-field'}>
                    <p className={'flex items-center gap-2 text-sm font-semibold text-ink'}>
                        <Users className={'h-4 w-4 text-ink-faint'} aria-hidden={'true'} />
                        {t('discordBot.access.title')}
                    </p>
                    <p className={'mt-1 text-xs leading-relaxed text-ink-faint'}>
                        {t('discordBot.access.description')}
                    </p>

                    <div className={'mt-3 flex flex-wrap gap-2'}>
                        {state.bot!.owners.map((id) => (
                            <span
                                key={id}
                                className={
                                    'inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-xs text-ink'
                                }
                            >
                                <Crown className={'h-3 w-3 text-warning'} aria-hidden={'true'} />
                                <span className={'font-mono'}>{id}</span>
                                <span className={'text-ink-faint'}>{t('discordBot.access.owner')}</span>
                            </span>
                        ))}
                        {users.map((id) => {
                            const known = state.bot!.users.find((user) => user.id === id);

                            return (
                                <span
                                    key={id}
                                    className={
                                        'inline-flex items-center gap-1.5 rounded-full bg-raised py-0.5 pl-0.5 pr-1 text-xs text-ink'
                                    }
                                >
                                    {known ? (
                                        <img src={known.avatar} alt={''} className={'h-5 w-5 rounded-full'} />
                                    ) : (
                                        <span className={'h-5 w-5 rounded-full bg-overlay'} aria-hidden={'true'} />
                                    )}
                                    {known ? (
                                        <>
                                            <span className={'font-medium'}>{known.name}</span>
                                            <span className={'text-ink-faint'}>@{known.username}</span>
                                        </>
                                    ) : (
                                        <span className={'font-mono'} title={t('discordBot.access.pending')}>
                                            {id}
                                        </span>
                                    )}
                                    <button
                                        type={'button'}
                                        onClick={() => setUsers((current) => current.filter((entry) => entry !== id))}
                                        aria-label={t('discordBot.access.remove', {
                                            name: known?.name ?? id,
                                        })}
                                        className={'rounded-full p-0.5 text-ink-faint hover:bg-overlay hover:text-ink'}
                                    >
                                        <X className={'h-3 w-3'} aria-hidden={'true'} />
                                    </button>
                                </span>
                            );
                        })}
                    </div>

                    <form onSubmit={addUser} className={'mt-3 flex items-start gap-2'}>
                        <div className={'min-w-0 flex-1 sm:max-w-xs'}>
                            <Input
                                value={draft}
                                inputMode={'numeric'}
                                maxLength={20}
                                placeholder={t('discordBot.access.placeholder')}
                                aria-label={t('discordBot.access.placeholder')}
                                onChange={(event) => setDraft(event.target.value.replace(/\D/g, ''))}
                            />
                        </div>
                        <Button
                            type={'submit'}
                            variant={'secondary'}
                            disabled={draft === ''}
                            icon={<UserPlus className={'h-4 w-4'} />}
                        >
                            {t('discordBot.access.add')}
                        </Button>
                    </form>
                    <p className={'mt-2 text-xs leading-relaxed text-ink-faint'}>{t('discordBot.access.hint')}</p>
                </div>

                <div className={'rounded-2xl bg-card p-5 ring-1 ring-line-field'}>
                    <p className={'flex items-center gap-2 text-sm font-semibold text-ink'}>
                        <Palette className={'h-4 w-4 text-ink-faint'} aria-hidden={'true'} />
                        {t('discordBot.design.title')}
                    </p>

                    <div className={'mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2'}>
                        <div>
                            <p className={'text-xs font-medium text-ink-muted'}>{t('discordBot.design.accent')}</p>
                            <div className={'mt-1.5 flex items-center gap-2'}>
                                <input
                                    type={'color'}
                                    value={design.accent || '#5865f2'}
                                    onChange={(event) => setDesign({ ...design, accent: event.target.value })}
                                    className={
                                        'h-10 w-12 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0'
                                    }
                                    aria-label={t('discordBot.design.accent')}
                                />
                                <Input
                                    value={design.accent}
                                    placeholder={t('discordBot.design.accentAuto')}
                                    onChange={(event) =>
                                        setDesign({
                                            ...design,
                                            accent: event.target.value.trim(),
                                        })
                                    }
                                />
                                {design.accent !== '' && (
                                    <Button
                                        size={'sm'}
                                        variant={'ghost'}
                                        onClick={() => setDesign({ ...design, accent: '' })}
                                        aria-label={t('discordBot.design.accentReset')}
                                        icon={<RotateCcw className={'h-3.5 w-3.5'} />}
                                    />
                                )}
                            </div>
                            <p className={'mt-1 text-xs text-ink-faint'}>{t('discordBot.design.accentHint')}</p>
                        </div>

                        <div>
                            <p className={'text-xs font-medium text-ink-muted'}>{t('discordBot.design.visibility')}</p>
                            <div className={'mt-1.5 grid grid-cols-3 gap-1.5'}>
                                {(['private', 'public', 'choice'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type={'button'}
                                        onClick={() => setDesign({ ...design, visibility: mode })}
                                        aria-pressed={design.visibility === mode}
                                        className={cn(
                                            'rounded-xl px-2 py-2 text-xs transition-colors',
                                            design.visibility === mode
                                                ? 'bg-accent/15 text-ink'
                                                : 'text-ink-muted ring-1 ring-line-field hover:bg-overlay/50'
                                        )}
                                    >
                                        {t(`discordBot.design.visibility_${mode}`)}
                                    </button>
                                ))}
                            </div>
                            <p className={'mt-1 text-xs text-ink-faint'}>{t('discordBot.design.visibilityHint')}</p>
                        </div>

                        <Input
                            label={t('discordBot.design.footer')}
                            value={design.footer}
                            maxLength={80}
                            placeholder={state.bot!.name}
                            onChange={(event) => setDesign({ ...design, footer: event.target.value })}
                        />

                        <div>
                            <p className={'flex justify-between text-xs font-medium text-ink-muted'}>
                                {t('discordBot.design.consoleLines')}
                                <span className={'font-mono text-ink'}>{design.console_lines}</span>
                            </p>
                            <Slider
                                min={5}
                                max={30}
                                value={design.console_lines}
                                onChange={(value) => setDesign({ ...design, console_lines: value })}
                            />
                        </div>

                        {state.consoleImages && (
                            <div>
                                <p className={'text-xs font-medium text-ink-muted'}>
                                    {t('discordBot.design.consoleStyle')}
                                </p>
                                <div className={'mt-1.5 grid grid-cols-2 gap-1.5'}>
                                    {([false, true] as const).map((image) => (
                                        <button
                                            key={String(image)}
                                            type={'button'}
                                            onClick={() => setDesign({ ...design, console_image: image })}
                                            aria-pressed={design.console_image === image}
                                            className={cn(
                                                'rounded-xl px-2 py-2 text-xs transition-colors',
                                                design.console_image === image
                                                    ? 'bg-accent/15 text-ink'
                                                    : 'text-ink-muted ring-1 ring-line-field hover:bg-overlay/50'
                                            )}
                                        >
                                            {t(
                                                image
                                                    ? 'discordBot.design.consoleImage'
                                                    : 'discordBot.design.consoleText'
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <p className={'mt-1 text-xs text-ink-faint'}>
                                    {t('discordBot.design.consoleStyleHint')}
                                </p>
                            </div>
                        )}

                        {state.consoleImages && design.console_image && (
                            <div>
                                <p className={'flex justify-between text-xs font-medium text-ink-muted'}>
                                    {t('discordBot.design.consoleFont')}
                                    <span className={'font-mono text-ink'}>{design.console_font}px</span>
                                </p>
                                <Slider
                                    min={10}
                                    max={18}
                                    value={design.console_font}
                                    onChange={(value) => setDesign({ ...design, console_font: value })}
                                />
                            </div>
                        )}

                        <div>
                            <p className={'flex justify-between text-xs font-medium text-ink-muted'}>
                                {t('discordBot.design.barLength')}
                                <span className={'font-mono text-ink'}>{design.bar_length}</span>
                            </p>
                            <Slider
                                min={5}
                                max={30}
                                value={design.bar_length}
                                onChange={(value) => setDesign({ ...design, bar_length: value })}
                            />
                            <p className={'mt-1 text-xs text-ink-faint'}>{t('discordBot.design.barLengthHint')}</p>
                        </div>
                    </div>

                    <div className={'mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2'}>
                        {(['banner', 'logos'] as const).map((key) => (
                            <label
                                key={key}
                                className={'flex cursor-pointer items-start gap-3 rounded-xl bg-overlay/40 p-3'}
                            >
                                <Toggle
                                    checked={design[key]}
                                    onChange={(checked) => setDesign({ ...design, [key]: checked })}
                                />
                                <span className={'min-w-0'}>
                                    <span className={'block text-sm font-medium text-ink'}>
                                        {t(`discordBot.design.${key}`)}
                                    </span>
                                    <span className={'block text-xs text-ink-faint'}>
                                        {t(`discordBot.design.${key}Hint`)}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {dirty && (
                    <div
                        className={
                            'sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-2xl bg-raised/95 p-3 shadow-panel ring-1 ring-line-field backdrop-blur'
                        }
                    >
                        <span className={'mr-auto text-xs text-ink-muted'}>{t('discordBot.studio.unsaved')}</span>
                        <Button
                            variant={'ghost'}
                            size={'sm'}
                            onClick={() => {
                                setDesign(initialDesign);
                                setCommands(initialCommands);
                                setUsers(initialUsers);
                            }}
                        >
                            {t('discordBot.studio.reset')}
                        </Button>
                        <Button
                            size={'sm'}
                            loading={saving}
                            onClick={() => void save()}
                            icon={<Save className={'h-3.5 w-3.5'} />}
                        >
                            {t('discordBot.studio.save')}
                        </Button>
                    </div>
                )}
            </div>

            <div className={'sticky top-4 h-fit min-w-0 space-y-3'}>
                {previews === null ? (
                    <Skeleton className={'h-96 rounded-2xl'} />
                ) : (
                    <PreviewPane
                        stylesheet={css}
                        previews={previews}
                        drawing={drawing}
                        empty={t('discordBot.studio.allOff')}
                    />
                )}
            </div>
        </div>
    );
}
