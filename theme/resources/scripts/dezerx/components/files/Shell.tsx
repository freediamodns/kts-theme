import React, { createContext, ReactNode, useContext } from 'react';
import { Dialog } from '@headlessui/react';
import { cn } from '@/dezerx/lib/cn';
import { ModalDesign, usePanelTheme } from '@/dezerx/lib/panelTheme';

const DesignContext = createContext<ModalDesign>('stark');

const PANELS: Record<ModalDesign, string> = {
    stark: 'rounded-3xl bg-raised ring-1 ring-line-field',
    classic: 'rounded-2xl bg-raised ring-1 ring-line-field',
    accent: 'rounded-2xl bg-raised ring-1 ring-line-field',
    glass: 'rounded-3xl bg-raised/70 ring-1 ring-line-field backdrop-blur-xl',
};

const HEADERS: Partial<Record<ModalDesign, string>> = {
    classic: '-mx-6 -mt-6 mb-2 rounded-t-[inherit] border-b border-line-field px-6 py-4',
    accent: '-mx-6 -mt-6 mb-2 rounded-t-[inherit] border-b border-accent/25 bg-accent/10 px-6 py-4',
};

const FOOTERS: Record<ModalDesign, string> = {
    stark: 'mt-6',
    glass: 'mt-6',
    classic: '-mx-6 -mb-6 mt-6 rounded-b-[inherit] border-t border-line-field bg-card/50 px-6 py-4',
    accent: '-mx-6 -mb-6 mt-6 rounded-b-[inherit] border-t border-line-field bg-card/50 px-6 py-4',
};

export default function DialogShell({
    open,
    onClose,
    title,
    body,
    width = 'sm',
    children,
}: {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    body?: ReactNode;
    width?: 'sm' | 'md' | 'lg' | 'xl';
    children: ReactNode;
}) {
    const design = usePanelTheme()['modal.design'];
    const header = HEADERS[design];

    const heading = (
        <Dialog.Title
            className={cn('text-base font-semibold tracking-tight', design === 'accent' ? 'text-accent' : 'text-ink')}
        >
            {title}
        </Dialog.Title>
    );

    const description = body && (
        <p className={cn('text-sm leading-relaxed text-ink-muted', header ? 'mb-1' : 'mt-2')}>{body}</p>
    );

    return (
        <Dialog open={open} onClose={onClose} className={'relative z-[60]'}>
            <div aria-hidden={'true'} className={'fixed inset-0  backdrop-blur-lg animate-backdrop-in'} />

            <div className={'fixed inset-0 flex items-center justify-center p-4'}>
                <Dialog.Panel
                    className={cn(
                        'w-full dz-on-raised p-6 shadow-panel animate-modal-in motion-reduce:animate-none',
                        PANELS[design],
                        width === 'sm'
                            ? 'max-w-sm'
                            : width === 'md'
                            ? 'max-w-md'
                            : width === 'lg'
                            ? 'max-w-lg'
                            : 'max-w-2xl'
                    )}
                >
                    <DesignContext.Provider value={design}>
                        {header ? <div className={header}>{heading}</div> : heading}

                        {description}

                        {children}
                    </DesignContext.Provider>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
    const design = useContext(DesignContext);
    const fused = usePanelTheme()['modal.fused'];

    return (
        <div
            className={cn(
                'dz-dialog-footer flex items-center justify-end',
                fused ? 'dz-fused' : 'flex-wrap gap-2',
                FOOTERS[design],
                className
            )}
        >
            {children}
        </div>
    );
}
