import React, { FormEvent, useState } from 'react';
import { Check, Copy, ExternalLink, Info, KeyRound, RefreshCw, Trash2 } from 'lucide-react';
import { Button, HoverTip, Input, Notice, useToast } from '@/dezerx/components/ui';
import { SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { InstallLinks } from '@/dezerx/components/discordbot/InstallCard';
import { formatRelative } from '@/dezerx/lib/format';
import { useCopied } from '@/dezerx/lib/useCopied';
import { BotState, deleteOwnBot, saveOwnBot, syncOwnBot } from '@/api/account/discordBot';
import { useT } from '@/i18n';

export default function OwnBotCard({ state, onChange }: { state: BotState; onChange: (state: BotState) => void }) {
    const t = useT();
    const { toast } = useToast();
    const [token, setToken] = useState('');
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [replacing, setReplacing] = useState(false);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [copied, copy] = useCopied();
    const bot = state.bot;
    const synced = bot !== null && bot.syncedAt !== null && bot.upToDate && !bot.syncError;

    const connect = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);

        try {
            const next = await saveOwnBot(token.trim());
            onChange(next);
            setToken('');
            setReplacing(false);
            toast(t(next.sync?.ok === false ? 'discordBot.own.syncFailed' : 'discordBot.own.connected'), {
                tone: next.sync?.ok === false ? 'error' : 'success',
            });
        } catch (error) {
            toast(apiMessage(error, t('discordBot.own.connectFailed')), { tone: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const sync = async () => {
        setSyncing(true);

        try {
            const next = await syncOwnBot();
            onChange(next);
            toast(next.sync?.ok === false ? next.sync.message : t('discordBot.own.syncedToast'), {
                tone: next.sync?.ok === false ? 'error' : 'success',
            });
        } catch (error) {
            toast(apiMessage(error, t('discordBot.own.syncFailed')), { tone: 'error' });
        } finally {
            setSyncing(false);
        }
    };

    const remove = () =>
        setDialog({
            title: t('discordBot.own.removeTitle'),
            body: t('discordBot.own.removeBody'),
            confirmLabel: t('discordBot.own.remove'),
            destructive: true,
            onConfirm: async () => {
                try {
                    onChange(await deleteOwnBot());
                    toast(t('discordBot.own.removed'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('discordBot.own.connectFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    const form = (
        <form onSubmit={connect} className={'space-y-3'}>
            <Input
                label={t('discordBot.own.token')}
                type={'password'}
                revealable
                autoComplete={'off'}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={t('discordBot.own.tokenPlaceholder')}
                icon={<KeyRound className={'h-4 w-4'} />}
            />
            <div className={'flex flex-wrap gap-2'}>
                <Button type={'submit'} loading={saving} disabled={token.trim().length < 50}>
                    {t('discordBot.own.connect')}
                </Button>
            </div>
        </form>
    );

    const closeReplace = () => {
        setReplacing(false);
        setToken('');
    };

    if (bot === null) {
        return (
            <div className={'rounded-2xl bg-card p-5 ring-1 ring-line-field'}>
                <SectionHeader
                    title={t('discordBot.own.setupTitle')}
                    description={t('discordBot.own.setupDescription')}
                />

                <ol className={'mt-4 grid grid-cols-1 gap-3 md:grid-cols-2'}>
                    {['step1', 'step2', 'step3', 'step4'].map((step, index) => (
                        <li key={step} className={'flex gap-3 rounded-xl bg-overlay/40 p-3'}>
                            <span
                                className={
                                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white'
                                }
                            >
                                {index + 1}
                            </span>
                            <p className={'text-xs leading-relaxed text-ink-muted'}>
                                {t(`discordBot.own.${step}`)}
                                {step === 'step1' && (
                                    <>
                                        {' '}
                                        <a
                                            href={'https://discord.com/developers/applications'}
                                            target={'_blank'}
                                            rel={'noreferrer noopener'}
                                            className={'font-medium text-accent hover:underline'}
                                        >
                                            discord.com/developers
                                        </a>
                                    </>
                                )}
                            </p>
                        </li>
                    ))}
                </ol>

                <div className={'mt-5 max-w-xl'}>{form}</div>
            </div>
        );
    }

    return (
        <div className={'rounded-2xl bg-card p-5 ring-1 ring-line-field'}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <DialogShell
                open={replacing}
                onClose={closeReplace}
                width={'md'}
                title={t('discordBot.own.replace')}
                body={t('discordBot.own.step2')}
            >
                <form onSubmit={connect} className={'mt-4'}>
                    <Input
                        label={t('discordBot.own.token')}
                        type={'password'}
                        revealable
                        autoComplete={'off'}
                        value={token}
                        onChange={(event) => setToken(event.target.value)}
                        placeholder={t('discordBot.own.tokenPlaceholder')}
                        icon={<KeyRound className={'h-4 w-4'} />}
                    />

                    <DialogFooter>
                        <Button type={'button'} size={'sm'} variant={'ghost'} onClick={closeReplace}>
                            {t('common.cancel')}
                        </Button>
                        <Button type={'submit'} size={'sm'} loading={saving} disabled={token.trim().length < 50}>
                            {t('discordBot.own.replace')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogShell>

            <div className={'flex flex-wrap items-start justify-between gap-4'}>
                <div className={'flex min-w-0 items-center gap-4'}>
                    <img src={bot.avatar} alt={''} className={'h-14 w-14 shrink-0 rounded-2xl'} />
                    <div className={'min-w-0'}>
                        <p className={'flex items-center gap-1.5 truncate text-base font-semibold text-ink'}>
                            {bot.name}
                            <span
                                className={'rounded bg-[#5865f2] px-1 text-[10px] font-semibold leading-4 text-white'}
                            >
                                APP
                            </span>
                        </p>
                        <p className={'mt-1 text-xs text-ink-faint'}>
                            {bot.syncedAt
                                ? t('discordBot.own.synced', { when: formatRelative(bot.syncedAt) })
                                : t('discordBot.own.neverSynced')}
                        </p>
                    </div>
                </div>

                <div className={'flex flex-wrap items-center gap-2'}>
                    <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            bot.syncError ? 'bg-red-500' : bot.upToDate ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        title={t(
                            bot.syncError
                                ? 'discordBot.own.syncFailed'
                                : bot.upToDate
                                ? 'discordBot.own.inSync'
                                : 'discordBot.own.outOfSync'
                        )}
                        aria-hidden={'true'}
                    />
                    <Button
                        size={'sm'}
                        variant={'secondary'}
                        loading={syncing}
                        onClick={() => void sync()}
                        icon={<RefreshCw className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                    >
                        {t('discordBot.own.sync')}
                    </Button>
                    <HoverTip label={t('discordBot.own.replace')} side={'top'}>
                        <Button
                            size={'sm'}
                            variant={'ghost'}
                            onClick={() => setReplacing(true)}
                            aria-label={t('discordBot.own.replace')}
                            icon={<KeyRound className={'h-3.5 w-3.5'} />}
                            className={'w-9 px-0'}
                        />
                    </HoverTip>
                    <HoverTip label={t('discordBot.own.remove')} side={'top'}>
                        <Button
                            size={'sm'}
                            variant={'ghost'}
                            onClick={remove}
                            aria-label={t('discordBot.own.remove')}
                            icon={<Trash2 className={'h-3.5 w-3.5'} />}
                            className={'w-9 px-0 text-danger hover:bg-danger/10 hover:text-danger'}
                        />
                    </HoverTip>
                </div>
            </div>

            {bot.keyActive === false && (
                <Notice tone={'danger'} title={t('discordBot.link.keyRevoked')} className={'mt-4'}>
                    {t('discordBot.own.keyRevoked')}
                </Notice>
            )}

            {bot.syncError && (
                <Notice tone={'danger'} title={t('discordBot.own.syncFailed')} className={'mt-4'}>
                    {bot.syncError}
                </Notice>
            )}

            <div className={'mt-5'}>
                <p className={'flex items-center gap-1.5 text-xs font-medium text-ink-muted'}>
                    {t('discordBot.own.endpoint')}
                    {synced && (
                        <HoverTip label={t('discordBot.own.endpointHint')} side={'top'} wrap>
                            <button
                                type={'button'}
                                aria-label={t('discordBot.own.endpointHint')}
                                className={'flex text-ink-faint transition-colors hover:text-ink'}
                            >
                                <Info className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                            </button>
                        </HoverTip>
                    )}
                    {synced && bot.portalUrl && (
                        <HoverTip label={t('discordBot.own.portal')} side={'top'}>
                            <a
                                href={bot.portalUrl}
                                target={'_blank'}
                                rel={'noreferrer noopener'}
                                aria-label={t('discordBot.own.portal')}
                                className={'flex text-ink-faint transition-colors hover:text-accent'}
                            >
                                <ExternalLink className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                            </a>
                        </HoverTip>
                    )}
                </p>
                <div className={'mt-1.5 flex flex-wrap items-center gap-2'}>
                    <div
                        className={
                            'flex min-w-0 flex-1 basis-80 items-center gap-2 rounded-xl bg-overlay/50 p-1.5 pl-3 ring-1 ring-line-field'
                        }
                    >
                        <code
                            className={
                                'min-w-0 flex-1 select-all truncate font-mono text-xs text-ink blur-[3px] transition-all hover:blur-none'
                            }
                        >
                            {bot.endpointUrl}
                        </code>
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            onClick={() => copy(bot.endpointUrl ?? '')}
                            icon={copied ? <Check className={'h-3.5 w-3.5'} /> : <Copy className={'h-3.5 w-3.5'} />}
                        >
                            {t(copied ? 'common.copied' : 'common.copy', { defaultValue: copied ? 'Copied' : 'Copy' })}
                        </Button>
                    </div>
                    <InstallLinks bot={{ ...bot, userInstallUrl: null }} />
                </div>
                {!synced && (
                    <p className={'mt-1.5 text-xs text-ink-faint'}>
                        {t('discordBot.own.endpointHint')}{' '}
                        {bot.portalUrl && (
                            <a
                                href={bot.portalUrl}
                                target={'_blank'}
                                rel={'noreferrer noopener'}
                                className={'inline-flex items-center gap-1 font-medium text-accent hover:underline'}
                            >
                                {t('discordBot.own.portal')}
                                <ExternalLink className={'h-3 w-3'} aria-hidden={'true'} />
                            </a>
                        )}
                    </p>
                )}
            </div>
        </div>
    );
}
