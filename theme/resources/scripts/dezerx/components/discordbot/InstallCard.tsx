import React from 'react';
import { ExternalLink, Plus, UserPlus } from 'lucide-react';
import { SectionHeader } from '@/dezerx/components/console/Section';
import { BotInfo } from '@/api/account/discordBot';
import { useT } from '@/i18n';

export function InstallLinks({ bot }: { bot: Pick<BotInfo, 'inviteUrl' | 'userInstallUrl'> }) {
    const t = useT();
    const link =
        'inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-colors ring-1 ring-line-field';

    return (
        <div className={'flex flex-wrap gap-2'}>
            {bot.userInstallUrl !== null && (
                <a
                    href={bot.userInstallUrl}
                    target={'_blank'}
                    rel={'noreferrer noopener'}
                    className={`${link} bg-[#5865f2] text-white ring-transparent hover:bg-[#4752c4]`}
                >
                    <UserPlus className={'h-4 w-4'} aria-hidden={'true'} />
                    {t('discordBot.install.account')}
                </a>
            )}
            <a
                href={bot.inviteUrl}
                target={'_blank'}
                rel={'noreferrer noopener'}
                className={`${link} bg-overlay text-ink hover:bg-raised`}
            >
                <Plus className={'h-4 w-4'} aria-hidden={'true'} />
                {t('discordBot.install.server')}
                <ExternalLink className={'h-3 w-3 text-ink-faint'} aria-hidden={'true'} />
            </a>
        </div>
    );
}

export default function InstallCard({ bot }: { bot: BotInfo }) {
    const t = useT();

    return (
        <div className={'flex flex-col rounded-2xl bg-card p-5 ring-1 ring-line-field'}>
            <SectionHeader title={t('discordBot.install.title')} description={t('discordBot.install.description')} />

            <div className={'mt-4 flex items-center gap-3'}>
                <img src={bot.avatar} alt={''} className={'h-12 w-12 shrink-0 rounded-2xl'} />
                <div className={'min-w-0'}>
                    <p className={'flex items-center gap-1.5 truncate text-sm font-semibold text-ink'}>
                        {bot.name}
                        <span className={'rounded bg-[#5865f2] px-1 text-[10px] font-semibold leading-4 text-white'}>
                            APP
                        </span>
                    </p>
                    <p className={'truncate text-xs text-ink-faint'}>
                        {t('discordBot.own.applicationId', { id: bot.applicationId })}
                    </p>
                </div>
            </div>

            <div className={'mt-auto pt-4'}>
                <InstallLinks bot={bot} />
            </div>
        </div>
    );
}
