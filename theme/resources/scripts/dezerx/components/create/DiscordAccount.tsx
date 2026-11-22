import React, { useState } from 'react';
import { Unplug } from 'lucide-react';
import { CreateDiscord, unlinkDiscord } from '@/api/dezerx/serverCreate';
import { DiscordMark } from '@/dezerx/components/create/DiscordGate';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { Button, useToast } from '@/dezerx/components/ui';
import { apiMessage } from '@/dezerx/components/console/Section';
import { useT } from '@/i18n';

export default function DiscordAccount({
    discord,
    held,
    onUnlinked,
}: {
    discord: CreateDiscord;
    held: number;
    onUnlinked: () => void;
}) {
    const t = useT();
    const { toast } = useToast();

    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    const confirm = () =>
        setDialog({
            title: t('create.discord.unlinkTitle'),
            body: t('create.discord.unlinkBody'),
            confirmLabel: t('create.discord.unlink'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await unlinkDiscord();
                    toast(t('create.discord.unlinked'), { tone: 'success' });
                    onUnlinked();
                } catch (error) {
                    toast(apiMessage(error, t('create.discord.unlinkFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    return (
        <>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <div className={'rounded-2xl bg-card p-4 ring-1 ring-line-field'}>
                <div className={'flex flex-wrap items-center justify-between gap-3'}>
                    <div className={'flex min-w-0 items-center gap-3'}>
                        {discord.avatar === null ? (
                            <span
                                className={
                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-white'
                                }
                            >
                                <DiscordMark className={'h-5 w-5'} />
                            </span>
                        ) : (
                            <img
                                src={discord.avatar}
                                alt={''}
                                loading={'lazy'}
                                className={'h-9 w-9 shrink-0 rounded-full'}
                            />
                        )}

                        <div className={'min-w-0'}>
                            <p className={'truncate text-sm font-medium text-ink'}>
                                {discord.username === null
                                    ? t('create.discord.linked')
                                    : t('create.discord.linkedAs', { name: discord.username })}
                            </p>
                            <p className={'truncate text-xs text-ink-faint'}>
                                {discord.joinsGuild ? t('create.discord.joined') : t('create.discord.manageHint')}
                            </p>
                        </div>
                    </div>

                    <Button
                        size={'sm'}
                        variant={'secondary'}
                        disabled={!discord.canUnlink}
                        onClick={confirm}
                        icon={<Unplug className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                    >
                        {t('create.discord.unlink')}
                    </Button>
                </div>

                {!discord.canUnlink && held > 0 && (
                    <p className={'mt-3 border-t border-line-hair pt-3 text-xs leading-relaxed text-ink-muted'}>
                        {t('create.discord.unlinkBlocked', { count: held })}
                    </p>
                )}
            </div>
        </>
    );
}
