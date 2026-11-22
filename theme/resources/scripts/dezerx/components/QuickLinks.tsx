import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { linkIcon } from '@/dezerx/lib/linkIcons';
import { THEME_CSS_EVENT, usePanelTheme, type QuickLinkCard } from '@/dezerx/lib/panelTheme';
import CardArt, { Globe } from '@/dezerx/components/CardArt';
import { useT } from '@/i18n';

function useLightPromo(): boolean {
    const [light, setLight] = useState(false);

    useEffect(() => {
        const check = () => {
            const raw = getComputedStyle(document.documentElement).getPropertyValue('--promo');
            const nums = raw.match(/\d+(?:\.\d+)?/g);

            if (!nums || nums.length < 3) {
                setLight(false);

                return;
            }

            const [r, g, b] = nums.map(Number);

            setLight((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6);
        };

        check();
        window.addEventListener(THEME_CSS_EVENT, check);

        return () => window.removeEventListener(THEME_CSS_EVENT, check);
    }, []);

    return light;
}

function FeatureCard({ link }: { link: QuickLinkCard }) {
    const t = useT();
    const light = useLightPromo();

    return (
        <a
            href={link.url}
            target={'_blank'}
            rel={'noreferrer noopener'}
            style={light ? ({ '--promo-ink': 'rgb(17 24 39)' } as React.CSSProperties) : undefined}
            className={
                'running-border relative isolate flex h-full flex-col overflow-hidden rounded-2xl bg-promo p-5 transition-transform hover:-translate-y-0.5'
            }
        >
            <span
                aria-hidden={'true'}
                className={'pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 to-black/10'}
            />

            <CardArt art={link.art} icon={link.icon} dark={light} />

            <div className={'relative flex flex-1 flex-col'}>
                <p className={'truncate text-xs font-medium tracking-tight text-promo-ink/80'}>{link.blurb}</p>

                <p className={'mt-3 text-2xl font-semibold tracking-tight text-promo-ink'}>{link.label}</p>

                <p className={'mt-auto truncate pt-3 text-xs font-medium text-promo-ink underline underline-offset-4'}>
                    {t('quickLinks.visit')}
                    <ChevronRight
                        aria-hidden={'true'}
                        className={'animate-nudge-x ml-0.5 inline-block h-3.5 w-3.5 align-middle'}
                    />
                </p>
            </div>
        </a>
    );
}

function PlainCard({ link }: { link: QuickLinkCard }) {
    const t = useT();
    const Icon = linkIcon(link.icon);

    return (
        <a
            href={link.url}
            target={'_blank'}
            rel={'noreferrer noopener'}
            className={'flex h-full flex-col rounded-2xl bg-card p-5 shadow-none transition-colors hover:bg-raised'}
        >
            <div className={'flex min-w-0 items-center gap-2 text-ink-faint'}>
                <Icon className={'h-4 w-4 shrink-0'} />
                <p className={'truncate text-xs font-medium text-ink-faint tracking-tight'}>{link.blurb}</p>
            </div>

            <p className={'mt-3 truncate text-2xl font-semibold tracking-tight text-ink'}>{link.label}</p>

            <p className={'mt-auto pt-3 text-xs font-medium text-accent underline underline-offset-4'}>
                {t('quickLinks.visit')}
                <ChevronRight aria-hidden={'true'} className={'ml-0.5 inline-block h-3.5 w-3.5 align-middle'} />
            </p>
        </a>
    );
}

export default function QuickLinks() {
    const cards = usePanelTheme()['servers.quickLinkCards'];
    const links = (cards ?? []).filter((link) => link.enabled);

    if (links.length === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                '-mr-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pr-4',
                '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                'sm:mr-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-x-visible sm:pb-0 sm:pr-0 xl:grid-cols-4'
            )}
        >
            {links.map((link, index) => (
                <div key={`${link.url}-${index}`} className={'w-[82%] shrink-0 snap-start sm:w-auto sm:shrink'}>
                    {link.feature ? <FeatureCard link={link} /> : <PlainCard link={link} />}
                </div>
            ))}
        </div>
    );
}

export { QuickLinks, Globe };
