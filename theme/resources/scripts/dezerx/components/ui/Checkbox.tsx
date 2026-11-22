import React, { forwardRef, InputHTMLAttributes, ReactNode, useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import useAutoId from '@/dezerx/lib/useAutoId';

export type CheckboxSize = 'xs' | 'sm' | 'md';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
    label?: ReactNode;
    error?: string;
    size?: CheckboxSize;
    indeterminate?: boolean;
    boxClassName?: string;
}

const BOXES: Record<CheckboxSize, string> = {
    xs: 'h-3.5 w-3.5 rounded-[3px]',
    sm: 'h-4 w-4 rounded-[4px]',
    md: 'h-[18px] w-[18px] rounded-[5px]',
};

const MARKS: Record<CheckboxSize, string> = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3 w-3',
};

const LABELS: Record<CheckboxSize, string> = {
    xs: 'text-[11px] leading-[14px]',
    sm: 'text-xs leading-4',
    md: 'text-xs leading-[18px]',
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    (
        { label, error, size = 'md', indeterminate = false, className, boxClassName, id, checked, disabled, ...props },
        ref
    ) => {
        const inputId = useAutoId(id);
        const errorId = `${inputId}-error`;
        const box = useRef<HTMLInputElement | null>(null);

        useEffect(() => {
            if (box.current) {
                box.current.indeterminate = indeterminate && !checked;
            }
        }, [indeterminate, checked]);

        const marked = Boolean(checked) || indeterminate;

        const control = (
            <span className={cn('relative inline-flex shrink-0', BOXES[size], label && 'mt-0.5')}>
                <input
                    ref={(node) => {
                        box.current = node;

                        if (typeof ref === 'function') {
                            ref(node);
                        } else if (ref) {
                            ref.current = node;
                        }
                    }}
                    id={inputId}
                    type={'checkbox'}
                    checked={checked}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={cn(
                        'peer absolute inset-0 z-10 h-full w-full opacity-0',
                        disabled ? 'cursor-default' : 'cursor-pointer'
                    )}
                    {...props}
                />
                <span
                    aria-hidden={'true'}
                    className={cn(
                        'pointer-events-none inline-flex h-full w-full items-center justify-center border transition-all duration-150',
                        BOXES[size],
                        'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/70 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-base',

                        marked ? 'border-accent bg-accent text-ink-inverse' : 'border-line-field bg-base',
                        !marked && !disabled && 'peer-hover:border-ink-faint/50',
                        error && !marked && 'border-danger/70',
                        disabled && 'opacity-40',
                        boxClassName
                    )}
                >
                    {checked ? (
                        <Check className={MARKS[size]} strokeWidth={3.5} />
                    ) : indeterminate ? (
                        <Minus className={MARKS[size]} strokeWidth={3.5} />
                    ) : null}
                </span>
            </span>
        );

        if (!label && !error) {
            return <span className={cn('inline-flex', className)}>{control}</span>;
        }

        return (
            <div className={cn('w-full', className)}>
                <div className={'flex items-start gap-2.5'}>
                    {control}

                    {label && (
                        <label
                            htmlFor={inputId}
                            className={cn(
                                'select-none text-ink-muted',
                                LABELS[size],
                                disabled ? 'cursor-default opacity-60' : 'cursor-pointer'
                            )}
                        >
                            {label}
                        </label>
                    )}
                </div>

                {error && (
                    <p id={errorId} role={'alert'} className={'mt-1.5 text-xs text-danger'}>
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
export { Checkbox };
