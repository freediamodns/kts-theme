import React, { ReactNode, useMemo, useState } from 'react';
import { Dialog, Popover } from '@headlessui/react';
import {
    Box,
    ChevronLeft,
    ChevronRight,
    Cloud,
    Cpu,
    Database,
    Folder,
    FolderOpen,
    Gamepad2,
    Globe,
    Hammer,
    HardDrive,
    Heart,
    LucideIcon,
    Pencil,
    Rocket,
    Server as ServerIcon,
    Shield,
    Star,
    Terminal,
    Trash2,
    Users,
    X,
    Zap,
} from 'lucide-react';
import { Button, Checkbox, Input, useToast } from '@/dezerx/components/ui';
import { apiMessage } from '@/dezerx/components/console/Section';
import { cn } from '@/dezerx/lib/cn';
import { CategoryColour, ServerCategory, saveCategories } from '@/api/account/preferences';
import { Server } from '@/api/server/getServer';
import { ServerStats } from '@/api/server/getServerResourceUsage';
import { useT } from '@/i18n';

export const CATEGORY_COLOURS: Record<CategoryColour, string> = {
    accent: 'bg-accent',
    blue: 'bg-[#3b82f6]',
    green: 'bg-[#22c55e]',
    amber: 'bg-[#f59e0b]',
    red: 'bg-[#ef4444]',
    purple: 'bg-[#8b5cf6]',
    pink: 'bg-[#ec4899]',
    teal: 'bg-[#14b8a6]',
};

function colourBar(colour: CategoryColour | null | undefined): string | null {
    return colour ? CATEGORY_COLOURS[colour] ?? null : null;
}

export function blankCategory(): ServerCategory {
    return { id: `c${Date.now().toString(36)}`, name: '', icon: 'folder', servers: [] };
}

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
    folder: Folder,
    server: ServerIcon,
    game: Gamepad2,
    globe: Globe,
    database: Database,
    cloud: Cloud,
    cpu: Cpu,
    drive: HardDrive,
    terminal: Terminal,
    shield: Shield,
    rocket: Rocket,
    zap: Zap,
    box: Box,
    users: Users,
    star: Star,
    heart: Heart,
    build: Hammer,
};

function glyphFor(category: ServerCategory): LucideIcon {
    return CATEGORY_ICONS[category.icon ?? 'folder'] ?? Folder;
}

export function IconAction({
    label,
    icon,
    tone = 'default',
    className,
    onClick,
}: {
    label: string;
    icon: ReactNode;
    tone?: 'default' | 'danger';
    className?: string;
    onClick?: () => void;
}) {
    return (
        <button
            type={'button'}
            title={label}
            aria-label={label}
            onClick={onClick}
            className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-overlay text-ink-muted ring-1 ring-line-field transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70',
                tone === 'danger'
                    ? 'hover:bg-danger hover:text-white hover:ring-danger'
                    : 'hover:text-ink hover:ring-ink-faint/40',
                className
            )}
        >
            {icon}
        </button>
    );
}

export function CategoryBar({
    categories,
    servers,
    stats,
    open,
    onOpen,
    onChange,
    editing,
    onEdit,
}: {
    categories: ServerCategory[];
    servers: Server[];
    stats: Record<string, ServerStats>;
    open: string | null;
    onOpen: (id: string | null) => void;
    onChange: (categories: ServerCategory[]) => void;
    editing: ServerCategory | null;
    onEdit: (category: ServerCategory | null) => void;
}) {
    const t = useT();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    const counts = useMemo(() => {
        const known = new Set(servers.map((server) => server.uuid));

        return Object.fromEntries(
            categories.map((category) => {
                const mine = category.servers.filter((uuid) => known.has(uuid));

                return [
                    category.id,
                    {
                        total: mine.length,
                        online: mine.filter((uuid) => stats[uuid]?.status === 'running').length,
                    },
                ];
            })
        );
    }, [categories, servers, stats]);

    const persist = async (next: ServerCategory[]) => {
        setSaving(true);

        try {
            onChange(await saveCategories(next));
            onEdit(null);
        } catch (error) {
            toast(apiMessage(error, t('categories.saveFailed')), { tone: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const remove = (id: string) => {
        if (open === id) {
            onOpen(null);
        }

        void persist(categories.filter((category) => category.id !== id));
    };

    const opened = categories.find((category) => category.id === open) ?? null;

    if (categories.length === 0 && opened === null) {
        return (
            <CategoryDialog
                category={editing}
                servers={servers}
                busy={saving}
                onClose={() => onEdit(null)}
                onSave={(next) => void persist([...categories, next])}
            />
        );
    }

    return (
        <>
            {opened === null ? (
                <div className={'relative z-20 mb-6 grid gap-3 sm:grid-cols-2'}>
                    {categories.map((category) => {
                        const count = counts[category.id] ?? { total: 0, online: 0 };

                        return (
                            <div
                                key={category.id}
                                className={
                                    'group relative z-0 flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-line-field transition-colors focus-within:z-10 hover:bg-raised'
                                }
                            >
                                <div className={'flex items-start gap-3'}>
                                    {colourBar(category.colour) && (
                                        <span
                                            aria-hidden={'true'}
                                            className={cn(
                                                'mr-1 w-1 shrink-0 self-stretch rounded-full',
                                                colourBar(category.colour)
                                            )}
                                        />
                                    )}

                                    <IconPicker
                                        category={category}
                                        onPick={(icon) =>
                                            void persist(
                                                categories.map((entry) =>
                                                    entry.id === category.id ? { ...entry, icon } : entry
                                                )
                                            )
                                        }
                                    />

                                    <button
                                        type={'button'}
                                        onClick={() => onOpen(category.id)}
                                        className={
                                            'min-w-0 flex-1 text-left after:absolute after:inset-0 after:rounded-2xl after:content-[""] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent/70'
                                        }
                                    >
                                        <span className={'block truncate text-sm font-medium text-ink'}>
                                            {category.name}
                                        </span>
                                        <span className={'mt-0.5 block text-xs text-ink-faint'}>
                                            {count.total === 0
                                                ? t('categories.empty')
                                                : t('categories.serversIn', { count: count.total })}
                                        </span>
                                    </button>

                                    <div className={'relative z-10 flex gap-1.5'}>
                                        <IconAction
                                            label={`Edit ${category.name}`}
                                            onClick={() => onEdit(category)}
                                            icon={<Pencil className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                                        />
                                        <IconAction
                                            label={`Delete ${category.name}`}
                                            tone={'danger'}
                                            onClick={() => remove(category.id)}
                                            icon={<Trash2 className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className={'mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-card p-3'}>
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        onClick={() => onOpen(null)}
                        icon={<ChevronLeft className={'h-3.5 w-3.5'} />}
                    >
                        {t('switcher.allServers')}
                    </Button>

                    <span className={'flex items-center gap-1.5 text-sm font-medium text-ink'}>
                        <FolderOpen className={'h-4 w-4 text-accent'} aria-hidden={'true'} />
                        {opened.name}
                    </span>

                    <span className={'flex-1'} />

                    <IconAction
                        label={t('categories.edit')}
                        onClick={() => onEdit(opened)}
                        icon={<Pencil className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                    />
                    <IconAction
                        label={t('categories.delete')}
                        tone={'danger'}
                        onClick={() => remove(opened.id)}
                        icon={<Trash2 className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                    />
                </div>
            )}

            <CategoryDialog
                category={editing}
                servers={servers}
                busy={saving}
                onClose={() => onEdit(null)}
                onSave={(next) =>
                    void persist(
                        categories.some((category) => category.id === next.id)
                            ? categories.map((category) => (category.id === next.id ? next : category))
                            : [...categories, next]
                    )
                }
            />
        </>
    );
}

function IconPicker({ category, onPick }: { category: ServerCategory; onPick: (icon: string) => void }) {
    const t = useT();
    const Glyph = glyphFor(category);

    return (
        <Popover className={'relative z-10'}>
            <Popover.Button
                title={t('categories.changeIcon')}
                aria-label={t('categories.changeIconFor', { name: category.name })}
                className={
                    'group/icon grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70'
                }
            >
                <Glyph
                    className={'col-start-1 row-start-1 h-6 w-6 transition-opacity group-hover/icon:opacity-0'}
                    aria-hidden={'true'}
                />
                <Pencil
                    className={
                        'col-start-1 row-start-1 h-4 w-4 opacity-0 transition-opacity group-hover/icon:opacity-100'
                    }
                    aria-hidden={'true'}
                />
            </Popover.Button>

            <Popover.Panel
                className={
                    'absolute left-0 top-11 z-20 w-56 rounded-2xl bg-card p-2 shadow-panel ring-1 ring-line-field'
                }
            >
                {({ close }) => (
                    <div className={'grid grid-cols-6 gap-1'}>
                        {Object.entries(CATEGORY_ICONS).map(([key, Option]) => {
                            const on = (category.icon ?? 'folder') === key;

                            return (
                                <button
                                    key={key}
                                    type={'button'}
                                    title={key}
                                    aria-label={key}
                                    aria-pressed={on}
                                    onClick={() => {
                                        onPick(key);
                                        close();
                                    }}
                                    className={cn(
                                        'grid h-8 w-8 place-items-center rounded-lg transition-colors',
                                        on
                                            ? 'bg-accent/15 text-accent'
                                            : 'text-ink-muted hover:bg-raised hover:text-ink'
                                    )}
                                >
                                    <Option className={'h-4 w-4'} aria-hidden={'true'} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </Popover.Panel>
        </Popover>
    );
}

function CategoryDialog({
    category,
    servers,
    busy,
    onSave,
    onClose,
}: {
    category: ServerCategory | null;
    servers: Server[];
    busy: boolean;
    onSave: (category: ServerCategory) => void;
    onClose: () => void;
}) {
    const t = useT();
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('folder');
    const [colour, setColour] = useState<CategoryColour | null>(null);
    const [picked, setPicked] = useState<string[]>([]);
    const [seen, setSeen] = useState<string | null>(null);

    if (category && seen !== category.id) {
        setSeen(category.id);
        setName(category.name);
        setIcon(category.icon ?? 'folder');
        setColour(category.colour ?? null);
        setPicked(category.servers);
    }

    const toggle = (uuid: string) =>
        setPicked((current) =>
            current.includes(uuid) ? current.filter((entry) => entry !== uuid) : [...current, uuid]
        );

    return (
        <Dialog open={category !== null} onClose={busy ? () => undefined : onClose} className={'relative z-[70]'}>
            <div className={'fixed inset-0 bg-black/50 backdrop-blur-sm animate-backdrop-in'} aria-hidden={'true'} />

            <div className={'fixed inset-0 flex items-center justify-center p-4'}>
                <Dialog.Panel
                    className={
                        'flex h-[30rem] max-h-full w-[30rem] max-w-full flex-col overflow-hidden rounded-2xl dz-on-raised bg-raised shadow-panel ring-1 ring-line-field animate-modal-in motion-reduce:animate-none'
                    }
                >
                    <div className={'flex items-start justify-between gap-3 p-4'}>
                        <Dialog.Title className={'text-sm font-medium text-ink'}>
                            {category && category.name !== '' ? t('categories.edit') : t('dashboard.newCategory')}
                        </Dialog.Title>

                        <button
                            type={'button'}
                            onClick={onClose}
                            aria-label={t('common.close')}
                            className={
                                'shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-overlay hover:text-ink'
                            }
                        >
                            <X className={'h-4 w-4'} aria-hidden={'true'} />
                        </button>
                    </div>

                    <div className={'space-y-3 px-4 pb-3'}>
                        <Input
                            label={t('common.name')}
                            value={name}
                            maxLength={40}
                            placeholder={'Minecraft'}
                            onChange={(event) => setName(event.target.value)}
                        />

                        <div>
                            <p className={'mb-1.5 text-xs text-ink-muted'}>{t('categories.icon')}</p>

                            <div className={'flex flex-wrap gap-1'}>
                                {Object.entries(CATEGORY_ICONS).map(([key, Option]) => (
                                    <button
                                        key={key}
                                        type={'button'}
                                        title={key}
                                        aria-label={key}
                                        aria-pressed={icon === key}
                                        onClick={() => setIcon(key)}
                                        className={cn(
                                            'grid h-8 w-8 place-items-center rounded-lg transition-colors',
                                            icon === key
                                                ? 'bg-accent/15 text-accent'
                                                : 'text-ink-muted hover:bg-overlay hover:text-ink'
                                        )}
                                    >
                                        <Option className={'h-4 w-4'} aria-hidden={'true'} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className={'mb-1.5 text-xs text-ink-muted'}>{t('categories.colour')}</p>

                            <div className={'flex flex-wrap gap-1.5'}>
                                <button
                                    type={'button'}
                                    title={t('categories.none')}
                                    aria-label={t('categories.noColour')}
                                    aria-pressed={colour === null}
                                    onClick={() => setColour(null)}
                                    className={cn(
                                        'grid h-8 w-8 place-items-center rounded-lg text-[10px] font-semibold transition-colors',
                                        colour === null
                                            ? 'bg-accent/15 text-accent'
                                            : 'text-ink-faint hover:bg-overlay hover:text-ink'
                                    )}
                                >
                                    {'\u2014'}
                                </button>

                                {(Object.keys(CATEGORY_COLOURS) as CategoryColour[]).map((key) => (
                                    <button
                                        key={key}
                                        type={'button'}
                                        title={key}
                                        aria-label={key}
                                        aria-pressed={colour === key}
                                        onClick={() => setColour(key)}
                                        className={cn(
                                            'grid h-8 w-8 place-items-center rounded-lg transition-colors',
                                            colour === key ? 'bg-accent/15' : 'hover:bg-overlay'
                                        )}
                                    >
                                        <span
                                            aria-hidden={'true'}
                                            className={cn('h-4 w-1.5 rounded-full', CATEGORY_COLOURS[key])}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={'flex items-center justify-between gap-3 px-4 pb-2'}>
                        <p className={'text-[11px] text-ink-faint'}>
                            {t('categories.pickedOf', { picked: picked.length, total: servers.length })}
                        </p>

                        <Checkbox
                            size={'sm'}
                            className={'w-auto'}
                            label={t('categories.selectAll')}
                            checked={servers.length > 0 && picked.length === servers.length}
                            indeterminate={picked.length > 0 && picked.length < servers.length}
                            onChange={(event) =>
                                setPicked(event.target.checked ? servers.map((server) => server.uuid) : [])
                            }
                        />
                    </div>

                    <div className={'min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-4'}>
                        {servers.map((server) => {
                            const on = picked.includes(server.uuid);

                            return (
                                <label
                                    key={server.uuid}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-colors',
                                        on ? 'bg-accent/10 text-ink' : 'bg-overlay/50 text-ink-muted hover:text-ink'
                                    )}
                                >
                                    <Checkbox size={'sm'} checked={on} onChange={() => toggle(server.uuid)} />
                                    <span className={'min-w-0 flex-1 truncate font-medium'}>{server.name}</span>
                                    <span className={'shrink-0 text-[10px] text-ink-faint'}>{server.node}</span>
                                </label>
                            );
                        })}
                    </div>

                    <div className={'flex justify-end gap-2 border-t border-line-field p-4'}>
                        <Button size={'sm'} variant={'ghost'} disabled={busy} onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size={'sm'}
                            variant={'primary'}
                            loading={busy}
                            disabled={name.trim() === ''}
                            onClick={() =>
                                category && onSave({ ...category, name: name.trim(), icon, colour, servers: picked })
                            }
                        >
                            {t('common.save')}
                        </Button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

export function visibleServers(servers: Server[], categories: ServerCategory[], open: string | null): Server[] {
    if (open !== null) {
        const category = categories.find((entry) => entry.id === open);

        return category ? servers.filter((server) => category.servers.includes(server.uuid)) : servers;
    }

    if (categories.length === 0) {
        return servers;
    }

    const grouped = new Set(categories.flatMap((category) => category.servers));

    return servers.filter((server) => !grouped.has(server.uuid));
}
