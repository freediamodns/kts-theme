import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, LifeBuoy, Plus } from 'lucide-react';
import { useHistory } from 'react-router-dom';
import PageBlock from '@/dezerx/components/PageBlock';
import { Button, Input, Notice, Select, Skeleton, SkeletonRegion, Toggle, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { RequestCard } from '@/dezerx/components/support/RequestCard';
import { SessionChat } from '@/dezerx/components/support/SessionChat';
import { StaffRecordPanel } from '@/dezerx/components/support/StaffRecord';
import { Leaderboard } from '@/dezerx/components/support/Leaderboard';
import { cn } from '@/dezerx/lib/cn';
import { durationChoices, staffConfig, StaffScope } from '@/dezerx/lib/staff';
import { refreshStaffBadges } from '@/dezerx/lib/staffBadges';
import { StaffRequestSummary } from '@/api/server/support';
import {
    StaffDashboard,
    adminRevokeRequest,
    askForAccess,
    askForMoreTime,
    claimRequest,
    declineRequest,
    getStaffDashboard,
    getStaffMessages,
    resignRequest,
    resolveRequest,
    sendStaffMessage,
    setAvailability,
    withdrawRequest,
} from '@/api/dezerx/staff';
import { useT } from '@/i18n';

type Tab = 'queue' | 'mine' | 'history' | 'all' | 'board';

export default function StaffContainer() {
    const t = useT();
    const { toast } = useToast();
    const history = useHistory();
    const config = useMemo(staffConfig, []);

    const [data, setData] = useState<StaffDashboard | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [tab, setTab] = useState<Tab>('queue');
    const [busy, setBusy] = useState<string | null>(null);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [available, setAvailable] = useState(true);
    const [showDone, setShowDone] = useState(false);

    const [askOpen, setAskOpen] = useState(false);
    const [server, setServer] = useState('');
    const [reason, setReason] = useState('');
    const [scope, setScope] = useState<StaffScope>('read_only');
    const [duration, setDuration] = useState<number>(config?.defaultDuration ?? 120);
    const [noLimit, setNoLimit] = useState(false);

    const load = useCallback(() => {
        getStaffDashboard(showDone)
            .then((payload) => {
                setData(payload);
                setAvailable(payload.record.available);
                setError(null);
                refreshStaffBadges();
            })
            .catch((problem) => setError(problem));
    }, [showDone]);

    useEffect(() => {
        load();
    }, [load]);

    if (config === null) {
        return (
            <PageBlock title={t('support.staffTitle')}>
                <Notice tone={'info'} title={t('support.offTitle')}>
                    {t('support.offBody')}
                </Notice>
            </PageBlock>
        );
    }

    if (data === null) {
        return (
            <PageBlock title={t('support.staffTitle')}>
                {error !== null ? (
                    <Notice tone={'danger'} title={t('support.loadFailed')}>
                        {apiMessage(error, t('support.unreachable'))}
                    </Notice>
                ) : (
                    <SkeletonRegion label={t('support.loading')}>
                        <Skeleton className={'h-20 w-full rounded-2xl'} />
                        <Skeleton className={'mt-3 h-56 w-full rounded-2xl'} />
                    </SkeletonRegion>
                )}
            </PageBlock>
        );
    }

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'queue', label: t('support.tabQueue'), count: data.queue.length },
        { key: 'mine', label: t('support.tabMine'), count: data.mine.length },
        { key: 'history', label: t('support.tabHistory'), count: data.history.length },
        ...(data.admin ? [{ key: 'all' as Tab, label: t('support.tabAll'), count: (data.all ?? []).length }] : []),
        { key: 'board', label: t('support.tabBoard') },
    ];

    const listed: StaffRequestSummary[] =
        tab === 'queue'
            ? data.queue
            : tab === 'mine'
            ? data.mine
            : tab === 'history'
            ? data.history
            : tab === 'all'
            ? data.all ?? []
            : [];

    const run = async (key: string, work: () => Promise<StaffRequestSummary>, done: string) => {
        setBusy(key);

        try {
            await work();
            load();
            toast(done, { tone: 'success' });
        } catch (problem) {
            toast(apiMessage(problem, t('support.actionFailed')), { tone: 'error' });
        } finally {
            setBusy(null);
        }
    };

    const prompt = (
        request: StaffRequestSummary,
        title: string,
        body: string,
        label: string,
        destructive: boolean,
        work: (value: string) => Promise<StaffRequestSummary>,
        done: string,
        field: string,
        optional = false
    ) =>
        setDialog({
            title,
            body,
            confirmLabel: label,
            destructive,
            input: { label: field, initial: '', optional },
            onConfirm: async (value: string) => {
                await run(request.uuid, () => work(value.trim()), done);
            },
        });

    const askMore = (request: StaffRequestSummary) =>
        setDialog({
            title: t('support.moreTimeTitle'),
            body: t('support.moreTimeBody', { max: config.extensionMax }),
            confirmLabel: t('support.askForTime'),
            input: { label: t('support.minutesLabel'), initial: '30' },
            onConfirm: async (value: string) => {
                const minutes = Number.parseInt(value, 10);

                if (Number.isNaN(minutes) || minutes < 1) {
                    toast(t('support.minutesInvalid'), { tone: 'error' });

                    return;
                }

                await run(request.uuid, () => askForMoreTime(request.uuid, minutes, ''), t('support.timeAsked'));
            },
        });

    const ask = async () => {
        setBusy('ask');

        try {
            await askForAccess({
                server: server.trim(),
                reason: reason.trim(),
                scope,
                openEnded: noLimit,
                durationMinutes: noLimit ? null : duration,
            });

            load();
            setReason('');
            setServer('');
            setAskOpen(false);
            toast(t('support.accessAsked'), { tone: 'success' });
        } catch (problem) {
            toast(apiMessage(problem, t('support.askFailed')), { tone: 'error' });
        } finally {
            setBusy(null);
        }
    };

    const toggleAvailable = async (value: boolean) => {
        setAvailable(value);

        try {
            await setAvailability(value);
        } catch (problem) {
            setAvailable(!value);
            toast(apiMessage(problem, t('support.actionFailed')), { tone: 'error' });
        }
    };

    return (
        <PageBlock title={t('support.staffTitle')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <div className={'space-y-4'}>
                <SectionHeader
                    title={t('support.staffTitle')}
                    description={t('support.staffDescription')}
                    action={
                        <div className={'flex items-center gap-3'}>
                            <span className={'flex items-center gap-2'}>
                                <Toggle
                                    checked={available}
                                    onChange={(value) => void toggleAvailable(value)}
                                    label={t('support.availableLabel')}
                                />
                                <span className={'text-[11px] text-ink-faint'}>
                                    {t(available ? 'support.availableOn' : 'support.availableOff')}
                                </span>
                            </span>

                            {data.canAsk && (
                                <Button
                                    size={'sm'}
                                    variant={'secondary'}
                                    onClick={() => setAskOpen((value) => !value)}
                                    icon={<Plus className={'h-3.5 w-3.5'} />}
                                >
                                    {t('support.askAnOwner')}
                                </Button>
                            )}
                        </div>
                    }
                />

                <StaffRecordPanel record={data.record} />

                {askOpen && data.canAsk && (
                    <div className={'space-y-3 rounded-2xl bg-card p-4'}>
                        <p className={'text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>
                            {t('support.askAnOwner')}
                        </p>

                        <div className={'grid gap-3 sm:grid-cols-2'}>
                            <Input
                                label={t('support.serverId')}
                                placeholder={'a1b2c3d4'}
                                value={server}
                                maxLength={16}
                                onChange={(event) => setServer(event.target.value.trim())}
                            />

                            <Select
                                label={t('support.scope')}
                                value={scope}
                                onChange={(value) => setScope(value as StaffScope)}
                                options={data.presets.map((entry) => ({ value: entry.key, label: entry.label }))}
                            />
                        </div>

                        <textarea
                            value={reason}
                            rows={3}
                            maxLength={2000}
                            placeholder={t('support.accessHint', { min: config.reasonMin })}
                            onChange={(event) => setReason(event.target.value)}
                            className={cn(
                                'dz-field dz-field-line w-full resize-none rounded-2xl border px-3.5 py-2.5',
                                'text-sm text-ink placeholder:text-ink-faint transition-colors duration-150',
                                'focus:border-accent/60 focus:outline-none'
                            )}
                        />

                        <div className={'flex flex-wrap items-center justify-between gap-3'}>
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

                            <Button
                                size={'sm'}
                                loading={busy === 'ask'}
                                disabled={server.trim() === '' || reason.trim().length < config.reasonMin}
                                onClick={() => void ask()}
                            >
                                {t('support.sendAsk')}
                            </Button>
                        </div>
                    </div>
                )}

                <div className={'flex flex-wrap items-center justify-between gap-3'}>
                    <div className={'flex flex-wrap gap-1.5'}>
                        {tabs.map((entry) => (
                            <button
                                key={entry.key}
                                type={'button'}
                                onClick={() => setTab(entry.key)}
                                className={cn(
                                    'rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                                    tab === entry.key
                                        ? 'bg-overlay text-ink'
                                        : 'text-ink-faint hover:bg-overlay/60 hover:text-ink'
                                )}
                            >
                                {entry.label}
                                {entry.count !== undefined && (
                                    <span className={'ml-1.5 text-ink-faint'}>{entry.count}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {data.admin && tab === 'all' && (
                        <span className={'flex items-center gap-2'}>
                            <Toggle checked={showDone} onChange={setShowDone} label={t('support.showDone')} />
                            <span className={'text-[11px] text-ink-faint'}>{t('support.showDone')}</span>
                        </span>
                    )}
                </div>

                {tab === 'board' ? (
                    <Leaderboard />
                ) : listed.length === 0 ? (
                    <SectionEmpty
                        icon={tab === 'queue' ? Inbox : LifeBuoy}
                        title={t(`support.empty.${tab}`)}
                        body={t('support.emptyStaffBody')}
                    />
                ) : (
                    listed.map((request) => (
                        <RequestCard
                            key={request.uuid}
                            request={request}
                            showServer={true}
                            reminderMinutes={config.reminderMinutes}
                            collapsible={true}
                            chat={
                                request.canChat && request.startedAt !== null ? (
                                    <SessionChat
                                        thread={request.uuid}
                                        bridge={{
                                            load: (cursor) => getStaffMessages(request.uuid, cursor),
                                            post: (body) => sendStaffMessage(request.uuid, body),
                                        }}
                                        canPost={request.canPost}
                                        closed={request.endedAt !== null}
                                        maxLength={config.messageMax}
                                    />
                                ) : undefined
                            }
                            actions={
                                <>
                                    {request.status === 'pending' && request.direction === 'owner_invite' && (
                                        <Button
                                            size={'sm'}
                                            loading={busy === request.uuid}
                                            onClick={() =>
                                                void run(
                                                    request.uuid,
                                                    () => claimRequest(request.uuid),
                                                    t('support.tookItOn')
                                                )
                                            }
                                        >
                                            {t('support.accept')}
                                        </Button>
                                    )}

                                    {request.status === 'pending' && request.direction === 'owner_invite' && (
                                        <Button
                                            size={'sm'}
                                            variant={'secondary'}
                                            onClick={() =>
                                                prompt(
                                                    request,
                                                    t('support.declineTitle'),
                                                    t('support.declineBody'),
                                                    t('support.decline'),
                                                    false,
                                                    (value) => declineRequest(request.uuid, value),
                                                    t('support.declinedDone'),
                                                    t('support.reasonLabel')
                                                )
                                            }
                                        >
                                            {t('support.decline')}
                                        </Button>
                                    )}

                                    {request.status === 'claimed' && request.mine && (
                                        <Button
                                            size={'sm'}
                                            variant={'secondary'}
                                            loading={busy === request.uuid}
                                            onClick={() =>
                                                void run(
                                                    request.uuid,
                                                    () => withdrawRequest(request.uuid),
                                                    t('support.steppedBack')
                                                )
                                            }
                                        >
                                            {t('support.stepBack')}
                                        </Button>
                                    )}

                                    {request.status === 'active' && request.mine && (
                                        <>
                                            {request.server !== null && (
                                                <Button
                                                    size={'sm'}
                                                    variant={'secondary'}
                                                    onClick={() =>
                                                        history.push(`/server/${request.server!.identifier}`)
                                                    }
                                                >
                                                    {t('support.openServer')}
                                                </Button>
                                            )}

                                            {!request.openEnded && (
                                                <Button
                                                    size={'sm'}
                                                    variant={'secondary'}
                                                    onClick={() => askMore(request)}
                                                >
                                                    {t('support.askForTime')}
                                                </Button>
                                            )}

                                            <Button
                                                size={'sm'}
                                                onClick={() =>
                                                    prompt(
                                                        request,
                                                        t('support.resolveTitle'),
                                                        t('support.resolveBody'),
                                                        t('support.markResolved'),
                                                        false,
                                                        (value) => resolveRequest(request.uuid, value),
                                                        t('support.resolvedDone'),
                                                        t('support.resolutionLabel'),
                                                        true
                                                    )
                                                }
                                            >
                                                {t('support.markResolved')}
                                            </Button>

                                            <Button
                                                size={'sm'}
                                                variant={'secondary'}
                                                onClick={() =>
                                                    prompt(
                                                        request,
                                                        t('support.resignTitle'),
                                                        t('support.resignBody'),
                                                        t('support.handBack'),
                                                        false,
                                                        (value) => resignRequest(request.uuid, value),
                                                        t('support.handedBackDone'),
                                                        t('support.handBackLabel'),
                                                        true
                                                    )
                                                }
                                            >
                                                {t('support.handBack')}
                                            </Button>
                                        </>
                                    )}

                                    {data.admin && request.status === 'active' && !request.mine && (
                                        <Button
                                            size={'sm'}
                                            variant={'danger'}
                                            onClick={() =>
                                                prompt(
                                                    request,
                                                    t('support.endTitle'),
                                                    t('support.endBody'),
                                                    t('support.endNow'),
                                                    true,
                                                    (value) => adminRevokeRequest(request.uuid, value),
                                                    t('support.ended'),
                                                    t('support.reasonLabel'),
                                                    true
                                                )
                                            }
                                        >
                                            {t('support.endNow')}
                                        </Button>
                                    )}
                                </>
                            }
                        />
                    ))
                )}
            </div>
        </PageBlock>
    );
}
