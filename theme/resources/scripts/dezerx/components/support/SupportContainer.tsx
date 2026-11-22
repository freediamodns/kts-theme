import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LifeBuoy, Plus, ShieldCheck } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import Can from '@/components/elements/Can';
import { ServerContext } from '@/state/server';
import {
    Button,
    Checkbox,
    Input,
    Notice,
    Select,
    Skeleton,
    SkeletonRegion,
    Toggle,
    useToast,
} from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { RequestCard } from '@/dezerx/components/support/RequestCard';
import { SessionChat } from '@/dezerx/components/support/SessionChat';
import { SessionReview } from '@/dezerx/components/support/SessionReview';
import { durationChoices, staffConfig, StaffScope } from '@/dezerx/lib/staff';
import { refreshStaffBadges } from '@/dezerx/lib/staffBadges';
import {
    StaffRequestSummary,
    SupportState,
    allowSupportRequest,
    cancelSupportRequest,
    denySupportRequest,
    extendSupportAccess,
    getSupport,
    getSupportMessages,
    leaveSupportFeedback,
    openSupportRequest,
    refuseSupportExtension,
    revokeSupportAccess,
    sendSupportMessage,
    setSupportAutoAccept,
} from '@/api/server/support';
import { useT } from '@/i18n';

const OPEN = ['pending', 'claimed', 'active'];

export default function SupportContainer() {
    const t = useT();
    const { toast } = useToast();
    const config = useMemo(staffConfig, []);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const [state, setState] = useState<SupportState | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const [reason, setReason] = useState('');
    const [scope, setScope] = useState<StaffScope>('standard');
    const [named, setNamed] = useState('');
    const [duration, setDuration] = useState<number>(config?.defaultDuration ?? 120);
    const [noLimit, setNoLimit] = useState(false);
    const [autoAccept, setAutoAccept] = useState(config?.autoAccept ?? false);
    const [trimmed, setTrimmed] = useState<string[]>([]);
    const [showScope, setShowScope] = useState(false);

    const load = useCallback(() => {
        getSupport(uuid)
            .then((data) => {
                setState(data);
                setAutoAccept(data.autoAccept);
                setError(null);
                refreshStaffBadges();
            })
            .catch((problem) => setError(problem));
    }, [uuid]);

    useEffect(() => {
        load();
    }, [load]);

    const preset = useMemo(() => config?.presets.find((entry) => entry.key === scope) ?? null, [config, scope]);

    useEffect(() => {
        setTrimmed(preset?.permissions ?? []);
    }, [preset]);

    if (config === null) {
        return (
            <ServerContentBlock title={t('support.title')}>
                <Notice tone={'info'} title={t('support.offTitle')}>
                    {t('support.offBody')}
                </Notice>
            </ServerContentBlock>
        );
    }

    if (state === null) {
        return (
            <ServerContentBlock title={t('support.title')}>
                {error !== null ? (
                    <Notice tone={'danger'} title={t('support.loadFailed')}>
                        {apiMessage(error, t('support.unreachable'))}
                    </Notice>
                ) : (
                    <SkeletonRegion label={t('support.loading')}>
                        <Skeleton className={'h-28 w-full rounded-2xl'} />
                        <Skeleton className={'mt-3 h-56 w-full rounded-2xl'} />
                    </SkeletonRegion>
                )}
            </ServerContentBlock>
        );
    }

    const open = state.requests.filter((request) => OPEN.includes(request.status));
    const past = state.requests.filter((request) => !OPEN.includes(request.status));
    const unsaid = past.filter((request) => request.canReview && request.feedback === null);
    const older = past.filter((request) => !unsaid.includes(request));
    const full = state.seatsLeft <= 0;
    const shortReason = reason.trim().length < config.reasonMin;

    const replace = (request: StaffRequestSummary) =>
        setState((current) =>
            current === null
                ? current
                : {
                      ...current,
                      requests: current.requests.some((entry) => entry.uuid === request.uuid)
                          ? current.requests.map((entry) => (entry.uuid === request.uuid ? request : entry))
                          : [request, ...current.requests],
                  }
        );

    const run = async (key: string, work: () => Promise<StaffRequestSummary>, done: string) => {
        setBusy(key);

        try {
            replace(await work());
            load();
            toast(done, { tone: 'success' });
        } catch (problem) {
            toast(apiMessage(problem, t('support.actionFailed')), { tone: 'error' });
        } finally {
            setBusy(null);
        }
    };

    const ask = async () => {
        setBusy('open');

        try {
            const created = await openSupportRequest(uuid, {
                reason: reason.trim(),
                scope,
                username: named.trim(),
                openEnded: noLimit,
                durationMinutes: noLimit ? null : duration,
                permissions: trimmed,
                autoAccept,
            });

            replace(created);
            load();
            setReason('');
            setNamed('');
            toast(t('support.asked'), { tone: 'success' });
        } catch (problem) {
            toast(apiMessage(problem, t('support.askFailed')), { tone: 'error' });
        } finally {
            setBusy(null);
        }
    };

    const withReason = (
        request: StaffRequestSummary,
        title: string,
        body: string,
        label: string,
        destructive: boolean,
        work: (reason: string) => Promise<StaffRequestSummary>,
        done: string,
        optional = false
    ) =>
        setDialog({
            title,
            body,
            confirmLabel: label,
            destructive,
            input: { label: t('support.reasonLabel'), initial: '', optional },
            onConfirm: async (given: string) => {
                await run(request.uuid, () => work(given.trim()), done);
            },
        });

    const toggleAutoAccept = async (value: boolean) => {
        setAutoAccept(value);

        try {
            await setSupportAutoAccept(uuid, value);
        } catch (problem) {
            setAutoAccept(!value);
            toast(apiMessage(problem, t('support.actionFailed')), { tone: 'error' });
        }
    };

    return (
        <ServerContentBlock title={t('support.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <div className={'space-y-4'}>
                <SectionHeader
                    title={t('support.title')}
                    description={t('support.description')}
                    action={
                        <span className={'text-[11px] text-ink-faint'}>
                            {t('support.seats', { total: state.seats, left: state.seatsLeft })}
                        </span>
                    }
                />

                {open.length === 0 && past.length === 0 && (
                    <SectionEmpty icon={LifeBuoy} title={t('support.emptyTitle')} body={t('support.emptyBody')} />
                )}

                {open.map((request) => (
                    <RequestCard
                        key={request.uuid}
                        request={request}
                        reminderMinutes={config.reminderMinutes}
                        chat={
                            request.canChat && request.startedAt !== null ? (
                                <SessionChat
                                    thread={request.uuid}
                                    bridge={{
                                        load: (cursor) => getSupportMessages(uuid, request.uuid, cursor),
                                        post: (body) => sendSupportMessage(uuid, request.uuid, body),
                                    }}
                                    canPost={request.canPost}
                                    closed={request.endedAt !== null}
                                    maxLength={config.messageMax}
                                />
                            ) : undefined
                        }
                        actions={
                            <Can action={'user.create'}>
                                {request.status === 'claimed' && (
                                    <Button
                                        size={'sm'}
                                        loading={busy === request.uuid}
                                        onClick={() =>
                                            void run(
                                                request.uuid,
                                                () => allowSupportRequest(uuid, request.uuid),
                                                t('support.letIn')
                                            )
                                        }
                                    >
                                        {t('support.allow', { name: request.staff ?? '' })}
                                    </Button>
                                )}

                                {request.status === 'pending' && request.direction === 'staff_request' && (
                                    <Button
                                        size={'sm'}
                                        loading={busy === request.uuid}
                                        onClick={() =>
                                            void run(
                                                request.uuid,
                                                () => allowSupportRequest(uuid, request.uuid),
                                                t('support.letIn')
                                            )
                                        }
                                    >
                                        {t('support.allow', { name: request.staff ?? '' })}
                                    </Button>
                                )}

                                {(request.status === 'claimed' ||
                                    (request.status === 'pending' && request.direction === 'staff_request')) && (
                                    <Button
                                        size={'sm'}
                                        variant={'secondary'}
                                        onClick={() =>
                                            withReason(
                                                request,
                                                t('support.denyTitle'),
                                                t('support.denyBody'),
                                                t('support.deny'),
                                                false,
                                                (given) => denySupportRequest(uuid, request.uuid, given),
                                                t('support.denied')
                                            )
                                        }
                                    >
                                        {t('support.deny')}
                                    </Button>
                                )}

                                {request.status === 'pending' && request.direction === 'owner_invite' && (
                                    <Button
                                        size={'sm'}
                                        variant={'secondary'}
                                        onClick={() =>
                                            void run(
                                                request.uuid,
                                                () => cancelSupportRequest(uuid, request.uuid),
                                                t('support.cancelled')
                                            )
                                        }
                                    >
                                        {t('support.cancel')}
                                    </Button>
                                )}

                                {request.status === 'active' && request.extensionAsk !== null && (
                                    <>
                                        <Button
                                            size={'sm'}
                                            loading={busy === request.uuid}
                                            onClick={() =>
                                                void run(
                                                    request.uuid,
                                                    () => extendSupportAccess(uuid, request.uuid),
                                                    t('support.extended')
                                                )
                                            }
                                        >
                                            {t('support.giveMinutes', { minutes: request.extensionAsk.minutes })}
                                        </Button>

                                        <Button
                                            size={'sm'}
                                            variant={'secondary'}
                                            onClick={() =>
                                                void run(
                                                    request.uuid,
                                                    () => refuseSupportExtension(uuid, request.uuid),
                                                    t('support.extensionRefused')
                                                )
                                            }
                                        >
                                            {t('support.refuseTime')}
                                        </Button>
                                    </>
                                )}

                                {request.status === 'active' && !request.openEnded && request.extensionAsk === null && (
                                    <Button
                                        size={'sm'}
                                        variant={'secondary'}
                                        onClick={() =>
                                            void run(
                                                request.uuid,
                                                () => extendSupportAccess(uuid, request.uuid, 30),
                                                t('support.extended')
                                            )
                                        }
                                    >
                                        {t('support.addThirty')}
                                    </Button>
                                )}

                                {request.status === 'active' && (
                                    <Button
                                        size={'sm'}
                                        variant={'danger'}
                                        onClick={() =>
                                            withReason(
                                                request,
                                                t('support.endTitle'),
                                                t('support.endBody'),
                                                t('support.endNow'),
                                                true,
                                                (given) => revokeSupportAccess(uuid, request.uuid, given),
                                                t('support.ended'),
                                                true
                                            )
                                        }
                                    >
                                        {t('support.endNow')}
                                    </Button>
                                )}
                            </Can>
                        }
                    />
                ))}

                {!full && (
                    <Can action={'user.create'}>
                        <div className={'space-y-3 rounded-2xl bg-card p-4'}>
                            <p className={'text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>
                                {t('support.askTitle')}
                            </p>

                            <textarea
                                value={reason}
                                rows={3}
                                maxLength={2000}
                                placeholder={t('support.reasonHint', { min: config.reasonMin })}
                                onChange={(event) => setReason(event.target.value)}
                                className={
                                    'dz-field dz-field-line w-full resize-none rounded-2xl border px-3.5 py-2.5 ' +
                                    'text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 ' +
                                    'focus:border-accent/60 focus:outline-none'
                                }
                            />

                            <div className={'grid gap-3 sm:grid-cols-2'}>
                                <Select
                                    label={t('support.scope')}
                                    value={scope}
                                    onChange={(value) => setScope(value as StaffScope)}
                                    options={config.presets.map((entry) => ({
                                        value: entry.key,
                                        label: entry.label,
                                    }))}
                                />

                                <Select
                                    label={t('support.howLong')}
                                    value={noLimit ? 'none' : String(duration)}
                                    onChange={(value) => {
                                        if (value === 'none') {
                                            setNoLimit(true);

                                            return;
                                        }

                                        setNoLimit(false);
                                        setDuration(Number(value));
                                    }}
                                    options={[
                                        ...durationChoices(config).map((minutes) => ({
                                            value: String(minutes),
                                            label: t('support.minutesOption', { minutes }),
                                        })),
                                        ...(config.openEnded ? [{ value: 'none', label: t('support.noLimit') }] : []),
                                    ]}
                                />
                            </div>

                            {preset !== null && <p className={'text-[11px] text-ink-faint'}>{preset.hint}</p>}

                            {config.named && (
                                <Input
                                    label={t('support.namedLabel')}
                                    placeholder={t('support.namedPlaceholder')}
                                    value={named}
                                    maxLength={191}
                                    onChange={(event) => setNamed(event.target.value)}
                                />
                            )}

                            {preset !== null && preset.permissions.length > 0 && (
                                <div>
                                    <button
                                        type={'button'}
                                        onClick={() => setShowScope((value) => !value)}
                                        className={'text-[11px] font-semibold text-ink-faint hover:text-ink'}
                                    >
                                        {t(showScope ? 'support.hideWhatTheyGet' : 'support.showWhatTheyGet', {
                                            total: trimmed.length,
                                        })}
                                    </button>

                                    {showScope && (
                                        <div className={'mt-2 grid gap-1 sm:grid-cols-2'}>
                                            {preset.permissions.map((permission) => (
                                                <Checkbox
                                                    key={permission}
                                                    label={permission}
                                                    checked={trimmed.includes(permission)}
                                                    disabled={permission === 'websocket.connect'}
                                                    onChange={(event) => {
                                                        const wanted = event.target.checked;

                                                        setTrimmed((current) =>
                                                            wanted
                                                                ? [...current, permission]
                                                                : current.filter((entry) => entry !== permission)
                                                        );
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={'flex flex-wrap items-center justify-between gap-3'}>
                                <div className={'flex items-start gap-3'}>
                                    <Toggle
                                        checked={autoAccept}
                                        onChange={(value) => void toggleAutoAccept(value)}
                                        label={t('support.autoAccept')}
                                    />

                                    <span className={'min-w-0'}>
                                        <span className={'block text-xs font-medium text-ink'}>
                                            {t('support.autoAccept')}
                                        </span>
                                        <span className={'block text-[11px] text-ink-faint'}>
                                            {t(autoAccept ? 'support.autoAcceptOn' : 'support.autoAcceptOff')}
                                        </span>
                                    </span>
                                </div>

                                <Button
                                    size={'sm'}
                                    loading={busy === 'open'}
                                    disabled={shortReason}
                                    onClick={() => void ask()}
                                    icon={<Plus className={'h-3.5 w-3.5'} />}
                                >
                                    {t('support.askForHelp')}
                                </Button>
                            </div>
                        </div>
                    </Can>
                )}

                {unsaid.map((request) => (
                    <RequestCard
                        key={request.uuid}
                        request={request}
                        reminderMinutes={config.reminderMinutes}
                        review={
                            request.canReview ? (
                                <SessionReview
                                    current={request.feedback}
                                    onSend={async (mood, note) => {
                                        replace(await leaveSupportFeedback(uuid, request.uuid, mood, note));
                                        load();
                                    }}
                                />
                            ) : undefined
                        }
                    />
                ))}

                {older.length > 0 && (
                    <div className={'space-y-3'}>
                        <button
                            type={'button'}
                            onClick={() => setShowHistory((value) => !value)}
                            className={
                                'inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint hover:text-ink'
                            }
                        >
                            <ShieldCheck className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                            {t(showHistory ? 'support.hidePast' : 'support.showPast', { total: older.length })}
                        </button>

                        {showHistory &&
                            older.map((request) => (
                                <RequestCard
                                    key={request.uuid}
                                    request={request}
                                    reminderMinutes={config.reminderMinutes}
                                    collapsible={true}
                                />
                            ))}
                    </div>
                )}
            </div>
        </ServerContentBlock>
    );
}
