import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';
import { useAppearance, useColorPreset } from '@/dezerx/lib/appearance';
import { Button } from '@/dezerx/components/ui';

const MENU_WIDTH = 224;
const MENU_ROOM = 260;
const EDGE_GAP = 8;

export default function PresetPicker({ className }: { className?: string }) {
    const t = useT();
    const { allowUserPresets } = useAppearance();
    const { presets, active, select } = useColorPreset();
    const [open, setOpen] = useState(false);
    const [placement, setPlacement] = useState({ alignLeft: false, above: false });
    const container = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        const measure = () => {
            const rect = container.current?.getBoundingClientRect();

            if (!rect) {
                return;
            }

            const below = window.innerHeight - rect.bottom;

            setPlacement({
                alignLeft: rect.right - MENU_WIDTH < EDGE_GAP,
                above: below < MENU_ROOM && rect.top > below,
            });
        };

        measure();

        window.addEventListener('resize', measure);

        return () => window.removeEventListener('resize', measure);
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (event: MouseEvent) => {
            if (!container.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    if (!allowUserPresets || presets.length < 2) {
        return null;
    }

    return (
        <div ref={container} className={'relative'}>
            <Button
                variant={'ghost'}
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-haspopup={'menu'}
                aria-label={t('presets.colour')}
                title={active ? t('presets.colourNamed', { name: active.label }) : t('presets.colour')}
                className={className}
                icon={<Palette className={'h-4 w-4 shrink-0'} />}
            />

            {open && (
                <div
                    role={'menu'}
                    className={cn(
                        'absolute z-50 w-56 overflow-y-auto rounded-2xl border border-line bg-raised/60 p-1 shadow-panel backdrop-blur-xl',
                        'max-h-[min(20rem,60vh)]',
                        placement.alignLeft ? 'left-0' : 'right-0',
                        placement.above ? 'bottom-full mb-2' : 'mt-2'
                    )}
                >
                    <p className={'px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>
                        {t('presets.colour')}
                    </p>

                    {presets.map((preset) => {
                        const chosen = preset.id === active?.id;

                        return (
                            <button
                                key={preset.id}
                                type={'button'}
                                role={'menuitemradio'}
                                aria-checked={chosen}
                                onClick={() => {
                                    select(preset);
                                    setOpen(false);
                                }}
                                className={cn(
                                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                                    chosen ? 'bg-overlay text-ink' : 'text-ink-muted hover:bg-overlay hover:text-ink'
                                )}
                            >
                                <span
                                    aria-hidden={'true'}
                                    style={{ background: preset.swatch }}
                                    className={'h-4 w-4 shrink-0 rounded-full ring-1 ring-inset ring-black/20'}
                                />

                                <span className={'min-w-0 flex-1 truncate'}>{preset.label}</span>

                                {chosen && (
                                    <Check aria-hidden={'true'} className={'h-3.5 w-3.5 shrink-0 text-accent'} />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export { PresetPicker };
