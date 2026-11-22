import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeOff, Search, Server } from 'lucide-react';
import { Badge, Input, Toggle, useToast } from '@/dezerx/components/ui';
import { SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import { cn } from '@/dezerx/lib/cn';
import { BotState, saveHiddenServers } from '@/api/account/discordBot';
import { useT } from '@/i18n';

const SEARCH_FROM = 8;

export default function ServersCard({ state, onChange }: { state: BotState; onChange: (state: BotState) => void }) {
    const t = useT();
    const { toast } = useToast();
    const [query, setQuery] = useState('');
    const [saving, setSaving] = useState<string | null>(null);

    const servers = state.servers ?? [];
    const hidden = servers.filter((server) => server.hidden).map((server) => server.uuid);

    const shown = useMemo(() => {
        const needle = query.trim().toLowerCase();

        return needle === ''
            ? servers
            : servers.filter(
                  (server) =>
                      server.name.toLowerCase().includes(needle) || server.identifier.toLowerCase().startsWith(needle)
              );
    }, [servers, query]);

    if (servers.length === 0) {
        return null;
    }

    const toggle = async (uuid: string, visible: boolean) => {
        setSaving(uuid);

        try {
            onChange(
                await saveHiddenServers(
                    visible
                        ? hidden.filter((entry) => entry !== uuid)
                        : [...hidden.filter((entry) => entry !== uuid), uuid]
                )
            );
        } catch (error) {
            toast(apiMessage(error, t('discordBot.servers.saveFailed')), { tone: 'error' });
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className={'overflow-hidden rounded-2xl bg-card ring-1 ring-line-field'}>
            <div className={'p-5 pb-4'}>
                <SectionHeader
                    title={t('discordBot.servers.title')}
                    description={t('discordBot.servers.description')}
                    action={
                        hidden.length > 0 ? (
                            <Badge tone={'neutral'}>
                                {t('discordBot.servers.hiddenCount', { count: hidden.length, total: servers.length })}
                            </Badge>
                        ) : undefined
                    }
                />

                {servers.length >= SEARCH_FROM && (
                    <div className={'mt-4 max-w-xs'}>
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t('discordBot.servers.search')}
                            aria-label={t('discordBot.servers.search')}
                            icon={<Search className={'h-4 w-4'} />}
                        />
                    </div>
                )}
            </div>

            <div className={'max-h-[28rem] overflow-y-auto overflow-x-hidden'}>
                {shown.length === 0 ? (
                    <p className={'px-5 py-3 text-sm text-ink-faint'}>{t('discordBot.servers.noMatch')}</p>
                ) : (
                    shown.map((server, index) => (
                        <div
                            key={server.uuid}
                            className={cn(
                                'flex items-center gap-3 px-5 py-2.5 transition-opacity',
                                index % 2 === 1 && 'dz-on-raised bg-raised',
                                server.hidden && 'opacity-60'
                            )}
                        >
                            {server.logo ? (
                                <img
                                    src={server.logo}
                                    alt={''}
                                    loading={'lazy'}
                                    className={cn(
                                        'h-9 w-9 shrink-0 rounded-lg bg-overlay/60 object-cover',
                                        server.hidden && 'grayscale'
                                    )}
                                />
                            ) : (
                                <span
                                    className={
                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-overlay/60 text-ink-muted'
                                    }
                                    aria-hidden={'true'}
                                >
                                    {server.hidden ? (
                                        <EyeOff className={'h-4 w-4'} />
                                    ) : (
                                        <Server className={'h-4 w-4'} />
                                    )}
                                </span>
                            )}
                            <div className={'min-w-0 flex-1'}>
                                <p className={'truncate text-sm font-medium text-ink'}>{server.name}</p>
                                <p className={'truncate text-xs text-ink-faint'}>
                                    <Link
                                        to={`/server/${server.identifier}`}
                                        className={
                                            'font-mono text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent'
                                        }
                                    >
                                        {server.identifier}
                                    </Link>
                                    {server.egg && ` · ${server.egg}`}
                                </p>
                            </div>
                            <Toggle
                                checked={!server.hidden}
                                disabled={saving !== null}
                                label={t('discordBot.servers.visible', { name: server.name })}
                                onChange={(visible) => void toggle(server.uuid, visible)}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
