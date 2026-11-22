import React, { ComponentType, ReactNode } from 'react';

function Icon({ children }: { children: ReactNode }) {
    return (
        <svg
            className={'dz-icon'}
            viewBox={'0 0 24 24'}
            width={'100%'}
            height={'100%'}
            fill={'none'}
            stroke={'currentColor'}
            strokeWidth={2}
            strokeLinecap={'round'}
            strokeLinejoin={'round'}
            aria-hidden={'true'}
        >
            {children}
        </svg>
    );
}

function BlocksIcon() {
    return (
        <Icon>
            <rect x={'3'} y={'3'} width={'7.5'} height={'7.5'} rx={'1.5'} />
            <rect x={'13.5'} y={'13.5'} width={'7.5'} height={'7.5'} rx={'1.5'} />
            <rect x={'3'} y={'13.5'} width={'7.5'} height={'7.5'} rx={'1.5'} />
            <path d={'M13.5 6.75h7.5M17.25 3v7.5'} />
        </Icon>
    );
}

function BrandIcon() {
    return (
        <Icon>
            <rect x={'2.5'} y={'6'} width={'8'} height={'12'} rx={'2.5'} />
            <path d={'M5.5 12h2'} />
            <path d={'M14 9.5h7.5M14 14.5h5'} />
        </Icon>
    );
}

function PaletteIcon() {
    return (
        <Icon>
            <circle cx={'8.5'} cy={'9'} r={'4.5'} />
            <circle cx={'15.5'} cy={'9'} r={'4.5'} />
            <circle cx={'12'} cy={'15.5'} r={'4.5'} />
        </Icon>
    );
}

function TypeIcon() {
    return (
        <Icon>
            <path d={'m5.5 17 6.5-13 6.5 13'} />
            <path d={'M8.25 12h7.5'} />
            <path d={'M4 21h16'} />
        </Icon>
    );
}

function IconsIcon() {
    return (
        <Icon>
            <rect x={'3'} y={'3'} width={'7.5'} height={'7.5'} rx={'2'} />
            <circle cx={'17.25'} cy={'6.75'} r={'3.75'} />
            <path d={'M6.75 13.5 10.5 21h-7.5z'} />
            <path d={'M13.5 14.5h7.5M13.5 18.5h5'} />
        </Icon>
    );
}

function SurfaceIcon() {
    return (
        <Icon>
            <rect x={'7.5'} y={'3'} width={'13.5'} height={'13.5'} rx={'3'} />
            <path d={'M16.5 21H6a3 3 0 0 1-3-3V7.5'} />
        </Icon>
    );
}

function LayoutIcon() {
    return (
        <Icon>
            <rect x={'3'} y={'4'} width={'18'} height={'16'} rx={'3'} />
            <path d={'M9.5 4v16'} />
            <path d={'M5.75 9h1.5M5.75 13h1.5'} />
        </Icon>
    );
}

function NavigationIcon() {
    return (
        <Icon>
            <path d={'M3 6h1.5'} />
            <path d={'M3 12h1.5'} />
            <path d={'M3 18h1.5'} />
            <path d={'M8.5 6H21'} />
            <path d={'M8.5 12h8'} />
            <path d={'M8.5 18H21'} />
        </Icon>
    );
}

function AuthIcon() {
    return (
        <Icon>
            <path d={'M13 3h5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-5'} />
            <path d={'M3 12h10'} />
            <path d={'m9.5 8.5 3.5 3.5-3.5 3.5'} />
        </Icon>
    );
}

function DashboardIcon() {
    return (
        <Icon>
            <rect x={'3'} y={'3'} width={'8'} height={'8'} rx={'2'} />
            <rect x={'13'} y={'3'} width={'8'} height={'4.5'} rx={'2'} />
            <rect x={'13'} y={'9.5'} width={'8'} height={'11.5'} rx={'2'} />
            <rect x={'3'} y={'13'} width={'8'} height={'8'} rx={'2'} />
        </Icon>
    );
}

function ManagerIcon() {
    return (
        <Icon>
            <rect x={'3'} y={'4'} width={'11'} height={'7'} rx={'2'} />
            <rect x={'3'} y={'13'} width={'11'} height={'7'} rx={'2'} />
            <path d={'M6.25 7.5h.01M6.25 16.5h.01'} />
            <path d={'M17.5 6.5H21M17.5 12H21M17.5 17.5H21'} />
        </Icon>
    );
}

function OverviewIcon() {
    return (
        <Icon>
            <rect x={'3'} y={'3'} width={'18'} height={'5'} rx={'2'} />
            <rect x={'3'} y={'10.5'} width={'8'} height={'10.5'} rx={'2'} />
            <circle cx={'17'} cy={'15.75'} r={'3.75'} />
        </Icon>
    );
}

function ConsoleIcon() {
    return (
        <Icon>
            <rect x={'2.5'} y={'4'} width={'19'} height={'16'} rx={'3'} />
            <path d={'m6.5 10 2.5 2-2.5 2'} />
            <path d={'M12.5 14H17'} />
        </Icon>
    );
}

function MotionIcon() {
    return (
        <Icon>
            <circle cx={'15.5'} cy={'12'} r={'5'} />
            <path d={'M7.5 7.5H3'} />
            <path d={'M6 12H2'} />
            <path d={'M7.5 16.5H3'} />
        </Icon>
    );
}

function SeoIcon() {
    return (
        <Icon>
            <circle cx={'10.5'} cy={'10.5'} r={'7'} />
            <path d={'M3.75 10.5h13.5'} />
            <path d={'M10.5 3.5c3.5 4 3.5 10 0 14'} />
            <path d={'M10.5 3.5c-3.5 4-3.5 10 0 14'} />
            <path d={'m16 16 5 5'} />
        </Icon>
    );
}

function LanguageIcon() {
    return (
        <Icon>
            <path d={'M3 5.5h9'} />
            <path d={'M7.5 3.5v2'} />
            <path d={'M10 5.5c0 4-2.5 7-6 8.5'} />
            <path d={'M5 9.5c1 2.5 2.8 4 4.8 4.8'} />
            <path d={'m13 20.5 4-9 4 9'} />
            <path d={'M14.4 17.5h5.2'} />
        </Icon>
    );
}

function CssIcon() {
    return (
        <Icon>
            <path d={'m7.5 8-4 4 4 4'} />
            <path d={'m16.5 8 4 4-4 4'} />
            <path d={'m13.5 5-3 14'} />
        </Icon>
    );
}

export const SECTION_ICONS: Record<string, ComponentType> = {
    language: LanguageIcon,
    blocks: BlocksIcon,
    brand: BrandIcon,
    palette: PaletteIcon,
    type: TypeIcon,
    icons: IconsIcon,
    square: SurfaceIcon,
    layout: LayoutIcon,
    link: NavigationIcon,
    key: AuthIcon,
    dashboard: DashboardIcon,
    manager: ManagerIcon,
    overview: OverviewIcon,
    console: ConsoleIcon,
    css: CssIcon,
    motion: MotionIcon,
    globe: SeoIcon,
};

export default SECTION_ICONS;
