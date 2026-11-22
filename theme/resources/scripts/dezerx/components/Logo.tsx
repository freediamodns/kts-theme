import React, { useLayoutEffect, useRef } from 'react';
import { useStoreState } from 'easy-peasy';
import { cn } from '@/dezerx/lib/cn';
import { useAppearance, type LogoConfig } from '@/dezerx/lib/appearance';

export default function Logo({
    className,
    override,
    compact = false,
}: {
    className?: string;
    override?: LogoConfig;
    compact?: boolean;
}) {
    const shared = useAppearance();
    const name = useStoreState((state) => state.settings.data?.name);
    const configured = override ?? shared.logo;
    const logo = { ...configured, text: configured.text || name || 'KTS Host' };

    if (compact && logo.mark) {
        return <Artwork logo={logo} className={cn('h-full w-full object-contain', className)} mark />;
    }

    const box = cn('h-full max-h-14 w-auto max-w-full select-none', className);

    if (logo.mode === 'text') {
        return <Wordmark text={logo.text} className={cn('max-h-14 max-w-full select-none', className)} />;
    }

    if (logo.mode === 'both') {
        return (
            <span className={cn('inline-flex h-full max-h-14 max-w-full items-center gap-2.5 select-none', className)}>
                <Artwork logo={logo} className={'h-full w-auto max-w-[60%] shrink-0 object-contain'} mark />
                <Wordmark text={logo.text} className={'min-w-0 flex-1'} />
            </span>
        );
    }

    return <Artwork logo={logo} className={cn(box, 'object-contain')} />;
}

const FIT_FLOOR = 0.55;

function Wordmark({ text, className }: { text: string; className?: string }) {
    const ref = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        const node = ref.current;

        if (!node) {
            return;
        }

        let settled = -1;

        const fit = () => {
            node.style.fontSize = '';

            const base = parseFloat(getComputedStyle(node).fontSize);
            const floor = Math.max(11, base * FIT_FLOOR);
            let size = base;

            while (node.scrollWidth > node.clientWidth + 1 && size > floor) {
                size -= 1;
                node.style.fontSize = `${size}px`;
            }

            settled = node.parentElement?.clientWidth ?? -1;
        };

        fit();

        const observer = new ResizeObserver(() => {
            if ((node.parentElement?.clientWidth ?? -1) !== settled) {
                fit();
            }
        });

        observer.observe(node.parentElement ?? node);
        void document.fonts?.ready.then(fit);

        return () => observer.disconnect();
    }, [text]);

    return (
        <span
            ref={ref}
            className={cn(
                'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-akira text-2xl leading-[1.3] tracking-tight text-ink',
                className
            )}
        >
            {text}
        </span>
    );
}

function Artwork({
    logo,
    className,
    mark = false,
}: {
    logo: { image: string; imageLight: string; mark: string | null; alt: string };
    className?: string;
    mark?: boolean;
}) {
    const darkSrc = mark ? logo.mark ?? logo.image : logo.image;
    const lightSrc = mark ? logo.mark ?? logo.imageLight : logo.imageLight;

    if (!darkSrc && !lightSrc) {
        return null;
    }

    return (
        <>
            <img
                src={darkSrc || lightSrc}
                alt={logo.alt}
                className={cn(className, 'block [.light_&]:hidden')}
                draggable={false}
            />
            <img
                src={lightSrc || darkSrc}
                alt={logo.alt}
                className={cn(className, 'hidden [.light_&]:block')}
                draggable={false}
                aria-hidden={'true'}
            />
        </>
    );
}

export { Logo };
