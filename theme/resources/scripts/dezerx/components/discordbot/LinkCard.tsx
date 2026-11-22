import React, { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck, Unplug } from 'lucide-react';
import { Badge, Button, Notice, useToast } from '@/dezerx/components/ui';
import { SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import { DiscordMark } from '@/dezerx/components/create/DiscordGate';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { formatRelative } from '@/dezerx/lib/format';
import { BotState, linkVerified, reissueKey, unlinkBot } from '@/api/account/discordBot';
import { useDiscordPopup } from '@/dezerx/components/discordbot/useDiscordPopup';
import { useT } from '@/i18n';

const PROBLEMS: Record<string, string> = {
    blocked: 'discordBot.link.blocked',
    taken: 'discordBot.link.taken',
    mismatch: 'discordBot.link.mismatch',
    cancelled: 'discordBot.link.cancelled',
};

export default function LinkCard({
    state,
    onChange,
    onRefresh,
}: {
    state: BotState;
    onChange: (state: BotState) => void;
    onRefresh: () => void;
}) {
    const t = useT();
    const { toast } = useToast();
    const [busy, setBusy] = useState(false);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const { open: connect, waiting } = useDiscordPopup(state.oauth.connectUrl, (status) => {
        if (status === 'connected') {
            toast(t('discordBot.link.linked'), { tone: 'success' });
            onRefresh();

            return;
        }

        toast(t(PROBLEMS[status] ?? 'discordBot.link.failed'), { tone: 'error' });
    });

    const run = async (action: () => Promise<BotState>, success: string) => {
        setBusy(true);

        try {
            onChange(await action());
            toast(t(success), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('discordBot.link.failed')), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const unlink = () =>
        setDialog({
            title: t('discordBot.link.unlinkTitle'),
            body: t('discordBot.link.unlinkBody'),
            confirmLabel: t('discordBot.link.unlink'),
            destructive: true,
            onConfirm: async () => {
                try {
                    onChange(await unlinkBot());
                    toast(t('discordBot.link.unlinked'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('discordBot.link.failed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    const member = state.member;

    return (
        <div className={'flex flex-col rounded-2xl bg-card p-5 ring-1 ring-line-field'}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <SectionHeader title={t('discordBot.link.title')} description={t('discordBot.link.description')} />

            {member !== null ? (
                <div className={'mt-4 space-y-4'}>
                    <div className={'flex items-center gap-3'}>
                        <img
                            src={member.avatar}
                            alt={''}
                            className={'h-12 w-12 shrink-0 rounded-full ring-2 ring-[#5865f2]/40'}
                        />
                        <div className={'min-w-0 flex-1'}>
                            <p className={'truncate text-sm font-semibold text-ink'}>
                                {t('discordBot.link.linkedAs', { name: member.username })}
                            </p>
                            <p className={'truncate text-xs text-ink-faint'}>
                                {member.linkedAt
                                    ? t('discordBot.link.linkedSince', { when: formatRelative(member.linkedAt) })
                                    : member.discordId}
                            </p>
                        </div>
                        <Badge tone={member.keyActive ? 'success' : 'danger'} dot>
                            {t(member.keyActive ? 'discordBot.link.keyActive' : 'discordBot.link.keyRevoked')}
                        </Badge>
                    </div>

                    {member.keyActive ? (
                        <div
                            className={
                                'flex items-center gap-2 rounded-xl bg-overlay/40 px-3 py-2.5 text-xs text-ink-muted'
                            }
                        >
                            <KeyRound className={'h-3.5 w-3.5 shrink-0 text-ink-faint'} aria-hidden={'true'} />
                            <code className={'truncate font-mono text-ink'}>{member.keyIdentifier}</code>
                            <span className={'ml-auto shrink-0 text-ink-faint'}>
                                {member.keyLastUsedAt
                                    ? t('discordBot.link.lastUsed', { when: formatRelative(member.keyLastUsedAt) })
                                    : t('discordBot.link.neverUsed')}
                            </span>
                        </div>
                    ) : (
                        <Notice
                            tone={'danger'}
                            title={t('discordBot.link.keyRevoked')}
                            action={
                                <Button
                                    size={'sm'}
                                    loading={busy}
                                    onClick={() => void run(reissueKey, 'discordBot.link.restored')}
                                >
                                    {t('discordBot.link.restore')}
                                </Button>
                            }
                        >
                            {t('discordBot.link.keyRevokedBody')}
                        </Notice>
                    )}

                    <div className={'flex justify-end'}>
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            onClick={unlink}
                            icon={<Unplug className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                        >
                            {t('discordBot.link.unlink')}
                        </Button>
                    </div>
                </div>
            ) : state.oauth.available ? (
                <div className={'mt-4 flex flex-1 flex-col justify-between gap-4'}>
                    <p className={'flex items-start gap-2 text-xs leading-relaxed text-ink-muted'}>
                        <ShieldCheck className={'mt-0.5 h-4 w-4 shrink-0 text-success'} aria-hidden={'true'} />
                        {t('discordBot.link.oauthHint')}
                    </p>

                    <div className={'flex flex-wrap gap-2'}>
                        <button
                            type={'button'}
                            onClick={connect}
                            className={
                                'inline-flex h-10 items-center gap-2 rounded-xl bg-[#5865f2] px-4 text-sm font-semibold text-white shadow-lg shadow-[#5865f2]/25 transition hover:bg-[#4752c4]'
                            }
                        >
                            {waiting ? (
                                <Loader2 className={'h-4 w-4 animate-spin'} aria-hidden={'true'} />
                            ) : (
                                <DiscordMark className={'h-4 w-4'} />
                            )}
                            {t('discordBot.link.connect')}
                        </button>

                        {state.suggested !== null && (
                            <Button
                                variant={'secondary'}
                                loading={busy}
                                onClick={() => void run(linkVerified, 'discordBot.link.linked')}
                                icon={<img src={state.suggested.avatar} alt={''} className={'h-4 w-4 rounded-full'} />}
                            >
                                {t('discordBot.link.continueAs', { name: state.suggested.username })}
                            </Button>
                        )}
                    </div>

                    {waiting && <p className={'text-xs text-ink-faint'}>{t('discordBot.link.popupHint')}</p>}
                </div>
            ) : (
                <Notice tone={'warning'} title={t('discordBot.link.notReady')} className={'mt-4'}>
                    {t('discordBot.link.notReadyBody')}
                </Notice>
            )}
        </div>
    );
}
