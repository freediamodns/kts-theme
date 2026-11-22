import React from 'react';
import {
    Archive,
    Bell,
    CreditCard,
    History,
    LifeBuoy,
    Link2,
    LucideIcon,
    Power,
    Server,
    SlidersHorizontal,
    Terminal,
    Unplug,
    UserRound,
} from 'lucide-react';
import { SectionHeader } from '@/dezerx/components/console/Section';
import { cn } from '@/dezerx/lib/cn';
import { BotCommand } from '@/api/account/discordBot';
import { useT } from '@/i18n';

const ICONS: Record<string, LucideIcon> = {
    servers: Server,
    controlpanel: SlidersHorizontal,
    power: Power,
    command: Terminal,
    backups: Archive,
    connect: Link2,
    activity: History,
    billing: CreditCard,
    alerts: Bell,
    account: UserRound,
    unlink: Unplug,
    help: LifeBuoy,
};

export function CommandIcon({ name, className }: { name: string; className?: string }) {
    const Icon = ICONS[name] ?? Terminal;

    return (
        <span
            className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-raised text-ink-muted',
                className
            )}
            aria-hidden={'true'}
        >
            <Icon className={'h-4 w-4'} />
        </span>
    );
}

export default function CommandList({ commands }: { commands: BotCommand[] }) {
    const t = useT();
    const shown = commands.filter((command) => command.enabled);

    if (shown.length === 0) {
        return null;
    }

    return (
        <div className={'rounded-2xl bg-card p-5 ring-1 ring-line-field'}>
            <SectionHeader
                title={t('discordBot.commands.title')}
                description={t('discordBot.commands.descriptionGlobal')}
            />

            <div className={'mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3'}>
                {shown.map((command) => (
                    <div key={command.name} className={'flex items-start gap-3 rounded-xl bg-overlay/40 p-3'}>
                        <CommandIcon name={command.name} />
                        <div className={'min-w-0'}>
                            <p className={'text-sm font-semibold text-ink'}>/{command.name}</p>
                            <p className={'mt-0.5 text-xs leading-relaxed text-ink-faint'}>
                                {t(`discordBot.command.${command.name}`, { defaultValue: command.description })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
