import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Loader2, Save, X } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { requestEditorSave, useEditorSaving } from '@/dezerx/components/editor/store';

export const ROW = 'flex items-center gap-2 border-t border-line-field px-3 py-3 first:border-t-0';

export const GEAR =
    'shrink-0 rounded-lg bg-overlay p-1.5 text-ink-muted transition-colors hover:bg-accent/20 hover:text-ink';

export const STEP = 'shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:text-ink disabled:opacity-25';

export const CHIP = 'shrink-0 rounded-md px-2 py-0.5 text-[12px] font-medium';

export const SOLID = 'shrink-0 rounded-md px-2 py-0.5 text-[12px] font-semibold text-white';

export const LABEL = 'block text-[12px] font-semibold uppercase tracking-wider text-ink-faint';

export function Modal({
    open,
    title,
    wide = false,
    onClose,
    children,
}: {
    open: boolean;
    title: string;

    wide?: boolean;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const saving = useEditorSaving();

    return (
        <Transition show={open} as={Fragment}>
            <Dialog onClose={onClose} className={'dz-scope relative z-[90] font-sans'}>
                <Transition.Child
                    as={Fragment}
                    enter={'transition duration-150 ease-out'}
                    enterFrom={'opacity-0'}
                    enterTo={'opacity-100'}
                    leave={'transition duration-100 ease-in'}
                    leaveFrom={'opacity-100'}
                    leaveTo={'opacity-0'}
                >
                    <div aria-hidden={'true'} className={'fixed inset-0  backdrop-blur-sm'} />
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
                            className={cn(
                                'dz-chrome flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl',
                                'dz-on-raised bg-raised shadow-panel ring-1 ring-line-field',
                                wide ? 'max-w-3xl' : 'max-w-lg'
                            )}
                        >
                            <div className={'flex shrink-0 items-center gap-3 border-b border-line-field px-4 py-3'}>
                                <Dialog.Title
                                    className={
                                        'min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight text-ink'
                                    }
                                >
                                    {title}
                                </Dialog.Title>

                                <button
                                    type={'button'}
                                    onClick={onClose}
                                    aria-label={'Close'}
                                    className={
                                        'shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:bg-overlay hover:text-ink'
                                    }
                                >
                                    <X className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                                </button>
                            </div>

                            <div className={'min-h-0 flex-1 space-y-4 overflow-y-auto p-4'}>{children}</div>

                            <div className={'shrink-0 border-t border-line-field p-3'}>
                                <button
                                    type={'button'}
                                    onClick={() => requestEditorSave()}
                                    disabled={saving}
                                    className={
                                        'flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-btn px-4 text-[13px] font-semibold text-btn-ink transition-colors hover:bg-btn/90 disabled:opacity-50'
                                    }
                                >
                                    {saving ? (
                                        <Loader2 className={'h-4 w-4 animate-spin'} aria-hidden={'true'} />
                                    ) : (
                                        <Save className={'h-4 w-4'} aria-hidden={'true'} />
                                    )}
                                    {'Save for everyone'}
                                </button>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}
