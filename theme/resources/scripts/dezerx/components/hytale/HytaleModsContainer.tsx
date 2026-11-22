import React, { useEffect, useState } from 'react';
import { Box, Power, Search, Trash2 } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { bytesToString } from '@/lib/formatters';
import { Badge, Button, Input, Notice, Skeleton, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { ListDialog, ResultCard, VersionPicker, resultGrid } from '@/dezerx/components/addons/AddonManager';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { cn } from '@/dezerx/lib/cn';
import {
    HytaleMod,
    HytaleModFile,
    HytaleModPayload,
    HytaleSearchHit,
    deleteHytaleMod,
    getHytaleModFiles,
    getHytaleMods,
    installHytaleModFile,
    searchHytaleMods,
    toggleHytaleMod,
} from '@/api/server/hytaleMods';
import { useT } from '@/i18n';

export default function HytaleModsContainer() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { toast } = useToast();

    const [payload, setPayload] = useState<HytaleModPayload | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [showInstalled, setShowInstalled] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    const load = () =>
        getHytaleMods(uuid)
            .then((data) => {
                setPayload(data);
                setError(null);
            })
            .catch(setError);

    useEffect(() => {
        void load();
    }, [uuid]);

    const toggle = async (mod: HytaleMod) => {
        setBusy(mod.file);

        try {
            await toggleHytaleMod(uuid, mod.file);
            await load();
            toast(mod.disabled ? `${mod.name} is on.` : `${mod.name} is off.`, { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('hytale.toggleFailed')), { tone: 'error' });
        } finally {
            setBusy(null);
        }
    };

    const remove = (mod: HytaleMod) =>
        setDialog({
            title: t('hytale.deleteTitle', { name: mod.name }),
            body: t('hytale.deleteBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deleteHytaleMod(uuid, mod.file);
                    await load();
                    toast(t('hytale.deleted'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('hytale.removeFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    return (
        <ServerContentBlock title={t('hytale.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            {error !== null && (
                <Notice
                    tone={'danger'}
                    className={'mb-4'}
                    title={t('hytale.loadFailed')}
                    action={
                        <Button size={'sm'} variant={'secondary'} onClick={() => void load()}>
                            {t('common.tryAgain')}
                        </Button>
                    }
                >
                    {apiMessage(error, t('hytale.unreachable'))}
                </Notice>
            )}

            {payload === null ? (
                error === null && <SectionSkeleton label={t('hytale.loading')} />
            ) : (
                <div className={'space-y-4'}>
                    <div className={'flex items-center justify-end'}>
                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            onClick={() => setShowInstalled(true)}
                            icon={<Box className={'h-3.5 w-3.5'} />}
                        >
                            {t('addons.installedCount', { count: payload.mods.length })}
                        </Button>
                    </div>

                    <Browser
                        uuid={uuid}
                        onInstalled={async () => {
                            toast(t('hytale.downloadStarted'), { tone: 'success' });
                            await load();
                        }}
                    />

                    <ListDialog
                        open={showInstalled}
                        onClose={() => setShowInstalled(false)}
                        title={t('addons.installed')}
                        subtitle={t('addons.installedDescription')}
                    >
                        {!payload.available || payload.mods.length === 0 ? (
                            <SectionEmpty icon={Box} title={t('hytale.emptyTitle')} body={t('hytale.emptyBody')} />
                        ) : (
                            <div className={'space-y-3'}>
                                {payload.mods.map((mod) => (
                                    <div
                                        key={mod.file}
                                        className={cn(
                                            'rounded-2xl bg-overlay/50 p-4 transition-opacity',
                                            mod.disabled && 'opacity-60'
                                        )}
                                    >
                                        <div className={'flex flex-wrap items-center justify-between gap-3'}>
                                            <div className={'flex min-w-0 items-center gap-2.5'}>
                                                <span
                                                    className={
                                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-overlay text-ink-muted'
                                                    }
                                                >
                                                    <Box className={'h-4 w-4'} aria-hidden={'true'} />
                                                </span>

                                                <div className={'min-w-0'}>
                                                    <div className={'flex flex-wrap items-center gap-2'}>
                                                        <p className={'truncate text-sm font-medium text-ink'}>
                                                            {mod.name}
                                                        </p>
                                                        {mod.disabled && (
                                                            <Badge tone={'warning'}>{t('addons.badgeDisabled')}</Badge>
                                                        )}
                                                    </div>

                                                    <p
                                                        className={
                                                            'mt-0.5 truncate font-mono text-[11px] text-ink-faint'
                                                        }
                                                    >
                                                        {`${mod.file} · ${bytesToString(mod.size)}`}
                                                    </p>
                                                </div>
                                            </div>

                                            <div
                                                className={
                                                    'flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto'
                                                }
                                            >
                                                <Button
                                                    size={'sm'}
                                                    variant={'ghost'}
                                                    loading={busy === mod.file}
                                                    onClick={() => void toggle(mod)}
                                                    title={
                                                        mod.disabled ? t('hytale.enableHint') : t('hytale.disableHint')
                                                    }
                                                    icon={<Power className={'h-3.5 w-3.5'} />}
                                                >
                                                    {t(mod.disabled ? 'addons.enable' : 'addons.disable')}
                                                </Button>

                                                <Button
                                                    size={'sm'}
                                                    variant={'ghost'}
                                                    onClick={() => remove(mod)}
                                                    className={'text-danger hover:bg-danger/10 hover:text-danger'}
                                                    icon={<Trash2 className={'h-3.5 w-3.5'} />}
                                                >
                                                    {t('common.delete')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ListDialog>
                </div>
            )}
        </ServerContentBlock>
    );
}

function Browser({ uuid, onInstalled }: { uuid: string; onInstalled: () => Promise<void> }) {
    const t = useT();
    const { toast } = useToast();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<HytaleSearchHit[] | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [searching, setSearching] = useState(false);
    const [picked, setPicked] = useState<HytaleSearchHit | null>(null);
    const [files, setFiles] = useState<HytaleModFile[] | null>(null);
    const [installing, setInstalling] = useState<string | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(
            () => {
                setSearching(true);

                searchHytaleMods(uuid, query)
                    .then((data) => {
                        setResults(data.results);
                        setProblem(data.error);
                    })
                    .catch((error) => {
                        setResults([]);
                        setProblem(apiMessage(error, t('hytale.searchFailed')));
                    })
                    .then(() => setSearching(false));
            },
            query === '' ? 0 : 350
        );

        return () => window.clearTimeout(timer);
    }, [uuid, query]);

    const open = async (hit: HytaleSearchHit) => {
        setPicked(hit);
        setFiles(null);

        try {
            const data = await getHytaleModFiles(uuid, hit.id);

            setFiles(data.files);
        } catch (error) {
            toast(apiMessage(error, t('hytale.versionsFailed')), { tone: 'error' });
            setFiles([]);
        }
    };

    const install = async (file: HytaleModFile) => {
        if (!picked) {
            return;
        }

        setInstalling(file.id);

        try {
            await installHytaleModFile(uuid, picked.id, file.id);
            setPicked(null);
            await onInstalled();
        } catch (error) {
            toast(apiMessage(error, t('hytale.installFailed')), { tone: 'error' });
        } finally {
            setInstalling(null);
        }
    };

    const tiles = usePanelTheme()['addons.cards'] === 'tiles';

    return (
        <div className={'space-y-3'}>
            <Input
                aria-label={t('hytale.searchLabel')}
                placeholder={t('hytale.searchPlaceholder')}
                value={query}
                icon={<Search className={'h-4 w-4'} />}
                onChange={(event) => setQuery(event.target.value)}
            />

            {results === null || (searching && results.length === 0) ? (
                <div className={resultGrid(tiles)}>
                    {Array.from({ length: tiles ? 6 : 5 }).map((_, index) => (
                        <Skeleton key={index} className={cn('rounded-2xl', tiles ? 'h-[132px]' : 'h-[74px]')} />
                    ))}
                </div>
            ) : problem !== null || results.length === 0 ? (
                <SectionEmpty icon={Search} title={t('modpacks.emptyTitle')} body={problem ?? t('hytale.noMatch')} />
            ) : (
                <div className={cn(resultGrid(tiles), searching && 'opacity-60 transition-opacity')}>
                    {results.map((hit) => (
                        <ResultCard
                            key={hit.id}
                            result={{
                                ...hit,
                                authorUrl: null,
                                stars: null,
                                updatedAt: null,
                                installable: true,
                                reason: null,
                            }}
                            tiles={tiles}
                            installing={installing !== null && picked?.id === hit.id}
                            onVersions={() => void open(hit)}
                            fallbackIcon={Box}
                        />
                    ))}
                </div>
            )}

            <VersionPicker
                addon={
                    picked && {
                        ...picked,
                        authorUrl: null,
                        stars: null,
                        updatedAt: null,
                        installable: true,
                        reason: null,
                    }
                }
                versions={
                    files &&
                    files.map((file) => ({
                        id: file.id,
                        label: file.name,
                        detail: file.filename,
                        meta: [
                            bytesToString(file.size),
                            file.releasedAt ? new Date(file.releasedAt).toLocaleDateString() : '',
                        ]
                            .filter(Boolean)
                            .join(' · '),
                    }))
                }
                empty={t('hytale.noFiles')}
                installing={installing !== null}
                fallbackIcon={Box}
                onInstall={(id) => {
                    const file = files?.find((entry) => entry.id === id);

                    if (file) {
                        void install(file);
                    }
                }}
                onClose={() => setPicked(null)}
            />
        </div>
    );
}
