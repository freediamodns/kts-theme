import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { LOCALES, LOCALE_SETTINGS, setLocale, useLocale, useT } from '@/i18n';

export function Flag({ code, className }: { code: string; className?: string }) {
    return (
        <span
            aria-hidden={'true'}
            className={cn('fi', `fi-${code}`, 'shrink-0 rounded-[2px] ring-1 ring-inset ring-black/20', className)}
        />
    );
}

interface Props {
    className?: string;
    variant?: 'button' | 'row';
}

export default function LanguagePicker({ className, variant = 'button' }: Props) {
    const t = useT();
    const active = useLocale();
    const [open, setOpen] = useState(false);
    const container = useRef<HTMLDivElement>(null);

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

    if (LOCALES.length < 2 || !LOCALE_SETTINGS.picker) {
        return null;
    }

    const label = t('common.language');

    return (
        <div ref={container} className={cn('relative', variant === 'row' && 'w-full')}>
            <button
                type={'button'}
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-haspopup={'menu'}
                aria-label={`${label}: ${active.english}`}
                title={`${label}: ${active.name}`}
                className={cn(
                    'flex items-center transition-colors',
                    variant === 'row'
                        ? 'w-full gap-3 rounded-2xl px-3 py-2.5 text-sm text-ink-muted hover:bg-raised hover:text-ink'
                        : cn(
                              'h-10 shrink-0 justify-center gap-2 rounded-3xl bg-raised text-ink-muted',
                              'hover:bg-overlay hover:text-ink',
                              'w-10 px-0 sm:w-auto sm:px-3.5',
                              className
                          )
                )}
            >
                <Flag code={active.flag} className={'text-base leading-none'} />

                {variant === 'row' ? (
                    <>
                        <span className={'flex-1 truncate text-left'}>{active.name}</span>
                        <ChevronDown
                            aria-hidden={'true'}
                            className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
                        />
                    </>
                ) : (
                    <>
                        <span className={'hidden text-sm font-medium uppercase sm:inline'}>{active.code}</span>
                        <ChevronDown
                            aria-hidden={'true'}
                            className={cn(
                                'hidden h-4 w-4 shrink-0 transition-transform sm:block',
                                open && 'rotate-180'
                            )}
                        />
                    </>
                )}
            </button>

            {open && (
                <div
                    role={'menu'}
                    className={cn(
                        'absolute z-50 mt-2 w-60 rounded-2xl border border-line-field bg-raised/60 backdrop-blur-xl p-1 shadow-panel',
                        variant === 'row' ? 'bottom-full left-0 mb-2 mt-0' : 'right-0'
                    )}
                >
                    <p className={'px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>
                        {label}
                    </p>

                    {LOCALES.map((locale) => {
                        const chosen = locale.code === active.code;
                        const partial = locale.coverage < 0.95;

                        return (
                            <button
                                key={locale.code}
                                type={'button'}
                                role={'menuitemradio'}
                                aria-checked={chosen}
                                lang={locale.code}
                                onClick={() => {
                                    setLocale(locale.code);
                                    setOpen(false);
                                }}
                                className={cn(
                                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                                    chosen ? 'bg-overlay text-ink' : 'text-ink-muted hover:bg-overlay hover:text-ink'
                                )}
                            >
                                <Flag code={locale.flag} className={'text-base leading-none'} />

                                <span className={'min-w-0 flex-1 truncate'}>{locale.name}</span>


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

export { LanguagePicker };
