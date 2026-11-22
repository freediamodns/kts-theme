import React, { Fragment, ReactNode, useRef, useState } from 'react';
import { Listbox, Popover, Transition } from '@headlessui/react';
import {
    Check,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    Loader2,
    Plus,
    Search,
    Server,
    Trash2,
    Upload,
} from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import useAutoId from '@/dezerx/lib/useAutoId';
import adminApi from '@/dezerx/lib/adminApi';
import { SIDEBAR_LINK_ICONS } from '@/dezerx/lib/linkIcons';
import { QUICK_LINK_ART, type QuickLinkCard } from '@/dezerx/lib/panelTheme';
import type {
    ConsoleRule,
    EggArt,
    SidebarLink,
    SidebarNavItem,
    ThemeImage,
    ThemeNotice,
} from '@/dezerx/lib/panelTheme';
import { ART_LIMIT, ART_MAX_LINES, artLines } from '@/dezerx/lib/consoleLines';
import { shippedArt, shippedArtSet } from '@/dezerx/lib/serverArtwork';
import { Checkbox, Select } from '@/dezerx/components/ui';
import { session } from '@/dezerx/components/editor/session';
import { OptionPreview, hasPreview } from '@/dezerx/components/editor/Previews';
import { isAxiosError } from 'axios';

export interface Choice {
    value: string;
    label: string;
}

export function Field({
    label,
    hint,
    children,
    action,
}: {
    label: string;
    hint?: string;
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className={'space-y-2'}>
            <div className={'flex items-start justify-between gap-3'}>
                <div className={'min-w-0'}>
                    <p className={'text-[15px] font-semibold tracking-tight text-ink'}>{label}</p>
                    {hint && <p className={'mt-1 text-[13px] leading-snug text-ink-faint'}>{hint}</p>}
                </div>
                {action}
            </div>

            {children}
        </div>
    );
}

export function ChoiceField({
    label,
    hint,
    choices,
    value,
    preview,
    onChange,
}: {
    label: string;
    hint?: string;
    choices: Choice[];
    value: string;
    preview?: string;
    onChange: (value: string) => void;
}) {
    const drawn = hasPreview(preview);

    return (
        <Field label={label} hint={hint}>
            <div
                className={cn(
                    'grid gap-2',
                    drawn ? 'grid-cols-2' : 'grid-cols-2 [@media(min-width:640px)]:grid-cols-3'
                )}
            >
                {choices.map((choice) => {
                    const selected = choice.value === value;

                    return (
                        <button
                            key={choice.value}
                            type={'button'}
                            onClick={() => onChange(choice.value)}
                            aria-pressed={selected}
                            className={cn(
                                'group rounded-xl text-left transition-colors',
                                drawn ? 'p-2' : 'px-3 py-2.5',
                                selected ? 'bg-accent/20' : 'bg-raised hover:bg-overlay'
                            )}
                        >
                            {drawn && preview && <OptionPreview kind={preview} value={choice.value} />}

                            <span
                                className={cn(
                                    'flex items-center gap-1 text-[12px] font-medium',
                                    drawn && 'mt-1.5',
                                    selected ? 'text-ink' : 'text-ink-muted'
                                )}
                            >
                                {selected && (
                                    <Check aria-hidden={'true'} className={'h-3.5 w-3.5 shrink-0 text-accent'} />
                                )}
                                <span className={'truncate'}>{choice.label}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </Field>
    );
}

export function RangeField({
    label,
    hint,
    value,
    min,
    max,
    step = 1,
    unit = '',
    preview,
    onChange,
}: {
    label: string;
    hint?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    preview?: string;
    onChange: (value: number) => void;
}) {
    const id = useAutoId();

    return (
        <Field
            label={label}
            hint={hint}
            action={
                <span
                    className={
                        'shrink-0 rounded-lg bg-raised px-2 py-1 text-[12px] font-semibold tabular-nums text-ink'
                    }
                >
                    {value}
                    {unit}
                </span>
            }
        >
            {hasPreview(preview) && preview && (
                <div className={'w-24'}>
                    <OptionPreview kind={preview} value={String(value)} />
                </div>
            )}

            <input
                id={id}
                type={'range'}
                min={min}
                max={max}
                step={step}
                value={value}
                aria-label={label}
                onChange={(event) => onChange(Number(event.target.value))}
                className={'config-slider w-full'}
            />
        </Field>
    );
}

export function ToggleField({
    label,
    hint,
    value,
    onChange,
}: {
    label: string;
    hint?: string;
    value: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <button
            type={'button'}
            role={'switch'}
            aria-checked={value}
            onClick={() => onChange(!value)}
            className={
                'flex w-full items-start gap-3 rounded-xl bg-raised p-3 text-left transition-colors hover:bg-overlay'
            }
        >
            <span className={'min-w-0 flex-1'}>
                <span className={'block text-[15px] font-semibold tracking-tight text-ink'}>{label}</span>
                {hint && <span className={'mt-0.5 block text-[12px] leading-snug text-ink-faint'}>{hint}</span>}
            </span>

            <span
                aria-hidden={'true'}
                className={cn(
                    'mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
                    value ? 'bg-accent' : 'bg-overlay'
                )}
            >
                <span
                    className={cn(
                        'block h-[18px] w-[18px] rounded-full transition-[transform,background-color]',
                        value ? 'translate-x-4 bg-accent-ink' : 'translate-x-0 bg-white'
                    )}
                />
            </span>
        </button>
    );
}

const FIELD_INPUT =
    'w-full rounded-xl border-0 bg-raised px-3 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent';

export function TextField({
    label,
    hint,
    value,
    placeholder,
    maxLength,
    multiline = false,
    onChange,
}: {
    label: string;
    hint?: string;
    value: string;
    placeholder?: string;
    maxLength?: number;
    multiline?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <Field label={label} hint={hint}>
            {multiline ? (
                <textarea
                    rows={3}
                    value={value}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    aria-label={label}
                    onChange={(event) => onChange(event.target.value)}
                    className={FIELD_INPUT}
                />
            ) : (
                <input
                    type={'text'}
                    value={value}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    aria-label={label}
                    onChange={(event) => onChange(event.target.value)}
                    className={FIELD_INPUT}
                />
            )}
        </Field>
    );
}

export function ImageField({
    label,
    hint,
    value,
    uploadUrl,
    onChange,
    onError,
}: {
    label: string;
    hint?: string;
    value: string;
    uploadUrl: string;
    onChange: (value: string) => void;
    onError: (message: string) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);

    const upload = async (file: File) => {
        setBusy(true);

        try {
            const body = new FormData();
            body.append('file', file);

            const { data } = await adminApi.post(uploadUrl, body);
            onChange(data.path as string);
        } catch (error) {
            onError(
                isAxiosError(error) ? error.response?.data?.message ?? 'That upload failed.' : 'That upload failed.'
            );
        } finally {
            setBusy(false);

            if (input.current) {
                input.current.value = '';
            }
        }
    };

    return (
        <Field label={label} hint={hint}>
            {value !== '' && (
                <div
                    aria-hidden={'true'}
                    style={{ backgroundImage: `url(${value})` }}
                    className={'h-20 w-full rounded-xl bg-raised bg-contain bg-center bg-no-repeat'}
                />
            )}

            <div className={'flex gap-2'}>
                <input
                    type={'text'}
                    value={value}
                    placeholder={'/dezerx/uploads/...'}
                    aria-label={label}
                    onChange={(event) => onChange(event.target.value)}
                    className={
                        'min-w-0 flex-1 rounded-xl border-0 bg-raised px-3 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent'
                    }
                />

                <button
                    type={'button'}
                    onClick={() => input.current?.click()}
                    disabled={busy}
                    aria-label={'Upload an image'}
                    className={
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-raised text-ink-muted transition-colors hover:bg-overlay hover:text-ink disabled:opacity-50'
                    }
                >
                    {busy ? (
                        <Loader2 className={'h-[18px] w-[18px] animate-spin'} />
                    ) : (
                        <Upload className={'h-[18px] w-[18px]'} />
                    )}
                </button>

                {value !== '' && (
                    <button
                        type={'button'}
                        onClick={() => onChange('')}
                        aria-label={'Remove the image'}
                        className={
                            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-raised text-ink-muted transition-colors hover:bg-danger/15 hover:text-danger'
                        }
                    >
                        <Trash2 className={'h-[18px] w-[18px]'} />
                    </button>
                )}
            </div>

            <input
                ref={input}
                type={'file'}
                accept={'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'}
                className={'hidden'}
                onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                        void upload(file);
                    }
                }}
            />
        </Field>
    );
}

export function move<T>(list: T[], from: number, to: number): T[] {
    if (to < 0 || to >= list.length) {
        return list;
    }

    const next = [...list];
    const item = next[from];

    if (item === undefined) {
        return list;
    }

    next.splice(from, 1);
    next.splice(to, 0, item);

    return next;
}

export function RowShell({
    children,
    onRemove,
    onMove,
    canMoveUp = false,
    canMoveDown = false,
    enabled,
    onToggle,
    dimmed = false,
}: {
    children: ReactNode;
    onRemove?: () => void;
    onMove?: (delta: number) => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    enabled?: boolean;
    onToggle?: () => void;
    dimmed?: boolean;
}) {
    return (
        <div className={cn('space-y-2 rounded-xl bg-raised p-3 transition-opacity', dimmed && 'opacity-50')}>
            <div className={'flex items-start gap-2'}>
                <div className={'min-w-0 flex-1 space-y-2'}>{children}</div>

                <div className={'flex shrink-0 flex-col items-center gap-0.5'}>
                    {onToggle && (
                        <button
                            type={'button'}
                            onClick={onToggle}
                            aria-pressed={enabled}
                            aria-label={enabled ? 'Hide' : 'Show'}
                            className={cn(
                                'rounded-lg p-1.5 transition-colors',
                                enabled ? 'text-accent hover:bg-overlay' : 'text-ink-faint hover:text-ink'
                            )}
                        >
                            {enabled ? (
                                <Eye className={'h-4 w-4'} aria-hidden={'true'} />
                            ) : (
                                <EyeOff className={'h-4 w-4'} aria-hidden={'true'} />
                            )}
                        </button>
                    )}

                    {onMove && (
                        <>
                            <button
                                type={'button'}
                                disabled={!canMoveUp}
                                onClick={() => onMove(-1)}
                                aria-label={'Move up'}
                                className={
                                    'rounded-lg p-1 text-ink-faint transition-colors hover:text-ink disabled:opacity-30'
                                }
                            >
                                <ChevronUp className={'h-4 w-4'} aria-hidden={'true'} />
                            </button>
                            <button
                                type={'button'}
                                disabled={!canMoveDown}
                                onClick={() => onMove(1)}
                                aria-label={'Move down'}
                                className={
                                    'rounded-lg p-1 text-ink-faint transition-colors hover:text-ink disabled:opacity-30'
                                }
                            >
                                <ChevronDown className={'h-4 w-4'} aria-hidden={'true'} />
                            </button>
                        </>
                    )}

                    {onRemove && (
                        <button
                            type={'button'}
                            onClick={onRemove}
                            aria-label={'Remove'}
                            className={
                                'rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-danger/15 hover:text-danger'
                            }
                        >
                            <Trash2 className={'h-4 w-4'} aria-hidden={'true'} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
    const names = Object.keys(SIDEBAR_LINK_ICONS);
    const Current = SIDEBAR_LINK_ICONS[value] ?? SIDEBAR_LINK_ICONS.link;

    return (
        <Listbox value={value} onChange={onChange}>
            {({ open }) => (
                <div className={'relative'}>
                    <Listbox.Button
                        aria-label={`Icon: ${value}`}
                        className={cn(
                            'group relative flex h-11 w-full items-center gap-2 rounded-lg border bg-raised/80 px-3 pr-9 text-left text-[14px] text-ink',
                            'transition-colors duration-150 focus:border-accent/60 focus:outline-none',
                            'border-line-field hover:border-ink-faint/25'
                        )}
                    >
                        <Current className={'h-[18px] w-[18px] shrink-0 text-ink-muted'} />
                        <span className={'min-w-0 flex-1 truncate'}>{value}</span>

                        <ChevronDown
                            aria-hidden={'true'}
                            className={cn(
                                'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint transition-transform',
                                open && 'rotate-180'
                            )}
                        />
                    </Listbox.Button>

                    <Transition
                        as={Fragment}
                        leave={'transition ease-in duration-75'}
                        leaveFrom={'opacity-100 scale-100'}
                        leaveTo={'opacity-0 scale-95'}
                    >
                        <Listbox.Options
                            className={
                                'absolute z-[95] mt-1 max-h-64 w-full origin-top overflow-y-auto rounded-xl border border-line-field bg-card p-1 shadow-panel focus:outline-none'
                            }
                        >
                            {names.map((name) => {
                                const Icon = SIDEBAR_LINK_ICONS[name];

                                return (
                                    <Listbox.Option key={name} value={name} className={'focus:outline-none'}>
                                        {({ active, selected }) => (
                                            <div
                                                className={cn(
                                                    'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px]',
                                                    active ? 'bg-overlay text-ink' : 'text-ink-muted',
                                                    selected && 'font-medium text-ink'
                                                )}
                                            >
                                                <Icon className={'h-[18px] w-[18px] shrink-0'} />
                                                <span className={'min-w-0 flex-1 truncate'}>{name}</span>
                                                <Check
                                                    aria-hidden={'true'}
                                                    className={cn(
                                                        'h-4 w-4 shrink-0 text-accent',
                                                        selected ? 'opacity-100' : 'opacity-0'
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </Listbox.Option>
                                );
                            })}
                        </Listbox.Options>
                    </Transition>
                </div>
            )}
        </Listbox>
    );
}

export const INPUT =
    'w-full rounded-lg border-0 bg-overlay px-3 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent';

export function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type={'button'}
            onClick={onClick}
            className={
                'flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-field py-2 text-[13px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink'
            }
        >
            <Plus className={'h-4 w-4'} aria-hidden={'true'} />
            {label}
        </button>
    );
}

export function QuickLinkListField({
    label,
    hint,
    value,
    max,
    onChange,
}: {
    label: string;
    hint?: string;
    value: QuickLinkCard[];
    max: number;
    onChange: (value: QuickLinkCard[]) => void;
}) {
    const patch = (index: number, next: Partial<QuickLinkCard>) =>
        onChange(value.map((link, at) => (at === index ? { ...link, ...next } : link)));

    return (
        <Field label={label} hint={hint}>
            <div className={'space-y-2'}>
                {value.map((link, index) => (
                    <RowShell
                        key={index}
                        dimmed={!link.enabled}
                        onRemove={() => onChange(value.filter((_, at) => at !== index))}
                        onMove={(delta) => onChange(move(value, index, index + delta))}
                        canMoveUp={index > 0}
                        canMoveDown={index < value.length - 1}
                        enabled={link.enabled}
                        onToggle={() => patch(index, { enabled: !link.enabled })}
                    >
                        <input
                            type={'text'}
                            value={link.label}
                            maxLength={40}
                            placeholder={'Label'}
                            aria-label={'Card label'}
                            onChange={(event) => patch(index, { label: event.target.value })}
                            className={INPUT}
                        />
                        <input
                            type={'text'}
                            value={link.blurb}
                            maxLength={80}
                            placeholder={'One line under the label'}
                            aria-label={'Card blurb'}
                            onChange={(event) => patch(index, { blurb: event.target.value })}
                            className={INPUT}
                        />
                        <input
                            type={'text'}
                            value={link.url}
                            maxLength={300}
                            placeholder={'https:// or /path'}
                            aria-label={'Card address'}
                            onChange={(event) => patch(index, { url: event.target.value })}
                            className={INPUT}
                        />

                        <div className={'flex flex-wrap items-center gap-2'}>
                            <IconPicker value={link.icon} onChange={(icon) => patch(index, { icon })} />

                            <div className={'min-w-[8rem] flex-1'}>
                                <Select
                                    size={'sm'}
                                    value={link.art}
                                    onChange={(art) => patch(index, { art: art as QuickLinkCard['art'] })}
                                    options={Object.entries(QUICK_LINK_ART).map(([key, name]) => ({
                                        value: key,
                                        label: name,
                                    }))}
                                />
                            </div>

                            <Checkbox
                                size={'sm'}
                                label={'Featured'}
                                checked={link.feature}
                                onChange={() => patch(index, { feature: !link.feature })}
                            />
                        </div>
                    </RowShell>
                ))}

                {value.length < max && (
                    <AddRow
                        label={'Add a card'}
                        onClick={() =>
                            onChange([
                                ...value,
                                {
                                    label: '',
                                    blurb: '',
                                    url: '',
                                    icon: 'link',
                                    feature: false,
                                    art: 'none',
                                    enabled: true,
                                },
                            ])
                        }
                    />
                )}
            </div>
        </Field>
    );
}

export function LinkListField({
    label,
    hint,
    value,
    max,
    onChange,
}: {
    label: string;
    hint?: string;
    value: SidebarLink[];
    max: number;
    onChange: (value: SidebarLink[]) => void;
}) {
    const patch = (index: number, next: Partial<SidebarLink>) =>
        onChange(value.map((link, at) => (at === index ? { ...link, ...next } : link)));

    return (
        <Field label={label} hint={hint}>
            <div className={'space-y-2'}>
                {value.map((link, index) => (
                    <RowShell
                        key={index}
                        dimmed={!link.enabled}
                        onRemove={() => onChange(value.filter((_, at) => at !== index))}
                        onMove={(delta) => onChange(move(value, index, index + delta))}
                        canMoveUp={index > 0}
                        canMoveDown={index < value.length - 1}
                        enabled={link.enabled}
                        onToggle={() => patch(index, { enabled: !link.enabled })}
                    >
                        <input
                            type={'text'}
                            value={link.label}
                            maxLength={40}
                            placeholder={'Label'}
                            aria-label={'Link label'}
                            onChange={(event) => patch(index, { label: event.target.value })}
                            className={INPUT}
                        />
                        <input
                            type={'text'}
                            value={link.url}
                            maxLength={300}
                            placeholder={'https:// or /path'}
                            aria-label={'Link address'}
                            onChange={(event) => patch(index, { url: event.target.value })}
                            className={INPUT}
                        />

                        <IconPicker value={link.icon} onChange={(icon) => patch(index, { icon })} />
                    </RowShell>
                ))}

                {value.length < max && (
                    <AddRow
                        label={'Add a link'}
                        onClick={() => onChange([...value, { label: '', url: '', icon: 'link', enabled: true }])}
                    />
                )}
            </div>
        </Field>
    );
}

export function ImageListField({
    label,
    hint,
    value,
    max,
    uploadUrl,
    onChange,
    onError,
}: {
    label: string;
    hint?: string;
    value: ThemeImage[];
    max: number;
    uploadUrl: string;
    onChange: (value: ThemeImage[]) => void;
    onError: (message: string) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [target, setTarget] = useState<number | null>(null);

    const patch = (index: number, next: Partial<ThemeImage>) =>
        onChange(value.map((entry, at) => (at === index ? { ...entry, ...next } : entry)));

    const upload = async (file: File) => {
        const index = target;

        if (index === null) {
            return;
        }

        try {
            const body = new FormData();
            body.append('file', file);

            const { data } = await adminApi.post(uploadUrl, body);
            patch(index, { url: data.path as string });
        } catch (error) {
            onError(
                isAxiosError(error) ? error.response?.data?.message ?? 'That upload failed.' : 'That upload failed.'
            );
        } finally {
            setTarget(null);

            if (input.current) {
                input.current.value = '';
            }
        }
    };

    return (
        <Field label={label} hint={hint}>
            <div className={'space-y-2'}>
                {value.map((entry, index) => (
                    <RowShell
                        key={index}
                        dimmed={!entry.enabled}
                        onRemove={() => onChange(value.filter((_, at) => at !== index))}
                        onMove={(delta) => onChange(move(value, index, index + delta))}
                        canMoveUp={index > 0}
                        canMoveDown={index < value.length - 1}
                        enabled={entry.enabled}
                        onToggle={() => patch(index, { enabled: !entry.enabled })}
                    >
                        <div className={'flex gap-2'}>
                            <span
                                aria-hidden={'true'}
                                style={entry.url === '' ? undefined : { backgroundImage: `url(${entry.url})` }}
                                className={
                                    'h-11 w-[4.5rem] shrink-0 rounded-lg bg-overlay bg-cover bg-center bg-no-repeat'
                                }
                            />

                            <div className={'min-w-0 flex-1 space-y-2'}>
                                <input
                                    type={'text'}
                                    value={entry.url}
                                    maxLength={300}
                                    placeholder={'/dezerx/uploads/... or https://'}
                                    aria-label={'Picture address'}
                                    onChange={(event) => patch(index, { url: event.target.value })}
                                    className={INPUT}
                                />

                                <input
                                    type={'text'}
                                    value={entry.label}
                                    maxLength={60}
                                    placeholder={'Name (optional)'}
                                    aria-label={'Picture name'}
                                    onChange={(event) => patch(index, { label: event.target.value })}
                                    className={INPUT}
                                />
                            </div>

                            <button
                                type={'button'}
                                onClick={() => {
                                    setTarget(index);
                                    input.current?.click();
                                }}
                                disabled={target !== null}
                                aria-label={'Upload a picture'}
                                className={
                                    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-overlay text-ink-muted transition-colors hover:text-ink disabled:opacity-50'
                                }
                            >
                                {target === index ? (
                                    <Loader2 className={'h-4 w-4 animate-spin'} aria-hidden={'true'} />
                                ) : (
                                    <Upload className={'h-4 w-4'} aria-hidden={'true'} />
                                )}
                            </button>
                        </div>
                    </RowShell>
                ))}

                {value.length < max && (
                    <AddRow
                        label={'Add a picture'}
                        onClick={() => onChange([...value, { url: '', label: '', enabled: true }])}
                    />
                )}

                <input
                    ref={input}
                    type={'file'}
                    accept={'image/*'}
                    className={'hidden'}
                    onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                            void upload(file);
                        }
                    }}
                />
            </div>
        </Field>
    );
}

const TONES: { value: ThemeNotice['tone']; label: string; dot: string }[] = [
    { value: 'info', label: 'Info', dot: 'bg-accent' },
    { value: 'success', label: 'Success', dot: 'bg-success' },
    { value: 'warning', label: 'Warning', dot: 'bg-warning' },
    { value: 'danger', label: 'Danger', dot: 'bg-danger' },
];

const ICON_MODES: { value: 'auto' | 'preset' | 'custom'; label: string }[] = [
    { value: 'auto', label: 'Automatic' },
    { value: 'preset', label: 'Choose icon' },
    { value: 'custom', label: 'Upload SVG' },
];

function NoticeIconField({
    icon,
    iconImage,
    uploadUrl,
    onChange,
    onError,
}: {
    icon: string;
    iconImage: string;
    uploadUrl: string;
    onChange: (next: Partial<ThemeNotice>) => void;
    onError: (message: string) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [mode, setMode] = useState<'auto' | 'preset' | 'custom'>(
        iconImage !== '' ? 'custom' : icon !== '' ? 'preset' : 'auto'
    );

    const upload = async (file: File) => {
        setBusy(true);

        try {
            const body = new FormData();
            body.append('file', file);

            const { data } = await adminApi.post(uploadUrl, body);
            onChange({ iconImage: data.path as string });
        } catch (error) {
            onError(
                isAxiosError(error) ? error.response?.data?.message ?? 'That upload failed.' : 'That upload failed.'
            );
        } finally {
            setBusy(false);

            if (input.current) {
                input.current.value = '';
            }
        }
    };

    const select = (next: 'auto' | 'preset' | 'custom') => {
        setMode(next);

        if (next === 'auto') {
            onChange({ icon: '', iconImage: '' });
        }

        if (next === 'preset') {
            onChange({ iconImage: '', icon: icon || 'bell' });
        }
    };

    return (
        <div className={'space-y-1.5'}>
            <div className={'flex flex-wrap gap-1'}>
                {ICON_MODES.map((option) => (
                    <button
                        key={option.value}
                        type={'button'}
                        aria-pressed={mode === option.value}
                        onClick={() => select(option.value)}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium transition-colors',
                            mode === option.value ? 'bg-overlay text-ink' : 'text-ink-faint hover:text-ink-muted'
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {mode === 'preset' && (
                <IconPicker value={icon || 'bell'} onChange={(next) => onChange({ icon: next, iconImage: '' })} />
            )}

            {mode === 'custom' && (
                <div className={'flex items-center gap-2'}>
                    {iconImage !== '' && (
                        <span
                            aria-hidden={'true'}
                            style={{ backgroundImage: `url(${iconImage})` }}
                            className={'h-8 w-8 shrink-0 rounded-lg bg-overlay bg-contain bg-center bg-no-repeat'}
                        />
                    )}

                    <button
                        type={'button'}
                        onClick={() => input.current?.click()}
                        disabled={busy}
                        className={
                            'inline-flex h-8 items-center gap-1.5 rounded-lg bg-overlay px-2.5 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-50'
                        }
                    >
                        {busy ? (
                            <Loader2 className={'h-3.5 w-3.5 animate-spin'} aria-hidden={'true'} />
                        ) : (
                            <Upload className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        )}
                        {iconImage !== '' ? 'Replace' : 'Upload'}
                    </button>

                    {iconImage !== '' && (
                        <button
                            type={'button'}
                            onClick={() => onChange({ iconImage: '' })}
                            aria-label={'Remove the custom icon'}
                            className={
                                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-overlay text-ink-muted transition-colors hover:bg-danger/15 hover:text-danger'
                            }
                        >
                            <Trash2 className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        </button>
                    )}
                </div>
            )}

            <input
                ref={input}
                type={'file'}
                accept={'image/svg+xml,image/png,image/webp'}
                className={'hidden'}
                onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                        void upload(file);
                    }
                }}
            />
        </div>
    );
}

const NOTICE_NODE_LIMIT = 25;

function NodePicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
    const [query, setQuery] = useState('');

    const known = session.data?.nodes ?? [];
    const names = [
        ...known.map((node) => node.name),
        ...value.filter((name) => !known.some((node) => node.name === name)),
    ];

    if (names.length === 0) {
        return (
            <input
                type={'text'}
                value={value.join(', ')}
                maxLength={600}
                placeholder={'Every node, or name them: DE-01, US-02'}
                aria-label={'Nodes this notice shows on'}
                onChange={(event) =>
                    onChange(
                        event.target.value
                            .split(',')
                            .map((entry) => entry.trim())
                            .filter(Boolean)
                    )
                }
                className={INPUT}
            />
        );
    }

    const needle = query.trim().toLowerCase();
    const shown = needle === '' ? names : names.filter((name) => name.toLowerCase().includes(needle));

    const full = value.length >= NOTICE_NODE_LIMIT;

    const toggle = (name: string) =>
        onChange(value.includes(name) ? value.filter((one) => one !== name) : [...value, name]);

    const label = value.length === 0 ? 'Every node' : value.length < 3 ? value.join(', ') : `${value.length} nodes`;

    return (
        <Popover className={'relative'}>
            {({ open }) => (
                <>
                    <Popover.Button
                        aria-label={'Nodes this notice shows on'}
                        className={cn(
                            'flex w-full items-center gap-2 rounded-lg bg-overlay px-3 py-3 text-left text-[14px] text-ink',
                            'focus:outline-none focus:ring-2 focus:ring-accent'
                        )}
                    >
                        <Server aria-hidden={'true'} className={'h-4 w-4 shrink-0 text-ink-faint'} />
                        <span className={cn('min-w-0 flex-1 truncate', value.length === 0 && 'text-ink-faint')}>
                            {label}
                        </span>
                        <ChevronDown
                            aria-hidden={'true'}
                            className={cn('h-4 w-4 shrink-0 text-ink-faint transition-transform', open && 'rotate-180')}
                        />
                    </Popover.Button>

                    <Popover.Panel
                        className={
                            'absolute inset-x-0 z-[95] mt-1 origin-top rounded-xl border border-line-field bg-card p-1 shadow-panel'
                        }
                    >
                        {names.length > 6 && (
                            <div className={'relative p-1'}>
                                <Search
                                    aria-hidden={'true'}
                                    className={
                                        'pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint'
                                    }
                                />
                                <input
                                    type={'text'}
                                    value={query}
                                    placeholder={`Search ${names.length} nodes`}
                                    aria-label={'Search nodes'}
                                    onChange={(event) => setQuery(event.target.value)}
                                    className={
                                        'w-full rounded-lg border-0 bg-overlay py-2 pl-7 pr-2 text-[13px] text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent'
                                    }
                                />
                            </div>
                        )}

                        <div className={'max-h-60 overflow-y-auto'}>
                            <PickerRow label={'Every node'} picked={value.length === 0} onClick={() => onChange([])} />

                            <div aria-hidden={'true'} className={'my-1 h-px bg-ink/10'} />

                            {shown.map((name) => {
                                const picked = value.includes(name);

                                return (
                                    <PickerRow
                                        key={name}
                                        label={name}
                                        picked={picked}
                                        disabled={full && !picked}
                                        missing={!known.some((node) => node.name === name)}
                                        onClick={() => toggle(name)}
                                    />
                                );
                            })}

                            {shown.length === 0 && (
                                <p className={'px-2.5 py-2 text-[13px] text-ink-faint'}>{'No node by that name.'}</p>
                            )}
                        </div>

                        {full && (
                            <p className={'px-2.5 py-1.5 text-[12px] leading-snug text-ink-faint'}>
                                {`${NOTICE_NODE_LIMIT} nodes is as many as one notice can name.`}
                            </p>
                        )}
                    </Popover.Panel>
                </>
            )}
        </Popover>
    );
}

function PickerRow({
    label,
    picked,
    disabled = false,
    missing = false,
    onClick,
}: {
    label: string;
    picked: boolean;
    disabled?: boolean;
    missing?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type={'button'}
            disabled={disabled}
            aria-pressed={picked}
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] transition-colors',
                picked ? 'font-medium text-ink' : 'text-ink-muted',
                disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-overlay hover:text-ink'
            )}
        >
            <span className={'min-w-0 flex-1 truncate'}>{label}</span>

            {missing && <span className={'shrink-0 text-[12px] text-ink-faint'}>{'gone'}</span>}

            <Check
                aria-hidden={'true'}
                className={cn('h-4 w-4 shrink-0 text-accent', picked ? 'opacity-100' : 'opacity-0')}
            />
        </button>
    );
}

export function NoticeListField({
    label,
    hint,
    value,
    max,
    nodes = false,
    uploadUrl,
    onChange,
    onError,
}: {
    label: string;
    hint?: string;
    value: ThemeNotice[];
    max: number;
    nodes?: boolean;
    uploadUrl: string;
    onChange: (value: ThemeNotice[]) => void;
    onError: (message: string) => void;
}) {
    const patch = (index: number, next: Partial<ThemeNotice>) =>
        onChange(value.map((notice, at) => (at === index ? { ...notice, ...next } : notice)));

    const blank = (): ThemeNotice => ({
        id: `notice-${Date.now().toString(36)}`,
        title: '',
        body: '',
        tone: 'info',
        enabled: true,
        dismissible: true,
        link: '',
        linkLabel: '',
        linkButton: false,
        icon: '',
        iconImage: '',
        nodes: [],
    });

    return (
        <Field label={label} hint={hint}>
            <div className={'space-y-2'}>
                {value.map((notice, index) => (
                    <RowShell key={notice.id} onRemove={() => onChange(value.filter((_, at) => at !== index))}>
                        <input
                            type={'text'}
                            value={notice.title}
                            maxLength={120}
                            placeholder={'Title'}
                            aria-label={'Notice title'}
                            onChange={(event) => patch(index, { title: event.target.value })}
                            className={INPUT}
                        />

                        <textarea
                            rows={2}
                            value={notice.body}
                            maxLength={400}
                            placeholder={'Message'}
                            aria-label={'Notice message'}
                            onChange={(event) => patch(index, { body: event.target.value })}
                            className={INPUT}
                        />

                        <div className={'grid grid-cols-2 gap-1.5'}>
                            <input
                                type={'text'}
                                value={notice.link ?? ''}
                                maxLength={300}
                                placeholder={'https:// or /path'}
                                aria-label={'Notice link'}
                                onChange={(event) => patch(index, { link: event.target.value })}
                                className={INPUT}
                            />
                            <input
                                type={'text'}
                                value={notice.linkLabel ?? ''}
                                maxLength={40}
                                placeholder={'Link label'}
                                aria-label={'Notice link label'}
                                onChange={(event) => patch(index, { linkLabel: event.target.value })}
                                className={INPUT}
                            />
                        </div>

                        <NoticeIconField
                            icon={notice.icon ?? ''}
                            iconImage={notice.iconImage ?? ''}
                            uploadUrl={uploadUrl}
                            onChange={(next) => patch(index, next)}
                            onError={onError}
                        />

                        <div className={'flex flex-wrap gap-1'}>
                            {TONES.map((tone) => (
                                <button
                                    key={tone.value}
                                    type={'button'}
                                    aria-pressed={notice.tone === tone.value}
                                    onClick={() => patch(index, { tone: tone.value })}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium transition-colors',
                                        notice.tone === tone.value
                                            ? 'bg-overlay text-ink'
                                            : 'text-ink-faint hover:text-ink-muted'
                                    )}
                                >
                                    <span aria-hidden={'true'} className={cn('h-2 w-2 rounded-full', tone.dot)} />
                                    {tone.label}
                                </button>
                            ))}
                        </div>

                        {nodes && (
                            <NodePicker value={notice.nodes ?? []} onChange={(next) => patch(index, { nodes: next })} />
                        )}

                        <div className={'flex flex-wrap gap-3 pt-0.5'}>
                            <Tick
                                label={'Shown'}
                                checked={notice.enabled}
                                onChange={(next) => patch(index, { enabled: next })}
                            />
                            <Tick
                                label={'Can be dismissed'}
                                checked={notice.dismissible}
                                onChange={(next) => patch(index, { dismissible: next })}
                            />
                            <Tick
                                label={'Show link as a button'}
                                checked={notice.linkButton ?? false}
                                onChange={(next) => patch(index, { linkButton: next })}
                            />
                        </div>
                    </RowShell>
                ))}

                {value.length < max && <AddRow label={'Add a notice'} onClick={() => onChange([...value, blank()])} />}
            </div>
        </Field>
    );
}

function artNote(art: string): string {
    const lines = artLines(art).length;

    if (lines === 0) {
        return 'A matching line is dropped from the console while this is empty.';
    }

    const dropped = art.replace(/\r\n?/g, '\n').split('\n').length - lines;

    return `Matching lines are swapped for these ${lines === 1 ? 'line' : `${lines} lines`}${
        dropped > 0 ? `, and everything past ${ART_MAX_LINES} lines is left off` : ''
    }.`;
}

export function ConsoleRulesField({
    label,
    hint,
    value,
    max,
    onChange,
}: {
    label: string;
    hint?: string;
    value: ConsoleRule[];
    max: number;
    onChange: (value: ConsoleRule[]) => void;
}) {
    const patch = (index: number, next: Partial<ConsoleRule>) =>
        onChange(value.map((rule, at) => (at === index ? { ...rule, ...next } : rule)));

    const move = (index: number, delta: number) => {
        const next = [...value];
        const [row] = next.splice(index, 1);

        if (row) {
            next.splice(index + delta, 0, row);
            onChange(next);
        }
    };

    const broken = (rule: ConsoleRule): boolean => {
        if (!rule.regex || rule.find === '') {
            return false;
        }

        try {
            void new RegExp(rule.find);

            return false;
        } catch {
            return true;
        }
    };

    return (
        <Field label={label} hint={hint}>
            <div className={'space-y-2'}>
                {value.map((rule, index) => (
                    <RowShell
                        key={index}
                        dimmed={!rule.enabled}
                        enabled={rule.enabled}
                        onToggle={() => patch(index, { enabled: !rule.enabled })}
                        onRemove={() => onChange(value.filter((_, at) => at !== index))}
                        onMove={(delta) => move(index, delta)}
                        canMoveUp={index > 0}
                        canMoveDown={index < value.length - 1}
                    >
                        <input
                            type={'text'}
                            value={rule.find}
                            maxLength={200}
                            spellCheck={false}
                            placeholder={'Find'}
                            aria-label={'Text to find'}
                            onChange={(event) => patch(index, { find: event.target.value })}
                            className={cn(INPUT, 'font-mono', broken(rule) && 'ring-1 ring-danger')}
                        />

                        {rule.art ? (
                            <textarea
                                rows={6}
                                wrap={'off'}
                                value={rule.replace}
                                maxLength={ART_LIMIT}
                                spellCheck={false}
                                placeholder={'Paste the art here (empty drops the line)'}
                                aria-label={'Replacement art'}
                                onChange={(event) => patch(index, { replace: event.target.value })}
                                className={cn(INPUT, 'whitespace-pre font-mono text-[12px] leading-tight')}
                            />
                        ) : (
                            <input
                                type={'text'}
                                value={rule.replace}
                                maxLength={200}
                                spellCheck={false}
                                placeholder={'Replace with (empty removes it)'}
                                aria-label={'Replacement text'}
                                onChange={(event) => patch(index, { replace: event.target.value })}
                                className={cn(INPUT, 'font-mono')}
                            />
                        )}

                        <div className={'flex flex-wrap items-center gap-3 pt-0.5'}>
                            <Tick
                                label={'Regular expression'}
                                checked={rule.regex}
                                onChange={(next) => patch(index, { regex: next })}
                            />

                            <Tick
                                label={'ASCII art'}
                                checked={rule.art === true}
                                onChange={(next) => patch(index, { art: next })}
                            />

                            {broken(rule) && <span className={'text-[12px] text-danger'}>Not a valid expression</span>}
                        </div>

                        {rule.art && (
                            <p className={'text-[12px] leading-relaxed text-ink-faint'}>{artNote(rule.replace)}</p>
                        )}
                    </RowShell>
                ))}

                {value.length < max && (
                    <AddRow
                        label={'Add a rule'}
                        onClick={() =>
                            onChange([...value, { find: '', replace: '', regex: false, art: false, enabled: true }])
                        }
                    />
                )}
            </div>
        </Field>
    );
}

function Tick({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
    return (
        <Checkbox size={'xs'} label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} />
    );
}

export interface EditorEgg {
    uuid: string;
    id: number;
    name: string;
    nest: string;
}

export function EggArtField({
    label,
    hint,
    value,
    eggs,
    max,
    onChange,
    onError,
}: {
    label: string;
    hint?: string;
    value: EggArt[];
    eggs: EditorEgg[];
    max: number;
    onChange: (value: EggArt[]) => void;
    onError: (message: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [openEgg, setOpenEgg] = useState<string | null>(null);

    const rows = new Map(value.map((row) => [row.egg, row]));

    const patch = (uuid: string, next: Partial<EggArt>) => {
        const current = rows.get(uuid) ?? { egg: uuid, image: '', imageLight: '', logo: '' };
        const merged = { ...current, ...next };

        const empty = merged.image === '' && merged.imageLight === '' && merged.logo === '';
        const without = value.filter((row) => row.egg !== uuid);

        onChange(empty ? without : [...without, merged]);
    };

    const needle = query.trim().toLowerCase();
    const shown = needle
        ? eggs.filter((egg) => egg.name.toLowerCase().includes(needle) || egg.nest.toLowerCase().includes(needle))
        : eggs;

    return (
        <Field label={label} hint={hint}>
            {eggs.length === 0 ? (
                <p className={'rounded-xl bg-raised p-3 text-[12px] leading-snug text-ink-faint'}>
                    {'No eggs could be read from the panel. The default background applies to every server.'}
                </p>
            ) : (
                <div className={'space-y-2'}>
                    <div className={'relative'}>
                        <Search
                            aria-hidden={'true'}
                            className={
                                'pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint'
                            }
                        />
                        <input
                            type={'text'}
                            value={query}
                            placeholder={`Search ${eggs.length} eggs`}
                            aria-label={'Search eggs'}
                            onChange={(event) => setQuery(event.target.value)}
                            className={
                                'w-full rounded-xl border-0 bg-raised py-3 pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent'
                            }
                        />
                    </div>

                    {shown.length === 0 && (
                        <p className={'px-1 py-2 text-[12px] text-ink-faint'}>{'No egg matches that.'}</p>
                    )}

                    {shown.map((egg) => {
                        const row = rows.get(egg.uuid);
                        const set = shippedArtSet(egg.name);
                        const fallback = set ? shippedArt(set) : null;
                        const open = openEgg === egg.uuid;
                        const overrides = row ? [row.image, row.imageLight, row.logo].filter(Boolean).length : 0;

                        return (
                            <div key={egg.uuid} className={'rounded-xl bg-raised'}>
                                <button
                                    type={'button'}
                                    onClick={() => setOpenEgg(open ? null : egg.uuid)}
                                    aria-expanded={open}
                                    className={'flex w-full items-center gap-2.5 p-2.5 text-left'}
                                >
                                    <span
                                        aria-hidden={'true'}
                                        style={{
                                            backgroundImage: `url(${row?.image || fallback?.image || ''})`,
                                        }}
                                        className={'h-8 w-8 shrink-0 rounded-lg bg-overlay bg-cover bg-center'}
                                    />

                                    <span className={'min-w-0 flex-1'}>
                                        <span className={'block truncate text-[13px] font-medium text-ink'}>
                                            {egg.name}
                                        </span>
                                        <span className={'block truncate text-[11px] text-ink-faint'}>
                                            {egg.nest}
                                            {overrides > 0
                                                ? ` · ${overrides} set`
                                                : fallback
                                                ? ' · bundled artwork'
                                                : ' · default background'}
                                        </span>
                                    </span>

                                    <ChevronDown
                                        aria-hidden={'true'}
                                        className={cn(
                                            'h-4 w-4 shrink-0 text-ink-faint transition-transform',
                                            open && 'rotate-180'
                                        )}
                                    />
                                </button>

                                {open && (
                                    <div className={'space-y-3 border-t border-line-field p-2.5'}>
                                        <ImageField
                                            label={'Background'}
                                            value={row?.image ?? ''}
                                            uploadUrl={EGG_ART_UPLOAD}
                                            onChange={(image) => patch(egg.uuid, { image })}
                                            onError={onError}
                                        />
                                        <ImageField
                                            label={'Background, light theme'}
                                            value={row?.imageLight ?? ''}
                                            uploadUrl={EGG_ART_UPLOAD}
                                            onChange={(imageLight) => patch(egg.uuid, { imageLight })}
                                            onError={onError}
                                        />
                                        <ImageField
                                            label={'Logo'}
                                            hint={'The square mark beside the server name.'}
                                            value={row?.logo ?? ''}
                                            uploadUrl={EGG_ART_UPLOAD}
                                            onChange={(logo) => patch(egg.uuid, { logo })}
                                            onError={onError}
                                        />

                                        <p className={'text-[11px] leading-snug text-ink-faint'}>
                                            {fallback
                                                ? 'Left blank, this egg uses the artwork the theme bundles for it.'
                                                : 'Left blank, this egg uses the default background.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {value.length >= max && (
                        <p className={'px-1 text-[12px] text-warning'}>
                            {`That is the ${max}-egg limit. Clear one to set another.`}
                        </p>
                    )}
                </div>
            )}
        </Field>
    );
}

const EGG_ART_UPLOAD = '/admin/dezerx/editor/background';
