import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Dialog } from '@headlessui/react';
import {
    Bed,
    CloudLightning,
    CloudRain,
    Minus,
    Moon,
    Plus,
    Skull,
    Sun,
    Sunrise,
    Sunset,
    UserRound,
    X,
} from 'lucide-react';
import {
    getNearbyPlayers,
    getPlayerMap,
    mapTileUrl,
    MapRegion,
    MapSky,
    MapSpan,
    NearbyPlayer,
    playerAvatarUrl,
} from '@/api/server/players';
import type { Place } from '@/dezerx/components/mc/PlayerControls';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

const SPANS: MapSpan[] = [128, 256, 512];

const REGION = 512;
const CHUNK = 16;

const POLL_EVERY = 2500;
const POLL_LIMIT = 72;

type Load = 'loading' | 'ready' | 'failed';

type Phase = 'sunrise' | 'day' | 'sunset' | 'night';

const NETHER = 'minecraft:the_nether';
const END = 'minecraft:the_end';

const phaseOf = (time: number): Phase =>
    time >= 22300 || time < 1000 ? 'sunrise' : time < 11500 ? 'day' : time < 13500 ? 'sunset' : 'night';

interface Pin {
    key: string;
    x: number;
    z: number;
    radius: number;
}

interface Nudge {
    dx: number;
    dy: number;
}

const SELF_RADIUS = 12;
const PLACE_RADIUS = 10;
const OTHER_RADIUS = 8;
const PIN_GAP = 2;

function spread(pins: Pin[], scale: number): Map<string, Nudge> {
    const taken = [{ x: 0, y: 0, radius: SELF_RADIUS }];
    const out = new Map<string, Nudge>();

    pins.forEach((pin, index) => {
        const tx = pin.x * scale;
        const ty = pin.z * scale;
        const clash = (point: { x: number; y: number }) =>
            taken.find((mark) => Math.hypot(point.x - mark.x, point.y - mark.y) < mark.radius + pin.radius + PIN_GAP);

        let at = { x: tx, y: ty };

        for (let step = 0, hit = clash(at); hit && step < 24; step++, hit = clash(at)) {
            const facing =
                Math.hypot(tx - hit.x, ty - hit.y) > 0.5
                    ? Math.atan2(ty - hit.y, tx - hit.x)
                    : -Math.PI / 4 + index * 1.2;
            const angle = facing + (step % 2 === 0 ? 1 : -1) * Math.ceil(step / 2) * (Math.PI / 6);
            const reach = hit.radius + pin.radius + PIN_GAP;

            at = { x: hit.x + Math.cos(angle) * reach, y: hit.y + Math.sin(angle) * reach };
        }

        taken.push({ ...at, radius: pin.radius });
        out.set(pin.key, { dx: at.x - tx, dy: at.y - ty });
    });

    return out;
}

const clockOf = (time: number): string => {
    const hours = (Math.floor(time / 1000) + 6) % 24;
    const minutes = Math.floor(((time % 1000) / 1000) * 60);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const RAIN = `url("data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><g stroke='rgba(220,232,250,0.6)' stroke-width='1'>" +
        "<line x1='3' y1='2' x2='1' y2='10'/><line x1='14' y1='12' x2='12' y2='20'/><line x1='25' y1='5' x2='23' y2='13'/>" +
        "<line x1='20' y1='22' x2='18' y2='30'/><line x1='8' y1='19' x2='6' y2='27'/><line x1='29' y1='17' x2='27' y2='25'/>" +
        '</g></svg>'
)}")`;

interface PlayerMapProps {
    server: string;
    player: string;
    name: string | null;
    position: { x: number; y: number; z: number };
    dimension: string;
    respawn: Place | null;
    lastDeath: Place | null;
}

export function PlayerMap({
    server,
    player,
    name,
    position,
    dimension,
    respawn,
    lastDeath,
    large = false,
}: PlayerMapProps & { large?: boolean }) {
    const t = useT();

    const [span, setSpan] = useState<MapSpan>(256);
    const [regions, setRegions] = useState<MapRegion[]>([]);
    const [available, setAvailable] = useState(true);
    const [load, setLoad] = useState<Load>('loading');
    const [stalled, setStalled] = useState(false);
    const [hover, setHover] = useState<{ x: number; z: number } | null>(null);
    const [sky, setSky] = useState<MapSky | null>(null);
    const [others, setOthers] = useState<NearbyPlayer[]>([]);
    const [size, setSize] = useState(300);

    const frame = useRef<HTMLDivElement>(null);

    const x = Math.floor(position.x);
    const z = Math.floor(position.z);

    const left = x - span / 2;
    const top = z - span / 2;

    useEffect(() => {
        const controller = new AbortController();
        let timer: number | null = null;
        let attempts = 0;

        setStalled(false);

        const poll = () => {
            getPlayerMap(server, dimension, x, z, span, controller.signal)
                .then((view) => {
                    setAvailable(view.available);
                    setRegions(view.regions);
                    setSky(view.sky);
                    setLoad('ready');

                    if (!view.regions.some((region) => region.state === 'rendering' || region.refreshing)) {
                        return;
                    }

                    if (++attempts < POLL_LIMIT) {
                        timer = window.setTimeout(poll, POLL_EVERY);
                    } else {
                        setStalled(true);
                    }
                })
                .catch((error) => {
                    if (!axios.isCancel(error)) {
                        setLoad('failed');
                    }
                });
        };

        poll();

        return () => {
            controller.abort();

            if (timer !== null) {
                window.clearTimeout(timer);
            }
        };
    }, [server, dimension, x, z, span]);

    useEffect(() => {
        const controller = new AbortController();

        getNearbyPlayers(server, dimension, x, z, span, controller.signal)
            .then((list) => setOthers(list.filter((entry) => entry.uuid.toLowerCase() !== player.toLowerCase())))
            .catch(() => undefined);

        return () => controller.abort();
    }, [server, player, dimension, x, z, span]);

    useEffect(() => {
        const element = frame.current;

        if (!element || typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver(([entry]) => setSize(entry.contentRect.width || 300));

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const across = (block: number) => `${((block - left) / span) * 100}%`;
    const down = (block: number) => `${((block - top) / span) * 100}%`;

    const inView = (place: Place | null): place is Place =>
        place !== null &&
        place.dimension === dimension &&
        place.x >= left &&
        place.x < left + span &&
        place.z >= top &&
        place.z < top + span;

    const nudges = useMemo(() => {
        const pins: Pin[] = [];

        if (inView(respawn)) {
            pins.push({ key: 'respawn', x: respawn.x + 0.5 - x, z: respawn.z + 0.5 - z, radius: PLACE_RADIUS });
        }

        if (inView(lastDeath)) {
            pins.push({ key: 'death', x: lastDeath.x + 0.5 - x, z: lastDeath.z + 0.5 - z, radius: PLACE_RADIUS });
        }

        others.forEach((other) => pins.push({ key: other.uuid, x: other.x - x, z: other.z - z, radius: OTHER_RADIUS }));

        return spread(pins, size / span);
    }, [respawn, lastDeath, others, x, z, size, span, left, top, dimension]);

    const shown = regions.filter((region) => region.state === 'ready');
    const rendering = regions.some((region) => region.state === 'rendering');
    const home = regions.find((region) => region.x === Math.floor(x / REGION) && region.z === Math.floor(z / REGION));
    const unexplored = load === 'ready' && home?.state === 'missing';

    const notice =
        load === 'failed'
            ? t('players.map.failed')
            : !available
            ? t('players.map.unavailable')
            : unexplored
            ? t('players.map.unexplored')
            : null;

    const track = (event: React.MouseEvent<HTMLDivElement>) => {
        const box = event.currentTarget.getBoundingClientRect();

        setHover({
            x: left + Math.floor(((event.clientX - box.left) / box.width) * span),
            z: top + Math.floor(((event.clientY - box.top) / box.height) * span),
        });
    };

    const lines = (start: number) => {
        const out: number[] = [];

        for (let at = (CHUNK - (((start % CHUNK) + CHUNK) % CHUNK)) % CHUNK; at < span; at += CHUNK) {
            out.push(at);
        }

        return out;
    };

    const zoom = (direction: 1 | -1) =>
        setSpan((current) => SPANS[Math.min(SPANS.length - 1, Math.max(0, SPANS.indexOf(current) + direction))]);

    return (
        <div>
            <div className={cn('mb-2 flex items-center gap-2', large ? 'justify-end' : 'justify-between')}>
                {!large && (
                    <p className={'text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>
                        {t('players.map.title')}
                    </p>
                )}

                <div className={'flex items-center gap-1'}>
                    <span className={'mr-1 font-mono text-[10px] text-ink-faint'}>{`${span}×${span}`}</span>

                    {(
                        [
                            [1, Minus, t('players.map.zoomOut'), span === SPANS[SPANS.length - 1]],
                            [-1, Plus, t('players.map.zoomIn'), span === SPANS[0]],
                        ] as const
                    ).map(([direction, Icon, label, disabled]) => (
                        <button
                            key={direction}
                            type={'button'}
                            onClick={() => zoom(direction)}
                            disabled={disabled}
                            aria-label={label}
                            title={label}
                            className={
                                'flex h-6 w-6 items-center justify-center rounded-md bg-overlay/60 text-ink-muted transition-colors hover:text-ink disabled:opacity-40 disabled:hover:text-ink-muted'
                            }
                        >
                            <Icon className={'h-3 w-3'} aria-hidden={'true'} />
                        </button>
                    ))}
                </div>
            </div>

            <div
                ref={frame}
                role={'img'}
                aria-label={t('players.map.label', { x, z })}
                onMouseMove={track}
                onMouseLeave={() => setHover(null)}
                className={cn(
                    'relative isolate mx-auto aspect-square select-none overflow-hidden rounded-xl bg-overlay/40 ring-1 ring-line-field',
                    large ? 'w-[min(100%,70vh)]' : 'w-full max-w-sm'
                )}
            >
                {regions.map((region) =>
                    region.state === 'rendering' ? (
                        <span
                            key={`${region.x}/${region.z}`}
                            aria-hidden={'true'}
                            className={'absolute animate-pulse bg-overlay/60'}
                            style={{
                                left: across(region.x * REGION),
                                top: down(region.z * REGION),
                                width: `${(REGION / span) * 100}%`,
                                height: `${(REGION / span) * 100}%`,
                            }}
                        />
                    ) : null
                )}

                {shown.map((region) => (
                    <img
                        key={`${region.x}/${region.z}/${region.version}`}
                        src={mapTileUrl(server, dimension, region)}
                        alt={''}
                        aria-hidden={'true'}
                        draggable={false}
                        className={'pointer-events-none absolute max-w-none'}
                        style={{
                            left: across(region.x * REGION),
                            top: down(region.z * REGION),
                            width: `${(REGION / span) * 100}%`,
                            height: `${(REGION / span) * 100}%`,
                            imageRendering: 'pixelated',
                        }}
                    />
                ))}

                <svg
                    aria-hidden={'true'}
                    viewBox={`0 0 ${span} ${span}`}
                    preserveAspectRatio={'none'}
                    className={'pointer-events-none absolute inset-0 h-full w-full'}
                >
                    <g stroke={'rgb(0 0 0)'} strokeOpacity={span === 512 ? 0.1 : 0.18} strokeWidth={1}>
                        {lines(left).map((at) => (
                            <line key={`x${at}`} x1={at} x2={at} y1={0} y2={span} vectorEffect={'non-scaling-stroke'} />
                        ))}
                        {lines(top).map((at) => (
                            <line key={`z${at}`} x1={0} x2={span} y1={at} y2={at} vectorEffect={'non-scaling-stroke'} />
                        ))}
                    </g>

                    {hover && (
                        <rect
                            x={Math.floor(hover.x / CHUNK) * CHUNK - left}
                            y={Math.floor(hover.z / CHUNK) * CHUNK - top}
                            width={CHUNK}
                            height={CHUNK}
                            fill={'rgb(255 255 255)'}
                            fillOpacity={0.18}
                            stroke={'rgb(255 255 255)'}
                            strokeOpacity={0.7}
                            strokeWidth={1}
                            vectorEffect={'non-scaling-stroke'}
                        />
                    )}
                </svg>

                <Atmosphere sky={sky} dimension={dimension} />

                {inView(respawn) && (
                    <Pinned
                        left={across(respawn.x + 0.5)}
                        top={down(respawn.z + 0.5)}
                        nudge={nudges.get('respawn')}
                        className={'h-5 w-5'}
                        label={`${t('playerControls.respawnPoint')} · ${respawn.x}, ${respawn.y}, ${respawn.z}`}
                    >
                        <PlaceBadge>
                            <Bed className={'h-3 w-3'} aria-hidden={'true'} />
                        </PlaceBadge>
                    </Pinned>
                )}

                {inView(lastDeath) && (
                    <Pinned
                        left={across(lastDeath.x + 0.5)}
                        top={down(lastDeath.z + 0.5)}
                        nudge={nudges.get('death')}
                        className={'h-5 w-5'}
                        label={`${t('playerControls.lastDeath')} · ${lastDeath.x}, ${lastDeath.y}, ${lastDeath.z}`}
                    >
                        <PlaceBadge>
                            <Skull className={'h-3 w-3'} aria-hidden={'true'} />
                        </PlaceBadge>
                    </Pinned>
                )}

                {others.map((other) => (
                    <Pinned
                        key={other.uuid}
                        left={across(other.x)}
                        top={down(other.z)}
                        nudge={nudges.get(other.uuid)}
                        className={'h-4 w-4'}
                        label={[
                            other.name ?? t('common.unknown'),
                            `${Math.floor(other.x)}, ${Math.floor(other.z)}`,
                            other.online ? t('players.online') : null,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    >
                        <Head server={server} player={other.uuid} muted />
                    </Pinned>
                ))}

                <span
                    title={`${name ?? t('common.unknown')} · ${Math.floor(position.x)}, ${Math.floor(
                        position.y
                    )}, ${Math.floor(position.z)}`}
                    className={'absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2'}
                >
                    <Head server={server} player={player} />
                </span>

                <span
                    aria-hidden={'true'}
                    className={
                        'pointer-events-none absolute left-1/2 top-1.5 -translate-x-1/2 rounded bg-black/45 px-1.5 text-[9px] font-semibold leading-4 text-white'
                    }
                >
                    {t('players.map.north')}
                </span>

                {sky && dimension !== NETHER && dimension !== END && <SkyBadge sky={sky} />}

                {(notice || (rendering && shown.length === 0) || stalled) && (
                    <div className={'pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-3'}>
                        <span className={'rounded-lg bg-overlay/90 px-2 py-1 text-center text-[11px] text-ink-muted'}>
                            {notice ?? (stalled ? t('players.map.stalled') : t('players.map.rendering'))}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export function PlayerMapDialog({ open, onClose, ...map }: PlayerMapProps & { open: boolean; onClose: () => void }) {
    const t = useT();
    const { x, y, z } = map.position;

    return (
        <Dialog open={open} onClose={onClose} className={'relative z-[60]'}>
            <div className={'animate-backdrop-in fixed inset-0 bg-black/50 backdrop-blur-sm'} aria-hidden={'true'} />

            <div className={'fixed inset-0 flex items-center justify-center p-4'}>
                <Dialog.Panel
                    className={
                        'dz-on-raised animate-modal-in flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-raised shadow-panel ring-1 ring-line-field motion-reduce:animate-none'
                    }
                >
                    <div className={'flex items-start justify-between gap-3 p-4 pb-1'}>
                        <div className={'min-w-0'}>
                            <Dialog.Title className={'truncate text-sm font-medium text-ink'}>
                                {t('players.map.title')}
                            </Dialog.Title>
                            <p className={'truncate font-mono text-[11px] text-ink-faint'}>
                                {[
                                    map.name ?? t('common.unknown'),
                                    `${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}`,
                                    map.dimension.replace('minecraft:', ''),
                                ].join(' · ')}
                            </p>
                        </div>

                        <button
                            type={'button'}
                            onClick={onClose}
                            aria-label={t('common.close')}
                            className={
                                'shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-overlay hover:text-ink'
                            }
                        >
                            <X className={'h-4 w-4'} aria-hidden={'true'} />
                        </button>
                    </div>

                    <div className={'min-h-0 overflow-auto px-4 pb-4'}>
                        <PlayerMap {...map} large />
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

const BACKDROP_SPAN: MapSpan = 256;

export function MapBackdrop({
    server,
    position,
    dimension,
    className,
}: {
    server: string;
    position: { x: number; z: number };
    dimension: string;
    className?: string;
}) {
    const [regions, setRegions] = useState<MapRegion[]>([]);
    const [box, setBox] = useState({ width: 0, height: 0 });

    const frame = useRef<HTMLDivElement>(null);

    const x = Math.floor(position.x);
    const z = Math.floor(position.z);

    useEffect(() => {
        const controller = new AbortController();
        let timer: number | null = null;
        let attempts = 0;

        const poll = () => {
            getPlayerMap(server, dimension, x, z, BACKDROP_SPAN, controller.signal)
                .then((view) => {
                    setRegions(view.available ? view.regions : []);

                    const drawing = view.regions.some((region) => region.state === 'rendering' || region.refreshing);

                    if (drawing && ++attempts < POLL_LIMIT) {
                        timer = window.setTimeout(poll, POLL_EVERY);
                    }
                })
                .catch(() => undefined);
        };

        poll();

        return () => {
            controller.abort();

            if (timer !== null) {
                window.clearTimeout(timer);
            }
        };
    }, [server, dimension, x, z]);

    useEffect(() => {
        const element = frame.current;

        if (!element || typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver(([entry]) =>
            setBox({ width: entry.contentRect.width, height: entry.contentRect.height })
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const scale = Math.max(box.width, box.height) / BACKDROP_SPAN;
    const shown = scale > 0 ? regions.filter((region) => region.state === 'ready') : [];

    return (
        <div ref={frame} aria-hidden={'true'} className={cn('pointer-events-none overflow-hidden', className)}>
            <div
                className={cn(
                    'absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none',
                    shown.length > 0 ? 'opacity-50 [.light_&]:opacity-70' : 'opacity-0'
                )}
            >
                {shown.map((region) => (
                    <img
                        key={`${region.x}/${region.z}/${region.version}`}
                        src={mapTileUrl(server, dimension, region)}
                        alt={''}
                        draggable={false}
                        className={'absolute max-w-none'}
                        style={{
                            left: box.width / 2 + (region.x * REGION - x) * scale,
                            top: box.height / 2 + (region.z * REGION - z) * scale,
                            width: REGION * scale,
                            height: REGION * scale,
                            imageRendering: 'pixelated',
                        }}
                    />
                ))}
            </div>

            <span
                className={
                    'absolute inset-0 bg-gradient-to-r from-card via-card/70 to-card/30 [.light_&]:via-card/50 [.light_&]:to-card/10'
                }
            />
        </div>
    );
}

function Pinned({
    left,
    top,
    nudge,
    label,
    className,
    children,
}: {
    left: string;
    top: string;
    nudge?: Nudge;
    label: string;
    className: string;
    children: React.ReactNode;
}) {
    const dx = nudge?.dx ?? 0;
    const dy = nudge?.dy ?? 0;
    const moved = Math.hypot(dx, dy) > 0.5;

    return (
        <>
            {moved && (
                <span
                    aria-hidden={'true'}
                    style={{ left, top }}
                    className={
                        'pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-1 ring-black/50'
                    }
                />
            )}

            <span
                title={label}
                style={{ left, top, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))` }}
                className={cn('absolute', className)}
            >
                {children}
            </span>
        </>
    );
}

function PlaceBadge({ children }: { children: React.ReactNode }) {
    return (
        <span
            className={
                'flex h-full w-full items-center justify-center rounded-full bg-card/90 text-ink shadow-panel ring-1 ring-line-field'
            }
        >
            {children}
        </span>
    );
}

function Head({ server, player, muted = false }: { server: string; player: string; muted?: boolean }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => setFailed(false), [player]);

    const frame = muted ? 'rounded ring-1 ring-white/70 opacity-80 grayscale' : 'rounded-md ring-2 ring-white';

    if (failed) {
        return (
            <span
                className={cn(
                    'relative flex h-full w-full items-center justify-center bg-card text-ink shadow-panel',
                    frame
                )}
            >
                <UserRound className={muted ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} aria-hidden={'true'} />
            </span>
        );
    }

    return (
        <img
            src={playerAvatarUrl(server, player)}
            alt={''}
            aria-hidden={'true'}
            draggable={false}
            loading={'lazy'}
            onError={() => setFailed(true)}
            style={{ imageRendering: 'pixelated' }}
            className={cn('relative h-full w-full bg-overlay shadow-panel', frame)}
        />
    );
}

function Atmosphere({ sky, dimension }: { sky: MapSky | null; dimension: string }) {
    const layers: { style: React.CSSProperties; className?: string }[] = [];

    const grade = (background: string, opacity: number) =>
        layers.push({ style: { background, opacity, mixBlendMode: 'multiply' } });

    if (dimension === NETHER) {
        grade('radial-gradient(circle at 50% 50%, #ffc29a 0%, #c4503a 100%)', 0.5);
    } else if (dimension === END) {
        grade('radial-gradient(circle at 50% 50%, #c9b6ef 0%, #5b4688 100%)', 0.5);
    } else if (sky) {
        const phase = phaseOf(sky.time);

        if (phase === 'sunrise') {
            grade('linear-gradient(270deg, #ffc08a 0%, #f2b8c6 55%, #a9b4e0 100%)', 0.55);
        } else if (phase === 'sunset') {
            grade('linear-gradient(90deg, #ffa66b 0%, #f0a39a 50%, #8d8cc4 100%)', 0.6);
        } else if (phase === 'night') {
            grade('#24305e', 0.78);
        }

        if (sky.raining || sky.thundering) {
            grade(sky.thundering ? '#6c7488' : '#9aa3b5', sky.thundering ? 0.6 : 0.5);
            layers.push({ style: { backgroundImage: RAIN, backgroundSize: '32px 32px' }, className: 'map-rain' });
        }

        if (sky.thundering) {
            layers.push({
                style: { background: 'rgb(235, 240, 255)', mixBlendMode: 'screen' },
                className: 'map-flash',
            });
        }
    }

    layers.push({
        style: { background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.3) 100%)' },
    });

    return (
        <>
            {layers.map((layer, index) => (
                <span
                    key={index}
                    aria-hidden={'true'}
                    style={layer.style}
                    className={cn('pointer-events-none absolute inset-0', layer.className)}
                />
            ))}
        </>
    );
}

function SkyBadge({ sky }: { sky: MapSky }) {
    const t = useT();
    const phase = phaseOf(sky.time);

    const Icon = sky.thundering
        ? CloudLightning
        : sky.raining
        ? CloudRain
        : { sunrise: Sunrise, day: Sun, sunset: Sunset, night: Moon }[phase];

    const label = [
        t(`players.map.${phase}`),
        clockOf(sky.time),
        sky.thundering ? t('players.map.thundering') : sky.raining ? t('players.map.raining') : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <span
            title={label}
            aria-label={label}
            className={
                'absolute right-1.5 top-1.5 flex items-center gap-1 rounded bg-black/45 px-1.5 font-mono text-[9px] font-semibold leading-4 text-white'
            }
        >
            <Icon className={'h-2.5 w-2.5'} aria-hidden={'true'} />
            {clockOf(sky.time)}
        </span>
    );
}
