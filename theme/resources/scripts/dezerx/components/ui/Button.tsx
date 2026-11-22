import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { buttonAnimation, usePanelTheme } from '@/dezerx/lib/panelTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
    primary: 'dz-btn-primary bg-btn text-btn-ink hover:bg-btn/90 font-semibold',
    secondary: 'dz-btn-secondary bg-overlay text-ink hover:bg-raised border border-line',
    ghost: 'dz-btn-ghost bg-transparent text-ink-muted hover:bg-overlay hover:text-ink',
    danger: 'dz-btn-danger bg-danger text-white hover:bg-danger/85',
};

const SIZES: Record<ButtonSize, string> = {
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-7 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: ReactNode;
    fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            loading = false,
            icon,
            fullWidth = false,
            className,
            children,
            disabled,
            type = 'button',
            ...props
        },
        ref
    ) => {
        const animation = buttonAnimation(usePanelTheme()['button.animation']);

        return (
            <button
                ref={ref}
                type={type}
                disabled={disabled || loading}
                aria-busy={loading || undefined}
                className={cn(
                    'rounded-2xl relative inline-flex items-center justify-center gap-2',
                    'font-medium tracking-tight transition-all duration-150',
                    'disabled:pointer-events-none disabled:opacity-50',
                    animation,
                    VARIANTS[variant],
                    SIZES[size],
                    fullWidth && 'w-full',
                    className
                )}
                {...props}
            >
                {loading && <Loader2 className={'absolute h-4 w-4 animate-spin'} aria-hidden={'true'} />}
                <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>
                    {icon}
                    {children}
                </span>
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
export { Button };
