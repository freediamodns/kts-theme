import React, { forwardRef, useState, InputHTMLAttributes, ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import useAutoId from '@/dezerx/lib/useAutoId';
import { useT } from '@/i18n';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: ReactNode;
    action?: ReactNode;
    revealable?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, icon, action, revealable = false, className, id, type = 'text', ...props }, ref) => {
        const t = useT();
        const inputId = useAutoId(id);
        const errorId = `${inputId}-error`;
        const hintId = `${inputId}-hint`;

        const [revealed, setRevealed] = useState(false);
        const resolvedType = revealable && revealed ? 'text' : type;

        return (
            <div className={'w-full'}>
                {label && (
                    <label
                        htmlFor={inputId}
                        className={'mb-1.5 block text-xs font-medium tracking-tight text-ink-muted'}
                    >
                        {label}
                    </label>
                )}

                <div className={'relative'}>
                    {icon && (
                        <span
                            className={'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint'}
                            aria-hidden={'true'}
                        >
                            {icon}
                        </span>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        type={resolvedType}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={cn(error && errorId, hint && !error && hintId) || undefined}
                        className={cn(
                            'dz-input dz-field rounded-2xl h-11 w-full px-3.5 text-sm text-ink',
                            'placeholder:text-ink-faint',
                            'transition-colors duration-150',
                            'focus:border-accent/60',
                            icon && 'pl-10',
                            (revealable || action) && 'pr-11',
                            error ? 'border-danger/70' : 'dz-field-line hover:border-ink-faint/25',
                            className
                        )}
                        {...props}
                    />

                    {action && !revealable && (
                        <span className={'absolute right-2 top-1/2 -translate-y-1/2'}>{action}</span>
                    )}

                    {revealable && (
                        <button
                            type={'button'}
                            onClick={() => setRevealed((v) => !v)}
                            className={
                                'absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-faint transition-colors hover:text-ink-muted'
                            }
                            aria-label={revealed ? t('common.hidePassword') : t('common.showPassword')}
                        >
                            {revealed ? (
                                <EyeOff className={'h-4 w-4'} aria-hidden={'true'} />
                            ) : (
                                <Eye className={'h-4 w-4'} aria-hidden={'true'} />
                            )}
                        </button>
                    )}
                </div>

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

Input.displayName = 'Input';

export default Input;
export { Input };
