import React, { ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStoreState } from '@/state/hooks';
import FlashMessageRender from '@/components/FlashMessageRender';
import AuthBackdrop from '@/dezerx/components/AuthBackdrop';
import Logo from '@/dezerx/components/Logo';
import ThemeToggle from '@/dezerx/components/ThemeToggle';
import PresetPicker from '@/dezerx/components/PresetPicker';
import LanguagePicker from '@/dezerx/components/LanguagePicker';
import { cn } from '@/dezerx/lib/cn';
import {
    authArt,
    authCardSurface,
    authControlPosition,
    authGlow,
    usePanelTheme,
    type ThemeConfig,
} from '@/dezerx/lib/panelTheme';

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    pitch: { heading: string; body: string };
    children: ReactNode;
    footer?: ReactNode;
    preview?: boolean;
}

const CONTROL =
    'h-10 w-10 shrink-0 rounded-2xl border border-line bg-card/70 px-0 text-ink-muted backdrop-blur-sm hover:bg-card hover:text-ink';

export default function AuthLayout({ title, subtitle, pitch, children, footer, preview = false }: AuthLayoutProps) {
    const theme = usePanelTheme();
    const panel = useStoreState((state) => state.settings.data?.name) || 'KTS Host';

    const template = theme['seo.title'];

    useEffect(() => {
        if (preview) {
            return;
        }

        const next = fill(template === '' ? '{page} · {panel}' : template, title, panel).trim();

        document.title = next === '' ? panel : next;
    }, [preview, template, title, panel]);

    const tall = preview ? 'h-full' : 'min-h-screen';

    const layout = theme['auth.layout'];
    const placement = authArt(layout);
    const centred = theme['auth.align'] === 'center';
    const surface = authCardSurface(theme['auth.card'], layout);
    const glow = authGlow(theme['auth.glow']);

    const heading = theme['auth.heading'] || pitch.heading;
    const body = theme['auth.body'] || pitch.body;
    const showPitch = theme['auth.pitch'] && (heading !== '' || body !== '');

    const controls = theme['auth.controls'] ? (
        <div
            className={cn(
                'z-50 flex items-center gap-2',
                preview ? 'absolute' : 'fixed',
                authControlPosition(theme['auth.controlsPlace'])
            )}
        >
            <LanguagePicker
                className={'!h-10 !rounded-2xl border border-line bg-card/70 backdrop-blur-sm hover:bg-card'}
            />
            <PresetPicker className={CONTROL} />
            <ThemeToggle className={CONTROL} />
        </div>
    ) : null;

    const form = (
        <div className={'relative w-full'} style={{ maxWidth: `${theme['auth.width']}px` }}>
            <div className={cn(surface, centred && 'text-center')}>
                {theme['auth.logo'] && (
                    <Link to={'/'} className={'mb-6 inline-flex h-12 items-center sm:mb-8 sm:h-14'}>
                        <Logo />
                    </Link>
                )}

                <h1 className={'text-2xl font-bold tracking-tight text-ink sm:text-3xl'}>{title}</h1>
                <p className={'mt-2 text-sm text-ink-muted'}>{subtitle}</p>

                <FlashMessageRender className={'mt-6'} />

                <div className={'mt-6 text-left sm:mt-8'}>{children}</div>

                {footer && <div className={'mt-8 text-center text-sm text-ink-faint'}>{footer}</div>}
            </div>

            <Footnote theme={theme} />
        </div>
    );

    const decor = (
        <>
            {theme['auth.grid'] && (
                <div
                    aria-hidden={'true'}
                    className={
                        'pointer-events-none absolute inset-0 bg-grid bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]'
                    }
                />
            )}

            {glow && (
                <div
                    aria-hidden={'true'}
                    className={cn('pointer-events-none absolute rounded-full blur-[120px]', glow)}
                    style={{ backgroundColor: 'rgb(from var(--accent) r g b / 0.22)' }}
                />
            )}
        </>
    );

    const pitchBlock = showPitch ? (
        <div
            className={
                'absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-base via-base/90 to-transparent p-12 pt-28 xl:p-16 xl:pt-32'
            }
        >
            <div className={'max-w-md'}>
                {heading !== '' && (
                    <h2 className={'text-4xl font-bold leading-[1.1] tracking-tight text-ink'}>{heading}</h2>
                )}
                {body !== '' && <p className={'mt-3 text-sm leading-relaxed text-ink-muted'}>{body}</p>}
            </div>
        </div>
    ) : null;

    const root = cn(
        'dz-scope relative overflow-hidden bg-base font-sans text-ink',
        tall,
        theme['auth.noise'] && 'dz-noise'
    );

    if (placement === 'beside') {
        const reversed = layout === 'split-reverse';

        const panes = (
            <>
                <div
                    className={cn(
                        'relative flex flex-col items-center justify-center px-5 pb-12 pt-24 sm:px-6 sm:py-12',
                        layout === 'frame' ? 'flex-1' : tall,
                        reversed && 'lg:order-2'
                    )}
                >
                    {decor}
                    {form}
                </div>

                <div
                    className={cn(
                        'relative hidden overflow-hidden bg-base lg:block',
                        reversed && 'lg:order-1'
                    )}
                >
                    <AuthBackdrop placement={'beside'} flip={reversed} />
                    {pitchBlock}
                </div>
            </>
        );

        if (layout === 'frame') {
            return (
                <div className={cn(root, 'p-3 sm:p-4 lg:p-6')}>
                    {controls}

                    <div
                        className={cn(
                            'relative flex flex-col overflow-hidden rounded-3xl bg-card shadow-panel ring-1 ring-line-field',
                            preview
                                ? 'h-full'
                                : 'min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-3rem)]',
                            'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]'
                        )}
                    >
                        {panes}
                    </div>
                </div>
            );
        }

        return (
            <div className={cn(root, 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]')}>
                {controls}
                {panes}
            </div>
        );
    }

    if (placement === 'above') {
        return (
            <div className={cn(root, 'flex flex-col')}>
                {controls}

                <div className={'relative h-48 shrink-0 overflow-hidden sm:h-60 lg:h-72'}>
                    <AuthBackdrop placement={'above'} />

                    {showPitch && (
                        <div className={'absolute inset-x-0 bottom-0 p-6 sm:p-10'}>
                            <div className={'mx-auto max-w-3xl'}>
                                {heading !== '' && (
                                    <h2 className={'text-3xl font-bold leading-tight tracking-tight text-ink'}>
                                        {heading}
                                    </h2>
                                )}
                                {body !== '' && <p className={'mt-2 text-sm text-ink-muted'}>{body}</p>}
                            </div>
                        </div>
                    )}
                </div>

                <div className={'relative flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-6'}>
                    {decor}
                    {form}
                </div>
            </div>
        );
    }

    if (layout === 'hero') {
        return (
            <div className={root}>
                {controls}

                <AuthBackdrop placement={'behind'} />

                <div
                    className={cn(
                        'relative mx-auto flex w-full max-w-7xl flex-col justify-center gap-8 px-5 py-20 sm:px-8 lg:px-16',
                        tall,
                        centred && 'items-center text-center'
                    )}
                >
                    {showPitch && (
                        <div className={'max-w-xl'}>
                            {heading !== '' && (
                                <h2
                                    className={
                                        'text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl xl:text-6xl'
                                    }
                                >
                                    {heading}
                                </h2>
                            )}
                            {body !== '' && (
                                <p className={'mt-4 text-base leading-relaxed text-ink-muted'}>{body}</p>
                            )}
                        </div>
                    )}

                    <div className={'relative'}>
                        {decor}
                        {form}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(root, 'flex items-center justify-center px-5 py-12 sm:px-6')}>
            {controls}

            <AuthBackdrop placement={placement} />

            {decor}
            {form}
        </div>
    );
}

function fill(template: string, page: string, panel: string): string {
    return template.split('{page}').join(page).split('{panel}').join(panel);
}

function Footnote({ theme }: { theme: ThemeConfig }) {
    const text = theme['auth.footer'];

    if (text === '') {
        return null;
    }

    const url = theme['auth.footerUrl'];

    return (
        <p className={'mt-8 text-center text-xs text-ink-faint'}>
            {url === '' ? (
                text
            ) : (
                <a
                    href={url}
                    target={'_blank'}
                    rel={'noreferrer noopener'}
                    className={'transition-colors hover:text-ink-muted'}
                >
                    {text}
                </a>
            )}
        </p>
    );
}

export { AuthLayout };
