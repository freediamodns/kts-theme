import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Ban,
    Check,
    ChevronDown,
    Eye,
    EyeOff,
    Palette as PaletteIcon,
    RotateCcw,
    Square,
    Trash2,
    Wand2,
    X,
} from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import {
    DECLARATION_LIMIT,
    SELECTOR_LIMIT,
    cleanCssDeclarations,
    cleanCssSelector,
    cssDeclarationList,
    type CssRule,
} from '@/dezerx/lib/panelTheme';
import { Checkbox, Select } from '@/dezerx/components/ui';
import { AddRow, Field, INPUT } from '@/dezerx/components/editor/Controls';
import { CssBox } from '@/dezerx/components/editor/CssBox';

const SAFE_CLASS = /^[A-Za-z0-9_-]+$/;

const SAFE_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;

const SKIP = '.dz-chrome, .dz-pick, [data-headlessui-portal]';

const MAX_HIGHLIGHTS = 40;

interface Scope {
    id: string;
    label: string;
    selector: string;
    matches: number;
}

function safeClasses(element: Element): string[] {
    return Array.from(element.classList).filter((one) => SAFE_CLASS.test(one));
}

function classSelector(element: Element, limit = 6): string | null {
    const classes = safeClasses(element).slice(0, limit);

    return classes.length === 0 ? null : `.${classes.join('.')}`;
}

function tagSelector(element: Element): string | null {
    const tag = element.tagName.toLowerCase();

    return SAFE_NAME.test(tag) && tag !== 'html' && tag !== 'body' ? tag : null;
}

function ownSelector(element: Element): string | null {
    if (element.id !== '' && SAFE_NAME.test(element.id)) {
        return `#${element.id}`;
    }

    return classSelector(element) ?? tagSelector(element);
}

function countMatches(selector: string): number {
    try {
        return document.querySelectorAll(selector).length;
    } catch {
        return 0;
    }
}

function describe(element: Element): string {
    const classes = safeClasses(element).slice(0, 3).join(' ');
    const tag = element.tagName.toLowerCase();

    return classes === '' ? tag : `${tag} ${classes}`;
}

function uniquePath(element: Element): string | null {
    const steps: string[] = [];

    let current: Element | null = element;

    for (let depth = 0; depth < 12; depth += 1) {
        if (current === null) {
            return null;
        }

        const own = ownSelector(current);

        if (own !== null && countMatches(own) === 1) {
            return [own, ...steps].join(' > ');
        }

        const parent: Element | null = current.parentElement;

        if (parent === null || parent.closest(SKIP) !== null) {
            return null;
        }

        steps.unshift(`:nth-child(${Array.from(parent.children).indexOf(current) + 1})`);
        current = parent;
    }

    return null;
}

function scopesFor(element: Element): Scope[] {
    const out: Scope[] = [];
    const seen = new Set<string>();

    const add = (id: string, label: string, raw: string | null, only = false) => {
        if (raw === null) {
            return;
        }

        const selector = cleanCssSelector(raw);

        if (selector === null || seen.has(selector)) {
            return;
        }

        const matches = countMatches(selector);

        if (matches === 0 || (only && matches !== 1)) {
            return;
        }

        seen.add(selector);
        out.push({ id, label, selector, matches });
    };

    const own = ownSelector(element);
    const parent = element.parentElement;
    const parentOwn = parent === null || parent.closest(SKIP) !== null ? null : ownSelector(parent);
    const grandparent = parent?.parentElement ?? null;
    const grandOwn = grandparent === null || grandparent.closest(SKIP) !== null ? null : ownSelector(grandparent);

    add('like', 'Every element like this', own);
    add('one', 'Only the one I pointed at', uniquePath(element), true);

    if (own !== null && parentOwn !== null) {
        add('within', 'Every one inside the same box', `${parentOwn} ${own}`);
    }

    if (own !== null && grandOwn !== null) {
        add('section', 'Every one inside this section', `${grandOwn} ${own}`);
    }

    add('box', 'The box around it', parentOwn);
    add('outer', 'The box around that', grandOwn);

    return out;
}

function touchesTerminal(selector: string): boolean {
    const terminal = document.querySelector('.xterm');

    if (terminal === null) {
        return false;
    }

    try {
        return Array.from(document.querySelectorAll(selector)).some(
            (one) => one === terminal || one.contains(terminal)
        );
    } catch {
        return false;
    }
}

function rectsFor(selector: string): DOMRect[] {
    try {
        return Array.from(document.querySelectorAll(selector))
            .slice(0, MAX_HIGHLIGHTS)
            .map((one) => one.getBoundingClientRect())
            .filter((rect) => rect.width > 0 && rect.height > 0);
    } catch {
        return [];
    }
}

function Highlights({ rects, tone }: { rects: DOMRect[]; tone: 'accent' | 'warning' }) {
    return (
        <>
            {rects.map((rect, index) => (
                <span
                    key={index}
                    className={cn(
                        'pointer-events-none fixed block rounded-md border-2',
                        tone === 'accent' ? 'border-accent bg-accent/15' : 'border-warning bg-warning/10'
                    )}
                    style={{
                        left: `${rect.left}px`,
                        top: `${rect.top}px`,
                        width: `${rect.width}px`,
                        height: `${rect.height}px`,
                    }}
                />
            ))}
        </>
    );
}

function ElementPicker({ onPick, onCancel }: { onPick: (element: Element) => void; onCancel: () => void }) {
    const [hovered, setHovered] = useState<{ rect: DOMRect; label: string } | null>(null);

    const pick = useRef(onPick);
    const cancel = useRef(onCancel);

    pick.current = onPick;
    cancel.current = onCancel;

    useEffect(() => {
        const body = document.body;
        const cursor = body.style.cursor;

        body.style.cursor = 'crosshair';

        let frame = 0;

        const reachable = (event: Event): Element | null => {
            const element = event.target instanceof Element ? event.target : null;

            return element === null || element.closest(SKIP) !== null ? null : element;
        };

        const onMove = (event: MouseEvent) => {
            if (frame !== 0) {
                return;
            }

            frame = window.requestAnimationFrame(() => {
                frame = 0;

                const element = reachable(event);

                setHovered(
                    element === null ? null : { rect: element.getBoundingClientRect(), label: describe(element) }
                );
            });
        };

        const swallow = (event: MouseEvent) => {
            if (reachable(event) === null) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
        };

        const onClick = (event: MouseEvent) => {
            const element = reachable(event);

            if (element === null) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            window.setTimeout(() => pick.current(element), 0);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                window.setTimeout(() => cancel.current(), 0);
            }
        };

        const options = { capture: true } as const;

        window.addEventListener('mousemove', onMove, options);
        window.addEventListener('mousedown', swallow, options);
        window.addEventListener('pointerdown', swallow, options);
        window.addEventListener('mouseup', swallow, options);
        window.addEventListener('click', onClick, options);
        window.addEventListener('keydown', onKeyDown, options);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('mousemove', onMove, options);
            window.removeEventListener('mousedown', swallow, options);
            window.removeEventListener('pointerdown', swallow, options);
            window.removeEventListener('mouseup', swallow, options);
            window.removeEventListener('click', onClick, options);
            window.removeEventListener('keydown', onKeyDown, options);

            body.style.cursor = cursor;
        };
    }, []);

    return createPortal(
        <div className={'dz-pick dz-chrome dz-scope pointer-events-none fixed inset-0 z-[120] font-sans'}>
            {hovered && (
                <>
                    <Highlights rects={[hovered.rect]} tone={'accent'} />

                    <span
                        className={
                            'fixed max-w-[18rem] truncate rounded-md bg-accent px-2 py-1 text-[11px] text-ink-inverse shadow-panel'
                        }
                        style={{
                            left: `${Math.max(8, hovered.rect.left)}px`,
                            top: `${Math.max(8, hovered.rect.top - 26)}px`,
                        }}
                    >
                        {hovered.label}
                    </span>
                </>
            )}

            <span
                className={
                    'fixed left-1/2 top-4 -translate-x-1/2 rounded-xl bg-card px-3 py-2 text-[13px] font-medium text-ink shadow-panel ring-1 ring-line-field'
                }
            >
                {'Click anything on the page. Escape cancels.'}
            </span>
        </div>,
        document.body
    );
}

function ScopeChoices({
    scopes,
    onPick,
    onClose,
}: {
    scopes: Scope[];
    onPick: (scope: Scope) => void;
    onClose: () => void;
}) {
    const [chosen, setChosen] = useState(scopes[0]?.id ?? '');

    useEffect(() => setChosen(scopes[0]?.id ?? ''), [scopes]);

    const scope = scopes.find((one) => one.id === chosen) ?? scopes[0] ?? null;
    const rects = useMemo(() => (scope === null ? [] : rectsFor(scope.selector)), [scope]);

    return (
        <div className={'space-y-2 rounded-xl bg-raised p-3'}>
            {scope !== null &&
                createPortal(
                    <div className={'dz-pick dz-chrome pointer-events-none fixed inset-0 z-[120]'}>
                        <Highlights rects={rects} tone={'warning'} />
                    </div>,
                    document.body
                )}

            <div className={'flex items-center justify-between gap-2'}>
                <p className={'text-[13px] font-semibold text-ink'}>{'How far should this reach?'}</p>

                <button
                    type={'button'}
                    onClick={onClose}
                    aria-label={'Forget that pick'}
                    className={
                        'shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:bg-overlay hover:text-ink'
                    }
                >
                    <X className={'h-4 w-4'} aria-hidden={'true'} />
                </button>
            </div>

            {scope === null ? (
                <p className={'rounded-lg bg-overlay p-2.5 text-[12px] leading-snug text-ink-faint'}>
                    {'Nothing about that element can be named safely. Try the box around it instead.'}
                </p>
            ) : (
                <>
                    <Select
                        size={'sm'}
                        value={scope.id}
                        onChange={setChosen}
                        options={scopes.map((one) => ({
                            value: one.id,
                            label: `${one.label} (${one.matches === 1 ? '1 match' : `${one.matches} matches`})`,
                        }))}
                    />

                    <p className={'truncate text-[12px] text-ink-muted'}>{scope.selector}</p>

                    <button
                        type={'button'}
                        onClick={() => onPick(scope)}
                        className={
                            'flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-2 text-[13px] font-semibold text-ink-inverse transition-opacity hover:opacity-90'
                        }
                    >
                        <Check className={'h-4 w-4'} aria-hidden={'true'} />
                        {'Style this'}
                    </button>
                </>
            )}
        </div>
    );
}

function readProperty(css: string, property: string): string | null {
    for (const declaration of cssDeclarationList(css)) {
        const at = declaration.indexOf(':');

        if (at > 0 && declaration.slice(0, at).trim().toLowerCase() === property) {
            return declaration
                .slice(at + 1)
                .replace(/\s*!\s*important\s*$/i, '')
                .trim();
        }
    }

    return null;
}

function writeProperty(css: string, property: string, value: string): string {
    const kept = cssDeclarationList(css).filter((declaration) => {
        const at = declaration.indexOf(':');

        return at < 1 || declaration.slice(0, at).trim().toLowerCase() !== property;
    });

    if (value !== '') {
        kept.push(`${property}: ${value}`);
    }

    return kept.length === 0 ? '' : `${kept.join('; ')};`;
}

interface ColourPreset {
    property: string;
    label: string;
    fallback: string;
    format: (colour: string) => string;
}

const COLOURS: ColourPreset[] = [
    { property: 'background-color', label: 'Background', fallback: '#101828', format: (colour) => colour },
    { property: 'color', label: 'Text', fallback: '#e5e7eb', format: (colour) => colour },
    { property: 'border', label: 'Border', fallback: '#334155', format: (colour) => `1px solid ${colour}` },
];

const TOKENS: { label: string; variable: string }[] = [
    { label: 'Page', variable: '--surface-base' },
    { label: 'Card', variable: '--surface-card' },
    { label: 'Raised', variable: '--surface-raised' },
    { label: 'Overlay', variable: '--surface-overlay' },
    { label: 'Accent', variable: '--accent' },
    { label: 'Accent alt', variable: '--accent-alt' },
    { label: 'Text', variable: '--ink' },
    { label: 'Muted text', variable: '--ink-muted' },
    { label: 'Faint text', variable: '--ink-faint' },
    { label: 'Inverse text', variable: '--ink-inverse' },
    { label: 'Success', variable: '--success' },
    { label: 'Warning', variable: '--warning' },
    { label: 'Danger', variable: '--danger' },
];

const SWITCHES: { label: string; property: string; value: string }[] = [
    { label: 'Hide it', property: 'display', value: 'none' },
    { label: 'No shadow', property: 'box-shadow', value: 'none' },
    { label: 'Full width', property: 'width', value: '100%' },
];

function hexOf(value: string | null, fallback: string): string {
    const found = value === null ? null : /#[0-9a-f]{6}/i.exec(value);

    return found === null ? fallback : found[0];
}

function swatchOf(value: string | null, fallback: string): string {
    if (value === null) {
        return fallback;
    }

    const variable = /var\(\s*(--[A-Za-z0-9-]+)\s*\)/.exec(value);

    return variable === null ? hexOf(value, fallback) : `var(${variable[1]})`;
}

function Palette({
    preset,
    current,
    onPick,
    onClear,
}: {
    preset: ColourPreset;
    current: string | null;
    onPick: (colour: string) => void;
    onClear: () => void;
}) {
    return (
        <div className={'space-y-2 rounded-lg bg-raised p-2.5'}>
            <p className={'text-[12px] font-semibold text-ink-muted'}>{`${preset.label} from the theme`}</p>

            <div className={'flex flex-wrap gap-1.5'}>
                {TOKENS.map((token) => {
                    const value = `var(${token.variable})`;

                    return (
                        <button
                            key={token.variable}
                            type={'button'}
                            title={token.label}
                            aria-label={token.label}
                            onClick={() => onPick(value)}
                            className={cn(
                                'h-6 w-6 shrink-0 rounded-full ring-1 transition-transform hover:scale-110',
                                current !== null && current.includes(token.variable)
                                    ? 'ring-2 ring-accent'
                                    : 'ring-line-field'
                            )}
                            style={{ background: value }}
                        />
                    );
                })}
            </div>

            <div className={'flex items-center gap-2 pt-0.5'}>
                <label
                    className={
                        'inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-overlay px-2 py-1 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink'
                    }
                >
                    <span
                        aria-hidden={'true'}
                        className={'h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-line-field'}
                        style={{ background: swatchOf(current, preset.fallback) }}
                    />

                    {'Custom colour'}

                    <input
                        type={'color'}
                        value={hexOf(current, preset.fallback)}
                        aria-label={`${preset.label} colour`}
                        onChange={(event) => onPick(event.target.value)}
                        className={'sr-only'}
                    />
                </label>

                {current !== null && (
                    <button
                        type={'button'}
                        onClick={onClear}
                        className={
                            'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-ink-faint transition-colors hover:text-danger'
                        }
                    >
                        <RotateCcw className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        {'Back to the theme'}
                    </button>
                )}
            </div>
        </div>
    );
}

function Presets({ declarations, onChange }: { declarations: string; onChange: (next: string) => void }) {
    const [open, setOpen] = useState<string | null>(null);

    const shown = COLOURS.find((entry) => entry.property === open) ?? null;
    const current = shown === null ? null : readProperty(declarations, shown.property);

    return (
        <div className={'space-y-2 rounded-lg bg-overlay p-2.5'}>
            <div className={'flex items-center justify-between gap-2'}>
                <p className={'flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted'}>
                    <PaletteIcon className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                    {'Quick styles'}
                </p>

                {declarations.trim() !== '' && (
                    <button
                        type={'button'}
                        onClick={() => {
                            setOpen(null);
                            onChange('');
                        }}
                        className={
                            'inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-ink-faint transition-colors hover:text-danger'
                        }
                    >
                        <RotateCcw className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        {'Reset this rule'}
                    </button>
                )}
            </div>

            <div className={'flex flex-wrap gap-2'}>
                {COLOURS.map((entry) => {
                    const value = readProperty(declarations, entry.property);

                    return (
                        <button
                            key={entry.property}
                            type={'button'}
                            aria-expanded={open === entry.property}
                            onClick={() => setOpen(open === entry.property ? null : entry.property)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium transition-colors',
                                open === entry.property
                                    ? 'bg-accent text-ink-inverse'
                                    : value === null
                                    ? 'bg-raised text-ink-muted hover:text-ink'
                                    : 'bg-accent/20 text-ink'
                            )}
                        >
                            <span
                                aria-hidden={'true'}
                                className={'h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-line-field'}
                                style={{ background: swatchOf(value, entry.fallback) }}
                            />
                            {entry.label}
                        </button>
                    );
                })}

                {SWITCHES.map((entry) => {
                    const on = readProperty(declarations, entry.property) === entry.value;

                    return (
                        <button
                            key={entry.label}
                            type={'button'}
                            onClick={() => onChange(writeProperty(declarations, entry.property, on ? '' : entry.value))}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium transition-colors',
                                on ? 'bg-accent/20 text-ink' : 'bg-raised text-ink-muted hover:text-ink'
                            )}
                        >
                            {on ? (
                                <Check className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                            ) : (
                                <Square className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                            )}
                            {entry.label}
                        </button>
                    );
                })}
            </div>

            {shown !== null && (
                <Palette
                    preset={shown}
                    current={current}
                    onPick={(colour) => onChange(writeProperty(declarations, shown.property, shown.format(colour)))}
                    onClear={() => onChange(writeProperty(declarations, shown.property, ''))}
                />
            )}
        </div>
    );
}

function RuleRow({
    rule,
    open,
    onOpen,
    onPatch,
    onRemove,
    onPick,
}: {
    rule: CssRule;
    open: boolean;
    onOpen: () => void;
    onPatch: (next: Partial<CssRule>) => void;
    onRemove: () => void;
    onPick: () => void;
}) {
    const selector = useMemo(() => cleanCssSelector(rule.selector), [rule.selector]);
    const matches = useMemo(() => (selector === null ? 0 : countMatches(selector)), [selector]);

    const badSelector = rule.selector.trim() !== '' && selector === null;
    const badCss = rule.css.trim() !== '' && cleanCssDeclarations(rule.css) === '';
    const broken = badSelector || badCss;
    const terminal = useMemo(() => (selector === null ? false : touchesTerminal(selector)), [selector]);

    return (
        <div className={cn('overflow-hidden rounded-xl bg-raised transition-opacity', !rule.enabled && 'opacity-50')}>
            <div className={'flex items-center gap-1 p-2'}>
                <button
                    type={'button'}
                    onClick={onOpen}
                    aria-expanded={open}
                    className={
                        'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-overlay'
                    }
                >
                    <ChevronDown
                        aria-hidden={'true'}
                        className={cn(
                            'h-4 w-4 shrink-0 text-ink-faint transition-transform',
                            open && 'rotate-180 text-accent'
                        )}
                    />

                    <span className={'min-w-0 flex-1'}>
                        <span className={'block truncate text-[13px] font-semibold text-ink'}>
                            {rule.label.trim() === '' ? 'Untitled rule' : rule.label}
                        </span>
                        <span className={cn('block truncate text-[11px]', broken ? 'text-danger' : 'text-ink-faint')}>
                            {rule.selector.trim() === '' ? 'Nothing picked yet' : rule.selector}
                        </span>
                    </span>

                    <span className={'shrink-0 text-[11px] tabular-nums text-ink-faint'}>
                        {selector === null ? '' : matches === 1 ? '1 match' : `${matches} matches`}
                    </span>
                </button>

                <button
                    type={'button'}
                    onClick={() => onPatch({ enabled: !rule.enabled })}
                    aria-pressed={rule.enabled}
                    aria-label={rule.enabled ? 'Turn this rule off' : 'Turn this rule on'}
                    className={cn(
                        'shrink-0 rounded-lg p-1.5 transition-colors',
                        rule.enabled ? 'text-accent hover:bg-overlay' : 'text-ink-faint hover:text-ink'
                    )}
                >
                    {rule.enabled ? (
                        <Eye className={'h-4 w-4'} aria-hidden={'true'} />
                    ) : (
                        <EyeOff className={'h-4 w-4'} aria-hidden={'true'} />
                    )}
                </button>

                <button
                    type={'button'}
                    onClick={onRemove}
                    aria-label={'Remove this rule'}
                    className={
                        'shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-danger/15 hover:text-danger'
                    }
                >
                    <Trash2 className={'h-4 w-4'} aria-hidden={'true'} />
                </button>
            </div>

            {!open ? null : (
                <div className={'space-y-2 border-t border-line-field p-3'}>
                    <input
                        type={'text'}
                        value={rule.label}
                        maxLength={60}
                        placeholder={'Name this rule'}
                        aria-label={'Rule name'}
                        onChange={(event) => onPatch({ label: event.target.value })}
                        className={INPUT}
                    />

                    <input
                        type={'text'}
                        value={rule.selector}
                        maxLength={SELECTOR_LIMIT}
                        spellCheck={false}
                        placeholder={'.bg-card'}
                        aria-label={'What the rule applies to'}
                        onChange={(event) => onPatch({ selector: event.target.value })}
                        className={cn(INPUT, 'text-[13px]', badSelector && 'ring-1 ring-danger')}
                    />

                    <div className={'flex items-center justify-between gap-2 text-[12px] text-ink-faint'}>
                        <span className={cn('min-w-0 truncate', badSelector && 'text-danger')}>
                            {badSelector
                                ? 'That cannot be used as a target.'
                                : selector === null
                                ? 'Point at the page to fill this in.'
                                : matches === 1
                                ? 'Matches 1 element on this page'
                                : `Matches ${matches} elements on this page`}
                        </span>

                        <button
                            type={'button'}
                            onClick={onPick}
                            className={'shrink-0 font-medium text-accent transition-colors hover:text-ink'}
                        >
                            {'Point again'}
                        </button>
                    </div>

                    {terminal && (
                        <p className={'rounded-lg bg-overlay p-2.5 text-[12px] leading-snug text-ink-faint'}>
                            {
                                'The console prints onto a canvas, so it takes the background from this rule but not the text '
                            }
                            {'colour. Set '}
                            <code className={'font-mono text-ink-muted'}>{'--terminal-ink'}</code>
                            {' for its text and '}
                            <code className={'font-mono text-ink-muted'}>{'--terminal-accent'}</code>
                            {' for what it highlights.'}
                        </p>
                    )}

                    <Presets declarations={rule.css} onChange={(next) => onPatch({ css: next })} />

                    <CssBox
                        value={rule.css}
                        limit={DECLARATION_LIMIT}
                        invalid={badCss}
                        onChange={(next) => onPatch({ css: next })}
                    />

                    <div className={'flex flex-wrap items-center gap-3 pt-0.5'}>
                        <Checkbox
                            size={'xs'}
                            label={'Win over the theme'}
                            checked={rule.important !== false}
                            onChange={(event) => onPatch({ important: event.target.checked })}
                        />

                        {badCss && (
                            <span className={'flex items-center gap-1 text-[12px] text-danger'}>
                                <Ban className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                                {'Braces, at-rules and comments are refused.'}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function CssRulesField({
    label,
    hint,
    value,
    max,
    onChange,
}: {
    label: string;
    hint?: string;
    value: CssRule[];
    max: number;
    onChange: (value: CssRule[]) => void;
}) {
    const [picking, setPicking] = useState<'new' | number | null>(null);
    const [scopes, setScopes] = useState<{ at: 'new' | number; list: Scope[] } | null>(null);
    const [open, setOpen] = useState<number | null>(null);

    const rules = Array.isArray(value) ? value : [];

    const patch = (index: number, next: Partial<CssRule>) =>
        onChange(rules.map((rule, at) => (at === index ? { ...rule, ...next } : rule)));

    const full = rules.length >= max;

    const take = (at: 'new' | number, selector: string) => {
        if (at !== 'new') {
            patch(at, { selector });
            setOpen(at);

            return;
        }

        if (!full) {
            onChange([...rules, { selector, css: '', label: '', important: true, enabled: true }]);
            setOpen(rules.length);
        }
    };

    return (
        <Field
            label={label}
            hint={hint}
            action={
                rules.length > 0 ? (
                    <button
                        type={'button'}
                        onClick={() => {
                            setScopes(null);
                            setPicking(null);
                            setOpen(null);
                            onChange([]);
                        }}
                        className={
                            'inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-raised px-2 py-1 text-[12px] font-medium text-ink-muted transition-colors hover:text-danger'
                        }
                    >
                        <RotateCcw className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        {'Reset every rule'}
                    </button>
                ) : undefined
            }
        >
            <div className={'space-y-2'}>
                <button
                    type={'button'}
                    disabled={full}
                    onClick={() => setPicking(picking === null ? 'new' : null)}
                    className={cn(
                        'flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50',
                        picking !== null ? 'bg-accent text-ink-inverse' : 'bg-accent/15 text-accent hover:bg-accent/25'
                    )}
                >
                    <Wand2 className={'h-4 w-4'} aria-hidden={'true'} />
                    {picking !== null ? 'Pointing at the page' : 'Pick an element on the page'}
                </button>

                {full && (
                    <p className={'text-[12px] text-ink-faint'}>
                        {`That is all ${max} rules. Remove one to add another.`}
                    </p>
                )}

                {scopes !== null && (
                    <ScopeChoices
                        scopes={scopes.list}
                        onClose={() => setScopes(null)}
                        onPick={(scope) => {
                            take(scopes.at, scope.selector);
                            setScopes(null);
                        }}
                    />
                )}

                {rules.map((rule, index) => (
                    <RuleRow
                        key={index}
                        rule={rule}
                        open={open === index}
                        onOpen={() => setOpen(open === index ? null : index)}
                        onPatch={(next) => patch(index, next)}
                        onRemove={() => {
                            setOpen(null);
                            onChange(rules.filter((_, at) => at !== index));
                        }}
                        onPick={() => setPicking(index)}
                    />
                ))}

                {!full && (
                    <AddRow
                        label={'Add a rule by hand'}
                        onClick={() => {
                            onChange([...rules, { selector: '', css: '', label: '', important: true, enabled: true }]);
                            setOpen(rules.length);
                        }}
                    />
                )}
            </div>

            {picking !== null && (
                <ElementPicker
                    onPick={(element) => {
                        const list = scopesFor(element);

                        setScopes({ at: picking, list });
                        setPicking(null);
                    }}
                    onCancel={() => setPicking(null)}
                />
            )}
        </Field>
    );
}

export default CssRulesField;
