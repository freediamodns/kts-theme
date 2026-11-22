import React, { CSSProperties, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ImagePlus, RotateCcw, Smile, Wand2 } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { useT, type TranslateFn } from '@/i18n';

export const MOTD_COLOURS: Record<string, { hex: string; key: string }> = {
    '0': { hex: '#000000', key: 'motd.colour.black' },
    '1': { hex: '#0000AA', key: 'motd.colour.darkBlue' },
    '2': { hex: '#00AA00', key: 'motd.colour.darkGreen' },
    '3': { hex: '#00AAAA', key: 'motd.colour.darkAqua' },
    '4': { hex: '#AA0000', key: 'motd.colour.darkRed' },
    '5': { hex: '#AA00AA', key: 'motd.colour.darkPurple' },
    '6': { hex: '#FFAA00', key: 'motd.colour.gold' },
    '7': { hex: '#AAAAAA', key: 'motd.colour.grey' },
    '8': { hex: '#555555', key: 'motd.colour.darkGrey' },
    '9': { hex: '#5555FF', key: 'motd.colour.blue' },
    a: { hex: '#55FF55', key: 'motd.colour.green' },
    b: { hex: '#55FFFF', key: 'motd.colour.aqua' },
    c: { hex: '#FF5555', key: 'motd.colour.red' },
    d: { hex: '#FF55FF', key: 'motd.colour.lightPurple' },
    e: { hex: '#FFFF55', key: 'motd.colour.yellow' },
    f: { hex: '#FFFFFF', key: 'motd.colour.white' },
};

const STYLES: { code: Style; key: string; className: string }[] = [
    { code: 'l', key: 'motd.style.bold', className: 'font-bold' },
    { code: 'm', key: 'motd.style.strikethrough', className: 'line-through' },
    { code: 'n', key: 'motd.style.underline', className: 'underline' },
    { code: 'o', key: 'motd.style.italic', className: 'italic' },
    { code: 'k', key: 'motd.style.obfuscated', className: '' },
];

const alignLabel = (t: TranslateFn, how: 'left' | 'center' | 'right'): string => t(`motd.align.${how}`);

const PRESETS: { id: string; value: string }[] = [
    {
        id: 'welcome',
        value: '§b§lMY SERVER §r§7» §fsurvival · skyblock · events\n§7Now on §a1.21§7 — everyone welcome!',
    },
    {
        id: 'network',
        value: '§8§l«§r §6§lNETWORK §8§l»§r §7play.example.com\n§eSurvival §8| §aSkyblock §8| §bCreative §8| §dMinigames',
    },
    { id: 'event', value: '§d§l✦ WEEKEND EVENT ✦\n§f2× XP and §e2× drops §funtil Sunday' },
    { id: 'season', value: '§a§lSEASON 4 §8• §fnow live\n§7New world, new shops, new claims' },
    { id: 'whitelist', value: '§c§lWHITELIST ONLY\n§7Apply on our Discord to get access' },
    { id: 'maintenance', value: '§6§l⚠ MAINTENANCE\n§7Back shortly — thanks for your patience' },
    { id: 'minimal', value: '§fA Minecraft Server\n§8example.com' },
    { id: 'rainbow', value: '§c§lM§6§lY §e§lS§a§lE§b§lR§9§lV§d§lE§5§lR\n§7A little colour goes a long way' },
];

const SYMBOLS = ['★', '☆', '✦', '✔', '✖', '❤', '⚡', '➤', '»', '«', '▶', '◆', '●', '■', '▬', '⬛', '☠', '⚔', '☺', '☻'];

const GLYPHS: Record<string, number> = {
    ' ': 4,
    '!': 2,
    '"': 5,
    "'": 3,
    '(': 5,
    ')': 5,
    '*': 5,
    ',': 2,
    '.': 2,
    ':': 2,
    ';': 2,
    '<': 5,
    '>': 5,
    '@': 7,
    I: 4,
    '[': 4,
    ']': 4,
    '`': 3,
    f: 5,
    i: 2,
    k: 5,
    l: 3,
    t: 4,
    '{': 5,
    '|': 2,
    '}': 5,
    '~': 7,
};

const GLYPH_WIDTH = 6;

const SPACE_WIDTH = 4;

const LINE_PIXELS = 270;

const DEFAULT_COLOUR = '#7e7e7e';

const DEFAULT = 'default';

const NO_ICON = '/dezerx/mc/img/packpng.webp';

type Style = 'l' | 'm' | 'n' | 'o' | 'k';

interface Run {
    text: string;
    colour: string;
    styles: Style[];
}

export function MotdEditor({
    value,
    onChange,
    address,
    icon,
    onRename,
    onIcon,
    onIconRemove,
    busy,
}: {
    value: string;
    onChange: (value: string) => void;
    address?: string;
    icon?: string | null;
    onRename?: (name: string) => void;
    onIcon?: (file: File) => void;
    onIconRemove?: () => void;
    busy?: boolean;
}) {
    const t = useT();
    const picker = useRef<HTMLInputElement>(null);
    const [name, setName] = useState(address ?? '');
    const [seenName, setSeenName] = useState(address ?? '');

    if (seenName !== (address ?? '')) {
        setSeenName(address ?? '');
        setName(address ?? '');
    }
    const editor = useRef<HTMLDivElement>(null);
    const painted = useRef<string | null>(null);
    const caret = useRef<number | null>(null);
    const [symbols, setSymbols] = useState(false);
    const [presets, setPresets] = useState(false);
    const [editing, setEditing] = useState(false);

    useLayoutEffect(() => {
        const element = editor.current;

        if (!element || painted.current === value) {
            return;
        }

        paint(element, parse(value));
        painted.current = value;

        if (caret.current !== null) {
            placeCaret(element, caret.current);
            caret.current = null;
        }
    }, [value]);

    useEffect(() => {
        const element = editor.current;

        if (!element) {
            return;
        }

        if (editing) {
            restoreObfuscated(element);

            return;
        }

        const timer = window.setInterval(() => scrambleObfuscated(element), 80);

        return () => {
            window.clearInterval(timer);
            restoreObfuscated(element);
        };
    }, [editing, value]);

    const push = (next: string, at: number | null) => {
        caret.current = at;
        onChange(next);
    };

    const read = () => {
        const element = editor.current;

        if (!element) {
            return;
        }

        const next = serialise(fromDom(element));

        painted.current = next;
        onChange(next);
    };

    const apply = (code: string) => {
        const element = editor.current;
        const runs = parse(value);
        const [start, end] = element ? selectionRange(element) : [0, 0];
        const to = start === end ? plainText(runs).length : end;

        push(serialise(format(runs, start, to, code)), start === end ? start : end);
    };

    const insert = (text: string) => {
        const element = editor.current;
        const runs = parse(value);
        const [start, end] = element ? selectionRange(element) : [0, 0];
        const plain = plainText(runs);

        push(serialise(retext(runs, plain.slice(0, start) + text + plain.slice(end))), start + text.length);
        setSymbols(false);
    };

    const preset = (next: string) => {
        push(next, null);
        setPresets(false);
    };

    const align = (how: 'left' | 'center' | 'right') => {
        const lines = toLines(parse(value)).map((line) => {
            const bare = trimLine(line);

            if (how === 'left' || bare.length === 0) {
                return bare;
            }

            const room = Math.max(0, LINE_PIXELS - lineWidth(bare));
            const spaces = Math.round((how === 'right' ? room : room / 2) / SPACE_WIDTH);

            if (spaces <= 0) {
                return bare;
            }

            return [{ text: ' '.repeat(spaces), colour: bare[0]!.colour, styles: [] as Style[] }, ...bare];
        });

        push(serialise(fromLines(lines)), null);
    };

    return (
        <div className='space-y-1 '>
            <div className="flex items-start gap-3 rounded-[3px] bg-[#2a2320] bg-[image:linear-gradient(rgba(0,0,0,0.68),rgba(0,0,0,0.68)),url('/dezerx/mc/img/motd-bg.webp')] bg-[length:auto,cover] bg-center p-3">
                <div className='shrink-0'>
                    <button
                        type='button'
                        disabled={!onIcon || busy}
                        onClick={() => picker.current?.click()}
                        title={onIcon ? t('motd.chooseIcon') : undefined}
                        className='group relative block h-16 w-16 overflow-hidden rounded-[2px] ring-1 ring-black/50 disabled:cursor-default'
                    >
                        <img
                            src={icon || NO_ICON}
                            alt=''
                            onError={(event) => {
                                event.currentTarget.src = NO_ICON;
                            }}
                            className='h-16 w-16 bg-[#1d1a18] [image-rendering:pixelated]'
                        />

                        {onIcon && (
                            <span className='absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100'>
                                <ImagePlus aria-hidden='true' className='h-5 w-5 text-white' />
                            </span>
                        )}
                    </button>

                    <input
                        ref={picker}
                        type='file'
                        accept='image/png,image/jpeg,image/webp,image/gif'
                        className='hidden'
                        onChange={(event) => {
                            const file = event.target.files?.[0];

                            if (file) {
                                onIcon?.(file);
                            }

                            event.target.value = '';
                        }}
                    />

                    {icon && onIconRemove && (
                        <button
                            type='button'
                            disabled={busy}
                            onClick={onIconRemove}
                            className='mt-1 w-16 truncate text-[10px] text-ink-faint transition-colors hover:text-danger disabled:opacity-50'
                        >
                            {t('common.remove')}
                        </button>
                    )}
                </div>

                <div className='min-w-0 flex-1'>
                    {onRename ? (
                        <input
                            value={name}
                            disabled={busy}
                            onChange={(event) => setName(event.target.value)}
                            onBlur={() => {
                                const next = name.trim();

                                if (next !== '' && next !== address) {
                                    onRename(next);
                                } else if (next === '') {
                                    setName(address ?? '');
                                }
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.currentTarget.blur();
                                }
                            }}
                            aria-label={t('motd.serverName')}
                            spellCheck={false}
                            className='w-full truncate border-0 bg-transparent p-0 font-minecraft text-sm text-white [text-shadow:2px_2px_0_rgba(0,0,0,0.55)] focus:outline-none focus:ring-0'
                        />
                    ) : (
                        <p className='truncate font-minecraft text-sm text-white [text-shadow:2px_2px_0_rgba(0,0,0,0.55)]'>
                            {address || t('motd.defaultServerName')}
                        </p>
                    )}

                    <div
                        ref={editor}
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck={false}
                        role='textbox'
                        aria-multiline='true'
                        aria-label={t('properties.motd.title')}
                        onInput={read}
                        onFocus={() => setEditing(true)}
                        onBlur={() => setEditing(false)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && (event.currentTarget.textContent ?? '').includes('\n')) {
                                event.preventDefault();
                            }
                        }}
                        onPaste={(event) => {
                            event.preventDefault();
                            insert(event.clipboardData.getData('text/plain').replace(/\r/g, ''));
                        }}
                        className='mt-0.5 min-h-[2.75rem] whitespace-pre-wrap break-words font-minecraft text-sm leading-[1.45] text-[#5d7e7e] [text-shadow:2px_2px_0_rgba(0,0,0,0.55)] focus:outline-none'
                    />
                </div>
            </div>

            <div className='flex flex-wrap items-center gap-1'>
                <Key label='§' title={t('motd.insertSection')} onClick={() => insert('§')} />

                <div className='relative'>
                    <Key
                        label={<Wand2 className='h-3.5 w-3.5' aria-hidden='true' />}
                        title={t('motd.presets')}
                        onClick={() => setPresets((open) => !open)}
                    />

                    {presets && (
                        <div className='absolute bottom-full left-0 z-10 mb-1 w-64 space-y-0.5 rounded-[3px] bg-[#2f2f2f] p-1.5 shadow-panel'>
                            {PRESETS.map((entry) => (
                                <button
                                    key={entry.id}
                                    type='button'
                                    onClick={() => preset(entry.value)}
                                    className='block w-full rounded-[2px] px-2 py-1 text-left transition-colors hover:bg-[#4a4a4a]'
                                >
                                    <span className='block text-[11px] font-medium text-[#dcdcdc]'>
                                        {t(`motd.preset.${entry.id}`)}
                                    </span>
                                    <span className='mt-0.5 block truncate font-minecraft text-[10px] text-[#8f8f8f]'>
                                        {entry.value.replace(/§./g, '').replace(/\n/g, ' · ')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className='relative'>
                    <Key
                        label={<Smile className='h-3.5 w-3.5' aria-hidden='true' />}
                        title={t('motd.symbols')}
                        onClick={() => setSymbols((open) => !open)}
                    />

                    {symbols && (
                        <div className='absolute bottom-full left-0 z-10 mb-1 grid w-56 grid-cols-10 gap-1 rounded-[3px] bg-[#2f2f2f] p-1.5 shadow-panel'>
                            {SYMBOLS.map((symbol) => (
                                <button
                                    key={symbol}
                                    type='button'
                                    onClick={() => insert(symbol)}
                                    className='h-5 rounded-[2px] text-xs text-[#dcdcdc] transition-colors hover:bg-[#4a4a4a]'
                                >
                                    {symbol}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {Object.entries(MOTD_COLOURS).map(([code, colour]) => (
                    <Key
                        key={code}
                        label={code}
                        title={`${t(colour.key)} (§${code})`}
                        style={{ color: colour.hex }}
                        onClick={() => apply(code)}
                    />
                ))}

                {STYLES.map((style) => (
                    <Key
                        key={style.code}
                        label={style.code}
                        title={`${t(style.key)} (§${style.code})`}
                        className={style.className}
                        onClick={() => apply(style.code)}
                    />
                ))}

                <Key
                    label={<RotateCcw className='h-3 w-3' aria-hidden='true' />}
                    title={t('motd.resetFormatting')}
                    onClick={() => apply('r')}
                />

                <span className='mx-1 h-5 w-px bg-[#3f3f3f]' aria-hidden='true' />

                {(['left', 'center', 'right'] as const).map((how) => (
                    <Key
                        key={how}
                        title={alignLabel(t, how)}
                        onClick={() => align(how)}
                        label={
                            <span aria-hidden='true' className='flex h-3 w-3.5 flex-col justify-between'>
                                {[0, 1, 2].map((row) => (
                                    <span
                                        key={row}
                                        className={cn(
                                            'block h-[2px] bg-current',
                                            row % 2 === 0
                                                ? 'w-full'
                                                : how === 'left'
                                                ? 'w-2/3 self-start'
                                                : how === 'right'
                                                ? 'w-2/3 self-end'
                                                : 'w-2/3 self-center'
                                        )}
                                    />
                                ))}
                            </span>
                        }
                    />
                ))}
            </div>
        </div>
    );
}

function Key({
    label,
    title,
    onClick,
    className,
    style,
}: {
    label?: ReactNode;
    title: string;
    onClick: () => void;
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            title={title}
            aria-label={title}
            style={style}
            className={cn(
                'flex h-7 w-7 items-center justify-center rounded-[3px] bg-[#3f3f3f]',
                'font-minecraft text-xs text-[#dcdcdc] transition-colors hover:bg-[#565656]',
                className
            )}
        >
            {label}
        </button>
    );
}

function paint(element: HTMLElement, runs: Run[]): void {
    element.replaceChildren();

    for (const run of runs) {
        run.text.split('\n').forEach((line, part) => {
            if (part > 0) {
                element.append(document.createElement('br'));
            }

            if (line === '') {
                return;
            }

            const span = document.createElement('span');

            span.dataset.c = run.colour;
            span.dataset.s = run.styles.join('');
            span.style.color = MOTD_COLOURS[run.colour]?.hex ?? DEFAULT_COLOUR;
            span.style.fontWeight = run.styles.includes('l') ? '700' : '';
            span.style.fontStyle = run.styles.includes('o') ? 'italic' : '';
            span.style.textDecoration = [
                run.styles.includes('n') ? 'underline' : '',
                run.styles.includes('m') ? 'line-through' : '',
            ]
                .filter(Boolean)
                .join(' ');

            if (run.styles.includes('k')) {
                span.dataset.text = line;
            }

            span.textContent = line;
            element.append(span);
        });
    }
}

function scrambleObfuscated(element: HTMLElement): void {
    element.querySelectorAll<HTMLElement>('[data-text]').forEach((span) => {
        span.textContent = Array.from(span.dataset.text ?? '')
            .map((character) => (character === ' ' ? ' ' : String.fromCharCode(33 + Math.floor(Math.random() * 94))))
            .join('');
    });
}

function restoreObfuscated(element: HTMLElement): void {
    element.querySelectorAll<HTMLElement>('[data-text]').forEach((span) => {
        span.textContent = span.dataset.text ?? '';
    });
}

function fromDom(element: HTMLElement): Run[] {
    const runs: Run[] = [];

    const walk = (node: Node, colour: string, styles: Style[], root = false) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const previous = root ? runs[runs.length - 1] : undefined;

            runs.push({
                text: node.textContent ?? '',
                colour: previous?.colour ?? colour,
                styles: previous?.styles ?? styles,
            });

            return;
        }

        if (!(node instanceof HTMLElement)) {
            return;
        }

        if (node.tagName === 'BR') {
            runs.push({ text: '\n', colour, styles });

            return;
        }

        const own = node.dataset.c ?? colour;
        const ownStyles = (node.dataset.s ?? styles.join('')).split('') as Style[];

        if (node.dataset.text !== undefined) {
            runs.push({
                text: node.dataset.text,
                colour: own,
                styles: ownStyles,
            });

            return;
        }

        node.childNodes.forEach((child) => walk(child, own, ownStyles));
    };

    element.childNodes.forEach((node) => walk(node, DEFAULT, [], true));

    return merge(runs);
}

export function parse(value: string): Run[] {
    const runs: Run[] = [];
    let colour = DEFAULT;
    let styles: Style[] = [];
    let text = '';

    const flush = () => {
        if (text !== '') {
            runs.push({ text, colour, styles: [...styles] });
            text = '';
        }
    };

    for (let index = 0; index < value.length; index++) {
        const character = value[index] ?? '';

        if (character !== '§' || index === value.length - 1) {
            text += character;

            continue;
        }

        const code = (value[++index] ?? '').toLowerCase();

        flush();

        if (code in MOTD_COLOURS) {
            colour = code;
            styles = [];
        } else if (code === 'r') {
            colour = DEFAULT;
            styles = [];
        } else if ('lmnok'.includes(code)) {
            styles = [...new Set([...styles, code as Style])];
        }
    }

    flush();

    return runs;
}

export function serialise(runs: Run[]): string {
    let colour = DEFAULT;
    let styles: Style[] = [];
    let out = '';

    for (const run of merge(runs)) {
        const dropped = styles.some((style) => !run.styles.includes(style));

        if (run.colour !== colour || dropped) {
            out += run.colour === DEFAULT ? '§r' : `§${run.colour}`;
            colour = run.colour;
            styles = [];
        }

        for (const style of run.styles) {
            if (!styles.includes(style)) {
                out += `§${style}`;
                styles = [...styles, style];
            }
        }

        out += run.text;
    }

    return out;
}

function format(runs: Run[], start: number, end: number, code: string): Run[] {
    const out: Run[] = [];
    let at = 0;

    for (const run of runs) {
        for (const character of run.text) {
            const inside = at >= start && at < end;
            let colour = run.colour;
            let styles = run.styles;

            if (inside) {
                if (code in MOTD_COLOURS) {
                    colour = code;
                    styles = [];
                } else if (code === 'r') {
                    colour = DEFAULT;
                    styles = [];
                } else {
                    styles = styles.includes(code as Style)
                        ? styles.filter((style) => style !== code)
                        : [...styles, code as Style];
                }
            }

            out.push({ text: character, colour, styles });
            at++;
        }
    }

    return merge(out);
}

function retext(runs: Run[], text: string): Run[] {
    const out: Run[] = [];
    const flat: Run[] = [];

    for (const run of runs) {
        for (const character of run.text) {
            flat.push({
                text: character,
                colour: run.colour,
                styles: run.styles,
            });
        }
    }

    for (let index = 0; index < text.length; index++) {
        const previous = flat[Math.min(index, flat.length - 1)];

        out.push({
            text: text[index] ?? '',
            colour: previous?.colour ?? DEFAULT,
            styles: previous?.styles ?? [],
        });
    }

    return merge(out);
}

function merge(runs: Run[]): Run[] {
    const out: Run[] = [];

    for (const run of runs) {
        if (run.text === '') {
            continue;
        }

        const last = out[out.length - 1];

        if (last && last.colour === run.colour && last.styles.join('') === run.styles.join('')) {
            last.text += run.text;

            continue;
        }

        out.push({ ...run, styles: [...run.styles] });
    }

    return out;
}

function runWidth(run: Run): number {
    const bold = run.styles.includes('l') ? 1 : 0;
    let total = 0;

    for (const character of run.text) {
        total += (GLYPHS[character] ?? GLYPH_WIDTH) + bold;
    }

    return total;
}

function lineWidth(line: Run[]): number {
    return line.reduce((total, run) => total + runWidth(run), 0);
}

function toLines(runs: Run[]): Run[][] {
    const lines: Run[][] = [[]];

    for (const run of runs) {
        run.text.split('\n').forEach((part, index) => {
            if (index > 0) {
                lines.push([]);
            }

            if (part !== '') {
                lines[lines.length - 1]!.push({ text: part, colour: run.colour, styles: [...run.styles] });
            }
        });
    }

    return lines;
}

function fromLines(lines: Run[][]): Run[] {
    const out: Run[] = [];

    lines.forEach((line, index) => {
        if (index > 0) {
            const previous = out[out.length - 1];

            out.push({ text: '\n', colour: previous?.colour ?? DEFAULT, styles: previous?.styles ?? [] });
        }

        out.push(...line);
    });

    return merge(out);
}

function trimLine(line: Run[]): Run[] {
    const out = line.map((run) => ({ text: run.text, colour: run.colour, styles: [...run.styles] }));

    while (out.length > 0) {
        out[0]!.text = out[0]!.text.replace(/^ +/, '');

        if (out[0]!.text !== '') {
            break;
        }

        out.shift();
    }

    while (out.length > 0) {
        const last = out[out.length - 1]!;
        last.text = last.text.replace(/ +$/, '');

        if (last.text !== '') {
            break;
        }

        out.pop();
    }

    return out;
}

function plainText(runs: Run[]): string {
    return runs.map((run) => run.text).join('');
}

function selectionRange(element: HTMLElement): [number, number] {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
        return [0, 0];
    }

    const range = selection.getRangeAt(0);

    if (!element.contains(range.startContainer)) {
        return [0, 0];
    }

    const offset = (node: Node, within: number) => {
        const measure = document.createRange();
        measure.selectNodeContents(element);
        measure.setEnd(node, within);

        return length(measure.cloneContents());
    };

    return [offset(range.startContainer, range.startOffset), offset(range.endContainer, range.endOffset)];
}

function length(fragment: DocumentFragment): number {
    let total = 0;

    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            total += (node.textContent ?? '').length;

            return;
        }

        if (node instanceof HTMLElement && node.tagName === 'BR') {
            total += 1;

            return;
        }

        node.childNodes.forEach(walk);
    };

    fragment.childNodes.forEach(walk);

    return total;
}

function placeCaret(element: HTMLElement, offset: number): void {
    const selection = window.getSelection();

    if (!selection) {
        return;
    }

    let remaining = offset;

    const found: { node: Node; offset: number }[] = [];

    const walk = (node: Node) => {
        if (found.length > 0) {
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            const size = (node.textContent ?? '').length;

            if (remaining <= size) {
                found.push({ node, offset: remaining });

                return;
            }

            remaining -= size;

            return;
        }

        if (node instanceof HTMLElement && node.tagName === 'BR') {
            if (remaining === 0) {
                found.push({ node: node.parentNode ?? element, offset: 0 });

                return;
            }

            remaining -= 1;

            return;
        }

        node.childNodes.forEach(walk);
    };

    element.childNodes.forEach(walk);

    const range = document.createRange();
    const target = found[0];

    if (target) {
        range.setStart(target.node, target.offset);
    } else {
        range.selectNodeContents(element);
        range.collapse(false);
    }

    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}
