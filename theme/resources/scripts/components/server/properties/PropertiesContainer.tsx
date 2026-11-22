import React, { ReactNode, useEffect, useState } from 'react';
import { Switch } from '@headlessui/react';
import { Download, RotateCcw, Save, Settings2, Smartphone, Unlock } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { Button, Input, Select, Skeleton, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, apiMessage } from '@/dezerx/components/console/Section';
import { MotdEditor } from '@/dezerx/components/console/MotdEditor';
import { cn } from '@/dezerx/lib/cn';
import renameServer from '@/api/server/renameServer';
import {
    GeyserStatus,
    PropertiesPayload,
    PropertyField as Field,
    PropertyValue as Value,
    deleteServerIcon,
    getGeyser,
    getProperties,
    getServerIcon,
    installGeyser as installGeyserRequest,
    saveProperties,
    uploadServerIcon,
} from '@/api/server/properties';
import { useT, type TranslateFn } from '@/i18n';

const GROUPS: Field['group'][] = ['gameplay', 'world', 'access'];

function fieldText(t: TranslateFn, key: string, part: 'label' | 'help', fallback: string): string {
    return t(`properties.fields.${key}.${part}`, { defaultValue: fallback });
}

export default function PropertiesContainer() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const serverName = ServerContext.useStoreState((state) => state.server.data!.name);
    const setServerName = ServerContext.useStoreActions((actions) => actions.server.setServer);
    const server = ServerContext.useStoreState((state) => state.server.data!);

    const { toast } = useToast();
    const [payload, setPayload] = useState<PropertiesPayload | null>(null);
    const [geyser, setGeyser] = useState<GeyserStatus | null>(null);
    const [icon, setIcon] = useState<string | null>(null);
    const [draft, setDraft] = useState<Record<string, Value>>({});
    const [saving, setSaving] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [name, setName] = useState(serverName);
    const [branding, setBranding] = useState(false);

    const load = () =>
        getProperties(uuid)
            .then((data) => {
                setPayload(data);
                setDraft(toDraft(data));
            })
            .catch((error) => {
                setPayload({
                    available: false,
                    message: apiMessage(error, t('properties.readFailed')),
                });
            });

    const loadGeyser = () =>
        getGeyser(uuid)
            .then(setGeyser)
            .catch(() => setGeyser({ supported: false }));

    useEffect(() => {
        void load();
        void loadGeyser();

        getServerIcon(uuid)
            .then(setIcon)
            .catch(() => setIcon(null));
    }, [uuid]);

    if (!payload) {
        return (
            <ServerContentBlock title={t('properties.title')}>
                <div className='space-y-3'>
                    <Skeleton className='h-24 rounded-2xl' />
                    <Skeleton className='h-24 rounded-2xl' />
                    <Skeleton className='h-64 rounded-2xl' />
                </div>
            </ServerContentBlock>
        );
    }

    if (!payload.available || !payload.fields || !payload.values) {
        return (
            <ServerContentBlock title={t('properties.title')}>
                <SectionEmpty
                    icon={Settings2}
                    title={t('properties.emptyTitle')}
                    body={payload.message ?? t('properties.emptyBody')}
                />
            </ServerContentBlock>
        );
    }

    const fields = payload.fields;
    const values = payload.values;

    const changed = fields
        .map((field) => field.key)
        .filter((key) => draft[key] !== fromFile(values[key], keyType(fields, key)));

    const set = (key: string, value: Value) => setDraft((current) => ({ ...current, [key]: value }));

    const save = async () => {
        setSaving(true);

        try {
            const data = await saveProperties(uuid, Object.fromEntries(changed.map((key) => [key, draft[key]])));

            toast(t(data.running ? 'properties.savedRunning' : 'properties.saved'), { tone: 'success' });

            await load();
        } catch (error) {
            toast(apiMessage(error, t('properties.saveFailed')), { tone: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const installGeyser = async () => {
        setInstalling(true);

        try {
            const data = await installGeyserRequest(uuid);
            toast(data.message ?? t('properties.geyser.installing'), { tone: 'success' });

            window.setTimeout(() => {
                void load();
                void loadGeyser();
            }, 5000);
        } catch (error) {
            toast(apiMessage(error, t('properties.geyser.installFailed')), { tone: 'error' });
        } finally {
            setInstalling(false);
        }
    };

    const rename = async (next: string) => {
        setBranding(true);

        try {
            await renameServer(uuid, next);

            setName(next);
            setServerName({ ...server, name: next });
            toast(t('properties.renamed'), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('properties.renameFailed')), { tone: 'error' });
        } finally {
            setBranding(false);
        }
    };

    const uploadIcon = async (file: File) => {
        setBranding(true);

        try {
            setIcon(await uploadServerIcon(uuid, file));
            toast(t('properties.iconUpdated'), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('properties.iconFailed')), { tone: 'error' });
        } finally {
            setBranding(false);
        }
    };

    const removeIcon = async () => {
        setBranding(true);

        try {
            await deleteServerIcon(uuid);
            setIcon(null);
            toast(t('properties.iconRemoved'), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('properties.iconRemoveFailed')), { tone: 'error' });
        } finally {
            setBranding(false);
        }
    };

    const cracked = draft['online-mode'] === false;

    return (
        <ServerContentBlock title={t('properties.title')}>
            <div className='space-y-4'>
                {changed.length > 0 && (
                    <div className='flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-overlay/95 p-3 shadow-panel'>
                        <p className='text-xs text-ink-faint'>{t('properties.unsaved', { count: changed.length })}</p>

                        <div className='flex items-center gap-2'>
                            <Button
                                size='sm'
                                variant='ghost'
                                disabled={saving}
                                onClick={() => setDraft(toDraft(payload))}
                                icon={<RotateCcw className='h-3.5 w-3.5' />}
                            >
                                {t('common.reset')}
                            </Button>

                            <Button
                                size='sm'
                                variant='primary'
                                loading={saving}
                                onClick={() => void save()}
                                icon={<Save className='h-3.5 w-3.5' />}
                            >
                                {t('common.save')}
                            </Button>
                        </div>
                    </div>
                )}
                <div className='grid gap-3 lg:grid-cols-2'>
                    <Highlight
                        icon={Unlock}
                        title={t('properties.cracked.title')}
                        body={t(cracked ? 'properties.cracked.on' : 'properties.cracked.off')}
                        control={
                            <Toggle
                                checked={cracked}
                                onChange={(next) => {
                                    set('online-mode', !next);

                                    if (next) {
                                        set('enforce-secure-profile', false);
                                    }
                                }}
                                label={t('properties.cracked.title')}
                            />
                        }
                    />

                    <BedrockCard status={geyser} installing={installing} onInstall={() => void installGeyser()} />
                </div>

                <section className='space-y-2'>
                    <div className='px-1'>
                        <h3 className='text-xs font-semibold tracking-tight text-ink-muted'>
                            {t('properties.motd.title')}
                        </h3>
                        <p className='mt-0.5 text-[11px] text-ink-faint'>{t('properties.motd.help')}</p>
                    </div>

                    <MotdEditor
                        value={String(draft.motd ?? '')}
                        onChange={(next) => set('motd', next)}
                        address={name}
                        icon={icon}
                        busy={branding}
                        onRename={(next) => void rename(next)}
                        onIcon={(file) => void uploadIcon(file)}
                        onIconRemove={() => void removeIcon()}
                    />
                </section>

                {GROUPS.map((group) => {
                    const rows = fields.filter((field) => field.group === group);

                    if (rows.length === 0) {
                        return null;
                    }

                    return (
                        <section key={group} className='space-y-2'>
                            <h3 className='px-1 text-xs font-semibold tracking-tight text-ink-muted'>
                                {t(`properties.groups.${group}`)}
                            </h3>

                            <div className='grid gap-2 sm:grid-cols-2'>
                                {rows.map((field) => (
                                    <FieldRow
                                        key={field.key}
                                        field={field}
                                        value={draft[field.key]}
                                        onChange={(next) => set(field.key, next)}
                                    />
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        </ServerContentBlock>
    );
}

function BedrockCard({
    status,
    installing,
    onInstall,
}: {
    status: GeyserStatus | null;
    installing: boolean;
    onInstall: () => void;
}) {
    const t = useT();

    if (status === null) {
        return <Skeleton className='h-[6.5rem] rounded-2xl' />;
    }

    if (!status.supported) {
        return (
            <Highlight
                icon={Smartphone}
                title={t('properties.geyser.title')}
                body={status.message ?? t('properties.geyser.unsupported')}
            />
        );
    }

    const installed = Boolean(status.installed);
    const port = status.port;

    return (
        <Highlight
            icon={Smartphone}
            title={t('properties.geyser.title')}
            body={
                installed && port ? (
                    <>
                        {t('properties.geyser.joinAt')}{' '}
                        <span className='font-mono text-ink'>
                            {port.ip}:{port.port}
                        </span>
                        {t('properties.geyser.running', { version: status.installed ?? '' })}
                        {t(
                            status.floodgate
                                ? 'properties.geyser.withFloodgate'
                                : status.floodgateAvailable
                                ? 'properties.geyser.withoutFloodgate'
                                : 'properties.geyser.noFloodgateBuild'
                        )}
                    </>
                ) : installed ? (
                    t('properties.geyser.noPort', { version: status.installed ?? '' })
                ) : status.floodgateAvailable ? (
                    t('properties.geyser.installsBoth')
                ) : (
                    t('properties.geyser.installsGeyser')
                )
            }
            control={
                <Button
                    size='sm'
                    variant={installed ? 'secondary' : 'primary'}
                    loading={installing}
                    onClick={onInstall}
                    icon={<Download className='h-3.5 w-3.5' />}
                >
                    {installed ? t('common.update') : t('properties.geyser.enable', { version: status.version ?? '' })}
                </Button>
            }
        />
    );
}

function Highlight({
    icon: Icon,
    title,
    body,
    control,
}: {
    icon: typeof Settings2;
    title: string;
    body: ReactNode;
    control?: ReactNode;
}) {
    return (
        <div className='flex items-start gap-3 rounded-2xl bg-card p-4'>
            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-overlay/60 text-ink-faint'>
                <Icon className='h-4 w-4' aria-hidden='true' />
            </span>

            <div className='min-w-0 flex-1'>
                <p className='text-sm font-medium text-ink'>{title}</p>
                <p className='mt-1 text-xs leading-relaxed text-ink-faint'>{body}</p>
            </div>

            {control && <div className='shrink-0 pl-1'>{control}</div>}
        </div>
    );
}

function FieldRow({
    field,
    value,
    onChange,
}: {
    field: Field;
    value: Value | undefined;
    onChange: (value: Value) => void;
}) {
    const t = useT();
    const label = fieldText(t, field.key, 'label', field.label);
    const help = field.help ? fieldText(t, field.key, 'help', field.help) : undefined;

    if (field.type === 'toggle') {
        return (
            <div className='flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3'>
                <div className='min-w-0'>
                    <p className='text-xs font-medium text-ink'>{label}</p>
                    {help && <p className='mt-0.5 text-[11px] leading-relaxed text-ink-faint'>{help}</p>}
                </div>

                <Toggle checked={value === true} onChange={onChange} label={label} />
            </div>
        );
    }

    return (
        <div className='space-y-1 rounded-2xl bg-card px-4 py-3'>
            {field.type === 'choice' ? (
                <Select
                    label={label}
                    value={String(value ?? '')}
                    onChange={onChange}
                    options={(field.options ?? []).map((option) => ({
                        value: option,
                        label: t(`properties.options.${option}`, {
                            defaultValue: option.charAt(0).toUpperCase() + option.slice(1),
                        }),
                    }))}
                    hint={help}
                />
            ) : (
                <Input
                    label={label}
                    type='number'
                    inputMode='numeric'
                    min={field.min}
                    max={field.max}
                    value={String(value ?? '')}
                    hint={help}
                    onChange={(event) => onChange(Number(event.target.value))}
                />
            )}
        </div>
    );
}

function Toggle({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}) {
    return (
        <Switch
            checked={checked}
            onChange={onChange}
            aria-label={label}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-base',
                checked ? 'bg-accent' : 'bg-overlay'
            )}
        >
            <span
                aria-hidden='true'
                className={cn(
                    'pointer-events-none my-0.5 inline-block h-5 w-5 transform rounded-full shadow transition-[transform,background-color]',
                    checked ? 'translate-x-[1.375rem] bg-accent-ink' : 'translate-x-0.5 bg-white'
                )}
            />
        </Switch>
    );
}

function fromFile(raw: string | undefined, type: Field['type']): Value {
    if (type === 'toggle') {
        return raw === 'true';
    }

    if (type === 'number') {
        return Number(raw ?? 0);
    }

    return raw ?? '';
}

function keyType(fields: Field[], key: string): Field['type'] {
    return fields.find((field) => field.key === key)?.type ?? 'text';
}

function toDraft(payload: PropertiesPayload): Record<string, Value> {
    return Object.fromEntries(
        (payload.fields ?? []).map((field) => [field.key, fromFile(payload.values?.[field.key], field.type)])
    );
}
