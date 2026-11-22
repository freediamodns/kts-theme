import React, { useEffect, useState } from 'react';
import { FileArchive, PawPrint, Power, Search, Trash2 } from 'lucide-react';
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
    PalworldMod,
    PalworldModFile,
    PalworldModPayload,
    PalworldSearchHit,
    deletePalworldMod,
    getPalworldModFiles,
    getPalworldMods,
    installPalworldModFile,
    searchPalworldMods,
    togglePalworldMod,
    unpackPalworldMod,
} from '@/api/server/palworldMods';
import { useT } from '@/i18n';

export default function PalworldModsContainer() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { toast } = useToast();

    const [payload, setPayload] = useState<PalworldModPayload | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);
    const [showInstalled, setShowInstalled] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    const load = () =>
        getPalworldMods(uuid)
            .then((data) => {
                setPayload(data);
                setError(null);
            })
            .catch(setError);

    useEffect(() => {
        void load();
    }, [uuid]);

    const toggle = async (mod: PalworldMod) => {
        setBusy(mod.file);

        try {
            await togglePalworldMod(uuid, mod.file);
            await load();
            toast(mod.disabled ? `${mod.name} is on.` : `${mod.name} is off.`, { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('palworld.toggleFailed')), { tone: 'error' });
        } finally {
            setBusy(null);
        }
    };

    const unpack = async (mod: PalworldMod) => {
        setBusy(mod.file);

        try {
            await unpackPalworldMod(uuid, mod.file);
            await load();
            toast(t('palworld.unpacked'), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('palworld.unpackFailed')), { tone: 'error' });
        } finally {
            setBusy(null);
        }
    };

    const remove = (mod: PalworldMod) =>
        setDialog({
            title: t('palworld.deleteTitle', { name: mod.name }),
            body: t('palworld.deleteBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            onConfirm: async () => {
                try {
                    await deletePalworldMod(uuid, mod.file);
                    await load();
                    toast(t('palworld.deleted'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('palworld.removeFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    return (
        <ServerContentBlock title={t('palworld.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            {error !== null && (
                <Notice
                    tone={'danger'}
                    className={'mb-4'}
                    title={t('palworld.loadFailed')}
                    action={
                        <Button size={'sm'} variant={'secondary'} onClick={() => void load()}>
                            {t('common.tryAgain')}
                        </Button>
                    }
                >
                    {apiMessage(error, t('palworld.unreachable'))}
                </Notice>
            )}

            {payload === null ? (
                error === null && <SectionSkeleton label={t('palworld.loading')} />
            ) : (
                <div className={'space-y-4'}>
                    <div className={'flex flex-wrap items-center justify-between gap-2'}>
                        <p className={'font-mono text-[11px] text-ink-faint'}>{payload.directory}</p>

                        <Button
                            size={'sm'}
                            variant={'secondary'}
                            onClick={() => setShowInstalled(true)}
                            icon={<PawPrint className={'h-3.5 w-3.5'} />}
                        >
                            {t('addons.installedCount', { count: payload.mods.length })}
                        </Button>
                    </div>

                    <Browser
                        uuid={uuid}
                        onInstalled={async (archive) => {
                            toast(archive ? t('palworld.archiveStarted') : t('palworld.downloadStarted'), {
                                tone: 'success',
                            });
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
                            <SectionEmpty
                                icon={PawPrint}
                                title={t('palworld.emptyTitle')}
                                body={t('palworld.emptyBody', { directory: payload.directory })}
                            />
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
                                                    {mod.archive ? (
                                                        <FileArchive className={'h-4 w-4'} aria-hidden={'true'} />
                                                    ) : (
                                                        <PawPrint className={'h-4 w-4'} aria-hidden={'true'} />
                                                    )}
                                                </span>

                                                <div className={'min-w-0'}>
                                                    <div className={'flex flex-wrap items-center gap-2'}>
                                                        <p className={'truncate text-sm font-medium text-ink'}>
                                                            {mod.name}
                                                        </p>
                                                        {mod.disabled && (
                                                            <Badge tone={'warning'}>{t('addons.badgeDisabled')}</Badge>
                                                        )}
                                                        {mod.archive && !mod.disabled && (
                                                            <Badge tone={'info'}>{t('palworld.badgeArchive')}</Badge>
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
                                                {mod.archive && !mod.disabled && (
                                                    <Button
                                                        size={'sm'}
                                                        variant={'secondary'}
                                                        loading={busy === mod.file}
                                                        onClick={() => void unpack(mod)}
                                                        title={t('palworld.unpackHint')}
                                                        icon={<FileArchive className={'h-3.5 w-3.5'} />}
                                                    >
                                                        {t('palworld.unpack')}
                                                    </Button>
                                                )}

                                                <Button
                                                    size={'sm'}
                                                    variant={'ghost'}
                                                    loading={busy === mod.file}
                                                    onClick={() => void toggle(mod)}
                                                    title={
                                                        mod.disabled
                                                            ? t('palworld.enableHint')
                                                            : t('palworld.disableHint')
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

function Browser({ uuid, onInstalled }: { uuid: string; onInstalled: (archive: boolean) => Promise<void> }) {
    const t = useT();
    const { toast } = useToast();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PalworldSearchHit[] | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [searching, setSearching] = useState(false);
    const [picked, setPicked] = useState<PalworldSearchHit | null>(null);
    const [files, setFiles] = useState<PalworldModFile[] | null>(null);
    const [installing, setInstalling] = useState<string | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(
            () => {
                setSearching(true);

                searchPalworldMods(uuid, query)
                    .then((data) => {
                        setResults(data.results);
                        setProblem(data.error);
                    })
                    .catch((error) => {
                        setResults([]);
                        setProblem(apiMessage(error, t('palworld.searchFailed')));
                    })
                    .then(() => setSearching(false));
            },
            query === '' ? 0 : 350
        );

        return () => window.clearTimeout(timer);
    }, [uuid, query]);

    const open = async (hit: PalworldSearchHit) => {
        setPicked(hit);
        setFiles(null);

        try {
            const data = await getPalworldModFiles(uuid, hit.id);

            setFiles(data.files);
        } catch (error) {
            toast(apiMessage(error, t('palworld.versionsFailed')), { tone: 'error' });
            setFiles([]);
        }
    };

    const install = async (file: PalworldModFile) => {
        if (!picked) {
            return;
        }

        setInstalling(file.id);

        try {
            const result = await installPalworldModFile(uuid, picked.id, file.id);

            setPicked(null);
            await onInstalled(result.archive);
        } catch (error) {
            toast(apiMessage(error, t('palworld.installFailed')), { tone: 'error' });
        } finally {
            setInstalling(null);
        }
    };

    const tiles = usePanelTheme()['addons.cards'] === 'tiles';

    return (
        <div className={'space-y-3'}>
            <Input
                aria-label={t('palworld.searchLabel')}
                placeholder={t('palworld.searchPlaceholder')}
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
                <SectionEmpty icon={Search} title={t('modpacks.emptyTitle')} body={problem ?? t('palworld.noMatch')} />
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
                            fallbackIcon={PawPrint}
                            badge={hit.category || undefined}
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
                empty={t('palworld.noFiles')}
                installing={installing !== null}
                fallbackIcon={PawPrint}
                badge={picked?.category || undefined}
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
