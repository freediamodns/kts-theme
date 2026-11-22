import React from 'react';
import { cn } from '@/dezerx/lib/cn';

export interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
    name?: string;
}

export function Toggle({ checked, onChange, label, disabled, className, id, name }: ToggleProps) {
    return (
        <button
            type={'button'}
            id={id}
            name={name}
            role={'switch'}
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
                checked ? 'bg-accent' : 'bg-overlay',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                className
            )}
        >
            <span
                aria-hidden={'true'}
                className={cn(
                    'block h-[18px] w-[18px] rounded-full transition-[transform,background-color]',
                    checked ? 'translate-x-4 bg-accent-ink' : 'translate-x-0 bg-white'
                )}
            />
        </button>
    );
}

export default Toggle;
