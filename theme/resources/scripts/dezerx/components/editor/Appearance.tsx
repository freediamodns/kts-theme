import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import {
    readStylesheetDefaults,
    toHex,
    toRgb,
    type AppearanceConfig,
    type ColorPreset,
    type ThemeName,
    type TokenMap,
} from '@/dezerx/lib/appearance';
import type { FontOption } from '@/dezerx/lib/fonts';
import { ChoiceField, Field, ImageField, TextField, ToggleField } from '@/dezerx/components/editor/Controls';
import { EDITOR_ROUTES } from '@/dezerx/lib/adminApi';

export interface TokenGroup {
    label: string;
    hint?: string;
    tokens: Record<string, string>;
}

export interface EditorAppearance extends AppearanceConfig {
    tokens: { dark: TokenMap; light: TokenMap };
}

interface SectionProps {
    appearance: EditorAppearance;
    onChange: (next: EditorAppearance) => void;
    onError: (message: string) => void;
}

export function brandGroupCount(appearance: EditorAppearance, group: string): number {
    const mode = appearance.logo.mode;

    if (group === 'wording') {
        return mode === 'image' ? 1 : 2;
    }

    return mode === 'text' ? 1 : 4;
}

export function BrandSection({ appearance, group, onChange, onError }: SectionProps & { group: string }) {
    const logo = appearance.logo;

    const patch = (next: Partial<typeof logo>) => onChange({ ...appearance, logo: { ...logo, ...next } });

    if (group === 'wording') {
        return (
            <div className={'space-y-5'}>
                {logo.mode !== 'image' && (
                    <TextField
                        label={'Wordmark'}
                        hint={'Left empty, the panel name from the settings table is used.'}
                        value={logo.text}
                        maxLength={40}
                        placeholder={'Panel name'}
                        onChange={(text) => patch({ text })}
                    />
                )}

                <TextField
                    label={'Alt text'}
                    hint={'Read out in place of the artwork.'}
                    value={logo.alt}
                    maxLength={80}
                    onChange={(alt) => patch({ alt })}
                />
            </div>
        );
    }

    return (
        <div className={'space-y-5'}>
            <ChoiceField
                label={'Logo mode'}
                hint={'What the sidebar draws where the brand goes.'}
                value={logo.mode}
                preview={'logo'}
                choices={[
                    { value: 'image', label: 'Artwork only' },
                    { value: 'text', label: 'Text only' },
                    { value: 'both', label: 'Artwork and text' },
                ]}
                onChange={(mode) => patch({ mode: mode as typeof logo.mode })}
            />

            {logo.mode !== 'text' && (
                <>
                    <ImageField
                        label={'Artwork'}
                        hint={'Used on the dark theme, and on both unless a light one is set.'}
                        value={logo.image}
                        uploadUrl={EDITOR_ROUTES.logoUpload}
                        onChange={(image) => patch({ image })}
                        onError={onError}
                    />

                    <ImageField
                        label={'Artwork, light theme'}
                        value={logo.imageLight}
                        uploadUrl={EDITOR_ROUTES.logoUpload}
                        onChange={(imageLight) => patch({ imageLight })}
                        onError={onError}
                    />

                    <ImageField
                        label={'Square mark'}
                        hint={'Shown where the sidebar is collapsed to icons.'}
                        value={logo.mark ?? ''}
                        uploadUrl={EDITOR_ROUTES.logoUpload}
                        onChange={(mark) => patch({ mark: mark || null })}
                        onError={onError}
                    />
                </>
            )}
        </div>
    );
}

export function ColourSection({
    appearance,
    groups,
    group,
    onChange,
    onError,
}: SectionProps & { groups: Record<string, TokenGroup>; group: string }) {
    const [theme, setTheme] = useState<ThemeName>('dark');

    const names = useMemo(() => Object.values(groups).flatMap((entry) => Object.keys(entry.tokens)), [groups]);

    const [shipped, setShipped] = useState<{ dark: TokenMap; light: TokenMap }>({ dark: {}, light: {} });

    useEffect(() => {
        setShipped(readStylesheetDefaults(names));
    }, [names]);

    const set = (token: string, value: string) =>
        onChange({
            ...appearance,
            tokens: { ...appearance.tokens, [theme]: { ...appearance.tokens[theme], [token]: value } },
        });

    const clear = (token: string) => {
        const next = { ...appearance.tokens[theme] };
        delete next[token];

        onChange({ ...appearance, tokens: { ...appearance.tokens, [theme]: next } });
    };

    if (group === 'presets') {
        return <PresetEditor appearance={appearance} shipped={shipped} onChange={onChange} onError={onError} />;
    }

    const current = groups[group];

    if (!current) {
        return null;
    }

    return (
        <div className={'space-y-5'}>
            <div className={'flex gap-1 rounded-xl bg-raised p-1'}>
                {(['dark', 'light'] as ThemeName[]).map((name) => (
                    <button
                        key={name}
                        type={'button'}
                        onClick={() => setTheme(name)}
                        aria-pressed={theme === name}
                        className={cn(
                            'flex-1 rounded-lg py-1.5 text-[13px] font-medium capitalize transition-colors',
                            theme === name ? 'bg-card text-ink' : 'text-ink-muted hover:text-ink'
                        )}
                    >
                        {name}
                    </button>
                ))}
            </div>

            <p className={'text-[12px] leading-snug text-ink-faint'}>
                {
                    'Editing the palette that is not currently on screen still saves. Use the theme toggle in the header to look at it.'
                }
            </p>

            <Field label={current.label} hint={current.hint}>
                <div className={'space-y-1.5'}>
                    {Object.entries(current.tokens).map(([token, label]) => {
                        const override = appearance.tokens[theme][token];
                        const value = toHex(override ?? shipped[theme][token] ?? '', '#000000');

                        return (
                            <div key={token} className={'flex items-center gap-2.5 rounded-xl bg-raised px-2.5 py-2'}>
                                <input
                                    type={'color'}
                                    value={value}
                                    aria-label={label}
                                    onChange={(event) => set(token, toRgb(event.target.value))}
                                    className={'h-7 w-7 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0'}
                                />

                                <span className={'min-w-0 flex-1 truncate text-[13px] text-ink'}>{label}</span>

                                <span className={'shrink-0 font-mono text-[11px] uppercase text-ink-faint'}>
                                    {value}
                                </span>

                                {override && (
                                    <button
                                        type={'button'}
                                        onClick={() => clear(token)}
                                        aria-label={`Reset ${label}`}
                                        className={
                                            'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink'
                                        }
                                    >
                                        {'Reset'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Field>
        </div>
    );
}

function PresetEditor({
    appearance,
    shipped,
    onChange,
}: {
    appearance: EditorAppearance;
    shipped: { dark: TokenMap; light: TokenMap };
    onChange: (next: EditorAppearance) => void;
    onError: (message: string) => void;
}) {
    const patch = (index: number, next: Partial<ColorPreset>) =>
        onChange({
            ...appearance,
            presets: appearance.presets.map((preset, at) => (at === index ? { ...preset, ...next } : preset)),
        });

    const add = () =>
        onChange({
            ...appearance,
            presets: [
                ...appearance.presets,
                {
                    id: `preset-${appearance.presets.length + 1}`,
                    label: 'New preset',
                    swatch: shipped.dark.accent ?? 'rgb(71 165 231)',
                    dark: { accent: shipped.dark.accent ?? '' },
                    light: { accent: shipped.light.accent ?? '' },
                },
            ],
        });

    return (
        <Field label={'Palettes'} hint={'What the picker in the header offers. The accent of each is its swatch.'}>
            <div className={'space-y-2'}>
                {appearance.presets.map((preset, index) => (
                    <div key={index} className={'flex items-center gap-2 rounded-xl bg-raised p-2'}>
                        <input
                            type={'color'}
                            value={toHex(preset.dark.accent ?? preset.swatch)}
                            aria-label={`${preset.label} accent`}
                            onChange={(event) => {
                                const value = toRgb(event.target.value);

                                patch(index, {
                                    swatch: value,
                                    dark: { ...preset.dark, accent: value },
                                    light: { ...preset.light, accent: value },
                                });
                            }}
                            className={'h-7 w-7 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0'}
                        />

                        <div className={'min-w-0 flex-1 space-y-1'}>
                            <input
                                type={'text'}
                                value={preset.label}
                                maxLength={40}
                                aria-label={'Palette name'}
                                onChange={(event) => patch(index, { label: event.target.value })}
                                className={
                                    'w-full rounded-lg border-0 bg-overlay px-3 py-3 text-[14px] text-ink focus:ring-2 focus:ring-accent'
                                }
                            />
                            <input
                                type={'text'}
                                value={preset.id}
                                maxLength={40}
                                aria-label={'Palette id'}
                                onChange={(event) => patch(index, { id: event.target.value })}
                                className={
                                    'w-full rounded-lg border-0 bg-overlay px-3 py-3 text-[12px] text-ink-faint focus:ring-2 focus:ring-accent'
                                }
                            />
                        </div>

                        <div className={'flex shrink-0 flex-col items-center gap-1'}>
                            <button
                                type={'button'}
                                aria-label={'Make this the default'}
                                aria-pressed={appearance.defaultPreset === preset.id}
                                onClick={() => onChange({ ...appearance, defaultPreset: preset.id })}
                                className={cn(
                                    'rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors',
                                    appearance.defaultPreset === preset.id
                                        ? 'bg-accent text-ink-inverse'
                                        : 'text-ink-faint hover:text-ink'
                                )}
                            >
                                {'Default'}
                            </button>

                            {appearance.presets.length > 1 && (
                                <button
                                    type={'button'}
                                    aria-label={`Delete ${preset.label}`}
                                    onClick={() =>
                                        onChange({
                                            ...appearance,
                                            presets: appearance.presets.filter((_, at) => at !== index),
                                        })
                                    }
                                    className={
                                        'rounded-md p-1 text-ink-faint transition-colors hover:bg-danger/15 hover:text-danger'
                                    }
                                >
                                    <Trash2 className={'h-3.5 w-3.5'} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                <button
                    type={'button'}
                    onClick={add}
                    className={
                        'flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-field py-2 text-[13px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink'
                    }
                >
                    <Plus className={'h-4 w-4'} aria-hidden={'true'} />
                    {'Add a palette'}
                </button>

                <ToggleField
                    label={'Let people pick their own'}
                    hint={'Shows the palette picker in the header.'}
                    value={appearance.allowUserPresets}
                    onChange={(allowUserPresets) => onChange({ ...appearance, allowUserPresets })}
                />
            </div>
        </Field>
    );
}

const SLOT_LABELS: Record<string, { label: string; hint: string }> = {
    sans: { label: 'Body', hint: 'Everything that is not a heading.' },
    display: { label: 'Headings', hint: 'The wordmark and page titles.' },
    mono: { label: 'Monospace', hint: 'The console and anything tabular.' },
};

export function TypeSection({
    appearance,
    catalogue,
    group,
    onChange,
}: SectionProps & { catalogue: FontOption[]; group: string }) {
    const meta = SLOT_LABELS[group] ?? { label: group, hint: '' };
    const offered = catalogue.filter((font) => font.slots.includes(group));
    const chosen = appearance.fonts[group as keyof typeof appearance.fonts];
    const preview = offered.find((font) => font.id === chosen);

    return (
        <div className={'space-y-5'}>
            <Field label={meta.label} hint={meta.hint}>
                <div className={'grid grid-cols-2 gap-2'}>
                    {offered.map((font) => {
                        const selected = chosen === font.id;

                        return (
                            <button
                                key={font.id}
                                type={'button'}
                                aria-pressed={selected}
                                onClick={() =>
                                    onChange({ ...appearance, fonts: { ...appearance.fonts, [group]: font.id } })
                                }
                                className={cn(
                                    'rounded-xl px-3 py-2.5 text-left transition-colors',
                                    selected ? 'bg-accent/20 text-ink' : 'bg-raised text-ink-muted hover:bg-overlay'
                                )}
                            >
                                <span
                                    style={{ fontFamily: font.stack }}
                                    className={'block truncate text-[15px] leading-tight'}
                                >
                                    {'Ag'}
                                </span>
                                <span className={'mt-1 block truncate text-[12px] text-ink-faint'}>{font.label}</span>
                            </button>
                        );
                    })}
                </div>
            </Field>

            {preview && (
                <div className={'rounded-2xl bg-raised p-4'}>
                    <p className={'mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint'}>
                        {'Sample'}
                    </p>
                    <p style={{ fontFamily: preview.stack }} className={'text-[15px] leading-relaxed text-ink'}>
                        {'The quick brown fox jumps over the lazy dog. 0123456789'}
                    </p>
                </div>
            )}
        </div>
    );
}

export interface RemoteOption {
    section: string;
    group: string;
    label: string;
    hint: string;
}

export const REMOTE_OPTIONS: RemoteOption[] = [
    { section: 'brand', group: 'logo', label: 'Logo mode', hint: 'What the sidebar draws where the brand goes.' },
    { section: 'brand', group: 'logo', label: 'Artwork', hint: 'The logo image, dark theme and light.' },
    { section: 'brand', group: 'logo', label: 'Square mark', hint: 'Shown where the sidebar is collapsed to icons.' },
    { section: 'brand', group: 'wording', label: 'Wordmark', hint: 'The panel name beside the mark.' },
    { section: 'brand', group: 'wording', label: 'Alt text', hint: 'Read out in place of the artwork.' },
    { section: 'colour', group: 'presets', label: 'Palettes', hint: 'What the picker in the header offers.' },
    {
        section: 'colour',
        group: 'presets',
        label: 'Let people pick their own',
        hint: 'Shows the palette picker in the header.',
    },
    { section: 'type', group: 'sans', label: 'Body typeface', hint: 'Everything that is not a heading.' },
    { section: 'type', group: 'display', label: 'Heading typeface', hint: 'The wordmark and page titles.' },
    { section: 'type', group: 'mono', label: 'Monospace typeface', hint: 'The console and anything tabular.' },
];
