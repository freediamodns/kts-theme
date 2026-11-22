import React, { useCallback, useEffect, useState } from 'react';
import PageBlock from '@/dezerx/components/PageBlock';
import { SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { Notice, useToast } from '@/dezerx/components/ui';
import { BotState, getBotState } from '@/api/account/discordBot';
import LinkCard from '@/dezerx/components/discordbot/LinkCard';
import InstallCard from '@/dezerx/components/discordbot/InstallCard';
import CommandList from '@/dezerx/components/discordbot/CommandList';
import OwnBotCard from '@/dezerx/components/discordbot/OwnBotCard';
import Studio from '@/dezerx/components/discordbot/Studio';
import AlertsCard from '@/dezerx/components/discordbot/AlertsCard';
import ServersCard from '@/dezerx/components/discordbot/ServersCard';
import { useT } from '@/i18n';

export default function DiscordBotContainer() {
    const t = useT();
    const { toast } = useToast();
    const [state, setState] = useState<BotState | null>(null);
    const [failed, setFailed] = useState(false);

    const load = useCallback(() => {
        getBotState()
            .then((next) => {
                setState(next);
                setFailed(false);
            })
            .catch((error) => {
                setFailed(true);
                toast(apiMessage(error, t('discordBot.loadFailed')), { tone: 'error' });
            });
    }, []);

    useEffect(load, [load]);

    const personal = state?.mode === 'personal';

    return (
        <PageBlock title={t('discordBot.title')}>
            <div className={'space-y-6'}>
                {state === null ? (
                    failed ? (
                        <Notice tone={'danger'} title={t('discordBot.loadFailed')} />
                    ) : (
                        <SectionSkeleton label={t('discordBot.title')} rows={4} />
                    )
                ) : personal ? (
                    <>
                        <OwnBotCard state={state} onChange={setState} />
                        {state.bot !== null && <Studio state={state} onChange={setState} />}
                        {state.bot !== null && <ServersCard state={state} onChange={setState} />}
                        <AlertsCard state={state} onChange={setState} />
                    </>
                ) : (
                    <>
                        <div className={'grid grid-cols-1 gap-6 lg:grid-cols-2'}>
                            <LinkCard state={state} onChange={setState} onRefresh={load} />
                            {state.bot !== null && <InstallCard bot={state.bot} />}
                        </div>
                        <CommandList commands={state.commands} />
                        {state.member !== null && <ServersCard state={state} onChange={setState} />}
                        <AlertsCard state={state} onChange={setState} />
                    </>
                )}
            </div>
        </PageBlock>
    );
}
