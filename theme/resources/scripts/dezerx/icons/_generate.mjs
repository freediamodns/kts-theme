import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);

const USED = fs
    .readFileSync(path.join(HERE, 'names.txt'), 'utf8')
    .trim()
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean);

const SYNONYMS = {
    search: ['magnifyingglass', 'zoomin'],
    trash: ['trashcan', 'delete', 'bin', 'deletebin'],
    x: ['close', 'cross', 'xmark'],
    at: ['atsign', 'mention'],
    loader: ['spinner', 'loading', 'circlenotch'],
    cpu: ['processor', 'chip'],
    drive: ['disk', 'harddisk'],
    plug: ['powerplug'],
    soup: ['bowlfood', 'bowl'],
    wand: ['magicwand', 'magic'],
    regex: ['code'],
    pencil: ['edit', 'pen'],
    paintbrush: ['brush', 'paintbucket'],
    palette: ['colorpalette', 'colorfilter'],
    smile: ['smiley', 'emotionhappy', 'moodsmile', 'happy'],
    mappin: ['location', 'pin'],
    globe: ['world', 'earth'],
    monitor: ['desktop', 'devicedesktop', 'computer', 'display', 'screen'],
    smartphone: ['deviceMobile', 'mobile', 'phone', 'smartphone'],
    network: ['sitemap', 'hierarchy'],
    terminal: ['console', 'commandline', 'prompt'],
    save: ['floppy', 'devicefloppy', 'floppydisk', 'diskette'],
    grid: ['gridfour', 'squaresfour', 'apps', 'layoutgrid'],
    buoy: ['lifebuoy', 'lifering', 'support', 'helpcircle', 'questionmark'],
    check: ['tick'],
    ban: ['prohibit', 'forbid', 'block', 'forbid2'],
    bell: ['notification'],
    box: ['package', 'cube'],
    boxes: ['packages', 'cubes', 'stack'],
    history: ['arrowcounterclockwise', 'timeline', 'restore', 'timer'],
    wrench: ['tool', 'tools'],
    unlock: ['lockopen', 'lockunlocked', 'lockunlock'],
    eyeoff: ['eyeclosed', 'eyeslash'],
    users: ['usergroup', 'people', 'team', 'usersgroup'],
    user: ['person', 'account'],
    mail: ['envelope', 'email'],
    share: ['sharenetwork', 'sharefoward'],
    copy: ['duplicate', 'filecopy'],
    link: ['linksimple', 'chain'],
    menu: ['hamburger', 'bars', 'listbullet'],
    info: ['information', 'infocircle'],
    alert: ['warning', 'exclamation'],
    cog: ['gear', 'settings'],
    settings: ['gear', 'cog'],
    sliders: ['equalizer', 'adjustments', 'faders', 'tune'],
    refresh: ['reload', 'arrowclockwise', 'rotate'],
    rotate: ['reload', 'refresh', 'arrowclockwise'],
    plus: ['add'],
    minus: ['subtract', 'remove'],
    image: ['picture', 'photo'],
    picture: ['image', 'photo'],
    logout: ['signout', 'exit', 'logoutbox'],
    chevron: ['caret', 'arrow'],
    chevrons: ['caretdouble', 'arrowdouble', 'arrowrightdouble'],
    grip: ['dotssix', 'draggable', 'dragdrop', 'drag'],
    message: ['chat', 'comment', 'bubble'],
    inbox: ['tray'],
    map: ['maptrifold'],
    egg: [],
    skull: [],
    crown: ['vipcrown'],
    hammer: [],
    server: ['harddrives', 'serverstack'],
};

const OVERRIDES = {
    tabler: {
        Bot: 'TbRobot',
        Gamepad2: 'TbDeviceGamepad2',
        MoreVertical: 'TbDotsVertical',
        Newspaper: 'TbNews',
        Unplug: 'TbPlugOff',
        Zap: 'TbBolt',
        Blocks: 'TbBlocks',
        Send: 'TbSend',
        HardDrive: 'TbServer2',
        MemoryStick: 'TbDeviceSdCard',
        Monitor: 'TbDeviceDesktop',
        Play: 'TbPlayerPlay',
        Save: 'TbDeviceFloppy',
        UtensilsCrossed: 'TbToolsKitchen2',
        XCircle: 'TbCircleX',
    },
    phosphor: {
        Activity: 'PiPulse',
        Blocks: 'PiPuzzlePiece',
        Bot: 'PiRobot',
        Gamepad2: 'PiGameController',
        MoreVertical: 'PiDotsThreeVertical',
        Send: 'PiPaperPlaneTilt',
        Zap: 'PiLightning',
        AlertTriangle: 'PiWarning',
        TriangleAlert: 'PiWarning',
        Ban: 'PiProhibit',
        ExternalLink: 'PiArrowSquareOut',
        Grid3x3: 'PiGridFour',
        GripHorizontal: 'PiDotsSix',
        Inbox: 'PiTray',
        Map: 'PiMapTrifold',
        RefreshCw: 'PiArrowClockwise',
        RotateCcw: 'PiArrowCounterClockwise',
        RotateCw: 'PiArrowClockwise',
        SearchX: 'PiMagnifyingGlassMinus',
        Server: 'PiHardDrives',
        ServerCog: 'PiHardDrives',
        Soup: 'PiBowlFood',
        Unplug: 'PiPlugs',
        UtensilsCrossed: 'PiForkKnife',
    },
    remix: {
        ChevronDown: 'RiArrowDownSLine',
        ChevronUp: 'RiArrowUpSLine',
        ChevronLeft: 'RiArrowLeftSLine',
        ChevronRight: 'RiArrowRightSLine',
        Activity: 'RiPulseLine',
        Blocks: 'RiPuzzleLine',
        Bot: 'RiRobot2Line',
        MemoryStick: 'RiSdCardLine',
        MoreVertical: 'RiMore2Line',
        PackageOpen: 'RiInboxUnarchiveLine',
        Send: 'RiSendPlaneLine',
        Tag: 'RiPriceTag3Line',
        Unplug: 'RiPlugLine',
        UtensilsCrossed: 'RiRestaurantLine',
        Zap: 'RiFlashlightLine',
        ChevronsRight: 'RiArrowRightDoubleLine',
        Copy: 'RiFileCopyLine',
        CreditCard: 'RiBankCardLine',
        Crown: 'RiVipCrownLine',
        GripHorizontal: 'RiDraggable',
        ListChecks: 'RiListCheck2',
        LogOut: 'RiLogoutBoxLine',
        Monitor: 'RiComputerLine',
        Power: 'RiShutDownLine',
        RotateCcw: 'RiArrowGoBackLine',
        RotateCw: 'RiArrowGoForwardLine',
        SlidersHorizontal: 'RiEqualizerLine',
        Smile: 'RiEmotionHappyLine',
        Trash2: 'RiDeleteBinLine',
        Unlock: 'RiLockUnlockLine',
        Users: 'RiTeamLine',
        XCircle: 'RiCloseCircleLine',
    },
};

function tokens(name) {
    return name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[0-9]+/g, ' ')
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter(Boolean);
}

const key = (name) => tokens(name).join('');

function variants(lucide) {
    const t = tokens(lucide);
    const out = new Set([t.join('')]);

    for (const syn of SYNONYMS[t.join('')] ?? []) out.add(key(syn));

    for (let i = 0; i < t.length; i++) {
        for (const syn of SYNONYMS[t[i]] ?? []) {
            const copy = [...t];
            copy[i] = syn;
            out.add(key(copy.join('')));
        }
    }

    if (t.length > 1) {
        out.add(t.slice(0, -1).join(''));
        out.add([...t].reverse().join(''));
    }

    return [...out];
}

const PACKS = {
    tabler: {
        label: 'Tabler',
        module: 'react-icons/tb',
        prefix: 'Tb',
        demote: /Filled$/,
    },
    phosphor: {
        label: 'Phosphor',
        module: 'react-icons/pi',
        prefix: 'Pi',
        demote: /(Bold|Fill|Duotone|Light|Thin)$/,
    },
    remix: {
        label: 'Remix',
        module: 'react-icons/ri',
        prefix: 'Ri',
        promote: /Line$/,
        demote: /Fill$/,
        strip: /(Line|Fill)$/,
    },
};

const report = [];

for (const [id, spec] of Object.entries(PACKS)) {
    const mod = await import(spec.module);
    const exported = new Set(Object.keys(mod));

    const index = new Map();

    for (const name of exported) {
        if (!name.startsWith(spec.prefix)) continue;

        let bare = name.slice(spec.prefix.length);
        if (spec.strip) bare = bare.replace(spec.strip, '');

        const score =
            (spec.promote && spec.promote.test(name) ? 2 : 0) + (spec.demote && spec.demote.test(name) ? -1 : 1);

        const current = index.get(key(bare));
        if (!current || score > current.score) index.set(key(bare), { name, score });
    }

    const map = {};
    const missing = [];

    for (const lucide of USED) {
        const override = OVERRIDES[id]?.[lucide];

        if (override) {
            if (!exported.has(override)) throw new Error(`${id}: override ${override} does not exist`);
            map[lucide] = override;
            continue;
        }

        const hit = variants(lucide).find((v) => index.has(v));

        if (hit) map[lucide] = index.get(hit).name;
        else missing.push(lucide);
    }

    const names = Object.values(map);
    const lines = [
        `/* Generated by _generate.mjs — do not edit by hand. */`,
        `import type { ComponentType } from 'react';`,
        `import {`,
        ...[...new Set(names)].sort().map((n) => `    ${n},`),
        `} from '${spec.module}';`,
        ``,
        `/** ${Object.keys(map).length} of ${USED.length} mapped; the rest fall back to lucide. */`,
        `const GLYPHS: Record<string, ComponentType<Record<string, unknown>>> = {`,
        ...Object.entries(map).map(([lucide, name]) => `    ${lucide}: ${name} as ComponentType<Record<string, unknown>>,`),
        `};`,
        ``,
        `export default GLYPHS;`,
        ``,
    ];

    fs.writeFileSync(path.join(HERE, 'families', `${id}.ts`), lines.join('\n'));
    report.push([spec.label, Object.keys(map).length, missing]);
}


const huge = await import('@hugeicons/core-free-icons');
const hugeNames = Object.keys(huge).filter((n) => n.endsWith('Icon') && !n.endsWith('FreeIcons'));

const hugeIndex = new Map();

for (const name of hugeNames) {
    const bare = name.replace(/Icon$/, '');
    const k = key(bare);
    const current = hugeIndex.get(k);
    if (!current || name.length < current.length) hugeIndex.set(k, name);
}

const HUGE_OVERRIDES = {
    Blocks: 'PuzzleIcon',
    Gamepad2: 'GameController01Icon',
    Newspaper: 'News01Icon',
    Scissors: 'Scissor01Icon',
    Send: 'Mail01Icon',
    Server: 'ServerStack01Icon',
    MemoryStick: 'ComputerIcon',
    UtensilsCrossed: 'Restaurant01Icon',
    Loader2: 'Loading03Icon',
    XCircle: 'CancelCircleIcon',
    X: 'Cancel01Icon',
    Trash2: 'Delete02Icon',
    SearchX: 'SearchRemoveIcon',
    GripHorizontal: 'DragDropIcon',
    Grid3x3: 'GridIcon',
    LayoutGrid: 'DashboardSquare01Icon',
    Ban: 'UnavailableIcon',
    Boxes: 'Package01Icon',
    CheckCircle2: 'CheckmarkCircle01Icon',
    ChevronsRight: 'ArrowRight01Icon',
    Egg: 'EggsIcon',
    ExternalLink: 'LinkSquare01Icon',
    Hammer: 'LegalHammerIcon',
    Heart: 'FavouriteIcon',
    Info: 'InformationCircleIcon',
    ListChecks: 'CheckListIcon',
    Map: 'MapsIcon',
    Palette: 'ColorsIcon',
    PictureInPicture2: 'PictureInPictureOnIcon',
    Power: 'ShutDownIcon',
    ServerCog: 'CpuSettingsIcon',
    Soup: 'RiceBowl01Icon',
    Unlock: 'SquareUnlock01Icon',
    Unplug: 'PlugSocketIcon',
};

const hugeMap = {};
const hugeMissing = [];

for (const lucide of USED) {
    const override = HUGE_OVERRIDES[lucide];

    if (override && hugeNames.includes(override)) {
        hugeMap[lucide] = override;
        continue;
    }

    const hit = variants(lucide).find((v) => hugeIndex.has(v));

    if (hit) hugeMap[lucide] = hugeIndex.get(hit);
    else hugeMissing.push(lucide);
}

const hugeLines = [
    `/* Generated by _generate.mjs — do not edit by hand. */`,
    `import React, { ComponentType, forwardRef } from 'react';`,
    `import { HugeiconsIcon } from '@hugeicons/react';`,
    `import {`,
    ...[...new Set(Object.values(hugeMap))].sort().map((n) => `    ${n},`),
    `} from '@hugeicons/core-free-icons';`,
    ``,
    `/*`,
    ` * HugeIcons ships data rather than components — one array of SVG children`,
    ` * per icon, rendered by \`HugeiconsIcon\`. So each name here is bound to its`,
    ` * data once, and the result takes the same props a lucide icon does.`,
    ` */`,
    `function bind(icon: Parameters<typeof HugeiconsIcon>[0]['icon']) {`,
    `    return forwardRef<SVGSVGElement, Record<string, unknown>>(function Huge(props, ref) {`,
    `        return <HugeiconsIcon ref={ref} icon={icon} {...(props as object)} />;`,
    `    }) as unknown as ComponentType<Record<string, unknown>>;`,
    `}`,
    ``,
    `/** ${Object.keys(hugeMap).length} of ${USED.length} mapped; the rest fall back to lucide. */`,
    `const GLYPHS: Record<string, ComponentType<Record<string, unknown>>> = {`,
    ...Object.entries(hugeMap).map(([lucide, name]) => `    ${lucide}: bind(${name}),`),
    `};`,
    ``,
    `export default GLYPHS;`,
    ``,
];

fs.writeFileSync(path.join(HERE, 'families', 'hugeicons.tsx'), hugeLines.join('\n'));
report.push(['HugeIcons', Object.keys(hugeMap).length, hugeMissing]);


const shim = [
    `/* Generated by _generate.mjs — do not edit by hand. */`,
    `import type { ComponentType } from 'react';`,
    `import {`,
    ...USED.map((n) => `    ${n} as Lucide${n},`),
    `} from 'lucide-react/dist/esm/lucide-react.js';`,
    `import { themed } from './runtime';`,
    ``,
    `export { IconSetProvider, loadIconSet, useIconSet, STROKE_SETS } from './runtime';`,
    `export type { Glyphs } from './runtime';`,
    ``,
    `/** What two files use to hold an icon in a record. */`,
    `export type LucideIcon = ComponentType<Record<string, unknown>>;`,
    `export type LucideProps = Record<string, unknown>;`,
    ``,
    ...USED.map((n) => `export const ${n} = themed('${n}', Lucide${n} as never);`),
    ``,
];

fs.writeFileSync(path.join(HERE, 'index.tsx'), shim.join('\n'));

console.log('');
for (const [label, hit, missing] of report) {
    const pct = Math.round((hit / USED.length) * 100);
    console.log(`${label.padEnd(11)} ${String(hit).padStart(3)}/${USED.length}  ${String(pct).padStart(3)}%`);
    if (missing.length) console.log(`            lucide fallback: ${missing.join(' ')}`);
}
console.log('');
