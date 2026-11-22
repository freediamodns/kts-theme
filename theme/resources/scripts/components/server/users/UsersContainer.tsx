import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Actions, useStoreActions, useStoreState } from 'easy-peasy';
import { Check, ChevronDown, ShieldCheck, Trash2, UserPlus, Users as UsersIcon } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ApplicationStore } from '@/state';
import { ServerContext } from '@/state/server';
import { Subuser } from '@/state/server/subusers';
import { usePermissions } from '@/plugins/usePermissions';
import { useDeepCompareMemo } from '@/plugins/useDeepCompareMemo';
import getServerSubusers from '@/api/server/users/getServerSubusers';
import createOrUpdateSubuser from '@/api/server/users/createOrUpdateSubuser';
import deleteSubuser from '@/api/server/users/deleteSubuser';
import { Badge, Button, Checkbox, Input, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { cn } from '@/dezerx/lib/cn';
import { useT, type TranslateFn } from '@/i18n';

const UsersContainer = () => {
    const t = useT();
    const { toast } = useToast();

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const subusers = ServerContext.useStoreState((state) => state.subusers.data);
    const setSubusers = ServerContext.useStoreActions((actions) => actions.subusers.setSubusers);
    const appendSubuser = ServerContext.useStoreActions((actions) => actions.subusers.appendSubuser);
    const removeSubuser = ServerContext.useStoreActions((actions) => actions.subusers.removeSubuser);

    const isRootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const permissions = useStoreState((state: ApplicationStore) => state.permissions.data);
    const getPermissions = useStoreActions((actions: Actions<ApplicationStore>) => actions.permissions.getPermissions);
    const held = ServerContext.useStoreState((state) => state.server.permissions);

    const [canCreate, canUpdate, canDelete] = usePermissions(['user.create', 'user.update', 'user.delete']);

    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    useEffect(() => {
        getServerSubusers(uuid)
            .then((subusers) => setSubusers(subusers))
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('users.loadFailed')), { tone: 'error' });
            })
            .then(() => setLoading(false));
    }, []);

    useEffect(() => {
        getPermissions().catch((error) => {
            console.error(error);
            toast(apiMessage(error, t('users.permissionsLoadFailed')), { tone: 'error' });
        });
    }, []);

    const groups = useMemo(
        () =>
            Object.keys(permissions)
                .filter((key) => key !== 'websocket')
                .map((key) => ({
                    key,
                    description: permissions[key]!.description,
                    keys: Object.keys(permissions[key]!.keys).map((child) => `${key}.${child}`),
                })),
        [permissions]
    );

    const editable = useDeepCompareMemo(() => {
        const everything = groups.flatMap((group) => group.keys);

        if (isRootAdmin || (held.length === 1 && held[0] === '*')) {
            return everything;
        }

        return everything.filter((key) => held.indexOf(key) >= 0);
    }, [isRootAdmin, groups, held]);

    const remove = (subuser: Subuser) =>
        setDialog({
            title: t('users.removeTitle', { name: subuser.username || subuser.email }),
            body: t('users.removeBody'),
            confirmLabel: t('common.remove'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteSubuser(uuid, subuser.uuid);

                    removeSubuser(subuser.uuid);
                    toast(t('users.removed'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('users.removeFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    const ready = !loading && groups.length > 0;

    return (
        <ServerContentBlock title={t('users.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            {!ready && subusers.length === 0 ? (
                <SectionSkeleton label={t('users.loading')} rows={2} />
            ) : (
                <div className={'space-y-4'}>
                    <SectionHeader
                        title={t('users.title')}
                        description={t('users.description')}
                        action={
                            canCreate && (
                                <Button
                                    size={'sm'}
                                    variant={inviting ? 'secondary' : 'primary'}
                                    onClick={() => setInviting((value) => !value)}
                                    icon={<UserPlus className={'h-3.5 w-3.5'} />}
                                >
                                    {t(inviting ? 'common.cancel' : 'users.addUser')}
                                </Button>
                            )
                        }
                    />

                    {!isRootAdmin && held[0] !== '*' && (
                        <p className={'rounded-2xl bg-card px-4 py-3 text-xs text-ink-faint'}>
                            {t('users.onlyOwnPermissions')}
                        </p>
                    )}

                    {inviting && (
                        <InviteForm
                            uuid={uuid}
                            groups={groups}
                            editable={editable}
                            onCreated={(subuser) => {
                                appendSubuser(subuser);
                                setInviting(false);
                            }}
                        />
                    )}

                    {subusers.length === 0 ? (
                        <SectionEmpty icon={UsersIcon} title={t('users.emptyTitle')} body={t('users.emptyBody')} />
                    ) : (
                        <div className={'space-y-3'}>
                            {subusers.map((subuser) => (
                                <UserCard
                                    key={subuser.uuid}
                                    uuid={uuid}
                                    subuser={subuser}
                                    groups={groups}
                                    editable={editable}
                                    canUpdate={canUpdate}
                                    canDelete={canDelete}
                                    onSaved={appendSubuser}
                                    onRemove={() => remove(subuser)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </ServerContentBlock>
    );
};

function groupName(t: TranslateFn, key: string): string {
    return t(`users.groupNames.${key}`, { defaultValue: key });
}

function groupDescription(t: TranslateFn, key: string, fallback: string): string {
    return t(`users.groupDescriptions.${key}`, { defaultValue: fallback });
}

function permissionLabel(t: TranslateFn, permission: string, fallback: string): string {
    return t(`users.permissions.${permission}`, { defaultValue: fallback });
}

interface PermissionGroup {
    key: string;
    description: string;
    keys: string[];
}

function InviteForm({
    uuid,
    groups,
    editable,
    onCreated,
}: {
    uuid: string;
    groups: PermissionGroup[];
    editable: string[];
    onCreated: (subuser: Subuser) => void;
}) {
    const t = useT();
    const { toast } = useToast();

    const [email, setEmail] = useState('');
    const [picked, setPicked] = useState<string[]>(['control.console']);
    const [busy, setBusy] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);

        createOrUpdateSubuser(uuid, { email, permissions: picked })
            .then((subuser) => {
                toast(t('users.added', { email }), { tone: 'success' });
                onCreated(subuser);
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('users.addFailed')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    return (
        <form onSubmit={submit} className={'space-y-4 rounded-2xl bg-card p-4'}>
            <Input
                type={'email'}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                label={t('account.email.title')}
                hint={t('users.emailHint')}
                placeholder={'someone@example.com'}
            />

            <PermissionPicker groups={groups} editable={editable} picked={picked} onChange={setPicked} />

            <div className={'flex justify-end'}>
                <Button
                    type={'submit'}
                    size={'sm'}
                    variant={'primary'}
                    loading={busy}
                    disabled={email.trim() === '' || picked.length === 0}
                >
                    {t('users.addUser')}
                </Button>
            </div>
        </form>
    );
}

function UserCard({
    uuid,
    subuser,
    groups,
    editable,
    canUpdate,
    canDelete,
    onSaved,
    onRemove,
}: {
    uuid: string;
    subuser: Subuser;
    groups: PermissionGroup[];
    editable: string[];
    canUpdate: boolean;
    canDelete: boolean;
    onSaved: (subuser: Subuser) => void;
    onRemove: () => void;
}) {
    const t = useT();
    const { toast } = useToast();

    const [picked, setPicked] = useState<string[]>(subuser.permissions);
    const [busy, setBusy] = useState(false);

    useEffect(() => setPicked(subuser.permissions), [subuser.permissions]);

    const dirty =
        picked.length !== subuser.permissions.length ||
        picked.some((permission) => subuser.permissions.indexOf(permission as never) < 0);

    const save = () => {
        setBusy(true);

        createOrUpdateSubuser(uuid, { email: subuser.email, permissions: picked }, subuser)
            .then((updated) => {
                onSaved(updated);
                toast(t('users.permissionsSaved'), { tone: 'success' });
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('users.permissionsSaveFailed')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    return (
        <div className={'rounded-2xl bg-card p-4'}>
            <div className={'flex flex-wrap items-center justify-between gap-3'}>
                <div className={'flex min-w-0 items-center gap-2.5'}>
                    {subuser.image ? (
                        <img src={subuser.image} alt={''} className={'h-9 w-9 shrink-0 rounded-full object-cover'} />
                    ) : (
                        <span
                            className={
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent'
                            }
                        >
                            {(subuser.username || subuser.email).charAt(0).toUpperCase()}
                        </span>
                    )}

                    <div className={'min-w-0'}>
                        <div className={'flex flex-wrap items-center gap-2'}>
                            <p className={'truncate text-sm font-medium text-ink'}>
                                {subuser.username || subuser.email}
                            </p>
                            {subuser.twoFactorEnabled && (
                                <Badge tone={'success'}>
                                    <ShieldCheck aria-hidden={'true'} className={'mr-1 inline-block h-3 w-3'} />
                                    {'2FA'}
                                </Badge>
                            )}
                        </div>
                        <p className={'mt-0.5 truncate text-xs text-ink-faint'}>{subuser.email}</p>
                    </div>
                </div>

                <div className={'flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto'}>
                    {canUpdate && (
                        <Button
                            size={'sm'}
                            variant={'primary'}
                            loading={busy}
                            disabled={!dirty}
                            onClick={save}
                            icon={<Check className={'h-3.5 w-3.5'} />}
                        >
                            {t('common.save')}
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            size={'sm'}
                            variant={'ghost'}
                            onClick={onRemove}
                            className={'text-danger hover:bg-danger/10 hover:text-danger'}
                            icon={<Trash2 className={'h-3.5 w-3.5'} />}
                        >
                            {t('common.remove')}
                        </Button>
                    )}
                </div>
            </div>

            <div className={'mt-4'}>
                <PermissionPicker
                    groups={groups}
                    editable={editable}
                    picked={picked}
                    onChange={setPicked}
                    readOnly={!canUpdate}
                />
            </div>
        </div>
    );
}

function PermissionPicker({
    groups,
    editable,
    picked,
    onChange,
    readOnly = false,
}: {
    groups: PermissionGroup[];
    editable: string[];
    picked: string[];
    onChange: (next: string[]) => void;
    readOnly?: boolean;
}) {
    const t = useT();
    const [open, setOpen] = useState(false);

    const toggleGroup = (group: PermissionGroup, everything: boolean) =>
        onChange(
            everything
                ? picked.filter((permission) => group.keys.indexOf(permission) < 0)
                : Array.from(new Set([...picked, ...group.keys]))
        );

    const togglePermission = (permission: string) =>
        onChange(
            picked.indexOf(permission) >= 0 ? picked.filter((value) => value !== permission) : [...picked, permission]
        );

    return (
        <div>
            <div className={'mb-2 flex items-center justify-between gap-3'}>
                <p className={'text-xs font-medium text-ink-muted'}>{t('users.canAccess')}</p>

                <button
                    type={'button'}
                    onClick={() => setOpen((value) => !value)}
                    aria-expanded={open}
                    className={
                        'flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] text-ink-faint transition-colors hover:text-ink'
                    }
                >
                    {t(open ? 'users.hideDetails' : 'users.details')}
                    <ChevronDown
                        aria-hidden={'true'}
                        className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
                    />
                </button>
            </div>

            <div className={'flex flex-wrap gap-1.5'}>
                {groups.map((group) => {
                    const granted = group.keys.filter((key) => picked.indexOf(key) >= 0).length;
                    const everything = granted === group.keys.length;
                    const partial = granted > 0 && !everything;
                    const locked = readOnly || group.keys.some((key) => editable.indexOf(key) < 0);

                    return (
                        <button
                            key={group.key}
                            type={'button'}
                            aria-pressed={everything}
                            disabled={locked}
                            title={locked ? t('users.lockedGroup') : groupDescription(t, group.key, group.description)}
                            onClick={() => toggleGroup(group, everything || partial)}
                            className={cn(
                                'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                                everything
                                    ? 'bg-accent/15 text-accent'
                                    : partial
                                    ? 'bg-accent/10 text-accent/70 ring-1 ring-inset ring-accent/30'
                                    : 'bg-overlay text-ink-muted hover:text-ink',
                                locked && 'cursor-not-allowed opacity-50'
                            )}
                        >
                            {groupName(t, group.key)}
                            {partial && (
                                <span
                                    className={'ml-1.5 tabular-nums opacity-80'}
                                >{`${granted}/${group.keys.length}`}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {open && (
                <div className={'mt-3 space-y-3 rounded-xl bg-raised p-3'}>
                    {groups.map((group) => (
                        <div key={group.key}>
                            <p className={'text-xs font-medium capitalize text-ink'}>{groupName(t, group.key)}</p>
                            <p className={'mt-0.5 text-[11px] leading-snug text-ink-faint'}>
                                {groupDescription(t, group.key, group.description)}
                            </p>

                            <div className={'mt-2 grid gap-1.5 sm:grid-cols-2'}>
                                {group.keys.map((permission) => (
                                    <Checkbox
                                        key={permission}
                                        size={'xs'}
                                        checked={picked.indexOf(permission) >= 0}
                                        disabled={readOnly || editable.indexOf(permission) < 0}
                                        onChange={() => togglePermission(permission)}
                                        label={permissionLabel(
                                            t,
                                            permission,
                                            permission.split('.')[1]!.replace(/_/g, ' ')
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default UsersContainer;
