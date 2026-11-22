import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { CREATE_PATH } from '@/dezerx/lib/serverCreate';
import { buttonAnimation, usePanelTheme } from '@/dezerx/lib/panelTheme';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

export default function CreateServerButton({ remaining }: { remaining?: number | null }) {
    const t = useT();
    const animation = buttonAnimation(usePanelTheme()['button.animation']);

    const known = remaining !== null && remaining !== undefined;

    return (
        <Link
            to={CREATE_PATH}
            className={cn(
                'rounded-2xl inline-flex h-11 items-center justify-center gap-2 px-5',
                'text-sm font-semibold tracking-tight transition-all duration-150',
                'bg-btn text-btn-ink hover:bg-btn/90',
                animation
            )}
        >
            <Plus className={'h-4 w-4'} aria-hidden={'true'} />
            {t('create.button')}

            {known && remaining > 0 && (
                <span className={'rounded-full bg-btn-ink/15 px-1.5 py-0.5 text-[10px] font-semibold'}>
                    {remaining}
                </span>
            )}
        </Link>
    );
}

export { CreateServerButton };
