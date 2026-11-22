import React, { Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, Transition } from '@headlessui/react';
import { Check, Wand2, X } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { setPresetsOpen, usePresetsOpen, usePreviewing } from '@/dezerx/components/editor/store';
import { THEME_DEFAULTS, activeStyle, type ThemeConfig } from '@/dezerx/lib/panelTheme';
import { THEME_PRESETS, presetPalette, presetSwatches, type ThemePreset } from '@/dezerx/lib/presets';

function alpha(colour: string | undefined, amount: number): string {
    const parts = (colour ?? '').match(/(\d+)\s+(\d+)\s+(\d+)/);

    return parts ? `rgba(${parts[1]}, ${parts[2]}, ${parts[3]}, ${amount})` : (colour ?? 'transparent');
}

interface Ink {
    base: string;
    card: string;
    raised: string;
    overlay: string;
    ink: string;
    muted: string;
    faint: string;
    inverse: string;
    accent: string;
    accentAlt: string;
}

function inkOf(preset: ThemePreset): Ink {
    const tokens = presetPalette(preset);

    return {
        base: tokens['surface-base'],
        card: tokens['surface-card'],
        raised: tokens['surface-raised'],
        overlay: tokens['surface-overlay'],
        ink: tokens.ink,
        muted: tokens['ink-muted'],
        faint: tokens['ink-faint'],
        inverse: tokens['ink-inverse'],
        accent: tokens.accent,
        accentAlt: tokens['accent-alt'],
    };
}

const SIDEBAR_WIDTH: Record<ThemeConfig['sidebar.design'], string> = {
    classic: '27%',
    floating: '27%',
    bordered: '27%',
    compact: '23%',
    rail: '13%',
};

function ThumbNavRow({
    ink,
    theme,
    active,
    rail,
    radius,
}: {
    ink: Ink;
    theme: ThemeConfig;
    active: boolean;
    rail: boolean;
    radius: number;
}) {
    const design = theme['sidebar.active'];
    const marker = activeStyle(design).marker;

    const surface = () => {
        if (!active) {
            return {};
        }

        switch (design) {
            case 'solid':
                return { background: ink.accent };
            case 'pill':
                return { background: alpha(ink.accent, 0.22), borderRadius: 999 };
            case 'glow':
                return {
                    background: alpha(ink.accent, 0.14),
                    boxShadow: `0 0 0 1px ${alpha(ink.accent, 0.45)}, 0 0 8px ${alpha(ink.accent, 0.35)}`,
                };
            case 'gradient':
                return { background: `linear-gradient(90deg, ${alpha(ink.accent, 0.3)}, transparent)` };
            case 'underline':
            case 'dot':
                return {};
            default:
                return { background: alpha(ink.accent, 0.13) };
        }
    };

    const glyph = active ? (design === 'solid' ? ink.inverse : ink.accent) : ink.faint;

    return (
        <div className={'relative flex items-center'} style={{ gap: 4, padding: '3px 4px', borderRadius: radius, ...surface() }}>
            {active && marker === 'bar' && (
                <span
                    style={{ background: ink.accent, borderRadius: 999 }}
                    className={'absolute bottom-[3px] left-0 top-[3px] w-[2px]'}
                />
            )}

            <span style={{ background: glyph, borderRadius: 2 }} className={'block h-[6px] w-[6px] shrink-0'} />

            {!rail && (
                <span
                    style={{ background: active ? glyph : ink.muted, opacity: active ? 0.9 : 0.45, borderRadius: 999 }}
                    className={'block h-[3px] flex-1'}
                />
            )}

            {active && marker === 'dot' && !rail && (
                <span style={{ background: ink.accent }} className={'block h-[3px] w-[3px] shrink-0 rounded-full'} />
            )}

            {active && marker === 'underline' && (
                <span
                    style={{ background: ink.accent, borderRadius: 999 }}
                    className={'absolute bottom-0 left-[4px] right-[4px] h-[1.5px]'}
                />
            )}
        </div>
    );
}

function PresetThumb({ preset }: { preset: ThemePreset }) {
    const ink = inkOf(preset);
    const theme: ThemeConfig = { ...THEME_DEFAULTS, ...preset.theme };

    const radius = Math.max(2, Math.round(theme['surface.radius'] * 0.28));
    const design = theme['sidebar.design'];
    const floating = design === 'floating';
    const rail = design === 'rail';
    const wallpaper = theme['background.image'];

    const cardAlpha = theme['surface.opacity'] / 100;
    const card = alpha(ink.card, cardAlpha);

    const edge =
        theme['surface.border'] === 'none'
            ? undefined
            : `1px solid ${
                  theme['surface.border'] === 'accent'
                      ? alpha(ink.accent, 0.35)
                      : alpha(ink.ink, theme['surface.border'] === 'strong' ? 0.2 : 0.08)
              }`;

    const shadow =
        theme['surface.shadow'] === 'none' ? undefined : '0 4px 10px -6px rgba(0, 0, 0, 0.65)';

    const tiles = theme['manager.rows'] === 'tile';
    const artwork = theme['servers.artwork'];

    const panel = { background: card, border: edge, boxShadow: shadow, borderRadius: radius };

    return (
        <div
            aria-hidden={'true'}
            className={'relative w-full overflow-hidden'}
            style={{ background: ink.base, borderRadius: 10, aspectRatio: '16 / 10' }}
        >
            {wallpaper !== '' && (
                <>
                    <span
                        className={'absolute inset-0'}
                        style={{
                            backgroundImage: `url("${wallpaper}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />
                    <span
                        className={'absolute inset-0'}
                        style={{ background: alpha(ink.base, theme['background.dim'] / 100) }}
                    />
                </>
            )}

            <div className={'absolute inset-0 flex'} style={{ padding: floating ? 4 : 0, gap: floating ? 4 : 0 }}>
                <div
                    className={'flex shrink-0 flex-col'}
                    style={{
                        width: SIDEBAR_WIDTH[design],
                        gap: 3,
                        padding: 4,
                        background: theme['page.sidebarSolid'] ? ink.card : card,
                        borderRadius: floating ? radius : 0,
                        borderRight: floating ? undefined : design === 'bordered' ? edge : undefined,
                        boxShadow: floating ? shadow : undefined,
                    }}
                >
                    <div className={'flex items-center'} style={{ gap: 4, padding: '2px 3px' }}>
                        <span style={{ background: ink.accent, borderRadius: 3 }} className={'block h-[8px] w-[8px] shrink-0'} />
                        {!rail && (
                            <span style={{ background: ink.ink, opacity: 0.8, borderRadius: 999 }} className={'block h-[4px] flex-1'} />
                        )}
                    </div>

                    <span style={{ background: ink.ink, opacity: 0.08 }} className={'my-[1px] block h-px w-full'} />

                    {[0, 1, 2, 3].map((row) => (
                        <ThumbNavRow key={row} ink={ink} theme={theme} active={row === 1} rail={rail} radius={radius} />
                    ))}

                    <span className={'flex-1'} />

                    <div className={'flex items-center'} style={{ gap: 4, padding: '2px 3px' }}>
                        <span style={{ background: ink.overlay, borderRadius: 999 }} className={'block h-[8px] w-[8px] shrink-0'} />
                        {!rail && (
                            <span style={{ background: ink.faint, opacity: 0.6, borderRadius: 999 }} className={'block h-[3px] flex-1'} />
                        )}
                    </div>
                </div>

                <div className={'flex min-w-0 flex-1 flex-col'} style={{ gap: 4, padding: 5 }}>
                    <div className={'flex items-center'} style={{ gap: 4 }}>
                        <span
                            style={{
                                background: ink.raised,
                                borderRadius: theme['nav.searchStyle'] === 'pill' ? 999 : radius,
                                width: theme['nav.searchStyle'] === 'wide' ? '72%' : '46%',
                            }}
                            className={'block h-[9px]'}
                        />
                        <span className={'flex-1'} />
                        <span style={{ background: ink.overlay }} className={'block h-[8px] w-[8px] shrink-0 rounded-full'} />
                    </div>

                    {theme['manager.mode'] === 'navbar' && (
                        <div className={'flex items-center'} style={{ gap: 3, ...panel, padding: 3 }}>
                            {[0, 1, 2, 3, 4].map((tab) => (
                                <span
                                    key={tab}
                                    style={{
                                        background: tab === 0 ? ink.accent : alpha(ink.ink, 0.14),
                                        borderRadius: 999,
                                    }}
                                    className={'block h-[4px] flex-1'}
                                />
                            ))}
                        </div>
                    )}

                    {tiles ? (
                        <div className={'grid flex-1 grid-cols-2'} style={{ gap: 4 }}>
                            {[0, 1, 2, 3].map((tile) => (
                                <div key={tile} style={panel} className={'flex flex-col overflow-hidden'}>
                                    {artwork ? (
                                        <span
                                            style={{ background: alpha(ink.accent, 0.35) }}
                                            className={'block h-[45%] w-full shrink-0'}
                                        />
                                    ) : (
                                        <span
                                            style={{ background: ink.overlay, borderRadius: 2, margin: 4 }}
                                            className={'block h-[7px] w-[7px] shrink-0'}
                                        />
                                    )}

                                    <span className={'flex-1'} />

                                    <span
                                        style={{ background: ink.muted, opacity: 0.55, borderRadius: 999, margin: 4 }}
                                        className={'block h-[3px] w-[55%]'}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={'flex flex-1 flex-col'} style={{ gap: 4 }}>
                            {[0, 1, 2].map((row) => (
                                <div key={row} className={'flex flex-1 items-center'} style={{ ...panel, gap: 5, padding: 5 }}>
                                    <span
                                        style={{
                                            background: alpha(ink.accent, row === 0 ? 0.55 : 0.28),
                                            borderRadius: 3,
                                        }}
                                        className={cn('block shrink-0', artwork ? 'h-full w-[16%]' : 'h-[7px] w-[7px]')}
                                    />

                                    <span className={'flex min-w-0 flex-1 flex-col'} style={{ gap: 3 }}>
                                        <span
                                            style={{ background: ink.ink, opacity: 0.75, borderRadius: 999 }}
                                            className={'block h-[3px] w-[62%]'}
                                        />
                                        <span
                                            style={{ background: ink.muted, opacity: 0.4, borderRadius: 999 }}
                                            className={'block h-[3px] w-[38%]'}
                                        />
                                    </span>

                                    <span
                                        style={{ background: row === 0 ? ink.accentAlt : ink.overlay, borderRadius: 999 }}
                                        className={'block h-[5px] w-[5px] shrink-0'}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PresetCard({
    preset,
    active,
    onPick,
}: {
    preset: ThemePreset;
    active: boolean;
    onPick: () => void;
}) {
    return (
        <button
            type={'button'}
            onClick={onPick}
            aria-pressed={active}
            className={cn(
                'group flex flex-col rounded-2xl p-2.5 text-left transition-colors',
                'ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                active ? 'bg-accent/10 ring-accent' : 'bg-overlay/50 ring-line-field hover:bg-overlay hover:ring-accent/50'
            )}
        >
            <PresetThumb preset={preset} />

            <div className={'mt-2.5 flex items-center gap-1.5'}>
                <span className={'min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight text-ink'}>
                    {preset.label}
                </span>

                {active ? (
                    <span
                        className={
                            'inline-flex shrink-0 items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-inverse'
                        }
                    >
                        <Check className={'h-3 w-3'} aria-hidden={'true'} />
                        {'On'}
                    </span>
                ) : (
                    <span className={'flex shrink-0 items-center gap-1'} aria-hidden={'true'}>
                        {presetSwatches(preset).map((colour, at) => (
                            <span
                                key={at}
                                style={{ background: colour }}
                                className={'block h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-black/20'}
                            />
                        ))}
                    </span>
                )}
            </div>

            <p className={'mt-1 line-clamp-2 text-[12px] leading-snug text-ink-faint'}>{preset.blurb}</p>

            <div className={'mt-2 flex flex-wrap gap-1'}>
                {preset.tags.map((tag) => (
                    <span
                        key={tag}
                        className={'rounded-md bg-overlay px-1.5 py-0.5 text-[10px] font-medium text-ink-muted'}
                    >
                        {tag}
                    </span>
                ))}
            </div>
        </button>
    );
}

export function PresetsDialog({
    open,
    active,
    onPick,
    onClose,
}: {
    open: boolean;
    active: string | null;
    onPick: (preset: ThemePreset) => void;
    onClose: () => void;
}) {
    return (
        <Transition show={open} as={Fragment}>
            <Dialog onClose={onClose} className={'dz-scope relative z-[95] font-sans'}>
                <Transition.Child
                    as={Fragment}
                    enter={'transition duration-150 ease-out'}
                    enterFrom={'opacity-0'}
                    enterTo={'opacity-100'}
                    leave={'transition duration-100 ease-in'}
                    leaveFrom={'opacity-100'}
                    leaveTo={'opacity-0'}
                >
                    <div aria-hidden={'true'} className={'fixed inset-0 bg-black/50 backdrop-blur-sm'} />
                </Transition.Child>

                <div className={'fixed inset-0 flex items-center justify-center p-4'}>
                    <Transition.Child
                        as={Fragment}
                        enter={'transition duration-150 ease-out'}
                        enterFrom={'scale-95 opacity-0'}
                        enterTo={'scale-100 opacity-100'}
                        leave={'transition duration-100 ease-in'}
                        leaveFrom={'scale-100 opacity-100'}
                        leaveTo={'scale-95 opacity-0'}
                    >
                        <Dialog.Panel
                            className={
                                'dz-chrome flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-line-field dz-on-raised bg-raised shadow-panel'
                            }
                        >
                            <div className={'flex shrink-0 items-start gap-3 border-b border-line-field px-5 py-4'}>
                                <span
                                    aria-hidden={'true'}
                                    className={
                                        'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent'
                                    }
                                >
                                    <Wand2 className={'h-[18px] w-[18px]'} />
                                </span>

                                <div className={'min-w-0 flex-1'}>
                                    <Dialog.Title
                                        className={'text-[17px] font-semibold tracking-tight text-ink'}
                                    >
                                        {'Presets'}
                                    </Dialog.Title>
                                </div>

                                <button
                                    type={'button'}
                                    onClick={onClose}
                                    aria-label={'Close'}
                                    className={
                                        'shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-overlay hover:text-ink'
                                    }
                                >
                                    <X className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                                </button>
                            </div>

                            <div className={'min-h-0 flex-1 overflow-y-auto p-4'}>
                                <div
                                    className={
                                        'grid gap-3 [@media(min-width:560px)]:grid-cols-2 [@media(min-width:900px)]:grid-cols-3 [@media(min-width:1180px)]:grid-cols-4'
                                    }
                                >
                                    {THEME_PRESETS.map((preset) => (
                                        <PresetCard
                                            key={preset.id}
                                            preset={preset}
                                            active={preset.id === active}
                                            onPick={() => onPick(preset)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className={'flex shrink-0 items-center gap-3 border-t border-line-field px-5 py-3'}>
                                <p className={'min-w-0 flex-1 text-[12px] leading-snug text-ink-faint'}>
                                    {
                                        'Picking one changes the panel on screen only. Nobody else sees it until you save.'
                                    }
                                </p>

                                <button
                                    type={'button'}
                                    onClick={onClose}
                                    className={
                                        'inline-flex h-9 shrink-0 items-center rounded-xl bg-overlay/50 px-4 text-[13px] font-medium text-ink transition-colors hover:bg-overlay'
                                    }
                                >
                                    {'Done'}
                                </button>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}

export function PresetsLauncher({ beside }: { beside: boolean }) {
    const open = usePresetsOpen();
    const previewing = usePreviewing();

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <button
            type={'button'}
            onClick={() => setPresetsOpen(true)}
            aria-label={'Presets'}
            title={'Presets, whole designs in one press'}
            style={{
                position: 'fixed',
                bottom: '1.25rem',

                right: beside ? '4.875rem' : '1.25rem',
                zIndex: 60,
            }}
            className={cn(
                'dz-scope group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl shadow-panel',
                'bg-card text-accent ring-1 ring-line-field transition-all duration-200 hover:scale-105 hover:text-ink',
                'shadow-[0_0_26px_-8px] shadow-accent/60',
                (open || previewing) && 'pointer-events-none scale-90 opacity-0'
            )}
        >
            <svg
                className={
                    'pointer-events-none absolute inset-0 h-full w-full opacity-70 transition-opacity duration-200 group-hover:opacity-100'
                }
                viewBox={'0 0 48 48'}
                aria-hidden={'true'}
            >
                <defs>
                    <radialGradient id={'dzPresetGlow'} cx={'50%'} cy={'62%'} r={'55%'}>
                        <stop offset={'0%'} stopColor={'currentColor'} stopOpacity={'0.5'} />
                        <stop offset={'55%'} stopColor={'currentColor'} stopOpacity={'0.14'} />
                        <stop offset={'100%'} stopColor={'currentColor'} stopOpacity={'0'} />
                    </radialGradient>
                </defs>
                <circle cx={'24'} cy={'30'} r={'24'} fill={'url(#dzPresetGlow)'} />
            </svg>

            <Wand2 className={'relative h-5 w-5'} aria-hidden={'true'} />
        </button>,
        document.body
    );
}

export default PresetsLauncher;
