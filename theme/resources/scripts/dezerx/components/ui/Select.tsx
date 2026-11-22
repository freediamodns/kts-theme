import React, {
    CSSProperties,
    forwardRef,
    Fragment,
    MutableRefObject,
    RefObject,
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import useAutoId from '@/dezerx/lib/useAutoId';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export type SelectSize = 'sm' | 'md';

export interface SelectProps {
    label?: string;
    size?: SelectSize;
    error?: string;
    hint?: string;
    options: SelectOption[];
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    name?: string;
    className?: string;
    id?: string;
}

const MENU_MAX_HEIGHT = 256;
const MENU_MIN_HEIGHT = 96;
const MENU_GAP = 4;
const EDGE_GAP = 8;

const HIDDEN: CSSProperties = { position: 'fixed', visibility: 'hidden' };

function useMenuPlacement(open: boolean, anchor: RefObject<HTMLElement>): CSSProperties {
    const [style, setStyle] = useState<CSSProperties | null>(null);

    const place = useCallback(() => {
        const element = anchor.current;

        if (!element) {
            return;
        }

        const rect = element.getBoundingClientRect();
        const below = window.innerHeight - rect.bottom - MENU_GAP - EDGE_GAP;
        const above = rect.top - MENU_GAP - EDGE_GAP;
        const flip = below < Math.min(MENU_MAX_HEIGHT, above);
        const room = Math.max(flip ? above : below, MENU_MIN_HEIGHT);

        setStyle({
            position: 'fixed',
            left: rect.left,
            width: rect.width,
            maxHeight: Math.min(MENU_MAX_HEIGHT, room),
            ...(flip ? { bottom: window.innerHeight - rect.top + MENU_GAP } : { top: rect.bottom + MENU_GAP }),
        });
    }, [anchor]);

    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        place();

        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);

        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, place]);

    return style ?? HIDDEN;
}

function SelectMenu({
    open,
    anchor,
    options,
    size,
}: {
    open: boolean;
    anchor: RefObject<HTMLElement>;
    options: SelectOption[];
    size: SelectSize;
}) {
    const style = useMenuPlacement(open, anchor);

    return createPortal(
        <Transition
            as={Fragment}
            show={open}
            leave={'transition ease-in duration-75'}
            leaveFrom={'opacity-100 scale-100'}
            leaveTo={'opacity-0 scale-95'}
        >
            <Listbox.Options
                static
                style={style}
                className={
                    'dz-scope z-[120] origin-top overflow-y-auto rounded-xl border border-line-hair bg-card p-1 shadow-panel focus:outline-none'
                }
            >
                {options.map((option) => (
                    <Listbox.Option
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        className={'focus:outline-none'}
                    >
                        {({ active, selected: isSelected }) => (
                            <div
                                className={cn(
                                    'flex cursor-pointer items-center gap-2 rounded-lg',
                                    size === 'sm' ? 'px-2.5 py-2 text-[14px]' : 'px-2.5 py-2 text-sm',
                                    active ? 'bg-overlay text-ink' : 'text-ink-muted',
                                    isSelected && 'font-medium text-ink',
                                    option.disabled && 'cursor-not-allowed opacity-40'
                                )}
                            >
                                <Check
                                    aria-hidden={'true'}
                                    className={cn(
                                        'h-3.5 w-3.5 shrink-0 text-accent',
                                        isSelected ? 'opacity-100' : 'opacity-0'
                                    )}
                                />
                                <span className={'min-w-0 truncate'}>{option.label}</span>
                            </div>
                        )}
                    </Listbox.Option>
                ))}
            </Listbox.Options>
        </Transition>,
        document.body
    );
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
    (
        { label, size = 'md', error, hint, options, placeholder, value, onChange, disabled, name, className, id },
        ref
    ) => {
        const selectId = useAutoId(id);
        const errorId = `${selectId}-error`;
        const hintId = `${selectId}-hint`;

        const button = useRef<HTMLButtonElement>(null);

        const attachButton = useCallback(
            (node: HTMLButtonElement | null) => {
                (button as MutableRefObject<HTMLButtonElement | null>).current = node;

                if (typeof ref === 'function') {
                    ref(node);
                } else if (ref) {
                    (ref as MutableRefObject<HTMLButtonElement | null>).current = node;
                }
            },
            [ref]
        );

        const selected = options.find((option) => option.value === value);

        return (
            <div className={'w-full'}>
                {label && (
                    <label
                        htmlFor={selectId}
                        className={'mb-1.5 block text-xs font-medium tracking-tight text-ink-muted'}
                    >
                        {label}
                    </label>
                )}

                <Listbox value={value} onChange={onChange} disabled={disabled} name={name}>
                    {({ open }) => (
                        <div className={'relative'}>
                            <Listbox.Button
                                ref={attachButton}
                                id={selectId}
                                aria-invalid={error ? true : undefined}
                                aria-describedby={cn(error && errorId, hint && !error && hintId) || undefined}
                                className={cn(
                                    'dz-field group relative flex w-full items-center border text-left text-ink',
                                    size === 'sm'
                                        ? 'h-11 rounded-lg px-3 pr-9 text-[14px]'
                                        : 'h-11 rounded-2xl px-3.5 pr-10 text-sm',
                                    'transition-colors duration-150',
                                    'focus:border-accent/60 focus:outline-none',
                                    'disabled:cursor-not-allowed disabled:opacity-60',
                                    error ? 'border-danger/70' : 'dz-field-line hover:border-ink-faint/25',
                                    className
                                )}
                            >
                                <span className={cn('min-w-0 truncate', !selected && 'text-ink-faint')}>
                                    {selected?.label ?? placeholder ?? ''}
                                </span>

                                <ChevronDown
                                    aria-hidden={'true'}
                                    className={cn(
                                        'pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-faint transition-transform',
                                        size === 'sm' ? 'right-3 h-4 w-4' : 'right-3 h-4 w-4',
                                        open && 'rotate-180'
                                    )}
                                />
                            </Listbox.Button>

                            <SelectMenu open={open} anchor={button} options={options} size={size} />
                        </div>
                    )}
                </Listbox>

                {error ? (
                    <p id={errorId} role={'alert'} className={'mt-1.5 text-xs text-danger'}>
                        {error}
                    </p>
                ) : hint ? (
                    <p id={hintId} className={'mt-1.5 text-xs text-ink-faint'}>
                        {hint}
                    </p>
                ) : null}
            </div>
        );
    }
);

Select.displayName = 'Select';
