import React, { ReactNode, useEffect, useState } from 'react';
import { ChevronDown, Clock, MessageCircle, Server as ServerIcon, ShieldCheck } from 'lucide-react';
import { StaffRequestSummary } from '@/api/server/support';
import { Badge, Button, Notice } from '@/dezerx/components/ui';
import { Countdown } from '@/dezerx/components/support/Countdown';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { PersonAvatar } from '@/dezerx/components/PersonAvatar';
import { MoodMark } from '@/dezerx/components/support/Mood';
import { cn } from '@/dezerx/lib/cn';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { resolveEggArt } from '@/dezerx/lib/serverArtwork';
import { useT } from '@/i18n';

const LINE = 'inline-flex items-center gap-1.5 text-[11px] text-ink-faint';

const LONG = 55;

function Line({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
    return (
        <span className={LINE}>
            <Icon className={'h-3.5 w-3.5'} aria-hidden={'true'} />
            {children}
        </span>
    );
}

function PersonLine({
    hash,
    url,
    name,
    children,
}: {
    hash: string;
    url: string | null;
    name: string | null;
    children: ReactNode;
}) {
    return (
        <span className={LINE}>
            <PersonAvatar hash={hash} url={url} name={name} size={16} className={'h-4 w-4 text-[9px]'} />
            {children}
        </span>
    );
}

function ServerLine({ egg, children }: { egg: { uuid: string; name: string } | null; children: ReactNode }) {
    const theme = usePanelTheme();
    const logo = resolveEggArt(egg?.uuid, egg?.name, theme).logo;

    const [broken, setBroken] = useState(false);

    useEffect(() => setBroken(false), [logo]);

    return (
        <span className={LINE}>
            {logo === null || broken ? (
                <ServerIcon className={'h-4 w-4 shrink-0'} aria-hidden={'true'} />
            ) : (
                <img
                    src={logo}
                    alt={''}
                    aria-hidden={'true'}
                    width={16}
                    height={16}
                    loading={'lazy'}
                    decoding={'async'}
                    draggable={false}
                    onError={() => setBroken(true)}
                    className={'h-4 w-4 shrink-0 select-none rounded object-contain'}
                />
            )}
            {children}
        </span>
    );
}

export function RequestCard({
    request,
    showServer,
    reminderMinutes,
    collapsible,
    actions,
    chat,
    extra,
    review,
}: {
    request: StaffRequestSummary;
    showServer?: boolean;
    reminderMinutes: number;
    collapsible?: boolean;
    actions?: ReactNode;
    chat?: ReactNode;
    extra?: ReactNode;
    review?: ReactNode;
}) {
    const t = useT();
    const [shown, setShown] = useState(collapsible !== true);
    const [past, setPast] = useState(false);
    const [full, setFull] = useState(false);

    const timeline = request.timeline ?? [];
    const marks = request.direction === 'staff_request' || request.handoffs > 0;
    const long = request.reason.length > LONG || request.reason.includes('\n');

    const reason = (
        <span className={'min-w-0 truncate text-sm text-ink transition-colors group-hover:text-ink-muted'}>
            {request.reason}
        </span>
    );

    return (
        <div className={'space-y-2.5 rounded-2xl bg-card px-4 py-3'}>
            {full && (
                <DialogShell open={true} onClose={() => setFull(false)} title={t('support.issueTitle')} width={'lg'}>
                    <p
                        className={
                            'mt-3 max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-sm text-ink-muted'
                        }
                    >
                        {request.reason}
                    </p>

                    <DialogFooter>
                        <Button size={'sm'} variant={'secondary'} onClick={() => setFull(false)}>
                            {t('common.close')}
                        </Button>
                    </DialogFooter>
                </DialogShell>
            )}

            <div className={'flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5'}>
                <div className={'min-w-0 flex-1 space-y-1'}>
                    <div className={'flex min-w-0 items-center gap-2'}>
                        {collapsible === true ? (
                            <button
                                type={'button'}
                                aria-expanded={shown}
                                onClick={() => setShown((value) => !value)}
                                className={'group flex min-w-0 max-w-[60%] items-center text-left'}
                            >
                                {reason}
                            </button>
                        ) : (
                            <span className={'min-w-0 max-w-[60%] truncate text-sm text-ink'}>{request.reason}</span>
                        )}

                        {long && (
                            <button
                                type={'button'}
                                onClick={() => setFull(true)}
                                className={'shrink-0 text-[11px] font-semibold text-accent hover:underline'}
                            >
                                {t('support.viewMore')}
                            </button>
                        )}
                    </div>

                    <div className={'flex flex-wrap items-center gap-x-4 gap-y-1'}>
                        {showServer && request.server !== null && (
                            <ServerLine egg={request.server.egg}>{request.server.name}</ServerLine>
                        )}

                        {request.owner !== null && (
                            <PersonLine hash={request.ownerAvatar} url={request.ownerAvatarUrl} name={request.owner}>
                                {t('support.ownerIs', { name: request.owner })}
                            </PersonLine>
                        )}

                        {request.staff !== null && (
                            <PersonLine hash={request.staffAvatar} url={request.staffAvatarUrl} name={request.staff}>
                                {t('support.staffIs', { name: request.staff })}
                            </PersonLine>
                        )}

                        {request.staff === null && request.target !== null && (
                            <Line icon={ShieldCheck}>{t('support.askedFor', { name: request.target })}</Line>
                        )}

                        {request.staff === null && request.target === null && request.status === 'pending' && (
                            <Line icon={ShieldCheck}>{t('support.inTheQueue')}</Line>
                        )}

                        <Line icon={Clock}>
                            {request.openEnded
                                ? t('support.noLimit')
                                : t('support.forMinutes', { minutes: request.durationMinutes ?? 0 })}
                        </Line>

                        {request.feedback !== null && !request.canReview && (
                            <MoodMark mood={request.feedback.mood} className={'text-base'} />
                        )}

                        {review}
                    </div>
                </div>

                <div className={'flex flex-wrap items-center justify-end gap-2 empty:hidden'}>
                    {request.unread > 0 && (
                        <span className={'inline-flex items-center gap-1 text-[11px] font-semibold text-accent'}>
                            <MessageCircle className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                            {request.unread}
                        </span>
                    )}

                    {request.status === 'active' && !request.openEnded && (
                        <Countdown expiresAt={request.expiresAt} running={true} warnBelow={reminderMinutes} />
                    )}

                    {actions}
                </div>
            </div>

            {shown && (
                <>
                    {marks && (
                        <div className={'flex flex-wrap items-center gap-2'}>
                            {request.direction === 'staff_request' && (
                                <Badge tone={'info'}>{t('support.staffAsked')}</Badge>
                            )}

                            {request.handoffs > 0 && (
                                <Badge tone={'neutral'}>
                                    {t('support.handedBackTimes', { times: request.handoffs })}
                                </Badge>
                            )}
                        </div>
                    )}

                    {request.extensionAsk !== null && (
                        <Notice
                            tone={'warning'}
                            title={t('support.extensionAsked', { minutes: request.extensionAsk.minutes })}
                        >
                            {request.extensionAsk.note.trim() === ''
                                ? t('support.nothingSaid')
                                : request.extensionAsk.note}
                        </Notice>
                    )}

                    {request.declineReason !== null && request.declineReason.trim() !== '' && (
                        <Notice tone={'danger'} title={t('support.declinedTitle')}>
                            {request.declineReason}
                        </Notice>
                    )}

                    {request.resolution !== null && request.resolution.trim() !== '' && (
                        <Notice tone={'info'} title={t('support.resolutionTitle')}>
                            {request.resolution}
                        </Notice>
                    )}

                    {extra}

                    {chat}

                    {timeline.length > 0 && (
                        <div>
                            <button
                                type={'button'}
                                onClick={() => setPast((value) => !value)}
                                className={
                                    'inline-flex items-center gap-1 text-[11px] font-semibold text-ink-faint hover:text-ink'
                                }
                            >
                                <ChevronDown
                                    className={cn('h-3.5 w-3.5 transition-transform', past && 'rotate-180')}
                                    aria-hidden={'true'}
                                />
                                {t('support.history')}
                            </button>

                            {past && (
                                <ul className={'mt-2 space-y-1.5 border-l border-line-field pl-3'}>
                                    {timeline.map((entry, index) => (
                                        <li key={`${entry.action}-${index}`} className={'text-[11px] text-ink-muted'}>
                                            <span className={'font-semibold text-ink'}>
                                                {t(`support.event.${entry.action}`)}
                                            </span>
                                            {entry.actor !== null && (
                                                <span className={'text-ink-faint'}> {entry.actor}</span>
                                            )}
                                            {entry.at !== null && (
                                                <span className={'text-ink-faint'}>
                                                    {' '}
                                                    {new Date(entry.at).toLocaleString()}
                                                </span>
                                            )}
                                            {entry.note !== null && entry.note !== '' && (
                                                <p className={'whitespace-pre-wrap break-words text-ink-muted'}>
                                                    {entry.note}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default RequestCard;
