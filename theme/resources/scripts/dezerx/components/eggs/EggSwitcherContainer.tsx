import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Search, TriangleAlert } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { Button, Input, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import EggSwitchDialog, { EggMark, SwitchRequest } from '@/dezerx/components/eggs/EggSwitchDialog';
import { EggSwitcherPayload, EggTarget, getEggSwitcher, switchEgg } from '@/api/server/eggSwitcher';
import { useDemo } from '@/dezerx/lib/demo';
import { useT } from '@/i18n';

export default function EggSwitcherContainer() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { toast } = useToast();
    const demo = useDemo();

    const [payload, setPayload] = useState<EggSwitcherPayload | null>(null);
    const [query, setQuery] = useState('');
    const [dialog, setDialog] = useState<SwitchRequest | null>(null);

    useEffect(() => {
        getEggSwitcher(uuid)
            .then(setPayload)
            .catch((error) => toast(apiMessage(error, t('fivem.readFailed')), { tone: 'error' }));
    }, [uuid]);

    const groups = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const matching = (payload?.targets ?? []).filter(
            (egg) =>
                needle === '' ||
                egg.name.toLowerCase().includes(needle) ||
                egg.nest.toLowerCase().includes(needle) ||
                egg.description.toLowerCase().includes(needle)
        );

        const out: { nest: string; eggs: EggTarget[] }[] = [];

        for (const egg of matching) {
            const existing = out.find((group) => group.nest === egg.nest);

            if (existing) {
                existing.eggs.push(egg);
            } else {
                out.push({ nest: egg.nest, eggs: [egg] });
            }
        }

        return out;
    }, [payload?.targets, query]);

    const apply = (egg: EggTarget) => {
        if (payload === null) {
            return;
        }

        setDialog({
            from: payload.current,
            to: egg,
            options: payload.options ?? { startup: 'force', reinstall: 'force', wipe: 'denied' },
            onConfirm: async (choices) => {
                try {
                    const { message, reinstalled } = await switchEgg(uuid, egg.uuid, choices);

                    toast(message, { tone: 'success' });

                    if (reinstalled) {
                        setPayload((current) =>
                            current === null
                                ? current
                                : { ...current, blocked: t('eggs.rebuildingAs', { name: egg.name }) }
                        );
                    } else {
                        getEggSwitcher(uuid)
                            .then(setPayload)
                            .catch(() => undefined);
                    }
                } catch (error) {
                    toast(apiMessage(error, t('eggs.switchFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });
    };

    if (payload === null) {
        return (
            <ServerContentBlock title={t('eggs.title')}>
                <SectionSkeleton label={t('eggs.loading')} />
            </ServerContentBlock>
        );
    }

    return (
        <ServerContentBlock title={t('eggs.title')}>
            <EggSwitchDialog request={dialog} onClose={() => setDialog(null)} />

            <div className={'space-y-6'}>
                <div className={'flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-4'}>
                    <div className={'flex min-w-0 items-center gap-3'}>
                        <EggMark uuid={payload.current.uuid} name={payload.current.name} />

                        <div className={'min-w-0'}>
                            <p className={'text-[11px] font-semibold uppercase tracking-wider text-ink-faint'}>
                                {t('eggs.runningNow')}
                            </p>
                            <p className={'mt-1 truncate font-akira text-lg tracking-tight text-ink'}>
                                {payload.current.name}
                            </p>
                            <p className={'mt-0.5 truncate text-xs text-ink-faint'}>
                                {payload.current.nest}
                                {payload.current.image !== '' && ` · ${payload.current.image}`}
                            </p>
                        </div>
                    </div>

                    <ArrowLeftRight className={'h-8 w-8 shrink-0 text-ink-faint'} aria-hidden={'true'} />
                </div>

                {payload.blocked !== null && (
                    <div className={'flex items-start gap-2.5 rounded-2xl bg-danger/10 p-4 text-sm text-ink'}>
                        <TriangleAlert aria-hidden={'true'} className={'mt-0.5 h-4 w-4 shrink-0 text-danger'} />
                        <p>{demo ? payload.blocked : `${payload.blocked} ${t('eggs.blocked')}`}</p>
                    </div>
                )}

                <div className={'space-y-3'}>
                    <SectionHeader title={t('eggs.switchTo')} description={t('eggs.switchToDescription')} />

                    {payload.targets.length > 3 && (
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t('eggs.search')}
                            icon={<Search className={'h-4 w-4'} />}
                        />
                    )}

                    {payload.targets.length === 0 ? (
                        <SectionEmpty
                            icon={ArrowLeftRight}
                            title={t('eggs.emptyTitle')}
                            body={t(payload.offered > 0 ? 'eggs.emptyOnlyCurrent' : 'eggs.emptyNone')}
                        />
                    ) : groups.length === 0 ? (
                        <SectionEmpty icon={Search} title={t('modpacks.emptyTitle')} body={t('eggs.noMatch')} />
                    ) : (
                        groups.map((group) => (
                            <div key={group.nest} className={'space-y-2'}>
                                <p className={'px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint'}>
                                    {group.nest}
                                </p>

                                <div className={'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'}>
                                    {group.eggs.map((egg) => (
                                        <div
                                            key={egg.uuid}
                                            className={'flex h-full flex-col gap-3 rounded-2xl bg-card p-4'}
                                        >
                                            <div className={'flex min-w-0 flex-1 gap-3'}>
                                                <EggMark uuid={egg.uuid} name={egg.name} size={'sm'} />

                                                <div className={'min-w-0 flex-1'}>
                                                    <p className={'truncate text-sm font-medium text-ink'}>
                                                        {egg.name}
                                                    </p>

                                                    <p className={'mt-1 line-clamp-3 text-xs text-ink-faint'}>
                                                        {egg.description || t('eggs.noDescription')}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                size={'sm'}
                                                variant={'primary'}
                                                fullWidth
                                                disabled={payload.blocked !== null}
                                                onClick={() => apply(egg)}
                                                icon={<ArrowLeftRight className={'h-3.5 w-3.5'} />}
                                            >
                                                Switch
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </ServerContentBlock>
    );
}

export { EggSwitcherContainer };
