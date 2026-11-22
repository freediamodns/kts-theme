import React, { ComponentType } from 'react';
import {
    Activity,
    Archive,
    ArrowLeftRight,
    BarChart3,
    Bell,
    Blocks,
    BookOpen,
    Box,
    Boxes,
    CalendarClock,
    Clock,
    Code2,
    CreditCard,
    Crown,
    Database,
    Download,
    Flame,
    Folder,
    FolderTree,
    Gamepad2,
    Globe,
    Globe2,
    Heart,
    Image,
    KeyRound,
    Layers,
    LayoutGrid,
    LifeBuoy,
    Link2,
    Lock,
    Mail,
    Map,
    Network,
    Newspaper,
    Play,
    PawPrint,
    Plug,
    Plus,
    Puzzle,
    Rocket,
    Search,
    Server,
    Settings,
    Shield,
    ShoppingCart,
    Scissors,
    SlidersHorizontal,
    Star,
    Tag,
    Terminal,
    Trash2,
    User,
    UserRound,
    Users,
    Wrench,
    Zap,
} from 'lucide-react';

export const SIDEBAR_LINK_ICONS: Record<string, ComponentType<{ className?: string }>> = {
    link: Link2,
    globe: Globe,
    crown: Crown,
    activity: Activity,
    discord: DiscordIcon,
    support: LifeBuoy,
    mail: Mail,
    shield: Shield,
    star: Star,
    billing: CreditCard,
    cart: ShoppingCart,
    heart: Heart,
    grid: LayoutGrid,
    plus: Plus,
    user: User,
    server: Server,
    terminal: Terminal,
    settings: Settings,
    key: KeyRound,
    book: BookOpen,
    news: Newspaper,
    download: Download,

    files: FolderTree,
    rocket: Rocket,
    database: Database,
    archive: Archive,
    network: Network,
    schedule: CalendarClock,
    users: Users,
    player: UserRound,
    plug: Plug,
    blocks: Blocks,
    boxes: Boxes,
    tag: Tag,
    sliders: SlidersHorizontal,
    scissors: Scissors,
    world: Globe2,
    map: Map,
    fivem: FiveMIcon,
    rust: RustIcon,
    paw: PawPrint,
    swap: ArrowLeftRight,
    trash: Trash2,
    cube: Box,
    folder: Folder,
    layers: Layers,
    puzzle: Puzzle,
    wrench: Wrench,
    gamepad: Gamepad2,
    chart: BarChart3,
    clock: Clock,
    bell: Bell,
    flame: Flame,
    image: Image,
    lock: Lock,
    play: Play,
    search: Search,
    code: Code2,
    zap: Zap,
};

export function linkIcon(name: string): ComponentType<{ className?: string }> {
    return SIDEBAR_LINK_ICONS[name] ?? Link2;
}

function FiveMIcon({ className }: { className?: string }) {
    return (
        <svg viewBox={'0 0 48 48'} fill={'currentColor'} className={className} aria-hidden={'true'}>
            <polygon points={'5,45 9,34 21,22 15,45'} />
            <polygon points={'25,18 33,45 43,45 32,12'} />
            <polygon points={'16.059,14.164 20,3 28,3'} />
            <polygon points={'10.731,29.002 23,17 23,15 11.58,26.667'} />
            <polygon points={'15.142,16.429 13,22 29.724,5.725 28.818,3.178'} />
            <polygon points={'23.932,14.055 24.377,15.626 30.941,9.178 30.385,7.702'} />
        </svg>
    );
}

function RustIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox={'1.75 1.75 20.5 20.5'}
            fill={'none'}
            stroke={'currentColor'}
            strokeWidth={1.3}
            strokeLinecap={'round'}
            strokeLinejoin={'round'}
            className={className}
            aria-hidden={'true'}
        >
            <rect
                x={11.658}
                y={11.658}
                width={1.865}
                height={1.865}
                transform={'translate(-5.215 12.591) rotate(-45)'}
            />
            <rect x={13.062} y={13.999} width={3.374} height={1.5} transform={'translate(-6.109 14.749) rotate(-45)'} />
            <polygon points={'17.28,14.894 14.894,17.28 17.849,21.25 21.25,17.849'} />
            <rect x={10.904} y={8.789} width={3.374} height={1.5} transform={'translate(25.182 19.077) rotate(-180)'} />
            <polygon points={'10.904,7.647 14.278,7.647 14.996,2.75 10.186,2.75'} />
            <rect x={7.852} y={11.841} width={3.374} height={1.5} transform={'translate(22.13 3.052) rotate(90)'} />
            <polygon points={'7.647,14.278 7.647,10.904 2.75,10.186 2.75,14.996'} />
        </svg>
    );
}

function DiscordIcon({ className }: { className?: string }) {
    return (
        <svg viewBox={'0 0 24 24'} fill={'currentColor'} className={className} aria-hidden={'true'}>
            <path
                d={
                    'M19.27 5.33A16.6 16.6 0 0 0 15.16 4c-.2.36-.42.83-.58 1.2a15.3 15.3 0 0 0-4.16 0A9.6 9.6 0 0 0 9.83 4a16.5 16.5 0 0 0-4.1 1.33C3.1 9.28 2.4 13.13 2.75 16.92A16.7 16.7 0 0 0 7.8 19.5c.4-.56.77-1.15 1.08-1.78-.6-.22-1.16-.5-1.7-.82.14-.1.28-.22.42-.33a11.9 11.9 0 0 0 10.1 0c.14.12.28.23.42.33-.54.32-1.1.6-1.7.82.31.63.68 1.22 1.08 1.78a16.6 16.6 0 0 0 5.05-2.58c.42-4.4-.7-8.2-2.28-11.59ZM9.68 14.6c-1 0-1.83-.92-1.83-2.05 0-1.13.8-2.05 1.83-2.05 1.03 0 1.85.93 1.83 2.05 0 1.13-.8 2.05-1.83 2.05Zm4.64 0c-1 0-1.83-.92-1.83-2.05 0-1.13.8-2.05 1.83-2.05 1.03 0 1.85.93 1.83 2.05 0 1.13-.8 2.05-1.83 2.05Z'
                }
            />
        </svg>
    );
}

export { DiscordIcon };
