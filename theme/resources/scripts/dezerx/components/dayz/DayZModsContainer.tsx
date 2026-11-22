import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
    ArrowLeftRight,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Gamepad2,
    FolderOpen,
    KeyRound,
    Link2,
    ListChecks,
    Lock,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { bytesToString } from '@/lib/formatters';
import { Badge, Button, HoverTip, Input, Notice, Skeleton, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { ResultCard, VersionPicker, resultGrid } from '@/dezerx/components/addons/AddonManager';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { cn } from '@/dezerx/lib/cn';
import {
    DayZItemPayload,
    DayZMod,
    DayZModsPayload,
    DayZSide,
    DayZWorkshopItem,
    addDayZMods,
    deleteDayZFolder,
    getDayZItem,
    getDayZMods,
    loadDayZFolder,
    moveDayZMod,
    orderDayZMods,
    removeDayZMod,
    searchDayZMods,
    syncDayZKeys,
} from '@/api/server/dayzMods';
import { useT } from '@/i18n';

type Translate = ReturnType<typeof useT>;

const SIDES: DayZSide[] = ['client', 'server'];

const date = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toLocaleDateString() : '');

const asResult = (item: DayZWorkshopItem) => ({
    id: item.id,
    name: item.title,
    description: item.description,
    author: '',
    authorUrl: null,
    downloads: item.subscriptions,
    stars: null,
    updatedAt: item.updatedAt ? new Date(item.updatedAt * 1000).toISOString() : null,
    icon: item.preview,
    url: item.url,
    installable: true,
    reason: null,
});

export default function DayZModsContainer() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { toast } = useToast();

    const [payload, setPayload] = useState<DayZModsPayload | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [side, setSide] = useState<DayZSide>('client');
    const [busy, setBusy] = useState<string | null>(null);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    const load = () =>
        getDayZMods(uuid)
            .then((data) => {
                setPayload(data);
                setError(null);
            })
            .catch(setError);

    useEffect(() => {
        void load();
    }, [uuid]);

    const run = async (key: string, action: () => Promise<unknown>, done: string | null, failed: string) => {
        setBusy(key);

        try {
            await action();
            await load();
            if (done) {
                toast(done, { tone: 'success' });
            }
        } catch (problem) {
            toast(apiMessage(problem, failed), { tone: 'error' });
            await load();
        } finally {
            setBusy(null);
        }
    };

    const loaded = useMemo(() => {
        const out = new Set<string>();
        for (const list of SIDES.map((s) => payload?.lists?.[s] ?? [])) {
            list.forEach((mod) => out.add(mod.raw));
        }
        (payload?.modFile?.mods ?? []).forEach((mod) => out.add(mod.raw));

        return out;
    }, [payload]);

    const missingKeys = useMemo(
        () =>
            [...SIDES.flatMap((s) => payload?.lists?.[s] ?? []), ...(payload?.modFile?.mods ?? [])].reduce(
                (total, mod) => total + (mod.missingKeys?.length ?? 0),
                0
            ),
        [payload]
    );

    if (payload !== null && !payload.available) {
        return (
            <ServerContentBlock title={t('dayz.title')}>
                <SectionEmpty icon={Gamepad2} title={t('dayz.unavailableTitle')} body={t('dayz.unavailableBody')} />
            </ServerContentBlock>
        );
    }

    const list = payload?.lists?.[side] ?? [];
    const editable = payload?.editable?.[side] ?? false;
    const ordered = payload?.orderHonoured?.[side] ?? true;
    const broken = SIDES.flatMap((s) => payload?.lists?.[s] ?? []).find((mod) => mod.cut === 'breaks');

    const move = (index: number, by: number) => {
        const order = list.map((mod) => mod.raw);
        const [entry] = order.splice(index, 1);
        order.splice(index + by, 0, entry);

        setPayload((current) =>
            current?.lists
                ? {
                      ...current,
                      lists: { ...current.lists, [side]: order.map((raw) => list.find((mod) => mod.raw === raw)!) },
                  }
                : current
        );

        void run(`order:${entry}`, () => orderDayZMods(uuid, side, order), null, t('dayz.orderFailed'));
    };

    const remove = (mod: DayZMod) =>
        setDialog({
            title: t('dayz.removeTitle', { name: mod.name ?? mod.raw }),
            body: t('dayz.removeBody'),
            confirmLabel: t('dayz.remove'),
            destructive: true,
            onConfirm: () =>
                run(mod.raw, () => removeDayZMod(uuid, mod.raw, side), t('dayz.removed'), t('dayz.changeFailed')),
        });

    const destroy = (mod: DayZMod) =>
        setDialog({
            title: t('dayz.deleteTitle', { folder: mod.folder ?? mod.raw }),
            body: t('dayz.deleteBody'),
            confirmLabel: t('common.delete'),
            destructive: true,
            onConfirm: () =>
                run(mod.raw, () => deleteDayZFolder(uuid, mod.folder!), t('dayz.deleted'), t('dayz.deleteFailed')),
        });

    return (
        <ServerContentBlock title={t('dayz.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            {error !== null && (
                <Notice
                    tone={'danger'}
                    className={'mb-4'}
                    title={t('dayz.loadFailed')}
                    action={
                        <Button size={'sm'} variant={'secondary'} onClick={() => void load()}>
                            {t('common.tryAgain')}
                        </Button>
                    }
                >
                    {apiMessage(error, t('dayz.unreachable'))}
                </Notice>
            )}

            {payload === null ? (
                error === null && <SectionSkeleton label={t('dayz.loading')} />
            ) : (
                <div className={'space-y-4'}>
                    {broken && (
                        <Notice tone={'danger'} title={t('dayz.spaceTitle', { entry: broken.raw })}>
                            {t('dayz.spaceBody')}
                        </Notice>
                    )}

                    {payload.downloads === false ? (
                        <Notice tone={'warning'} title={t('dayz.noDownloadsTitle')}>
                            {t('dayz.noDownloadsBody')}
                        </Notice>
                    ) : (
                        <Notice tone={'info'} title={t('dayz.restartTitle')} dismissId={'dayz.restart'}>
                            {t('dayz.restartBody')}
                        </Notice>
                    )}

                    <section className={'rounded-2xl bg-card p-4 sm:p-5'}>
                        <header className={'mb-4 flex flex-wrap items-center justify-between gap-3'}>
                            <div className={'min-w-0'}>
                                <h2 className={'text-sm font-semibold tracking-tight text-ink'}>
                                    {t('dayz.loadedTitle')}
                                </h2>
                                <p className={'mt-0.5 text-xs text-ink-faint'}>{t(`dayz.${side}Description`)}</p>
                            </div>

                            <div className={'flex flex-wrap items-center gap-2'}>
                                {missingKeys > 0 && (
                                    <Button
                                        size={'sm'}
                                        variant={'secondary'}
                                        loading={busy === 'keys'}
                                        onClick={() =>
                                            void run(
                                                'keys',
                                                () =>
                                                    syncDayZKeys(uuid).then(({ copied }) =>
                                                        toast(t('dayz.keysCopied', { count: copied.length }), {
                                                            tone: 'success',
                                                        })
                                                    ),
                                                null,
                                                t('dayz.keysFailed')
                                            )
                                        }
                                        icon={<KeyRound className={'h-3.5 w-3.5'} />}
                                    >
                                        {t('dayz.syncKeys', { count: missingKeys })}
                                    </Button>
                                )}

                                <div className={'flex rounded-xl bg-overlay/60 p-0.5'} role={'tablist'}>
                                    {SIDES.map((option) => (
                                        <button
                                            key={option}
                                            type={'button'}
                                            role={'tab'}
                                            aria-selected={side === option}
                                            onClick={() => setSide(option)}
                                            className={cn(
                                                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                                                side === option
                                                    ? 'bg-raised text-ink shadow-sm'
                                                    : 'text-ink-faint hover:text-ink'
                                            )}
                                        >
                                            {t(`dayz.${option}Tab`, { count: payload.lists?.[option]?.length ?? 0 })}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </header>

                        {!editable && (
                            <p className={'mb-3 flex items-center gap-1.5 text-xs text-ink-faint'}>
                                <Lock className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                {t('dayz.locked')}
                            </p>
                        )}

                        {!ordered && list.length > 1 && (
                            <div className={'mb-3'}>
                                <HoverTip side={'bottom'} wrap label={t('dayz.sortedNote')}>
                                    <span
                                        tabIndex={0}
                                        aria-label={t('dayz.sortedNote')}
                                        className={
                                            'inline-flex cursor-help items-center gap-1.5 rounded-lg bg-overlay/60 px-2 py-1 text-[11px] text-ink-faint'
                                        }
                                    >
                                        <ListChecks className={'h-3.5 w-3.5 shrink-0'} aria-hidden={'true'} />
                                        {t('dayz.sortedLabel')}
                                    </span>
                                </HoverTip>
                            </div>
                        )}

                        {list.length === 0 ? (
                            <SectionEmpty
                                icon={Gamepad2}
                                title={t('dayz.emptyTitle')}
                                body={t(side === 'client' ? 'dayz.emptyClient' : 'dayz.emptyServer')}
                            />
                        ) : (
                            <ol className={'space-y-2'}>
                                {list.map((mod, index) => (
                                    <ModRow
                                        key={mod.raw}
                                        t={t}
                                        mod={mod}
                                        index={index}
                                        downloads={payload.downloads !== false}
                                        actions={
                                            editable && (
                                                <>
                                                    {ordered && (
                                                        <>
                                                            <IconButton
                                                                label={t('dayz.moveUp')}
                                                                disabled={index === 0 || busy !== null}
                                                                onClick={() => move(index, -1)}
                                                            >
                                                                <ChevronUp className={'h-3.5 w-3.5'} />
                                                            </IconButton>
                                                            <IconButton
                                                                label={t('dayz.moveDown')}
                                                                disabled={index === list.length - 1 || busy !== null}
                                                                onClick={() => move(index, 1)}
                                                            >
                                                                <ChevronDown className={'h-3.5 w-3.5'} />
                                                            </IconButton>
                                                        </>
                                                    )}
                                                    {mod.folder && payload.editable?.[side === 'client' ? 'server' : 'client'] && (
                                                        <IconButton
                                                            label={t(side === 'client' ? 'dayz.toServer' : 'dayz.toClient')}
                                                            disabled={busy !== null}
                                                            onClick={() =>
                                                                void run(
                                                                    mod.raw,
                                                                    () =>
                                                                        moveDayZMod(
                                                                            uuid,
                                                                            mod.folder!,
                                                                            side === 'client' ? 'server' : 'client'
                                                                        ),
                                                                    t(side === 'client' ? 'dayz.movedServer' : 'dayz.movedClient'),
                                                                    t('dayz.changeFailed')
                                                                )
                                                            }
                                                        >
                                                            <ArrowLeftRight className={'h-3.5 w-3.5'} />
                                                        </IconButton>
                                                    )}
                                                    <IconButton
                                                        label={t('dayz.remove')}
                                                        danger
                                                        disabled={busy !== null}
                                                        onClick={() => remove(mod)}
                                                    >
                                                        <X className={'h-3.5 w-3.5'} />
                                                    </IconButton>
                                                </>
                                            )
                                        }
                                    />
                                ))}
                            </ol>
                        )}
                    </section>

                    {payload.modFile && payload.modFile.mods.length > 0 && (
                        <section className={'rounded-2xl bg-card p-4 sm:p-5'}>
                            <header className={'mb-4'}>
                                <h2 className={'text-sm font-semibold tracking-tight text-ink'}>
                                    {t('dayz.modFileTitle', { file: payload.modFile.name })}
                                </h2>
                                <p className={'mt-0.5 text-xs text-ink-faint'}>{t('dayz.modFileBody')}</p>
                            </header>
                            <ol className={'space-y-2'}>
                                {payload.modFile.mods.map((mod, index) => (
                                    <ModRow
                                        key={mod.raw}
                                        t={t}
                                        mod={mod}
                                        index={index}
                                        downloads={payload.downloads !== false}
                                    />
                                ))}
                            </ol>
                        </section>
                    )}

                    {(payload.unloaded?.length ?? 0) > 0 && (
                        <section className={'rounded-2xl bg-card p-4 sm:p-5'}>
                            <header className={'mb-4'}>
                                <h2 className={'text-sm font-semibold tracking-tight text-ink'}>
                                    {t('dayz.unloadedTitle')}
                                </h2>
                                <p className={'mt-0.5 text-xs text-ink-faint'}>{t('dayz.unloadedBody')}</p>
                            </header>
                            <ul className={'space-y-2'}>
                                {payload.unloaded!.map((mod) => (
                                    <ModRow
                                        key={mod.raw}
                                        t={t}
                                        mod={mod}
                                        downloads={payload.downloads !== false}
                                        actions={
                                            <>
                                                {SIDES.filter((option) => payload.editable?.[option]).map((option) => (
                                                    <Button
                                                        key={option}
                                                        size={'sm'}
                                                        variant={option === 'client' ? 'secondary' : 'ghost'}
                                                        loading={busy === `${mod.raw}:${option}`}
                                                        disabled={busy !== null}
                                                        onClick={() =>
                                                            void run(
                                                                `${mod.raw}:${option}`,
                                                                () => loadDayZFolder(uuid, mod.folder!, option),
                                                                t('dayz.loaded'),
                                                                t('dayz.changeFailed')
                                                            )
                                                        }
                                                        icon={<Plus className={'h-3.5 w-3.5'} />}
                                                    >
                                                        {t(option === 'client' ? 'dayz.loadClient' : 'dayz.loadServer')}
                                                    </Button>
                                                ))}
                                                <IconButton
                                                    label={t('dayz.deleteFiles')}
                                                    danger
                                                    disabled={busy !== null}
                                                    onClick={() => destroy(mod)}
                                                >
                                                    <Trash2 className={'h-3.5 w-3.5'} />
                                                </IconButton>
                                            </>
                                        }
                                    />
                                ))}
                            </ul>
                        </section>
                    )}

                    <Browser
                        uuid={uuid}
                        loaded={loaded}
                        canAdd={payload.editable ?? { client: false, server: false }}
                        searchMode={payload.search ?? 'pages'}
                        onAdded={async (added, to) => {
                            setSide(to);
                            toast(
                                added === 0 ? t('dayz.alreadyLoaded') : t('dayz.added', { count: added }),
                                { tone: 'success' }
                            );
                            await load();
                        }}
                    />
                </div>
            )}
        </ServerContentBlock>
    );
}

function IconButton({
    label,
    danger = false,
    disabled,
    onClick,
    children,
}: {
    label: string;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type={'button'}
            title={label}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'rounded-lg p-1.5 text-ink-faint transition-colors disabled:pointer-events-none disabled:opacity-40',
                danger ? 'hover:bg-danger/10 hover:text-danger' : 'hover:bg-overlay hover:text-ink'
            )}
        >
            {children}
        </button>
    );
}

function ModRow({
    t,
    mod,
    index,
    downloads,
    actions,
}: {
    t: Translate;
    mod: DayZMod;
    index?: number;
    downloads: boolean;
    actions?: React.ReactNode;
}) {
    if (mod.kind === 'unknown') {
        return (
            <li className={'flex items-center justify-between gap-3 rounded-2xl bg-overlay/40 p-3'}>
                <div className={'min-w-0'}>
                    <p className={'truncate font-mono text-xs text-ink'}>{mod.raw}</p>
                    <p className={'mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-faint'}>
                        {t('dayz.unknownEntry')}
                        {mod.cut && (
                            <Badge tone={'danger'}>{t(mod.cut === 'breaks' ? 'dayz.badgeBreaks' : 'dayz.badgeAfterBreak')}</Badge>
                        )}
                    </p>
                </div>
                <div className={'flex shrink-0 items-center gap-0.5'}>{actions}</div>
            </li>
        );
    }

    const meta = [
        mod.folder,
        mod.size ? bytesToString(mod.size) : null,
        mod.updatedAt ? t('dayz.updatedOn', { date: date(mod.updatedAt) }) : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <li className={'flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-overlay/40 p-3'}>
            <div className={'flex min-w-0 items-center gap-3'}>
                {index !== undefined && (
                    <span className={'w-5 shrink-0 text-right font-mono text-[11px] text-ink-faint'}>{index + 1}</span>
                )}

                {mod.preview ? (
                    <img
                        src={mod.preview}
                        alt={''}
                        loading={'lazy'}
                        className={'h-10 w-10 shrink-0 rounded-xl bg-overlay object-cover'}
                    />
                ) : (
                    <span
                        className={
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-overlay text-ink-muted'
                        }
                    >
                        {mod.kind === 'workshop' ? (
                            <Gamepad2 className={'h-4 w-4'} aria-hidden={'true'} />
                        ) : (
                            <FolderOpen className={'h-4 w-4'} aria-hidden={'true'} />
                        )}
                    </span>
                )}

                <div className={'min-w-0'}>
                    <div className={'flex flex-wrap items-center gap-1.5'}>
                        <p className={'truncate text-sm font-medium text-ink'}>{mod.name ?? mod.raw}</p>
                        {mod.url && (
                            <a
                                href={mod.url}
                                target={'_blank'}
                                rel={'noreferrer'}
                                className={'text-ink-faint hover:text-ink'}
                                title={t('dayz.openWorkshop')}
                            >
                                <ExternalLink className={'h-3 w-3'} aria-hidden={'true'} />
                            </a>
                        )}
                        <Badge tone={'neutral'}>{t(mod.kind === 'workshop' ? 'dayz.badgeWorkshop' : 'dayz.badgeUpload')}</Badge>
                        {mod.kind === 'workshop' && !mod.known && <Badge tone={'warning'}>{t('dayz.badgeGone')}</Badge>}
                        {mod.kind === 'workshop' && !mod.onDisk && (
                            <Badge tone={downloads ? 'info' : 'warning'}>
                                {t(downloads ? 'dayz.badgePending' : 'dayz.badgeMissing')}
                            </Badge>
                        )}
                        {mod.kind === 'upload' && !mod.onDisk && <Badge tone={'warning'}>{t('dayz.badgeMissing')}</Badge>}
                        {mod.updateAvailable && (
                            <Badge tone={'info'}>{t(downloads ? 'dayz.badgeUpdate' : 'dayz.badgeOutdated')}</Badge>
                        )}
                        {mod.cut && (
                            <Badge tone={'danger'}>{t(mod.cut === 'breaks' ? 'dayz.badgeBreaks' : 'dayz.badgeAfterBreak')}</Badge>
                        )}
                        {(mod.missingKeys?.length ?? 0) > 0 && (
                            <Badge tone={'danger'}>{t('dayz.badgeNoKey', { count: mod.missingKeys!.length })}</Badge>
                        )}
                    </div>
                    {meta !== '' && <p className={'mt-0.5 truncate font-mono text-[11px] text-ink-faint'}>{meta}</p>}
                </div>
            </div>

            {actions && <div className={'flex shrink-0 flex-wrap items-center gap-0.5'}>{actions}</div>}
        </li>
    );
}

function Browser({
    uuid,
    loaded,
    canAdd,
    searchMode,
    onAdded,
}: {
    uuid: string;
    loaded: Set<string>;
    canAdd: Record<DayZSide, boolean>;
    searchMode: 'api' | 'pages';
    onAdded: (count: number, side: DayZSide) => Promise<void>;
}) {
    const t = useT();
    const { toast } = useToast();
    const tiles = usePanelTheme()['addons.cards'] === 'tiles';

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<DayZWorkshopItem[] | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [searching, setSearching] = useState(false);
    const [direct, setDirect] = useState('');
    const [looking, setLooking] = useState<string | null>(null);
    const [picked, setPicked] = useState<DayZItemPayload | null>(null);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(
            () => {
                setSearching(true);

                searchDayZMods(uuid, query)
                    .then((data) => {
                        setResults(data.results);
                        setProblem(data.error);
                    })
                    .catch((error) => {
                        setResults([]);
                        setProblem(apiMessage(error, t('dayz.searchFailed')));
                    })
                    .then(() => setSearching(false));
            },
            query === '' ? 0 : 400
        );

        return () => window.clearTimeout(timer);
    }, [uuid, query]);

    const open = async (id: string) => {
        setLooking(id);

        try {
            setPicked(await getDayZItem(uuid, id));
        } catch (error) {
            toast(apiMessage(error, t('dayz.lookupFailed')), { tone: 'error' });
        } finally {
            setLooking(null);
        }
    };

    const lookup = (event: FormEvent) => {
        event.preventDefault();
        if (direct.trim() !== '') {
            void open(direct.trim());
        }
    };

    const ids = picked
        ? picked.collection
            ? picked.collection.items.map((item) => item.id)
            : [...picked.requires.map((item) => item.id), picked.item!.id]
        : [];
    const fresh = ids.filter((id) => !loaded.has(`@${id}`));

    const add = async (side: DayZSide) => {
        setAdding(true);

        try {
            const { added } = await addDayZMods(uuid, ids, side);
            setPicked(null);
            await onAdded(added.length, side);
        } catch (error) {
            toast(apiMessage(error, t('dayz.addFailed')), { tone: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const head = picked?.collection
        ? {
              ...asResult(picked.collection.items[0] ?? ({} as DayZWorkshopItem)),
              id: picked.collection.id,
              name: t('dayz.collectionTitle', { count: picked.collection.items.length }),
              description: picked.collection.items.map((item) => item.title).join(', '),
              url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${picked.collection.id}`,
          }
        : picked?.item
        ? asResult(picked.item)
        : null;

    const extras = picked && !picked.collection ? picked.requires : [];

    return (
        <section className={'space-y-3 rounded-2xl bg-card p-4 sm:p-5'}>
            <header>
                <h2 className={'text-sm font-semibold tracking-tight text-ink'}>{t('dayz.browseTitle')}</h2>
                <p className={'mt-0.5 text-xs text-ink-faint'}>
                    {t(searchMode === 'api' ? 'dayz.browseBodyApi' : 'dayz.browseBodyPages')}
                </p>
            </header>

            <div className={'grid gap-2 lg:grid-cols-[1fr_minmax(0,22rem)]'}>
                <Input
                    aria-label={t('dayz.searchLabel')}
                    placeholder={t('dayz.searchPlaceholder')}
                    value={query}
                    icon={<Search className={'h-4 w-4'} />}
                    onChange={(event) => setQuery(event.target.value)}
                />

                <form onSubmit={lookup} className={'flex gap-2'}>
                    <Input
                        aria-label={t('dayz.directLabel')}
                        placeholder={t('dayz.directPlaceholder')}
                        value={direct}
                        icon={<Link2 className={'h-4 w-4'} />}
                        onChange={(event) => setDirect(event.target.value)}
                    />
                    <Button type={'submit'} size={'md'} variant={'secondary'} loading={looking === direct.trim()}>
                        {t('dayz.lookUp')}
                    </Button>
                </form>
            </div>

            {results === null || (searching && results.length === 0) ? (
                <div className={resultGrid(tiles)}>
                    {Array.from({ length: tiles ? 6 : 5 }).map((_, index) => (
                        <Skeleton key={index} className={cn('rounded-2xl', tiles ? 'h-[132px]' : 'h-[74px]')} />
                    ))}
                </div>
            ) : problem !== null || results.length === 0 ? (
                <SectionEmpty icon={Search} title={t('dayz.noResultsTitle')} body={problem ?? t('dayz.noMatch')} />
            ) : (
                <div className={cn(resultGrid(tiles), searching && 'opacity-60 transition-opacity')}>
                    {results.map((item) => (
                        <ResultCard
                            key={item.id}
                            result={asResult(item)}
                            tiles={tiles}
                            installing={looking === item.id}
                            onVersions={() => void open(item.id)}
                            fallbackIcon={Gamepad2}
                            badge={loaded.has(`@${item.id}`) ? t('dayz.badgeLoaded') : undefined}
                        />
                    ))}
                </div>
            )}

            <VersionPicker
                addon={head}
                versions={
                    picked
                        ? (['client', 'server'] as DayZSide[])
                              .filter((option) => canAdd[option])
                              .map((option) => ({
                                  id: option,
                                  label: t(option === 'client' ? 'dayz.addClient' : 'dayz.addServer'),
                                  detail: option === 'client' ? '-mod=' : '-serverMod=',
                                  meta:
                                      fresh.length === 0
                                          ? t('dayz.allLoaded')
                                          : t('dayz.willAdd', { count: fresh.length }),
                              }))
                        : null
                }
                empty={t('dayz.locked')}
                installing={adding}
                fallbackIcon={Gamepad2}
                badge={picked?.collection ? t('dayz.badgeCollection') : undefined}
                filters={
                    extras.length > 0 && (
                        <div className={'mt-3 rounded-xl bg-overlay/40 p-3'}>
                            <p className={'text-xs font-medium text-ink'}>{t('dayz.requiresTitle')}</p>
                            <ul className={'mt-1.5 space-y-1'}>
                                {extras.map((item) => (
                                    <li key={item.id} className={'flex items-center justify-between gap-2 text-xs'}>
                                        <span className={'truncate text-ink-muted'}>{item.title}</span>
                                        <span className={'shrink-0 text-[11px] text-ink-faint'}>
                                            {loaded.has(`@${item.id}`) ? t('dayz.alreadyThere') : t('dayz.addedFirst')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                }
                onInstall={(option) => void add(option as DayZSide)}
                onClose={() => setPicked(null)}
            />
        </section>
    );
}
