import React, { ComponentType, useMemo } from 'react';
import { useStoreState } from 'easy-peasy';
import {
    Archive,
    ArrowLeftRight,
    Blocks,
    Box,
    Boxes,
    CalendarClock,
    Cloud,
    ExternalLink,
    Gamepad2,
    Globe,
    Map,
    PawPrint,
    Plug,
    SlidersHorizontal,
    Tag,
    Trash2,
    Users,
} from 'lucide-react';
import { ApplicationStore } from '@/state';
import { cn } from '@/dezerx/lib/cn';
import { allAddons, type AddonSummary } from '@/dezerx/lib/addons';
import { demoRefusal, useDemo } from '@/dezerx/lib/demo';
import { useToast } from '@/dezerx/components/ui/Toast';
import { HoverTip } from '@/dezerx/components/ui/HoverTip';

const ADMIN_ADDONS = '/admin/dezerx/addons';

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
    'player-manager': Users,
    'plugin-manager': Plug,
    'mod-manager': Boxes,
    'modpack-manager': Archive,
    'version-changer': Tag,
    'properties-editor': SlidersHorizontal,
    'hytale-mod-manager': Box,
    'palworld-mod-manager': PawPrint,
    'world-manager': Globe,
    'world-viewer': Map,
    'egg-switcher': ArrowLeftRight,
    'recycle-bin': Trash2,
    'drive-backups': Cloud,
    'auto-action': CalendarClock,
    'dayz-mods': Gamepad2,
};

function Mark({ addon }: { addon: AddonSummary }) {
    if (addon.mark !== '') {
        return (
            <span
                aria-hidden={'true'}
                className={'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4'}
                dangerouslySetInnerHTML={{ __html: addon.mark }}
            />
        );
    }

    const Icon = ICONS[addon.key] ?? Blocks;

    return <Icon className={'h-[18px] w-[18px] shrink-0 text-ink-faint'} />;
}

export function AddonsSection() {
    const { toast } = useToast();
    const demo = useDemo();
    const admin = useStoreState((state: ApplicationStore) => state.user.data?.rootAdmin) === true;

    const addons = useMemo(() => allAddons(), []);
    const live = addons.filter((addon) => addon.enabled).length;

    const settings = (key?: string) => {
        if (demo) {
            toast(demoRefusal(), { tone: 'error' });

            return;
        }

        window.location.href = key ? `${ADMIN_ADDONS}/${key}` : ADMIN_ADDONS;
    };

    if (addons.length === 0) {
        return <p className={'text-[15px] text-ink-faint'}>{'Nothing is registered on this panel yet.'}</p>;
    }

    return (
        <div className={'space-y-3'}>
            <div className={'flex items-center justify-between gap-3'}>
                <p className={'text-[13px] text-ink-faint'}>{`${live} of ${addons.length} turned on`}</p>

                {(admin || demo) && (
                    <button
                        type={'button'}
                        disabled={demo}
                        onClick={() => settings()}
                        title={demo ? demoRefusal() : undefined}
                        className={cn(
                            'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium transition-colors',
                            demo ? 'cursor-not-allowed text-ink-faint opacity-50' : 'text-accent hover:bg-raised'
                        )}
                    >
                        {'Settings'}
                        <ExternalLink aria-hidden={'true'} className={'h-3.5 w-3.5'} />
                    </button>
                )}
            </div>

            <ul className={'overflow-hidden rounded-xl ring-1 ring-line-field'}>
                {addons.map((addon) => (
                    <li key={addon.key} className={'border-t border-line-field first:border-t-0'}>
                        <div className={'flex items-start gap-2.5 bg-card px-3 py-2.5'}>
                            <span className={'mt-0.5'}>
                                <Mark addon={addon} />
                            </span>

                            <div className={'min-w-0 flex-1'}>
                                <p className={'truncate text-[15px] font-semibold tracking-tight text-ink'}>
                                    {addon.name}
                                </p>
                                <p className={'mt-0.5 text-[13px] leading-relaxed text-ink-muted'}>{addon.blurb}</p>
                            </div>

                            <HoverTip side={'left'} label={addon.enabled ? 'Turned on' : 'Turned off'}>
                                <span
                                    role={'img'}
                                    aria-label={addon.enabled ? 'Turned on' : 'Turned off'}
                                    className={cn(
                                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                                        addon.enabled ? 'bg-success' : 'bg-ink-faint/40'
                                    )}
                                />
                            </HoverTip>

                            {(admin || demo) && (
                                <button
                                    type={'button'}
                                    disabled={demo}
                                    aria-label={`Settings for ${addon.name}`}
                                    title={demo ? demoRefusal() : `Settings for ${addon.name}`}
                                    onClick={() => settings(addon.key)}
                                    className={
                                        'shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:bg-raised hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-faint'
                                    }
                                >
                                    <ExternalLink className={'h-4 w-4'} />
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default AddonsSection;
