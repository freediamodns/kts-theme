import React, { useEffect, useRef, useState } from 'react';
import { useStoreState } from 'easy-peasy';
import { ChevronDown, ExternalLink, LifeBuoy, LogOut, Paintbrush, Settings } from 'lucide-react';
import http from '@/api/http';
import { ApplicationStore } from '@/state';
import { cn } from '@/dezerx/lib/cn';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { linkIcon } from '@/dezerx/lib/linkIcons';
import { setEditorOpen, useEditorOpen } from '@/dezerx/components/editor/store';
import { useDemo } from '@/dezerx/lib/demo';
import { Button } from '@/dezerx/components/ui';
import ThemeToggle from '@/dezerx/components/ThemeToggle';
import LanguagePicker from '@/dezerx/components/LanguagePicker';
import PresetPicker from '@/dezerx/components/PresetPicker';
import { useT } from '@/i18n';

const ICON_BUTTON = 'h-10 w-10 shrink-0 rounded-3xl bg-raised px-0 text-ink-muted hover:bg-overlay hover:text-ink';

function SupportMenu() {
    const t = useT();
    const [open, setOpen] = useState(false);
    const container = useRef<HTMLDivElement>(null);
    const links = usePanelTheme()['sidebar.links'].filter((link) => link.enabled);

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

    if (links.length === 0) {
        return null;
    }

    return (
        <div ref={container} className={'relative'}>
            <Button
                variant={'ghost'}
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-haspopup={'menu'}
                aria-label={t('accountBar.support')}
                title={t('accountBar.support')}
                className={cn(
                    'h-10 shrink-0 rounded-3xl bg-raised px-0 text-ink hover:bg-overlay hover:text-ink',
                    'w-10 sm:w-auto sm:px-4'
                )}
                icon={<LifeBuoy className={'h-4 w-4 shrink-0'} />}
            >
                <span className={'hidden sm:inline'}>{t('accountBar.support')}</span>
                <ChevronDown
                    aria-hidden={'true'}
                    className={cn('hidden h-4 w-4 shrink-0 transition-transform sm:block', open && 'rotate-180')}
                />
            </Button>

            {open && (
                <div
                    role={'menu'}
                    className={'absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-line-field bg-raised/60 backdrop-blur-xl p-1'}
                >
                    {links.map((link) => {
                        const Icon = linkIcon(link.icon);

                        return (
                            <a
                                key={link.url}
                                href={link.url}
                                target={'_blank'}
                                rel={'noreferrer noopener'}
                                role={'menuitem'}
                                onClick={() => setOpen(false)}
                                className={
                                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-overlay hover:text-ink'
                                }
                            >
                                <Icon className={'h-4 w-4 shrink-0'} />
                                <span className={'min-w-0 flex-1 truncate'}>{link.label}</span>
                                <ExternalLink className={'h-3 w-3 shrink-0 opacity-50'} />
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function EditorButton() {
    const t = useT();
    const open = useEditorOpen();

    if (open) {
        return null;
    }

    return (
        <Button
            variant={'ghost'}
            onClick={() => setEditorOpen(true)}
            aria-label={t('accountBar.editTheme')}
            title={t('accountBar.editTheme')}
            className={cn(ICON_BUTTON, 'hidden text-accent hover:text-accent sm:inline-flex')}
            icon={<Paintbrush className={'h-4 w-4'} />}
        />
    );
}

function useLogout(): [() => void, boolean] {
    const [loggingOut, setLoggingOut] = useState(false);

    const logout = () => {
        setLoggingOut(true);
        http.post('/auth/logout').finally(() => {
            
            window.location = '/';
        });
    };

    return [logout, loggingOut];
}

export default function AccountBar() {
    const t = useT();
    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data!.rootAdmin);

    const demo = useDemo();
    const [logout, loggingOut] = useLogout();

    return (
        <div className={'hidden items-center gap-1.5 sm:gap-2 lg:flex'}>
            <SupportMenu />

            <LanguagePicker />

            <PresetPicker className={ICON_BUTTON} />

            <ThemeToggle className={ICON_BUTTON} />

            {(rootAdmin || demo) && <EditorButton />}

            {rootAdmin && (
                <a
                    href={'/admin'}
                    aria-label={t('accountBar.administration')}
                    title={t('accountBar.administration')}
                    className={cn(ICON_BUTTON, 'inline-flex items-center justify-center transition-colors')}
                >
                    <Settings className={'h-4 w-4'} aria-hidden={'true'} />
                </a>
            )}

            <Button
                variant={'ghost'}
                onClick={logout}
                loading={loggingOut}
                aria-label={t('accountBar.signOut')}
                title={t('accountBar.signOut')}
                className={cn(ICON_BUTTON, 'text-danger hover:bg-danger/15 hover:text-danger')}
                icon={<LogOut className={'h-4 w-4'} />}
            />
        </div>
    );
}

const DRAWER_ROW =
    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-raised hover:text-ink';

export function AccountDrawerActions() {
    const t = useT();
    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data!.rootAdmin);
    const demo = useDemo();
    const [logout, loggingOut] = useLogout();

    return (
        <div className={'shrink-0 space-y-1 border-t border-line-field p-3'}>
            <div className={'flex items-center gap-2 pb-1'}>
                <ThemeToggle className={ICON_BUTTON} />
                <PresetPicker className={ICON_BUTTON} />
            </div>

            <LanguagePicker variant={'row'} />

            {(rootAdmin || demo) && (
                <button type={'button'} onClick={() => setEditorOpen(true)} className={DRAWER_ROW}>
                    <Paintbrush className={'h-[18px] w-[18px] shrink-0'} aria-hidden={'true'} />
                    <span className={'flex-1 truncate text-left'}>{t('accountBar.editTheme')}</span>
                </button>
            )}

            {rootAdmin && (
                <a href={'/admin'} className={DRAWER_ROW}>
                    <Settings className={'h-[18px] w-[18px] shrink-0'} aria-hidden={'true'} />
                    <span className={'flex-1 truncate text-left'}>{t('accountBar.administration')}</span>
                </a>
            )}

            <button
                type={'button'}
                onClick={logout}
                disabled={loggingOut}
                className={cn(DRAWER_ROW, 'text-danger hover:bg-danger/10 hover:text-danger')}
            >
                <LogOut className={'h-[18px] w-[18px] shrink-0'} aria-hidden={'true'} />
                <span className={'flex-1 truncate text-left'}>
                    {t(loggingOut ? 'accountBar.signingOut' : 'accountBar.signOut')}
                </span>
            </button>
        </div>
    );
}

export { AccountBar };
