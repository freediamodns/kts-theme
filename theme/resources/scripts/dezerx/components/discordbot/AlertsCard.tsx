import React, { useState } from 'react';
import { Bell, ExternalLink, Trash2 } from 'lucide-react';
import { Badge, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { formatRelative } from '@/dezerx/lib/format';
import { BotAlert, BotState, deleteBotAlert } from '@/api/account/discordBot';
import { useT } from '@/i18n';

function watching(alert: BotAlert, crashes: string): string[] {
    return [
        alert.cpu !== null ? `CPU ≥ ${alert.cpu}%` : null,
        alert.memory !== null ? `RAM ≥ ${alert.memory}%` : null,
        alert.disk !== null ? `Disk ≥ ${alert.disk}%` : null,
        alert.offline ? crashes : null,
    ].filter((entry): entry is string => entry !== null);
}

export default function AlertsCard({ state, onChange }: { state: BotState; onChange: (state: BotState) => void }) {
    const t = useT();
    const { toast } = useToast();
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    if (!state.alerts) {
        return null;
    }

    const remove = (alert: BotAlert) =>
        setDialog({
            title: t('discordBot.alerts.removeTitle', { name: alert.server.name }),
            body: t('discordBot.alerts.removeBody'),
            confirmLabel: t('discordBot.alerts.remove'),
            destructive: true,
            onConfirm: async () => {
                try {
                    onChange(await deleteBotAlert(alert.id));
                    toast(t('discordBot.alerts.removed'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('discordBot.alerts.removeFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    return (
        <div className={'space-y-3'}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <SectionHeader title={t('discordBot.alerts.title')} description={t('discordBot.alerts.description')} />

            {state.alertList.length === 0 ? (
                <SectionEmpty
                    icon={Bell}
                    title={t('discordBot.alerts.empty')}
                    body={t('discordBot.alerts.emptyBody')}
                />
            ) : (
                <div className={'grid grid-cols-1 gap-3 lg:grid-cols-2'}>
                    {state.alertList.map((alert) => (
                        <div
                            key={alert.id}
                            className={'flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-line-field'}
                        >
                            <div className={'min-w-0 flex-1'}>
                                <p className={'truncate text-sm font-semibold text-ink'}>{alert.server.name}</p>
                                <div className={'mt-1.5 flex flex-wrap gap-1.5'}>
                                    {watching(alert, t('discordBot.alerts.crashes')).map((entry) => (
                                        <Badge key={entry} tone={'neutral'}>
                                            {entry}
                                        </Badge>
                                    ))}
                                </div>
                                <p className={'mt-2 text-xs text-ink-faint'}>
                                    {alert.notifiedAt
                                        ? t('discordBot.alerts.lastFired', { when: formatRelative(alert.notifiedAt) })
                                        : t('discordBot.alerts.neverFired')}
                                    {' · '}
                                    {t('discordBot.alerts.cooldown', { minutes: alert.cooldown })}
                                </p>
                                {alert.lastError && <p className={'mt-1 text-xs text-danger'}>{alert.lastError}</p>}
                            </div>

                            <div className={'flex shrink-0 flex-col gap-1.5'}>
                                <a
                                    href={alert.channelUrl}
                                    target={'_blank'}
                                    rel={'noreferrer noopener'}
                                    aria-label={t('discordBot.alerts.channel')}
                                    title={t('discordBot.alerts.channel')}
                                    className={
                                        'flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint ring-1 ring-line-field transition-colors hover:bg-raised hover:text-ink'
                                    }
                                >
                                    <ExternalLink className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                </a>
                                <button
                                    type={'button'}
                                    onClick={() => remove(alert)}
                                    aria-label={t('discordBot.alerts.remove')}
                                    title={t('discordBot.alerts.remove')}
                                    className={
                                        'flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint ring-1 ring-line-field transition-colors hover:bg-danger/10 hover:text-danger'
                                    }
                                >
                                    <Trash2 className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
