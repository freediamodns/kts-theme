import React, { useEffect, useMemo, useState } from 'react';
import {
    Check,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    Plus,
    Search,
    Settings2,
    SlidersHorizontal,
    Trash2,
    TriangleAlert,
    X,
} from 'lucide-react';
import routes from '@/routers/routes';
import { cn } from '@/dezerx/lib/cn';
import { allAddons } from '@/dezerx/lib/addons';
import { SIDEBAR_LINK_ICONS } from '@/dezerx/lib/linkIcons';
import {
    BADGE_TONES,
    MANAGER_NAV_LABELS,
    type BadgeTone,
    type ServerTab,
    type ServerTabGroup,
    newGroupKey,
    newTabKey,
} from '@/dezerx/lib/panelTheme';
import { session } from '@/dezerx/components/editor/session';
import { INPUT, IconPicker, move, type EditorEgg } from '@/dezerx/components/editor/Controls';
import { Checkbox, Select } from '@/dezerx/components/ui';
import { CHIP, GEAR, LABEL, Modal, ROW, SOLID, STEP } from '@/dezerx/components/editor/EditorRows';
import { useT, type TranslateFn } from '@/i18n';

export interface PermissionCatalogue {
    [group: string]: { description: string; keys: Record<string, string> };
}

interface BuiltIn {
    path: string;
    name: string;
    permission: string | string[] | null;
    addon?: string;
}

type Addons = ReturnType<typeof allAddons>;

function builtIns(): BuiltIn[] {
    return routes.server
        .filter((route) => route.name !== undefined)
        .map((route) => ({
            path: route.path,
            name: MANAGER_NAV_LABELS[route.path] ?? route.name!,
            permission: route.permission,
            addon: route.addon,
        }));
}

function permissionList(permission: string | string[] | null): string[] {
    return permission === null ? [] : Array.isArray(permission) ? permission : [permission];
}

export function ServerTabsField({
    hint,
    tabs,
    groups,
    permissions,
    eggs,
    max,
    onTabs,
    onGroups,
}: {
    label: string;
    hint?: string;
    tabs: ServerTab[];
    groups: ServerTabGroup[];
    permissions: PermissionCatalogue;
    eggs: EditorEgg[];
    max: number;
    onTabs: (value: ServerTab[]) => void;
    onGroups: (value: ServerTabGroup[]) => void;
}) {
    const t = useT();

    const catalogue = useMemo(builtIns, []);
    const addons = useMemo(allAddons, []);

    const [open, setOpen] = useState<string[]>([]);
    const [editing, setEditing] = useState<string | null>(null);
    const [editingGroup, setEditingGroup] = useState<string | null>(null);
    const [picking, setPicking] = useState<string | null>(null);

    const patch = (key: string, next: Partial<ServerTab>) =>
        onTabs(tabs.map((tab) => (tab.key === key ? { ...tab, ...next } : tab)));

    const shuffle = (key: string, delta: number) => {
        const tab = tabs.find((one) => one.key === key);

        if (!tab) {
            return;
        }

        const siblings = tabs.filter((one) => one.group === tab.group);
        const swap = siblings[siblings.indexOf(tab) + delta];

        if (swap) {
            onTabs(move(tabs, tabs.indexOf(tab), tabs.indexOf(swap)));
        }
    };

    const unfold = (key: string) =>
        setOpen((current) => (current.includes(key) ? current.filter((one) => one !== key) : [...current, key]));

    const addLink = (group: string) => {
        const key = newTabKey(tabs.map((tab) => tab.key));

        onTabs([
            ...tabs,
            {
                key,
                route: '',
                icon: 'link',
                label: '',
                enabled: true,
                group,
                custom: true,
                external: true,
                permission: [],
                eggs: [],
            },
        ]);

        setPicking(null);
        setEditing(key);
    };

    const restore = (group: string, path: string) => {
        onTabs(tabs.map((tab) => (tab.key === path ? { ...tab, group, enabled: true } : tab)));
        setPicking(null);
        setEditing(path);
    };

    const addGroup = () => {
        const key = newGroupKey(groups.map((group) => group.key));

        onGroups([...groups, { key, label: '', icon: 'link', enabled: true, open: true, collapsible: true }]);
        setOpen((current) => [...current, key]);
        setEditingGroup(key);
    };

    const orphans = [...new Set(tabs.map((tab) => tab.group))]
        .filter((key) => key !== '' && !groups.some((group) => group.key === key))
        .map((key) => ({ key, label: '', icon: 'link', enabled: true, open: true, collapsible: true }));

    const shown: ServerTabGroup[] = [
        ...(tabs.some((tab) => tab.group === '')
            ? [{ key: '', label: '', icon: 'link', enabled: true, open: true, collapsible: false }]
            : []),
        ...groups,
        ...orphans,
    ];

    const active = editing === null ? null : tabs.find((tab) => tab.key === editing) ?? null;
    const activeGroup = editingGroup === null ? null : shown.find((group) => group.key === editingGroup) ?? null;

    return (
        <div className={'space-y-3'}>
            {hint && <p className={'text-[12px] leading-snug text-ink-faint'}>{hint}</p>}

            <div className={'space-y-2'}>
                {shown.map((group) => (
                    <CategoryBlock
                        key={group.key || '__loose'}
                        group={group}
                        index={groups.findIndex((one) => one.key === group.key)}
                        count={groups.length}
                        items={tabs.filter((tab) => tab.group === group.key)}
                        tabs={tabs}
                        catalogue={catalogue}
                        addons={addons}
                        open={open.includes(group.key)}
                        picking={picking === group.key}
                        onUnfold={() => unfold(group.key)}
                        onPick={() => setPicking((current) => (current === group.key ? null : group.key))}
                        onAddLink={() => addLink(group.key)}
                        onRestore={(path) => restore(group.key, path)}
                        onEdit={setEditing}
                        onEditGroup={() => setEditingGroup(group.key)}
                        onToggle={(key, enabled) => patch(key, { enabled })}
                        onShuffle={shuffle}
                        onMove={(delta) => {
                            const at = groups.findIndex((one) => one.key === group.key);

                            if (at !== -1) {
                                onGroups(move(groups, at, at + delta));
                            }
                        }}
                        full={tabs.length >= max}
                    />
                ))}
            </div>

            <button
                type={'button'}
                onClick={addGroup}
                className={
                    'flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-field py-2 text-[13px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink'
                }
            >
                <Plus className={'h-4 w-4'} aria-hidden={'true'} />
                {t('editor.tabs.addCategory')}
            </button>

            <TabModal
                tab={active}
                groups={[...groups, ...orphans]}
                known={active ? catalogue.find((entry) => entry.path === active.key) : undefined}
                addon={
                    active
                        ? addons.find((one) => one.key === catalogue.find((entry) => entry.path === active.key)?.addon)
                        : undefined
                }
                permissions={permissions}
                eggs={eggs}
                onPatch={(next) => active && patch(active.key, next)}
                onDelete={() => {
                    if (active) {
                        onTabs(tabs.filter((tab) => tab.key !== active.key));
                        setEditing(null);
                    }
                }}
                onClose={() => setEditing(null)}
            />

            <CategoryModal
                group={activeGroup}
                onPatch={(next) =>
                    activeGroup &&
                    onGroups(
                        groups.some((one) => one.key === activeGroup.key)
                            ? groups.map((one) => (one.key === activeGroup.key ? { ...one, ...next } : one))
                            : [...groups, { ...activeGroup, ...next }]
                    )
                }
                onDelete={() => {
                    if (!activeGroup) {
                        return;
                    }

                    onGroups(groups.filter((one) => one.key !== activeGroup.key));

                    onTabs(tabs.map((tab) => (tab.group === activeGroup.key ? { ...tab, group: '' } : tab)));
                    setEditingGroup(null);
                }}
                onClose={() => setEditingGroup(null)}
            />
        </div>
    );
}

function CategoryBlock({
    group,
    index,
    count,
    items,
    tabs,
    catalogue,
    addons,
    open,
    picking,
    onUnfold,
    onPick,
    onAddLink,
    onRestore,
    onEdit,
    onEditGroup,
    onToggle,
    onShuffle,
    onMove,
    full,
}: {
    group: ServerTabGroup;
    index: number;
    count: number;
    items: ServerTab[];
    tabs: ServerTab[];
    catalogue: BuiltIn[];
    addons: Addons;
    open: boolean;
    picking: boolean;
    onUnfold: () => void;
    onPick: () => void;
    onAddLink: () => void;
    onRestore: (path: string) => void;
    onEdit: (key: string) => void;
    onEditGroup: () => void;
    onToggle: (key: string, enabled: boolean) => void;
    onShuffle: (key: string, delta: number) => void;
    onMove: (delta: number) => void;
    full: boolean;
}) {
    const t = useT();
    const loose = group.key === '';

    const name = loose
        ? t('editor.tabs.loose')
        : group.label || t(`nav.groups.${group.key}`, { defaultValue: group.key });

    const pages = items.filter((tab) => !tab.custom);

    const waiting = pages
        .map((tab) => catalogue.find((entry) => entry.path === tab.key)?.addon)
        .filter((addon): addon is string => addon !== undefined);

    const dark =
        pages.length > 0 &&
        waiting.length === pages.length &&
        waiting.every((addon) => addons.find((one) => one.key === addon)?.enabled !== true);

    const hidden = items.filter((tab) => !tab.enabled).length;

    return (
        <div
            className={cn(
                'overflow-hidden rounded-xl ring-1 ring-line-field transition-opacity',
                !group.enabled && 'opacity-50'
            )}
        >
            <div className={cn(ROW, 'bg-raised/70')}>
                <button
                    type={'button'}
                    onClick={onUnfold}
                    aria-expanded={open}
                    className={'flex min-w-0 flex-1 items-center gap-2 text-left'}
                >
                    <ChevronDown
                        aria-hidden={'true'}
                        className={cn(
                            'h-[18px] w-[18px] shrink-0 text-ink-faint transition-transform duration-200 motion-reduce:transition-none',
                            !open && '-rotate-90'
                        )}
                    />

                    <span className={'truncate text-[15px] font-medium text-ink'}>{name}</span>

                    <span className={'shrink-0 text-[12px] tabular-nums text-ink-faint'}>{items.length}</span>

                    {hidden > 0 && (
                        <span className={cn(CHIP, 'bg-overlay text-ink-faint')}>
                            {t('editor.tabs.hiddenCount', { total: hidden })}
                        </span>
                    )}
                </button>

                {!loose && (
                    <>
                        <button
                            type={'button'}
                            onClick={() => onMove(-1)}
                            disabled={index <= 0}
                            aria-label={t('editor.tabs.moveUp')}
                            className={STEP}
                        >
                            <ChevronUp className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                        </button>

                        <button
                            type={'button'}
                            onClick={() => onMove(1)}
                            disabled={index === -1 || index === count - 1}
                            aria-label={t('editor.tabs.moveDown')}
                            className={STEP}
                        >
                            <ChevronDown className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                        </button>

                        <button
                            type={'button'}
                            onClick={onEditGroup}
                            aria-label={t('editor.tabs.categorySettings', { name })}
                            className={GEAR}
                        >
                            <Settings2 className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                        </button>
                    </>
                )}
            </div>

            {open && (
                <>
                    {dark && (
                        <p
                            className={
                                'flex items-start gap-1.5 border-t border-line-field bg-warning/10 px-3 py-2 text-[11px] leading-snug text-ink-muted'
                            }
                        >
                            <TriangleAlert aria-hidden={'true'} className={'mt-px h-3.5 w-3.5 shrink-0 text-warning'} />
                            <span>{t('editor.tabs.groupDark')}</span>
                        </p>
                    )}

                    {items.map((tab, at) => (
                        <TabRow
                            key={tab.key}
                            tab={tab}
                            first={at === 0}
                            last={at === items.length - 1}
                            known={catalogue.find((entry) => entry.path === tab.key)}
                            addons={addons}
                            onEdit={() => onEdit(tab.key)}
                            onToggle={() => onToggle(tab.key, !tab.enabled)}
                            onShuffle={(delta) => onShuffle(tab.key, delta)}
                        />
                    ))}

                    {picking && (
                        <Picker catalogue={catalogue} tabs={tabs} onAddLink={onAddLink} onRestore={onRestore} />
                    )}

                    {!full && (
                        <button
                            type={'button'}
                            onClick={onPick}
                            className={cn(
                                ROW,
                                'w-full bg-card text-[13px] font-medium text-accent transition-colors hover:bg-raised/60'
                            )}
                        >
                            {picking ? (
                                <X className={'h-4 w-4'} aria-hidden={'true'} />
                            ) : (
                                <Plus className={'h-4 w-4'} aria-hidden={'true'} />
                            )}
                            {picking ? t('editor.tabs.cancel') : t('editor.tabs.addTab')}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

function TabRow({
    tab,
    first,
    last,
    known,
    addons,
    onEdit,
    onToggle,
    onShuffle,
}: {
    tab: ServerTab;
    first: boolean;
    last: boolean;
    known?: BuiltIn;
    addons: Addons;
    onEdit: () => void;
    onToggle: () => void;
    onShuffle: (delta: number) => void;
}) {
    const t = useT();
    const Icon = SIDEBAR_LINK_ICONS[tab.icon] ?? SIDEBAR_LINK_ICONS.link;

    const addon = known?.addon ? addons.find((one) => one.key === known.addon) : undefined;
    const gate = tab.permission.length > 0 ? tab.permission : permissionList(known?.permission ?? null);

    return (
        <div className={cn(ROW, 'bg-card', !tab.enabled && 'opacity-50')}>
            <button type={'button'} onClick={onEdit} className={'flex min-w-0 flex-1 items-center gap-2.5 text-left'}>
                <Icon className={'h-5 w-5 shrink-0 text-ink-faint'} aria-hidden={'true'} />

                <span className={'min-w-0 flex-1 truncate text-[15px] text-ink'}>
                    {tab.label || known?.name || t('editor.tabs.untitled')}
                </span>

                {addon && (
                    <span
                        title={
                            addon.enabled
                                ? t('editor.tabs.addonOn', { addon: addon.name })
                                : t('editor.tabs.addonOff', { addon: addon.name })
                        }
                        className={cn(SOLID, addon.enabled ? 'bg-accent' : 'bg-warning')}
                    >
                        {addon.name}
                    </span>
                )}

                {tab.custom && tab.route.trim() === '' && (
                    <span title={t('editor.tabs.noAddressHint')} className={cn(SOLID, 'bg-danger')}>
                        {t('editor.tabs.noAddress')}
                    </span>
                )}

                {gate.length === 0 ? (
                    <span className={cn(SOLID, 'bg-warning')}>{t('editor.tabs.noPermission')}</span>
                ) : (
                    <span
                        title={gate.join(', ')}
                        className={cn(CHIP, 'max-w-[9rem] truncate bg-overlay font-mono text-ink-faint')}
                    >
                        {gate.join(', ')}
                    </span>
                )}
            </button>

            <button
                type={'button'}
                onClick={onToggle}
                aria-pressed={tab.enabled}
                aria-label={tab.enabled ? t('editor.tabs.hide') : t('editor.tabs.show')}
                className={cn(STEP, tab.enabled && 'text-accent')}
            >
                {tab.enabled ? (
                    <Eye className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                ) : (
                    <EyeOff className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                )}
            </button>

            <button
                type={'button'}
                onClick={() => onShuffle(-1)}
                disabled={first}
                aria-label={t('editor.tabs.moveUp')}
                className={STEP}
            >
                <ChevronUp className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
            </button>

            <button
                type={'button'}
                onClick={() => onShuffle(1)}
                disabled={last}
                aria-label={t('editor.tabs.moveDown')}
                className={STEP}
            >
                <ChevronDown className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
            </button>

            <button type={'button'} onClick={onEdit} aria-label={t('editor.tabs.settings')} className={GEAR}>
                <Settings2 className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
            </button>
        </div>
    );
}

function Picker({
    catalogue,
    tabs,
    onAddLink,
    onRestore,
}: {
    catalogue: BuiltIn[];
    tabs: ServerTab[];
    onAddLink: () => void;
    onRestore: (path: string) => void;
}) {
    const t = useT();

    const showing = new Set(tabs.filter((tab) => !tab.custom && tab.enabled).map((tab) => tab.key));

    const available = catalogue.filter((entry) => !showing.has(entry.path));

    return (
        <div className={'space-y-2 border-t border-line-field bg-overlay/40 px-3 py-2.5'}>
            <button
                type={'button'}
                onClick={onAddLink}
                className={
                    'flex w-full items-center gap-1.5 rounded-lg bg-raised px-2 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-card'
                }
            >
                <Plus aria-hidden={'true'} className={'h-4 w-4'} />
                {t('editor.tabs.addLink')}
            </button>

            {available.length > 0 && (
                <>
                    <p className={LABEL}>{t('editor.tabs.hiddenPages')}</p>

                    <div className={'flex flex-wrap gap-1'}>
                        {available.map((entry) => (
                            <button
                                key={entry.path}
                                type={'button'}
                                onClick={() => onRestore(entry.path)}
                                className={
                                    'rounded-md bg-raised px-1.5 py-0.5 text-[11px] text-ink-muted transition-colors hover:text-ink'
                                }
                            >
                                {entry.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

const TONE_LABELS: Record<BadgeTone, string> = {
    muted: 'Grey',
    accent: 'Accent',
    warning: 'Amber',
    danger: 'Red',
    success: 'Green',
};

function TabModal({
    tab: live,
    groups,
    known,
    addon,
    permissions,
    eggs,
    onPatch,
    onDelete,
    onClose,
}: {
    tab: ServerTab | null;
    groups: ServerTabGroup[];
    known?: BuiltIn;
    addon?: Addons[number];
    permissions: PermissionCatalogue;
    eggs: EditorEgg[];
    onPatch: (next: Partial<ServerTab>) => void;
    onDelete: () => void;
    onClose: () => void;
}) {
    const t = useT();

    const [advanced, setAdvanced] = useState(false);

    const [held, setHeld] = useState<ServerTab | null>(live);

    useEffect(() => {
        if (live !== null) {
            setHeld(live);
        }
    }, [live]);

    const tab = live ?? held;
    const key = live?.key ?? null;

    useEffect(() => setAdvanced(false), [key]);

    return (
        <Modal
            open={live !== null}
            wide={advanced}
            title={tab ? tab.label || known?.name || t('editor.tabs.untitled') : ''}
            onClose={onClose}
        >
            {tab && (
                <div className={cn('grid items-start gap-5', advanced && '[@media(min-width:900px)]:grid-cols-2')}>
                    <div className={'space-y-4'}>
                        {addon && (
                            <p
                                className={cn(
                                    'flex items-start gap-1.5 rounded-lg p-2 text-[12px] leading-snug',
                                    addon.enabled ? 'bg-accent/10 text-ink-muted' : 'bg-warning/10 text-ink-muted'
                                )}
                            >
                                <TriangleAlert
                                    aria-hidden={'true'}
                                    className={cn(
                                        'mt-px h-4 w-4 shrink-0',
                                        addon.enabled ? 'text-accent' : 'text-warning'
                                    )}
                                />
                                <span>
                                    {addon.enabled
                                        ? t('editor.tabs.addonOn', { addon: addon.name })
                                        : t('editor.tabs.addonOff', { addon: addon.name })}
                                </span>
                            </p>
                        )}

                        <label className={'block space-y-1'}>
                            <span className={LABEL}>{t('editor.tabs.name')}</span>
                            <input
                                type={'text'}
                                value={tab.label}
                                maxLength={40}
                                placeholder={known?.name ?? t('editor.tabs.namePlaceholder')}
                                onChange={(event) => onPatch({ label: event.target.value })}
                                className={INPUT}
                            />
                        </label>

                        <label className={'block space-y-1'}>
                            <span className={LABEL}>{t('editor.tabs.address')}</span>
                            <input
                                type={'text'}
                                value={tab.route}
                                maxLength={300}
                                placeholder={known?.path ?? 'https:// or /path'}
                                onChange={(event) => onPatch({ route: event.target.value })}
                                className={cn(INPUT, 'font-mono')}
                            />
                            <span className={'block text-[11px] leading-snug text-ink-faint'}>
                                {known
                                    ? t('editor.tabs.addressBuiltIn', { path: known.path })
                                    : t('editor.tabs.addressCustom')}
                            </span>
                        </label>

                        <div className={'grid grid-cols-2 gap-3'}>
                            <div className={'space-y-1'}>
                                <span className={LABEL}>{t('editor.tabs.icon')}</span>
                                <IconPicker value={tab.icon} onChange={(icon) => onPatch({ icon })} />
                            </div>

                            <div className={'space-y-1'}>
                                <span className={LABEL}>{t('editor.tabs.category')}</span>
                                <Select
                                    size={'sm'}
                                    value={tab.group}
                                    onChange={(group) => onPatch({ group })}
                                    options={[
                                        { value: '', label: t('editor.tabs.noCategory') },
                                        ...groups.map((group) => ({
                                            value: group.key,
                                            label: group.label || group.key,
                                        })),
                                    ]}
                                />
                            </div>
                        </div>

                        <Toggle
                            label={t('editor.tabs.visible')}
                            checked={tab.enabled}
                            onChange={() => onPatch({ enabled: !tab.enabled })}
                        />

                        {tab.custom && (
                            <Toggle
                                label={t('editor.tabs.newBrowserTab')}
                                checked={tab.external}
                                onChange={() => onPatch({ external: !tab.external })}
                            />
                        )}

                        <button
                            type={'button'}
                            onClick={() => setAdvanced((current) => !current)}
                            aria-expanded={advanced}
                            className={
                                'flex w-full items-center gap-2 rounded-lg bg-raised/60 px-3 py-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink'
                            }
                        >
                            <SlidersHorizontal aria-hidden={'true'} className={'h-4 w-4'} />
                            <span className={'flex-1 text-left'}>{t('editor.tabs.advanced')}</span>

                            {(tab.permission.length > 0 || tab.eggs.length > 0 || (tab.nodes ?? []).length > 0) && (
                                <span className={'rounded bg-accent px-1.5 text-[11px] font-semibold text-ink-inverse'}>
                                    {tab.permission.length + tab.eggs.length + (tab.nodes ?? []).length}
                                </span>
                            )}

                            <ChevronDown
                                aria-hidden={'true'}
                                className={cn('h-4 w-4 transition-transform', advanced && 'rotate-180')}
                            />
                        </button>

                        {tab.custom && (
                            <button
                                type={'button'}
                                onClick={onDelete}
                                className={
                                    'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-danger transition-colors hover:bg-danger/10'
                                }
                            >
                                <Trash2 className={'h-4 w-4'} aria-hidden={'true'} />
                                {t('editor.tabs.dropTab')}
                            </button>
                        )}
                    </div>

                    {advanced && (
                        <Audience
                            permissions={permissions}
                            eggs={eggs}
                            value={tab.permission}
                            chosenEggs={tab.eggs}
                            inherited={permissionList(known?.permission ?? null)}
                            tab={tab}
                            onPermissions={(permission) => onPatch({ permission })}
                            onEggs={(next) => onPatch({ eggs: next })}
                            onPatch={onPatch}
                        />
                    )}
                </div>
            )}
        </Modal>
    );
}

function CategoryModal({
    group: live,
    onPatch,
    onDelete,
    onClose,
}: {
    group: ServerTabGroup | null;
    onPatch: (next: Partial<ServerTabGroup>) => void;
    onDelete: () => void;
    onClose: () => void;
}) {
    const t = useT();

    const [held, setHeld] = useState<ServerTabGroup | null>(live);

    useEffect(() => {
        if (live !== null) {
            setHeld(live);
        }
    }, [live]);

    const group = live ?? held;
    const fallback = group ? t(`nav.groups.${group.key}`, { defaultValue: group.key }) : '';

    return (
        <Modal open={live !== null} title={group ? group.label || fallback : ''} onClose={onClose}>
            {group && (
                <>
                    <label className={'block space-y-1'}>
                        <span className={LABEL}>{t('editor.tabs.categoryName')}</span>
                        <input
                            type={'text'}
                            value={group.label}
                            maxLength={40}
                            placeholder={fallback}
                            onChange={(event) => onPatch({ label: event.target.value })}
                            className={INPUT}
                        />
                    </label>

                    <div className={'space-y-1'}>
                        <span className={LABEL}>{t('editor.tabs.icon')}</span>
                        <IconPicker value={group.icon} onChange={(icon) => onPatch({ icon })} />
                    </div>

                    <Toggle
                        label={t('editor.tabs.visible')}
                        checked={group.enabled}
                        onChange={() => onPatch({ enabled: !group.enabled })}
                    />

                    <Toggle
                        label={t('editor.tabs.canFold')}
                        checked={group.collapsible}
                        onChange={() => onPatch({ collapsible: !group.collapsible })}
                    />

                    {group.collapsible && (
                        <Toggle
                            label={t('editor.tabs.openByDefault')}
                            checked={group.open}
                            onChange={() => onPatch({ open: !group.open })}
                        />
                    )}

                    <button
                        type={'button'}
                        onClick={onDelete}
                        className={
                            'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-danger transition-colors hover:bg-danger/10'
                        }
                    >
                        <Trash2 className={'h-4 w-4'} aria-hidden={'true'} />
                        {t('editor.tabs.dropCategory')}
                    </button>
                </>
            )}
        </Modal>
    );
}

function Audience({
    permissions,
    eggs,
    value,
    chosenEggs,
    inherited,
    tab,
    onPermissions,
    onEggs,
    onPatch,
}: {
    permissions: PermissionCatalogue;
    eggs: EditorEgg[];
    value: string[];
    chosenEggs: string[];
    inherited: string[];
    tab: ServerTab;
    onPermissions: (value: string[]) => void;
    onEggs: (value: string[]) => void;
    onPatch: (next: Partial<ServerTab>) => void;
}) {
    const t = useT();
    const [view, setView] = useState<'permissions' | 'eggs' | 'nodes'>('permissions');
    const [query, setQuery] = useState('');

    const nodes = session.data?.nodes ?? [];
    const chosenNodes = tab.nodes ?? [];

    const lockedNames = nodes.filter((node) => chosenNodes.includes(node.id)).map((node) => node.name);
    const openNames = nodes.filter((node) => !chosenNodes.includes(node.id)).map((node) => node.name);

    const catalogue = useMemo(
        () =>
            Object.entries(permissions).flatMap(([group, spec]) => [
                `${group}.*`,
                ...Object.keys(spec.keys ?? {}).map((key) => `${group}.${key}`),
            ]),
        [permissions]
    );

    const eggsView = view === 'eggs';
    const nodesView = view === 'nodes';

    const chosen = nodesView ? chosenNodes.map(String) : eggsView ? chosenEggs : value;

    const commit = nodesView
        ? (next: string[]) => onPatch({ nodes: next.map(Number) })
        : eggsView
        ? onEggs
        : onPermissions;

    const needle = query.trim().toLowerCase();

    const visible = nodesView
        ? nodes
              .filter((node) => needle === '' || node.name.toLowerCase().includes(needle))
              .map((node) => String(node.id))
        : eggsView
        ? eggs
              .filter((egg) => needle === '' || `${egg.nest} ${egg.name}`.toLowerCase().includes(needle))
              .map((egg) => egg.uuid)
        : catalogue.filter((key) => needle === '' || key.toLowerCase().includes(needle));

    const toggle = (key: string) =>
        commit(chosen.includes(key) ? chosen.filter((one) => one !== key) : [...chosen, key]);

    const all = visible.length > 0 && visible.every((key) => chosen.includes(key));

    const buckets = visible.reduce<Record<string, string[]>>((out, key) => {
        const bucket = nodesView
            ? t('editor.tabs.nodes')
            : eggsView
            ? eggs.find((egg) => egg.uuid === key)?.nest ?? '-'
            : key.split('.')[0]!;

        (out[bucket] ??= []).push(key);

        return out;
    }, {});

    const name = (key: string) =>
        nodesView
            ? nodes.find((node) => String(node.id) === key)?.name ?? key
            : eggsView
            ? eggs.find((egg) => egg.uuid === key)?.name ?? key
            : key;

    const switchTo = (next: 'permissions' | 'eggs' | 'nodes') => {
        setView(next);
        setQuery('');
    };

    return (
        <div className={'space-y-2.5 rounded-xl bg-raised/60 p-3'}>
            <div className={'flex gap-1 rounded-lg bg-overlay p-0.5'}>
                {(
                    [
                        ['permissions', t('editor.tabs.permissions'), value.length],
                        ['eggs', t('editor.tabs.eggs'), chosenEggs.length],
                        ['nodes', t('editor.tabs.nodes'), chosenNodes.length],
                    ] as const
                ).map(([id, label, total]) => (
                    <button
                        key={id}
                        type={'button'}
                        onClick={() => switchTo(id)}
                        aria-pressed={view === id}
                        className={cn(
                            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium transition-colors',
                            view === id ? 'bg-card text-ink' : 'text-ink-faint hover:text-ink'
                        )}
                    >
                        {label}
                        {total > 0 && (
                            <span className={'rounded bg-accent px-1 text-[10px] font-semibold text-ink-inverse'}>
                                {total}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {nodesView && (
                <p className={'text-[11px] leading-snug text-ink-faint'}>
                    {chosenNodes.length === 0
                        ? t('editor.tabs.everyNode')
                        : openNames.length === 0
                        ? t('editor.tabs.nodeEvery')
                        : t('editor.tabs.nodeLocked', {
                              locked: lockedNames.join(', '),
                              open: openNames.join(', '),
                          })}
                </p>
            )}

            {!eggsView && !nodesView && inherited.length > 0 && (
                <p className={'text-[11px] leading-snug text-ink-faint'}>
                    {t('editor.tabs.builtInRequires', { permission: inherited.join(', ') })}
                </p>
            )}

            <div className={'relative'}>
                <Search
                    aria-hidden={'true'}
                    className={'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint'}
                />
                <input
                    type={'search'}
                    value={query}
                    placeholder={
                        nodesView
                            ? t('editor.tabs.searchNodes')
                            : eggsView
                            ? t('editor.tabs.searchEggs')
                            : t('editor.tabs.searchPermissions')
                    }
                    aria-label={
                        nodesView
                            ? t('editor.tabs.searchNodes')
                            : eggsView
                            ? t('editor.tabs.searchEggs')
                            : t('editor.tabs.searchPermissions')
                    }
                    onChange={(event) => setQuery(event.target.value)}
                    className={cn(INPUT, 'bg-base pl-9')}
                />
            </div>

            <div className={'flex items-center gap-3'}>
                {visible.length > 0 && (
                    <button
                        type={'button'}
                        onClick={() =>
                            commit(
                                all
                                    ? chosen.filter((key) => !visible.includes(key))
                                    : [...chosen, ...visible.filter((key) => !chosen.includes(key))]
                            )
                        }
                        className={'text-[12px] font-medium text-accent transition-colors hover:text-ink'}
                    >
                        {all ? t('editor.tabs.deselectAll') : t('editor.tabs.selectAll')}
                    </button>
                )}

                {chosen.length > 0 && (
                    <button
                        type={'button'}
                        onClick={() => commit([])}
                        className={'text-[12px] font-medium text-ink-faint transition-colors hover:text-danger'}
                    >
                        {t('editor.tabs.clear')}
                    </button>
                )}
            </div>

            <div className={'max-h-80 space-y-2 overflow-y-auto'}>
                {visible.length === 0 && (
                    <p className={'py-2 text-[12px] text-ink-faint'}>
                        {!eggsView && !nodesView && catalogue.length === 0
                            ? t('editor.tabs.permissionsMissing')
                            : t('editor.tabs.noMatches')}
                    </p>
                )}

                {Object.entries(buckets).map(([bucket, keys]) => (
                    <div key={bucket} className={'space-y-0.5'}>
                        <p className={LABEL}>{bucket}</p>

                        {keys.map((key) => (
                            <label
                                key={key}
                                className={cn(
                                    'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors',
                                    chosen.includes(key) ? 'bg-accent/10' : 'hover:bg-overlay/60'
                                )}
                            >
                                <Checkbox size={'sm'} checked={chosen.includes(key)} onChange={() => toggle(key)} />

                                <span
                                    className={cn(
                                        'min-w-0 flex-1 truncate text-[13px]',
                                        eggsView || nodesView ? 'text-ink-muted' : 'font-mono text-ink-muted'
                                    )}
                                >
                                    {name(key)}
                                </span>
                            </label>
                        ))}
                    </div>
                ))}
            </div>

            {nodesView && chosenNodes.length > 0 && (
                <div className={'space-y-2 border-t border-line-field pt-2.5'}>
                    <div className={'grid gap-2 sm:grid-cols-2'}>
                        <input
                            type={'text'}
                            value={tab.badge ?? ''}
                            maxLength={24}
                            placeholder={t('editor.tabs.badgeWords')}
                            aria-label={t('editor.tabs.badgeWords')}
                            onChange={(event) => onPatch({ badge: event.target.value })}
                            className={cn(INPUT, 'bg-base text-[13px]')}
                        />

                        <Select
                            size={'sm'}
                            value={tab.badgeColor ?? 'muted'}
                            onChange={(next) => onPatch({ badgeColor: next as BadgeTone })}
                            options={BADGE_TONES.map((tone) => ({ value: tone, label: TONE_LABELS[tone] }))}
                        />
                    </div>

                    <textarea
                        rows={2}
                        value={tab.note ?? ''}
                        maxLength={300}
                        placeholder={t('editor.tabs.badgeNote')}
                        aria-label={t('editor.tabs.badgeNote')}
                        onChange={(event) => onPatch({ note: event.target.value })}
                        className={cn(INPUT, 'bg-base text-[13px] leading-relaxed')}
                    />
                </div>
            )}

            {!nodesView && (
                <p className={'text-[11px] leading-snug text-ink-faint'}>
                    {eggsView
                        ? chosenEggs.length === 0
                            ? t('editor.tabs.everyEgg')
                            : t('editor.tabs.eggCount', { total: chosenEggs.length })
                        : t('editor.tabs.permissionsHint')}
                </p>
            )}
        </div>
    );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return <Checkbox size={'sm'} label={label} checked={checked} onChange={onChange} />;
}
