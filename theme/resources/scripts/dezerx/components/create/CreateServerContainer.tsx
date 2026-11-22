import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
    Archive,
    ArrowLeft,
    Check,
    ChevronLeft,
    ChevronDown,
    ChevronRight,
    Cpu,
    Database,
    HardDrive,
    Info,
    MapPin,
    MemoryStick,
    Network,
    Rocket,
    Search,
    SlidersHorizontal,
    TriangleAlert,
    Wand2,
} from 'lucide-react';
import PageBlock from '@/dezerx/components/PageBlock';
import {
    FALLBACK_UNITS,
    SIZED,
    SIZE_LABEL,
    SIZE_STEP,
    SizeField,
    Sized,
    unitFor,
    writeLeft,
    writeSize,
} from '@/dezerx/components/create/SizeField';
import { Badge, Button, HoverTip, Input, Notice, Select, useToast } from '@/dezerx/components/ui';
import { SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import NodeFlag from '@/dezerx/components/NodeFlag';
import DiscordAccount from '@/dezerx/components/create/DiscordAccount';
import DiscordGate from '@/dezerx/components/create/DiscordGate';
import InstallProgress from '@/dezerx/components/create/InstallProgress';
import nodeCountry from '@/dezerx/lib/nodeCountry';
import {
    ChosenResources,
    CreateEgg,
    CreateLocation,
    CreateUnits,
    ResourceBounds,
    CreatePage,
    CreateRefusal,
    CreateVariable,
    CreatedServer,
    createServer,
    getCreatePage,
} from '@/api/dezerx/serverCreate';
import { CREATE_PATH } from '@/dezerx/lib/serverCreate';
import { ResolvedArt, resolveEggArt } from '@/dezerx/lib/serverArtwork';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { formatSize } from '@/dezerx/lib/format';
import { useDemo } from '@/dezerx/lib/demo';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

const STEPS = ['game', 'location', 'details'] as const;

type Step = typeof STEPS[number];

const FALLBACK_ART = '/dezerx/eggs/fallback.png';

const NAME_FIRST =
    'amber arctic azure blazing bold brave bright calm cobalt coral crimson crystal dusky eager electric fearless feral frosted gentle gilded golden hidden humble idle indigo ivory jade lively lunar mellow midnight misty noble olive onyx polar quiet rapid rustic sable scarlet silent silver solar stormy sunny swift teal velvet wild'.split(
        ' '
    );

const NAME_SECOND =
    'anchor anvil badger basalt beacon bison boulder canyon cinder comet cove crater dune ember falcon fjord forge fox geyser glacier granite grove harbor heron ibex islet lantern lynx meadow mesa nebula oak orbit otter peak pine quarry raven reef ridge shard spire summit thicket tundra vault walrus willow zenith zephyr'.split(
        ' '
    );

function randomServerName(): string {
    const pick = (words: string[]) => words[Math.floor(Math.random() * words.length)]!;

    return `${pick(NAME_FIRST)}-${pick(NAME_SECOND)}`;
}

function EggArt({ egg, size = 'md' }: { egg: CreateEgg; size?: 'sm' | 'md' | 'lg' }) {
    const theme = usePanelTheme();
    const [broken, setBroken] = useState(false);
    const logo = resolveEggArt(egg.uuid, egg.name, theme).logo;

    useEffect(() => setBroken(false), [logo]);

    const missing = logo === null || broken;
    const box = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14' : 'h-12 w-12';

    return (
        <img
            src={missing ? FALLBACK_ART : logo!}
            alt={''}
            aria-hidden={'true'}
            onError={() => setBroken(true)}
            className={cn('shrink-0 object-contain', box, missing && 'opacity-50 grayscale')}
        />
    );
}

function useEggArt(egg: CreateEgg | null): ResolvedArt | null {
    const theme = usePanelTheme();

    if (egg === null || !theme['servers.artwork']) {
        return null;
    }

    const art = resolveEggArt(egg.uuid, egg.name, theme);

    return art.image === '' ? null : art;
}

function EggBackdrop({ art, even = false }: { art: ResolvedArt; even?: boolean }) {
    return (
        <>
            <img
                src={art.image}
                alt={''}
                aria-hidden={'true'}
                loading={'lazy'}
                decoding={'async'}
                className={
                    'absolute inset-0 h-full w-full scale-[1.03] object-cover opacity-20 transition-transform duration-500 group-hover:scale-[1.08] [.light_&]:hidden'
                }
            />
            <img
                src={art.imageLight}
                alt={''}
                aria-hidden={'true'}
                loading={'lazy'}
                decoding={'async'}
                className={
                    'absolute inset-0 hidden h-full w-full scale-[1.03] object-cover opacity-70 transition-transform duration-500 group-hover:scale-[1.08] [.light_&]:block'
                }
            />
            <span
                aria-hidden={'true'}
                className={cn(
                    'absolute inset-0',
                    even
                        ? 'bg-card/70 [.light_&]:bg-card/40'
                        : 'bg-gradient-to-t from-card via-card/85 to-card/40 [.light_&]:from-card/70 [.light_&]:via-card/40 [.light_&]:to-transparent'
                )}
            />
        </>
    );
}

function AboutDialog({ egg, onClose }: { egg: CreateEgg | null; onClose: () => void }) {
    const t = useT();

    return (
        <DialogShell open={egg !== null} onClose={onClose} width={'md'} title={egg?.name ?? ''}>
            <p className={'mt-1 text-xs font-medium uppercase tracking-wider text-ink-faint'}>{egg?.nest}</p>

            <p
                className={
                    'mt-4 max-h-[50vh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-ink-muted'
                }
            >
                {egg?.description}
            </p>

            <DialogFooter>
                <Button variant={'secondary'} size={'sm'} onClick={onClose}>
                    {t('common.close')}
                </Button>
            </DialogFooter>
        </DialogShell>
    );
}

function Stepper({ step, reached, onGo }: { step: Step; reached: Step[]; onGo: (step: Step) => void }) {
    const t = useT();

    return (
        <ol className={'flex flex-wrap items-center gap-x-2 gap-y-2'}>
            {STEPS.map((candidate, index) => {
                const done = reached.includes(candidate) && candidate !== step;
                const here = candidate === step;
                const open = here || reached.includes(candidate);

                return (
                    <li key={candidate} className={'flex items-center gap-2'}>
                        <button
                            type={'button'}
                            disabled={!open}
                            onClick={() => onGo(candidate)}
                            aria-current={here ? 'step' : undefined}
                            className={cn(
                                'flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-xs font-medium transition-colors',
                                here && 'bg-accent/15 text-accent',
                                !here && open && 'text-ink-muted hover:bg-overlay hover:text-ink',
                                !open && 'cursor-not-allowed text-ink-faint'
                            )}
                        >
                            <span
                                className={cn(
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                                    here && 'bg-accent text-btn-ink',
                                    done && 'bg-success/20 text-success',
                                    !here && !done && 'bg-overlay text-ink-faint'
                                )}
                            >
                                {done ? <Check className={'h-3.5 w-3.5'} aria-hidden={'true'} /> : index + 1}
                            </span>
                            {t(`create.steps.${candidate}`)}
                        </button>

                        {index < STEPS.length - 1 && (
                            <ChevronRight className={'h-3.5 w-3.5 shrink-0 text-ink-faint'} aria-hidden={'true'} />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

function Tile({
    selected,
    disabled,
    onClick,
    className,
    children,
}: {
    selected: boolean;
    disabled?: boolean;
    onClick: () => void;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type={'button'}
            disabled={disabled}
            onClick={onClick}
            aria-pressed={selected}
            className={cn(
                'relative flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left transition-all',
                !disabled && 'hover:-translate-y-0.5 hover:bg-raised',
                selected && 'bg-raised',
                disabled && 'cursor-not-allowed opacity-50',
                className
            )}
        >
            {children}

            {selected && (
                <span
                    aria-hidden={'true'}
                    className={
                        'absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-btn-ink'
                    }
                >
                    <Check className={'h-3 w-3'} />
                </span>
            )}
        </button>
    );
}

function EggCard({
    egg,
    selected,
    onPick,
    onAbout,
}: {
    egg: CreateEgg;
    selected: boolean;
    onPick: () => void;
    onAbout: () => void;
}) {
    const t = useT();
    const described = egg.description.trim() !== '';

    const art = useEggArt(egg);

    return (
        <div
            className={cn(
                'group relative flex overflow-hidden rounded-2xl bg-card transition-all hover:-translate-y-0.5',
                art === null && 'hover:bg-raised',
                art === null && selected && 'bg-raised',
                art !== null && selected && 'ring-2 ring-accent'
            )}
        >
            {art !== null && <EggBackdrop art={art} />}

            <div className={'relative flex min-w-0 flex-1'}>
                <span
                    aria-hidden={'true'}
                    className={'flex w-24 shrink-0 items-center justify-center self-stretch py-4'}
                >
                    <EggArt egg={egg} size={'lg'} />
                </span>

                <div className={'min-w-0 flex-1 p-4'}>
                    <button
                        type={'button'}
                        onClick={onPick}
                        aria-pressed={selected}
                        className={
                            'block max-w-full truncate text-left text-sm font-medium text-ink after:absolute after:inset-0 after:content-[""]'
                        }
                    >
                        {egg.name}
                    </button>

                    <div className={'mt-1 flex items-baseline gap-2'}>
                        <span className={'min-w-0 flex-1 truncate text-sm text-ink-faint'}>
                            {egg.description || egg.nest}
                        </span>

                        {described && (
                            <button
                                type={'button'}
                                onClick={onAbout}
                                className={
                                    'relative z-10 shrink-0 text-xs font-semibold text-accent underline-offset-4 hover:underline'
                                }
                            >
                                {t('create.readMore')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {selected && (
                <span
                    aria-hidden={'true'}
                    className={
                        'absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-btn-ink'
                    }
                >
                    <Check className={'h-3 w-3'} />
                </span>
            )}
        </div>
    );
}

function LocationMark({ location }: { location: CreateLocation }) {
    const code = nodeCountry(location.name) ?? nodeCountry(location.hint);

    if (code !== null) {
        return <NodeFlag node={code} className={'mt-0.5 overflow-hidden rounded-md text-[2.6rem]'} />;
    }

    return (
        <span className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-overlay text-ink-faint'}>
            <MapPin className={'h-5 w-5'} aria-hidden={'true'} />
        </span>
    );
}

function Allowance({
    page,
    limits,
    units,
}: {
    page: CreatePage;
    limits: Record<string, ResourceBounds> | null;
    units: CreateUnits;
}) {
    const t = useT();

    const cap = (key: Sized, fixed: number) => {
        const bounds = limits?.[key];

        if (bounds === undefined) {
            return fixed;
        }

        return bounds.left === null ? bounds.max : Math.min(bounds.max, bounds.left);
    };

    const pills: { key: string; icon: React.ReactNode; label: string; value: string }[] = [
        {
            key: 'memory',
            icon: <MemoryStick className={'h-3.5 w-3.5'} aria-hidden={'true'} />,
            label: t('create.memory'),
            value: writeLeft('memory', cap('memory', page.resources.memory), units),
        },
        {
            key: 'disk',
            icon: <HardDrive className={'h-3.5 w-3.5'} aria-hidden={'true'} />,
            label: t('create.disk'),
            value: writeLeft('disk', cap('disk', page.resources.disk), units),
        },
        {
            key: 'cpu',
            icon: <Cpu className={'h-3.5 w-3.5'} aria-hidden={'true'} />,
            label: t('create.cpu'),
            value: writeLeft('cpu', cap('cpu', page.resources.cpu), units),
        },
        {
            key: 'databases',
            icon: <Database className={'h-3.5 w-3.5'} aria-hidden={'true'} />,
            label: t('create.databases'),
            value: String(cap('databases', page.resources.databases)),
        },
        {
            key: 'backups',
            icon: <Archive className={'h-3.5 w-3.5'} aria-hidden={'true'} />,
            label: t('create.backups'),
            value: String(cap('backups', page.resources.backups)),
        },
        {
            key: 'ports',
            icon: <Network className={'h-3.5 w-3.5'} aria-hidden={'true'} />,
            label: t('create.extraPorts'),
            value: String(cap('allocations', page.resources.allocations)),
        },
    ];

    return (
        <div className={'flex flex-wrap items-center gap-1.5 sm:justify-end'}>
            {page.remaining !== null && (
                <Badge tone={page.remaining > 0 ? 'info' : 'warning'}>
                    {t('create.slotsLeft', { count: page.remaining })}
                </Badge>
            )}

            {pills.map((pill) => (
                <HoverTip key={pill.key} label={pill.label} side={'bottom'}>
                    <span
                        className={
                            'inline-flex items-center gap-1.5 rounded-full bg-overlay px-2.5 py-1 text-[11px] font-medium text-ink-muted'
                        }
                    >
                        <span className={'text-ink-faint'}>{pill.icon}</span>
                        <span className={'sr-only'}>{pill.label}</span>
                        {pill.value}
                    </span>
                </HoverTip>
            ))}
        </div>
    );
}

function ResourceRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className={'flex items-center justify-between gap-3 text-xs'}>
            <span className={'flex min-w-0 items-center gap-2 text-ink-faint'}>
                {icon}
                <span className={'truncate'}>{label}</span>
            </span>
            <span className={'shrink-0 font-medium text-ink'}>{value}</span>
        </div>
    );
}

function Accordion({
    open,
    onToggle,
    title,
    hint,
    flag = false,
    children,
}: {
    open: boolean;
    onToggle: () => void;
    title: string;
    hint: string;
    flag?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <button
                type={'button'}
                onClick={onToggle}
                aria-expanded={open}
                className={'flex w-full items-center gap-3 rounded-xl text-left transition-colors'}
            >
                <SlidersHorizontal className={'h-4 w-4 shrink-0 text-ink-faint'} aria-hidden={'true'} />

                <span className={'min-w-0 flex-1'}>
                    <span className={'block text-sm font-medium text-ink'}>{title}</span>
                    <span className={'mt-0.5 block truncate text-xs text-ink-faint'}>{hint}</span>
                </span>

                {flag && <TriangleAlert className={'h-4 w-4 shrink-0 text-warning'} aria-hidden={'true'} />}

                <ChevronDown
                    aria-hidden={'true'}
                    className={cn('h-4 w-4 shrink-0 text-ink-faint transition-transform', open && 'rotate-180')}
                />
            </button>

            {open && <div className={'mt-4 space-y-4'}>{children}</div>}
        </div>
    );
}

function VariableField({
    variable,
    value,
    onChange,
}: {
    variable: CreateVariable;
    value: string;
    onChange: (value: string) => void;
}) {
    if (variable.options.length > 0) {
        return (
            <Select
                label={variable.name}
                hint={variable.description}
                value={value}
                onChange={onChange}
                options={variable.options.map((option) => ({ value: option, label: option }))}
            />
        );
    }

    return (
        <Input
            label={variable.name}
            hint={variable.description}
            value={value}
            maxLength={255}
            onChange={(event) => onChange(event.currentTarget.value)}
        />
    );
}

function Refused({ refusal, page }: { refusal: CreateRefusal; page: CreatePage | null }) {
    const t = useT();

    const body =
        refusal === 'young' && page !== null
            ? t('create.refused.youngBody', { count: page.minAccountAgeHours })
            : refusal === 'limit' && page !== null
            ? t('create.refused.limitBody', { count: page.perUser })
            : t(`create.refused.${refusal}Body`);

    return (
        <Notice
            tone={refusal === 'limit' || refusal === 'full' ? 'info' : 'warning'}
            title={t(`create.refused.${refusal}`)}
        >
            {body}
        </Notice>
    );
}

export default function CreateServerContainer() {
    const t = useT();
    const history = useHistory();
    const { toast } = useToast();
    const demo = useDemo();
    const theme = usePanelTheme();

    const [page, setPage] = useState<CreatePage | null>(null);
    const [failed, setFailed] = useState<string | null>(null);
    const [step, setStep] = useState<Step>('game');
    const [reached, setReached] = useState<Step[]>(['game']);

    const [eggUuid, setEggUuid] = useState<string | null>(null);
    const [location, setLocation] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [environment, setEnvironment] = useState<Record<string, string>>({});
    const [query, setQuery] = useState('');
    const [placeQuery, setPlaceQuery] = useState('');
    const [about, setAbout] = useState<CreateEgg | null>(null);
    const [advanced, setAdvanced] = useState(false);
    const [sized, setSized] = useState<ChosenResources>({});
    const [built, setBuilt] = useState<CreatedServer | null>(null);
    const [busy, setBusy] = useState(false);

    const [units, setUnits] = useState<CreateUnits>(FALLBACK_UNITS);

    const translate = useRef(t);
    translate.current = t;

    const reload = useCallback(() => {
        getCreatePage()
            .then((loaded) => {
                setPage(loaded);
                setUnits({ ...FALLBACK_UNITS, ...loaded.units });
            })
            .catch((error) => setFailed(apiMessage(error, translate.current('create.loadFailed'))));
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const egg = useMemo(() => page?.eggs.find((one) => one.uuid === eggUuid) ?? null, [page?.eggs, eggUuid]);
    const place = useMemo(
        () => page?.locations.find((one) => one.id === location) ?? null,
        [page?.locations, location]
    );

    const summaryArt = useEggArt(egg);

    const limits = page?.limits ?? null;

    const sizes = useMemo(() => {
        const out = { ...(page?.resources ?? {}) } as Record<string, number>;

        for (const key of SIZED) {
            const bounds = limits?.[key];

            if (bounds !== undefined) {
                out[key] = sized[key] ?? bounds.default;
            }
        }

        return out;
    }, [page?.resources, limits, sized]);

    const oversized = useMemo(() => {
        if (limits === null) {
            return false;
        }

        return SIZED.some((key) => {
            const bounds = limits[key];

            if (bounds === undefined) {
                return false;
            }

            const ceiling = bounds.left === null ? bounds.max : Math.min(bounds.max, bounds.left);

            return sizes[key] < bounds.min || sizes[key] > ceiling;
        });
    }, [limits, sizes]);

    const roomy = useMemo(() => (page?.locations ?? []).filter((one) => one.room), [page?.locations]);

    const locations = useMemo(() => {
        const needle = placeQuery.trim().toLowerCase();

        return (page?.locations ?? []).filter(
            (one) =>
                needle === '' ||
                one.name.toLowerCase().includes(needle) ||
                one.description.toLowerCase().includes(needle)
        );
    }, [page?.locations, placeQuery]);

    const eggs = useMemo(() => {
        const needle = query.trim().toLowerCase();

        return (page?.eggs ?? []).filter(
            (one) =>
                needle === '' ||
                one.name.toLowerCase().includes(needle) ||
                one.nest.toLowerCase().includes(needle) ||
                one.description.toLowerCase().includes(needle)
        );
    }, [page?.eggs, query]);

    const grouped = useMemo(() => {
        const out: { nest: string; eggs: CreateEgg[] }[] = [];

        for (const one of eggs) {
            const existing = out.find((group) => group.nest === one.nest);

            if (existing) {
                existing.eggs.push(one);
            } else {
                out.push({ nest: one.nest, eggs: [one] });
            }
        }

        return out;
    }, [eggs]);

    const go = (next: Step) => {
        setStep(next);
        setReached((current) => (current.includes(next) ? current : [...current, next]));
    };

    const pickEgg = (chosen: CreateEgg) => {
        setEggUuid(chosen.uuid);
        setEnvironment(
            chosen.variables.reduce<Record<string, string>>(
                (carry, variable) => ({ ...carry, [variable.env]: variable.default }),
                {}
            )
        );

        if (name.trim() === '') {
            setName(chosen.name);
        }

        go('location');
    };

    const missing = useMemo(
        () =>
            (egg?.variables ?? [])
                .filter((variable) => variable.required && (environment[variable.env] ?? '').trim() === '')
                .map((variable) => variable.name),
        [egg?.variables, environment]
    );

    const ready =
        egg !== null && place !== null && place.room && name.trim() !== '' && missing.length === 0 && !oversized;

    const submit = async () => {
        if (!ready || busy || page === null || egg === null || place === null) {
            return;
        }

        setBusy(true);

        if (demo) {
            if (page.demoServer === null) {
                toast(t('create.demoNoServer'), { tone: 'info' });
                setBusy(false);

                return;
            }

            setBuilt({ uuid: '', identifier: page.demoServer, name: name.trim() });

            return;
        }

        try {
            const created = await createServer({
                egg: egg.uuid,
                location: place.id,
                name: name.trim(),
                environment,
                resources:
                    limits === null
                        ? undefined
                        : (Object.fromEntries(SIZED.map((key) => [key, sizes[key]])) as ChosenResources),
            });

            toast(t('create.created', { name: created.name }), { tone: 'success' });

            setBuilt(created);
        } catch (error) {
            toast(apiMessage(error, t('create.failed')), { tone: 'error' });
            setBusy(false);
        }
    };

    if (failed !== null) {
        return (
            <PageBlock title={t('create.title')}>
                <Notice tone={'danger'} title={t('create.loadFailed')}>
                    {failed}
                </Notice>
            </PageBlock>
        );
    }

    if (page === null) {
        return (
            <PageBlock title={t('create.title')}>
                <SectionSkeleton label={t('create.loading')} />
            </PageBlock>
        );
    }

    if (built !== null) {
        return (
            <PageBlock title={t('create.title')}>
                <InstallProgress server={built} demo={demo} />
            </PageBlock>
        );
    }

    const refusal = demo && page.refusal === 'demo' ? null : page.refusal;

    return (
        <PageBlock title={t('create.title')}>
            <AboutDialog egg={about} onClose={() => setAbout(null)} />

            <div className={'space-y-6'}>
                <div>
                    <button
                        type={'button'}
                        onClick={() => history.push('/')}
                        className={
                            'inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint transition-colors hover:text-ink'
                        }
                    >
                        <ArrowLeft className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        {t('create.backToDashboard')}
                    </button>

                    <div className={'mt-3 flex flex-wrap items-end justify-between gap-4'}>
                        <div className={'min-w-0'}>
                            <h1 className={'font-akira text-lg font-medium tracking-tight text-ink sm:text-2xl'}>
                                {t('create.title')}
                            </h1>
                            <p className={'mt-1 text-sm text-ink-faint'}>{t('create.subtitle')}</p>
                        </div>

                        <Allowance page={page} limits={limits} units={units} />
                    </div>
                </div>

                {refusal === 'discord' && page.discord.required && (
                    <DiscordGate discord={page.discord} onLinked={reload} />
                )}

                {page.discord.required && page.discord.linked && refusal !== 'discord' && (
                    <DiscordAccount discord={page.discord} held={page.held} onUnlinked={reload} />
                )}

                {refusal !== null && refusal !== 'discord' && <Refused refusal={refusal} page={page} />}

                {refusal === null && (
                    <>
                        <Stepper step={step} reached={reached} onGo={go} />

                        <div className={'grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]'}>
                            <div className={'space-y-4'}>
                                {step === 'game' && (
                                    <>
                                        <Input
                                            value={query}
                                            onChange={(event) => setQuery(event.currentTarget.value)}
                                            placeholder={t('create.searchGames')}
                                            aria-label={t('create.searchGames')}
                                            icon={<Search className={'h-4 w-4'} aria-hidden={'true'} />}
                                        />

                                        {grouped.length === 0 ? (
                                            <p className={'rounded-2xl bg-card p-8 text-center text-sm text-ink-faint'}>
                                                {t('create.noGames')}
                                            </p>
                                        ) : (
                                            grouped.map((group) => (
                                                <div key={group.nest} className={'space-y-2'}>
                                                    <p
                                                        className={
                                                            'text-xs font-semibold uppercase tracking-wider text-ink-faint'
                                                        }
                                                    >
                                                        {group.nest}
                                                    </p>

                                                    <div className={'grid gap-3 sm:grid-cols-2'}>
                                                        {group.eggs.map((one) => (
                                                            <EggCard
                                                                key={one.uuid}
                                                                egg={one}
                                                                selected={one.uuid === eggUuid}
                                                                onPick={() => pickEgg(one)}
                                                                onAbout={() => setAbout(one)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </>
                                )}

                                {step === 'location' && (
                                    <>
                                        {page.locations.length > 4 && (
                                            <Input
                                                value={placeQuery}
                                                onChange={(event) => setPlaceQuery(event.currentTarget.value)}
                                                placeholder={t('create.searchLocations')}
                                                aria-label={t('create.searchLocations')}
                                                icon={<Search className={'h-4 w-4'} aria-hidden={'true'} />}
                                            />
                                        )}

                                        {roomy.length === 0 && (
                                            <Notice tone={'warning'} title={t('create.noRoom')}>
                                                {t('create.noRoomBody')}
                                            </Notice>
                                        )}

                                        {locations.length === 0 ? (
                                            <p className={'rounded-2xl bg-card p-8 text-center text-sm text-ink-faint'}>
                                                {t('create.noLocations')}
                                            </p>
                                        ) : (
                                            <div className={'grid gap-3 sm:grid-cols-2'}>
                                                {locations.map((one: CreateLocation) => (
                                                    <Tile
                                                        key={one.id}
                                                        selected={one.id === location}
                                                        disabled={!one.room}
                                                        onClick={() => {
                                                            setLocation(one.id);
                                                            go('details');
                                                        }}
                                                    >
                                                        <LocationMark location={one} />

                                                        <span className={'min-w-0 flex-1'}>
                                                            <span
                                                                className={
                                                                    'block truncate text-sm font-medium text-ink'
                                                                }
                                                            >
                                                                {one.name}
                                                            </span>

                                                            {one.description !== '' && (
                                                                <span
                                                                    className={
                                                                        'mt-0.5 block truncate text-xs text-ink-faint'
                                                                    }
                                                                >
                                                                    {one.description}
                                                                </span>
                                                            )}
                                                        </span>

                                                        <span
                                                            className={cn(
                                                                'shrink-0 pr-6 text-right text-[11px] font-medium',
                                                                one.room ? 'text-success' : 'text-warning'
                                                            )}
                                                        >
                                                            {one.room
                                                                ? t('create.slotsAvailable', {
                                                                      free: one.slots,
                                                                      total: one.total,
                                                                  })
                                                                : t('create.locationFull')}
                                                        </span>
                                                    </Tile>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {step === 'details' && (
                                    <div className={'space-y-4'}>
                                        <div className={'rounded-2xl bg-card p-5'}>
                                            <Input
                                                label={t('create.nameLabel')}
                                                hint={
                                                    page.namePrefix === ''
                                                        ? t('create.nameHint')
                                                        : t('create.namePrefixed', { prefix: page.namePrefix })
                                                }
                                                value={name}
                                                maxLength={40}
                                                onChange={(event) => setName(event.currentTarget.value)}
                                                action={
                                                    <HoverTip label={t('create.nameGenerate')} side={'left'}>
                                                        <button
                                                            type={'button'}
                                                            onClick={() => setName(randomServerName())}
                                                            aria-label={t('create.nameGenerate')}
                                                            className={
                                                                'rounded-lg p-1.5 text-ink-faint transition-colors hover:text-ink-muted'
                                                            }
                                                        >
                                                            <Wand2 className={'h-4 w-4'} aria-hidden={'true'} />
                                                        </button>
                                                    </HoverTip>
                                                }
                                            />
                                        </div>

                                        {limits !== null && (
                                            <div className={'space-y-3 rounded-2xl bg-card p-5'}>
                                                <div>
                                                    <p className={'text-sm font-medium text-ink'}>
                                                        {t('create.sizeTitle')}
                                                    </p>
                                                    <p className={'mt-1 text-xs leading-relaxed text-ink-faint'}>
                                                        {t('create.sizeHint')}
                                                    </p>
                                                </div>

                                                <div className={'grid gap-3 sm:grid-cols-3'}>
                                                    {SIZED.map((key) =>
                                                        limits[key] === undefined ? null : (
                                                            <SizeField
                                                                key={key}
                                                                label={t(SIZE_LABEL[key])}
                                                                bounds={limits[key]}
                                                                value={sizes[key]}
                                                                step={SIZE_STEP[key]}
                                                                format={(value) => writeSize(key, value, units)}
                                                                unit={unitFor(key, units, setUnits, t)}
                                                                onChange={(value) =>
                                                                    setSized((current) => ({
                                                                        ...current,
                                                                        [key]: value,
                                                                    }))
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {(egg?.variables ?? []).length > 0 && (
                                            <div className={'rounded-2xl bg-card p-5'}>
                                                <Accordion
                                                    open={advanced}
                                                    onToggle={() => setAdvanced((value) => !value)}
                                                    title={t('create.eggVariables')}
                                                    hint={t('create.eggVariablesHint')}
                                                    flag={missing.length > 0}
                                                >
                                                    {(egg?.variables ?? []).map((variable) => (
                                                        <VariableField
                                                            key={variable.env}
                                                            variable={variable}
                                                            value={environment[variable.env] ?? ''}
                                                            onChange={(value) =>
                                                                setEnvironment((current) => ({
                                                                    ...current,
                                                                    [variable.env]: value,
                                                                }))
                                                            }
                                                        />
                                                    ))}
                                                </Accordion>
                                            </div>
                                        )}

                                        {missing.length > 0 && (
                                            <p className={'flex items-start gap-2 text-xs text-warning'}>
                                                <TriangleAlert
                                                    className={'mt-0.5 h-3.5 w-3.5 shrink-0'}
                                                    aria-hidden={'true'}
                                                />
                                                {t('create.missingOptions', { fields: missing.join(', ') })}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className={'flex items-center justify-between gap-3'}>
                                    <Button
                                        variant={'ghost'}
                                        size={'sm'}
                                        disabled={step === 'game'}
                                        onClick={() => go(STEPS[Math.max(0, STEPS.indexOf(step) - 1)])}
                                        icon={<ChevronLeft className={'h-4 w-4'} aria-hidden={'true'} />}
                                    >
                                        {t('create.back')}
                                    </Button>

                                    {step !== 'details' && (
                                        <Button
                                            variant={'secondary'}
                                            size={'sm'}
                                            disabled={step === 'game' ? egg === null : place === null || !place.room}
                                            onClick={() =>
                                                go(STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(step) + 1)])
                                            }
                                        >
                                            {t('create.next')}
                                            <ChevronRight className={'h-4 w-4'} aria-hidden={'true'} />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className={'lg:sticky lg:top-6 lg:self-start'}>
                                <div className={'group relative overflow-hidden rounded-2xl bg-card'}>
                                    {summaryArt !== null && <EggBackdrop art={summaryArt} even />}

                                    <div className={'relative flex items-stretch'}>
                                        {egg !== null && (
                                            <span
                                                aria-hidden={'true'}
                                                className={
                                                    'relative flex w-24 shrink-0 items-center justify-center self-stretch py-5'
                                                }
                                            >
                                                <EggArt egg={egg} size={'lg'} />
                                            </span>
                                        )}

                                        <span
                                            className={cn(
                                                'relative flex min-w-0 flex-1 flex-col justify-center py-5 pr-5',
                                                egg === null && 'pl-5'
                                            )}
                                        >
                                            <span
                                                className={
                                                    'block text-[10px] font-semibold uppercase tracking-wider text-ink-faint'
                                                }
                                            >
                                                {t('create.summary')}
                                            </span>
                                            <span className={'mt-1.5 block truncate text-sm font-medium text-ink'}>
                                                {egg?.name ?? t('create.noGameYet')}
                                            </span>
                                            <span className={'mt-0.5 block truncate text-xs text-ink-faint'}>
                                                {place?.name ?? t('create.noLocationYet')}
                                            </span>
                                        </span>
                                    </div>

                                    <div className={'relative space-y-2 border-t border-line-hair p-5'}>
                                        <ResourceRow
                                            icon={<MemoryStick className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                                            label={t('create.memory')}
                                            value={formatSize(sizes.memory)}
                                        />
                                        <ResourceRow
                                            icon={<HardDrive className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                                            label={t('create.disk')}
                                            value={formatSize(sizes.disk)}
                                        />
                                        <ResourceRow
                                            icon={<Cpu className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                                            label={t('create.cpu')}
                                            value={writeSize('cpu', sizes.cpu, units)}
                                        />
                                        <ResourceRow
                                            icon={<Database className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                                            label={t('create.databases')}
                                            value={String(sizes.databases)}
                                        />
                                        <ResourceRow
                                            icon={<Archive className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                                            label={t('create.backups')}
                                            value={String(sizes.backups)}
                                        />
                                        <ResourceRow
                                            icon={<Network className={'h-3.5 w-3.5'} aria-hidden={'true'} />}
                                            label={t('create.ports')}
                                            value={String(sizes.allocations + 1)}
                                        />
                                    </div>

                                    <div className={'relative px-5 pb-5'}>
                                        <Button
                                            fullWidth
                                            loading={busy}
                                            disabled={!ready}
                                            onClick={submit}
                                            icon={<Rocket className={'h-4 w-4'} aria-hidden={'true'} />}
                                        >
                                            {t('create.submit')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </PageBlock>
    );
}

export { CREATE_PATH };
