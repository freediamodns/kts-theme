import React, { ComponentType, Fragment, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useStoreState } from 'easy-peasy';
import { Dialog, Transition } from '@headlessui/react';
import { isAxiosError } from 'axios';
import { Download, Eye, LayoutGrid, Loader2, Pencil, RotateCcw, Save, Search, Upload, X } from 'lucide-react';
import { ApplicationStore } from '@/state';
import { cn } from '@/dezerx/lib/cn';
import adminApi, { DEMO_EDITOR_ROUTE, EDITOR_ROUTES } from '@/dezerx/lib/adminApi';
import { useDemo } from '@/dezerx/lib/demo';
import { applyTheme } from '@/dezerx/lib/theme';
import { matchingPreset, themeWithPreset, type ThemePreset } from '@/dezerx/lib/presets';
import { commitFaviconPreview } from '@/dezerx/lib/favicon';
import {
    NAV_LABELS,
    serverHeaderVisible,
    type ConsoleRule,
    type CssRule,
    type EggArt,
    type OverviewBlock,
    type QuickLinkCard,
    type SidebarLink,
    type SidebarNavItem,
    type ThemeConfig,
    type ThemeImage,
    type ThemeNotice,
} from '@/dezerx/lib/panelTheme';
import { useToast } from '@/dezerx/components/ui/Toast';
import { HoverTip } from '@/dezerx/components/ui/HoverTip';
import {
    BrandSection,
    ColourSection,
    REMOTE_OPTIONS,
    TypeSection,
    brandGroupCount,
    type EditorAppearance,
    type TokenGroup,
} from '@/dezerx/components/editor/Appearance';
import {
    ChoiceField,
    EggArtField,
    ImageField,
    ImageListField,
    LinkListField,
    ConsoleRulesField,
    NoticeListField,
    RangeField,
    TextField,
    ToggleField,
    QuickLinkListField,
    type EditorEgg,
} from '@/dezerx/components/editor/Controls';
import { CssRulesField } from '@/dezerx/components/editor/CssRules';
import { AddonsSection } from '@/dezerx/components/editor/AddonsSection';
import { PresetsDialog } from '@/dezerx/components/editor/Presets';
import { OverviewBlocksField } from '@/dezerx/components/editor/OverviewBlocks';
import { ServerTabsField, type PermissionCatalogue } from '@/dezerx/components/editor/ServerTabs';
import { LocalesField } from '@/dezerx/components/editor/LocalesField';
import { PanelLinksField } from '@/dezerx/components/editor/PanelLinks';
import { ToastSample } from '@/dezerx/components/editor/Previews';
import { SECTION_ICONS } from '@/dezerx/components/editor/SectionIcons';
import {
    EDITOR_WIDTH,
    onEditorSave,
    setDevice,
    setEditorOpen,
    setEditorSaving,
    setEditorSection,
    setPresetsOpen,
    setPreviewing,
    useDevice,
    useEditorOpen,
    usePresetsOpen,
    usePreviewing,
    usePreviewWidth,
    type Device,
} from '@/dezerx/components/editor/store';
import {
    DEFAULT_SECTION,
    applySession,
    session,
    type EditorData,
    type GroupSpec,
    type OptionSpec,
    type SectionSpec,
} from '@/dezerx/components/editor/session';

function applies(option: OptionSpec, theme: ThemeConfig): boolean {
    for (const [key, allowed] of Object.entries(option.when ?? {})) {
        if (!allowed.includes(theme[key as keyof ThemeConfig] as string)) {
            return false;
        }
    }

    for (const key of option.whenSet ?? []) {
        if ((theme[key as keyof ThemeConfig] as string) === '') {
            return false;
        }
    }

    for (const [key, ceiling] of Object.entries(option.whenBelow ?? {})) {
        if ((theme[key as keyof ThemeConfig] as number) >= ceiling) {
            return false;
        }
    }

    return true;
}

function groupCount(
    section: SectionSpec,
    group: GroupSpec,
    theme: ThemeConfig,
    appearance: EditorAppearance,
    tokenGroups: Record<string, TokenGroup>
): number {
    if (section.id === 'brand') {
        return brandGroupCount(appearance, group.id);
    }

    if (section.id === 'colour') {
        return group.id === 'presets' ? 2 : Object.keys(tokenGroups[group.id]?.tokens ?? {}).length;
    }

    return section.remote !== null ? 1 : group.options.filter((option) => applies(option, theme)).length;
}

export function ThemeEditor() {
    const open = useEditorOpen();
    const presetsOpen = usePresetsOpen();
    const previewing = usePreviewing();
    const { toast } = useToast();

    const [, bump] = useState(0);
    const render = useCallback(() => bump((count) => count + 1), []);

    const data = session.data;
    const theme = session.theme;
    const appearance = session.appearance;
    const dirty = session.dirty;

    const [section, setSection] = useState<string>(session.section);
    const [group, setGroup] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [resetAsked, setResetAsked] = useState(false);
    const importInput = useRef<HTMLInputElement>(null);

    const admin = useStoreState((state: ApplicationStore) => state.user.data?.rootAdmin) === true;
    const demo = useDemo();

    const fail = useCallback((message: string) => toast(message, { tone: 'error' }), [toast]);

    const preview = useRef<number | null>(null);

    const previewSoon = useCallback(() => {
        if (preview.current !== null) {
            window.clearTimeout(preview.current);
        }

        preview.current = window.setTimeout(() => {
            preview.current = null;
            applySession(true);
        }, 150);
    }, []);

    useEffect(
        () => () => {
            if (preview.current !== null) {
                window.clearTimeout(preview.current);
            }
        },
        []
    );

    const body = useRef<HTMLDivElement>(null);
    const saveRef = useRef<() => Promise<void>>(async () => undefined);

    useEffect(() => onEditorSave(() => void saveRef.current()), []);

    useEffect(() => {
        if (!open || (!admin && !demo) || session.fetched) {
            return;
        }

        session.fetched = true;

        let live = true;
        setLoading(true);

        adminApi
            .get(demo ? DEMO_EDITOR_ROUTE : EDITOR_ROUTES.editor)
            .then(({ data: payload }) => {
                if (!live) {
                    return;
                }

                session.data = payload as EditorData;
                session.theme = payload.theme as ThemeConfig;
                session.saved = payload.theme as ThemeConfig;
                session.appearance = payload.appearance as EditorAppearance;
                session.savedAppearance = payload.appearance as EditorAppearance;

                applySession(true);
                render();
            })
            .catch((error) => {
                if (!live) {
                    return;
                }

                session.fetched = false;

                const status = isAxiosError(error) ? error.response?.status : undefined;

                fail(
                    status === 403 || status === 404
                        ? demo
                            ? 'This account is no longer the demo.'
                            : 'That account is no longer an administrator.'
                        : 'The editor could not load.'
                );
                setEditorOpen(false);
            })
            .finally(() => live && setLoading(false));

        return () => {
            live = false;
        };
    }, [open, admin, demo, fail, render]);

    useEffect(() => {
        if (open) {
            setPreviewing(false);
        }

        applySession(open || previewing);
    }, [open, previewing]);

    useEffect(() => {
        setEditorSection(open ? section : '');
    }, [open, section]);

    useEffect(() => {
        if (group === null) {
            return;
        }

        const timer = window.setTimeout(() => {
            document
                .getElementById(groupAnchor(section, group))
                ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }, 0);

        return () => window.clearTimeout(timer);
    }, [section, group]);

    if (!admin && !demo) {
        return null;
    }

    const patch = (key: keyof ThemeConfig, value: unknown) => {
        session.theme = { ...session.theme, [key]: value };
        session.dirty = true;
        previewSoon();
        render();
    };

    const patchAppearance = (next: EditorAppearance) => {
        session.appearance = next;
        session.dirty = true;
        applySession(true);
        render();
    };

    const applyPreset = (preset: ThemePreset) => {
        session.theme = themeWithPreset(session.theme, preset);

        if (session.appearance !== null) {
            session.appearance = {
                ...session.appearance,
                tokens: { dark: { ...preset.tokens.dark }, light: { ...preset.tokens.light } },
                fonts: { ...preset.fonts },
            };
        }

        applyTheme(preset.mode);
        session.dirty = true;
        applySession(true);
        render();

        window.requestAnimationFrame(() => {
            body.current?.scrollTo({ top: 0 });

            document.querySelectorAll('.dz-preview-frame, .panel-shell main > div').forEach((region) => {
                region.scrollTop = 0;
            });

            window.scrollTo({ top: 0 });
        });

        toast(`${preset.label} is on. Save to give it to everyone.`, { tone: 'success' });
    };

    const close = () => {
        setPreviewing(session.dirty);
        setEditorOpen(false);
        session.section = DEFAULT_SECTION;
        setSection(DEFAULT_SECTION);
        setGroup(null);
        setQuery('');
    };

    const discard = () => {
        if (session.saved !== null) {
            session.theme = session.saved;
        }

        if (session.savedAppearance !== null) {
            session.appearance = session.savedAppearance;
        }

        session.dirty = false;
        setPreviewing(false);
        applySession(false);
        render();
        toast('Preview discarded. Back to the saved design.', { tone: 'success' });
    };

    const openSection = (id: string, page: string | null = null) => {
        session.section = id;
        setSection(id);
        setGroup(page);
        setQuery('');
    };

    const save = async () => {
        if (!data || !appearance) {
            return;
        }

        setSaving(true);
        setEditorSaving(true);

        try {
            await adminApi.post(EDITOR_ROUTES.update, { theme });
            session.saved = theme;

            await adminApi.post(EDITOR_ROUTES.tokens, appearance.tokens);

            await adminApi.post(EDITOR_ROUTES.logo, {
                mode: appearance.logo.mode,
                text: appearance.logo.text,
                image: appearance.logo.image,
                imageLight: appearance.logo.imageLight,
                mark: appearance.logo.mark ?? '',
                alt: appearance.logo.alt,
            });

            await adminApi.post(EDITOR_ROUTES.presets, {
                presets: appearance.presets,
                defaultPreset: appearance.defaultPreset,
                allowUserPresets: appearance.allowUserPresets,
            });

            await adminApi.post(EDITOR_ROUTES.fonts, appearance.fonts);

            session.savedAppearance = appearance;
            session.dirty = false;
            setPreviewing(false);

            commitFaviconPreview();
            applySession(open);
            render();

            toast('Saved. Everyone sees this now.', { tone: 'success' });
        } catch (error) {
            fail(isAxiosError(error) ? error.response?.data?.message ?? 'That did not save.' : 'That did not save.');
        } finally {
            setSaving(false);
            setEditorSaving(false);
        }
    };

    saveRef.current = save;

    const resetShape = async () => {
        setSaving(true);

        try {
            const { data: payload } = await adminApi.post(EDITOR_ROUTES.reset);

            session.theme = payload.theme as ThemeConfig;
            session.saved = payload.theme as ThemeConfig;

            if (payload.appearance) {
                session.appearance = payload.appearance as EditorAppearance;
                session.savedAppearance = payload.appearance as EditorAppearance;
            }

            applyTheme('dark');
            session.dirty = false;
            applySession(open);
            render();
            setResetAsked(false);
            toast('Back to what the panel ships with, colour and all.', { tone: 'success' });
        } catch {
            fail('That did not reset.');
        } finally {
            setSaving(false);
        }
    };

    const exportTheme = async () => {
        try {
            const { data: file } = await adminApi.get(EDITOR_ROUTES.export);

            const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = `stark-theme-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);

            toast('Exported.', { tone: 'success' });
        } catch {
            fail('That did not export.');
        }
    };

    const importTheme = async (file: File) => {
        setSaving(true);

        try {
            const { data: payload } = await adminApi.post(EDITOR_ROUTES.import, JSON.parse(await file.text()));

            session.theme = payload.theme as ThemeConfig;
            session.saved = payload.theme as ThemeConfig;

            if (payload.appearance) {
                session.appearance = payload.appearance as EditorAppearance;
                session.savedAppearance = payload.appearance as EditorAppearance;
            }

            session.dirty = false;
            applySession(open);
            render();

            toast(`Imported ${(payload.applied as string[]).join(', ')}. Reloading…`, { tone: 'success' });

            window.setTimeout(() => window.location.reload(), 600);
        } catch (error) {
            fail(
                isAxiosError(error)
                    ? error.response?.data?.errors?.[0]?.detail ?? 'That did not import.'
                    : 'That file could not be read as a theme export.'
            );
        } finally {
            setSaving(false);
        }
    };

    const sections = data?.schema.sections ?? [];
    const current = sections.find((item) => item.id === section) ?? sections[0] ?? null;

    const pages =
        current && appearance && data
            ? current.groups.filter((entry) => groupCount(current, entry, theme, appearance, data.tokenGroups) > 0)
            : [];

    const results = data && query.trim() !== '' ? search(sections, theme, query) : [];

    const preset = appearance ? matchingPreset(theme, appearance.tokens) : null;

    return (
        <>
            {open && <DeviceBar />}

            <div
                aria-hidden={!open}
                {...(!open ? { inert: '' } : {})}
                className={cn(
                    'dz-scope dz-chrome fixed inset-y-0 left-0 z-[70] flex flex-col rounded-3xl border border-line bg-card font-sans shadow-panel',
                    'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                    open ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ width: EDITOR_WIDTH, maxWidth: '100vw' }}
            >
                <div className={'relative flex min-h-0 flex-1'}>
                    {}
                    <SectionRail
                        sections={sections}
                        active={current?.id ?? null}
                        searchOpen={searchOpen}
                        onSearch={() => setSearchOpen((was) => !was)}
                        onClose={close}
                        onPick={(id) => {
                            setSearchOpen(false);
                            openSection(id);
                        }}
                    />

                    {loading || !data || !appearance ? (
                        <div className={'flex min-w-0 flex-1 items-center justify-center text-ink-faint'}>
                            <Loader2 className={'h-5 w-5 animate-spin'} aria-hidden={'true'} />
                        </div>
                    ) : (
                        <div ref={body} className={'min-w-0 flex-1 overflow-y-auto px-4 pb-4 pt-4'}>
                            {current && (
                                <SectionBody
                                    section={current}
                                    pages={pages}
                                    data={data}
                                    theme={theme}
                                    appearance={appearance}
                                    onTheme={patch}
                                    onAppearance={patchAppearance}
                                    onError={fail}
                                />
                            )}
                        </div>
                    )}

                    {searchOpen && data && (
                        <SearchPopover
                            query={query}
                            results={results}
                            theme={theme}
                            eggs={data.eggs}
                            permissions={data.permissions ?? {}}
                            onQuery={setQuery}
                            onChange={patch}
                            onError={fail}
                            onGo={(sectionId, groupId) => {
                                setSearchOpen(false);
                                openSection(sectionId, groupId);
                            }}
                            onClose={() => setSearchOpen(false)}
                        />
                    )}
                </div>

                {demo ? (
                    <footer className={'shrink-0 p-3'}></footer>
                ) : (
                    <footer className={'flex shrink-0 items-center gap-2 border-t border-line-field p-3'}>
                        <button
                            type={'button'}
                            onClick={() => setResetAsked(true)}
                            disabled={saving}
                            className={
                                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-raised px-3 text-[13px] font-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink disabled:opacity-50'
                            }
                        >
                            <RotateCcw className={'h-4 w-4'} aria-hidden={'true'} />
                            {'Reset'}
                        </button>

                        <input
                            ref={importInput}
                            type={'file'}
                            accept={'application/json,.json'}
                            className={'hidden'}
                            onChange={(event) => {
                                const chosen = event.target.files?.[0];

                                event.target.value = '';

                                if (chosen) {
                                    void importTheme(chosen);
                                }
                            }}
                        />

                        <button
                            type={'button'}
                            onClick={() => void exportTheme()}
                            disabled={saving}
                            title={'Export this design to a file'}
                            aria-label={'Export this design to a file'}
                            className={
                                'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-raised text-ink-muted transition-colors hover:bg-overlay hover:text-ink disabled:opacity-50'
                            }
                        >
                            <Download className={'h-4 w-4'} aria-hidden={'true'} />
                        </button>

                        <button
                            type={'button'}
                            onClick={() => importInput.current?.click()}
                            disabled={saving}
                            title={'Import a design from a file'}
                            aria-label={'Import a design from a file'}
                            className={
                                'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-raised text-ink-muted transition-colors hover:bg-overlay hover:text-ink disabled:opacity-50'
                            }
                        >
                            <Upload className={'h-4 w-4'} aria-hidden={'true'} />
                        </button>

                        <button
                            type={'button'}
                            onClick={() => void save()}
                            disabled={saving || !dirty}
                            className={
                                'ml-auto inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-btn px-4 text-[13px] font-semibold text-btn-ink transition-colors hover:bg-btn/90 disabled:opacity-50'
                            }
                        >
                            {saving ? (
                                <Loader2 className={'h-4 w-4 animate-spin'} aria-hidden={'true'} />
                            ) : (
                                <Save className={'h-4 w-4'} aria-hidden={'true'} />
                            )}
                            {dirty ? 'Save for everyone' : 'Saved'}
                        </button>
                    </footer>
                )}
            </div>

            {!open && previewing && !demo && (
                <div
                    className={cn(
                        'dz-scope font-sans fixed right-5 z-[75] flex items-center gap-2 rounded-2xl',
                        'border border-line-field bg-card/95 p-2 pl-3.5 text-ink shadow-panel backdrop-blur'
                    )}
                    style={{ bottom: '5.5rem' }}
                >
                    <span className={'flex items-center gap-1.5 pr-1 text-[13px] font-medium text-ink-muted'}>
                        <Eye className={'h-4 w-4 text-accent'} aria-hidden={'true'} />
                        {'Previewing unsaved design'}
                    </span>

                    <button
                        type={'button'}
                        onClick={() => setEditorOpen(true)}
                        className={
                            'inline-flex h-8 items-center gap-1.5 rounded-lg bg-raised px-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink'
                        }
                    >
                        <Pencil className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        {'Edit'}
                    </button>

                    <button
                        type={'button'}
                        onClick={discard}
                        disabled={saving}
                        className={
                            'inline-flex h-8 items-center gap-1.5 rounded-lg bg-raised px-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink disabled:opacity-50'
                        }
                    >
                        <RotateCcw className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        {'Discard'}
                    </button>

                    <button
                        type={'button'}
                        onClick={() => void save()}
                        disabled={saving}
                        className={
                            'inline-flex h-8 items-center gap-1.5 rounded-lg bg-btn px-3 text-[13px] font-semibold text-btn-ink transition-colors hover:bg-btn/90 disabled:opacity-50'
                        }
                    >
                        {saving ? (
                            <Loader2 className={'h-3.5 w-3.5 animate-spin'} aria-hidden={'true'} />
                        ) : (
                            <Save className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                        )}
                        {'Save'}
                    </button>
                </div>
            )}

            {}
            <PresetsDialog
                open={presetsOpen && appearance !== null}
                active={preset}
                onPick={(chosen) => {
                    applyPreset(chosen);
                    setPresetsOpen(false);
                }}
                onClose={() => setPresetsOpen(false)}
            />

            <ResetDialog
                open={resetAsked}
                busy={saving}
                onConfirm={() => void resetShape()}
                onClose={() => !saving && setResetAsked(false)}
            />
        </>
    );
}

function ResetDialog({
    open,
    busy,
    onConfirm,
    onClose,
}: {
    open: boolean;
    busy: boolean;
    onConfirm: () => void;
    onClose: () => void;
}) {
    return (
        <Transition show={open} as={Fragment}>
            <Dialog onClose={onClose} className={'dz-scope relative z-[95] font-sans'}>
                <Transition.Child
                    as={Fragment}
                    enter={'transition duration-150 ease-out'}
                    enterFrom={'opacity-0'}
                    enterTo={'opacity-100'}
                    leave={'transition duration-100 ease-in'}
                    leaveFrom={'opacity-100'}
                    leaveTo={'opacity-0'}
                >
                    <div aria-hidden={'true'} className={'fixed inset-0 bg-black/50 backdrop-blur-sm'} />
                </Transition.Child>

                <div className={'fixed inset-0 flex items-center justify-center p-4'}>
                    <Transition.Child
                        as={Fragment}
                        enter={'transition duration-150 ease-out'}
                        enterFrom={'scale-95 opacity-0'}
                        enterTo={'scale-100 opacity-100'}
                        leave={'transition duration-100 ease-in'}
                        leaveFrom={'scale-100 opacity-100'}
                        leaveTo={'scale-95 opacity-0'}
                    >
                        <Dialog.Panel
                            className={
                                'dz-chrome w-full max-w-md overflow-hidden rounded-3xl border border-line-field dz-on-raised bg-raised p-5 shadow-panel'
                            }
                        >
                            <div className={'min-w-0'}>
                                <Dialog.Title className={'text-[17px] font-semibold tracking-tight text-ink'}>
                                    {'Reset the whole design?'}
                                </Dialog.Title>
                                <p className={'mt-1.5 text-[13px] leading-relaxed text-ink-muted'}>
                                    {
                                        'Every option in this editor goes back to what the panel ships with: colours, typefaces, wallpaper, navigation, links, notices and your custom CSS. It applies to everyone the moment you press it, and there is no undo. Your logo and saved palettes are left alone.'
                                    }
                                </p>
                            </div>

                            <div className={'mt-6 flex justify-end gap-2'}>
                                <button
                                    type={'button'}
                                    onClick={onClose}
                                    disabled={busy}
                                    className={
                                        'inline-flex h-9 items-center rounded-xl bg-overlay/50 px-4 text-[13px] font-medium text-ink transition-colors hover:bg-overlay disabled:opacity-50'
                                    }
                                >
                                    {'Keep my design'}
                                </button>

                                <button
                                    type={'button'}
                                    onClick={onConfirm}
                                    disabled={busy}
                                    className={
                                        'inline-flex h-9 items-center gap-1.5 rounded-xl bg-danger px-4 text-[13px] font-semibold text-white transition-colors hover:bg-danger/85 disabled:opacity-50'
                                    }
                                >
                                    {busy ? (
                                        <Loader2 className={'h-4 w-4 animate-spin'} aria-hidden={'true'} />
                                    ) : (
                                        <RotateCcw className={'h-4 w-4'} aria-hidden={'true'} />
                                    )}
                                    {'Reset everything'}
                                </button>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}

function SectionRail({
    sections,
    active,
    searchOpen,
    onSearch,
    onPick,
    onClose,
}: {
    sections: SectionSpec[];
    active: string | null;
    searchOpen: boolean;
    onSearch: () => void;
    onPick: (id: string) => void;
    onClose: () => void;
}) {
    return (
        <nav
            aria-label={'Sections'}
            className={'relative flex w-16 shrink-0 flex-col items-center border-r border-line-field'}
        >
            <button
                type={'button'}
                onClick={onSearch}
                aria-expanded={searchOpen}
                aria-label={'Search every option'}
                title={'Search every option'}
                className={cn(
                    'mx-auto mt-2 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors',
                    searchOpen ? 'bg-accent text-ink-inverse' : 'text-ink-faint hover:bg-raised hover:text-ink'
                )}
            >
                <Search className={'h-7 w-7'} aria-hidden={'true'} />
            </button>

            <span aria-hidden={'true'} className={'my-2 h-px w-8 shrink-0 bg-line-field'} />

            <div className={'flex min-h-0 w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto pb-2'}>
                {sections.map((item) => {
                    const Icon = SECTION_ICONS[item.icon] ?? null;
                    const selected = item.id === active;

                    return (
                        <HoverTip key={item.id} label={item.label}>
                            <button
                                type={'button'}
                                onClick={() => onPick(item.id)}
                                aria-label={item.new === true ? `${item.label}, new` : item.label}
                                aria-current={selected ? 'page' : undefined}
                                className={cn(
                                    'relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors',
                                    selected
                                        ? 'bg-accent/15 text-accent'
                                        : item.new === true
                                        ? 'text-accent hover:bg-accent/15'
                                        : 'text-ink-faint hover:bg-raised hover:text-ink'
                                )}
                            >
                                <span aria-hidden={'true'} className={'block h-8 w-8'}>
                                    {Icon ? <Icon /> : <LayoutGrid className={'h-8 w-8'} />}
                                </span>

                                {item.new === true && !selected && (
                                    <span
                                        aria-hidden={'true'}
                                        className={'absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent'}
                                    />
                                )}
                            </button>
                        </HoverTip>
                    );
                })}
            </div>

            <span aria-hidden={'true'} className={'h-px w-8 shrink-0 bg-line-field'} />

            <button
                type={'button'}
                onClick={onClose}
                aria-label={'Close the editor'}
                title={'Close the editor'}
                className={
                    'mx-auto mb-2 mt-2 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                }
            >
                <X className={'h-7 w-7'} aria-hidden={'true'} />
            </button>
        </nav>
    );
}

function SearchPopover({
    query,
    results,
    theme,
    eggs,
    permissions,
    onQuery,
    onChange,
    onError,
    onGo,
    onClose,
}: {
    query: string;
    results: Result[];
    theme: ThemeConfig;
    eggs: EditorEgg[];
    permissions: PermissionCatalogue;
    onQuery: (next: string) => void;
    onChange: (key: keyof ThemeConfig, value: unknown) => void;
    onError: (message: string) => void;
    onGo: (section: string, group: string) => void;
    onClose: () => void;
}) {
    const box = useRef<HTMLDivElement>(null);
    const field = useRef<HTMLInputElement>(null);

    useEffect(() => {
        field.current?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const onPointerDown = (event: MouseEvent) => {
            if (!box.current?.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('keydown', onKeyDown);

        const timer = window.setTimeout(() => document.addEventListener('mousedown', onPointerDown), 0);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('mousedown', onPointerDown);
            window.clearTimeout(timer);
        };
    }, [onClose]);

    const searching = query.trim() !== '';

    return (
        <div
            ref={box}
            role={'dialog'}
            aria-label={'Search every option'}
            className={
                'absolute left-[4.25rem] top-2 z-[80] flex max-h-[calc(100%-1rem)] w-[calc(100%-5rem)] flex-col overflow-hidden rounded-2xl border border-line-field bg-card/95 shadow-panel backdrop-blur-xl'
            }
        >
            <div className={'relative shrink-0 p-2'}>
                <Search
                    aria-hidden={'true'}
                    className={
                        'pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint'
                    }
                />

                <input
                    ref={field}
                    type={'search'}
                    value={query}
                    onChange={(event) => onQuery(event.target.value)}
                    placeholder={'Search every option'}
                    aria-label={'Search every option'}
                    className={cn(
                        'h-11 w-full rounded-xl border-0 bg-raised pl-10 pr-9 text-[14px] text-ink',
                        'placeholder:text-ink-faint focus:ring-2 focus:ring-accent',
                        '[&::-webkit-search-cancel-button]:appearance-none'
                    )}
                />

                {searching && (
                    <button
                        type={'button'}
                        onClick={() => onQuery('')}
                        aria-label={'Clear the search'}
                        className={
                            'absolute right-4 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint transition-colors hover:text-ink'
                        }
                    >
                        <X className={'h-4 w-4'} aria-hidden={'true'} />
                    </button>
                )}
            </div>

            <div className={'min-h-0 flex-1 overflow-y-auto px-2 pb-2'}>
                {!searching ? (
                    <p className={'px-2 py-6 text-center text-[13px] text-ink-faint'}>
                        {'Type the name of the thing you want to change.'}
                    </p>
                ) : (
                    <>
                        <p className={'px-2 pb-2 text-[12px] text-ink-faint'}>
                            {`${results.length} ${results.length === 1 ? 'option' : 'options'} found`}
                        </p>

                        <SearchResults
                            results={results}
                            theme={theme}
                            eggs={eggs}
                            permissions={permissions}
                            onChange={onChange}
                            onError={onError}
                            onGo={onGo}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

interface Result {
    section: SectionSpec | null;
    sectionId: string;
    sectionLabel: string;
    groupId: string;
    groupLabel: string;
    label: string;
    option: OptionSpec | null;
}

function search(sections: SectionSpec[], theme: ThemeConfig, query: string): Result[] {
    const needle = query.trim().toLowerCase();
    const hits: Result[] = [];

    const matches = (...text: (string | undefined)[]) =>
        text.some((entry) => (entry ?? '').toLowerCase().includes(needle));

    for (const section of sections) {
        for (const group of section.groups) {
            for (const option of group.options) {
                if (!matches(option.label, option.hint) || !applies(option, theme)) {
                    continue;
                }

                hits.push({
                    section,
                    sectionId: section.id,
                    sectionLabel: section.label,
                    groupId: group.id,
                    groupLabel: group.label,
                    label: option.label,
                    option,
                });
            }
        }
    }

    for (const entry of REMOTE_OPTIONS) {
        if (!matches(entry.label, entry.hint)) {
            continue;
        }

        const owner = sections.find((item) => item.id === entry.section);
        const group = owner?.groups.find((item) => item.id === entry.group);

        hits.push({
            section: owner ?? null,
            sectionId: entry.section,
            sectionLabel: owner?.label ?? entry.section,
            groupId: entry.group,
            groupLabel: group?.label ?? entry.group,
            label: entry.label,
            option: null,
        });
    }

    return hits;
}

function SearchResults({
    results,
    theme,
    eggs,
    permissions,
    onChange,
    onError,
    onGo,
}: {
    results: Result[];
    theme: ThemeConfig;
    eggs: EditorEgg[];
    permissions: PermissionCatalogue;
    onChange: (key: keyof ThemeConfig, value: unknown) => void;
    onError: (message: string) => void;
    onGo: (section: string, group: string) => void;
}) {
    if (results.length === 0) {
        return (
            <div className={'px-4 py-8 text-center'}>
                <p className={'text-[15px] font-medium text-ink'}>{'Nothing matches that'}</p>
                <p className={'mt-1 text-[13px] text-ink-faint'}>{'Try the name of the thing you want to change.'}</p>
            </div>
        );
    }

    return (
        <div className={'space-y-2.5'}>
            {results.map((result) => (
                <div
                    key={`${result.sectionId}:${result.groupId}:${result.label}`}
                    className={'rounded-2xl bg-raised/50 p-3.5'}
                >
                    <button
                        type={'button'}
                        onClick={() => onGo(result.sectionId, result.groupId)}
                        className={
                            'mb-2 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint transition-colors hover:text-accent'
                        }
                    >
                        {`${result.sectionLabel} · ${result.groupLabel}`}
                    </button>

                    {result.option ? (
                        <Option
                            option={result.option}
                            theme={theme}
                            eggs={eggs}
                            permissions={permissions}
                            onChange={onChange}
                            onError={onError}
                        />
                    ) : (
                        <button
                            type={'button'}
                            onClick={() => onGo(result.sectionId, result.groupId)}
                            className={'flex w-full items-center gap-2 text-left'}
                        >
                            <span className={'min-w-0 flex-1 text-[15px] font-semibold tracking-tight text-ink'}>
                                {result.label}
                            </span>
                            <span className={'shrink-0 text-[12px] text-accent'}>{'Open'}</span>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

function Glyph({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <svg
            viewBox={'0 0 24 24'}
            fill={'none'}
            stroke={'currentColor'}
            strokeWidth={2}
            strokeLinecap={'round'}
            strokeLinejoin={'round'}
            aria-hidden={'true'}
            className={className}
        >
            {children}
        </svg>
    );
}

function DesktopGlyph({ className }: { className?: string }) {
    return (
        <Glyph className={className}>
            <rect x={'2'} y={'4'} width={'20'} height={'13'} rx={'2'} />
            <path d={'M8 21h8M12 17v4'} />
        </Glyph>
    );
}

function TabletGlyph({ className }: { className?: string }) {
    return (
        <Glyph className={className}>
            <rect x={'5'} y={'2'} width={'14'} height={'20'} rx={'2'} />
            <path d={'M12 18h.01'} />
        </Glyph>
    );
}

function MobileGlyph({ className }: { className?: string }) {
    return (
        <Glyph className={className}>
            <rect x={'7'} y={'2'} width={'10'} height={'20'} rx={'2'} />
            <path d={'M12 18h.01'} />
        </Glyph>
    );
}

function DeviceBar() {
    const device = useDevice();
    const width = usePreviewWidth();

    const options: { id: Device; label: string; icon: ComponentType<{ className?: string }> }[] = [
        { id: 'desktop', label: 'Desktop', icon: DesktopGlyph },
        { id: 'tablet', label: 'Tablet', icon: TabletGlyph },
        { id: 'mobile', label: 'Mobile', icon: MobileGlyph },
    ];

    const anchor =
        width === null
            ? { left: `calc(${EDITOR_WIDTH} + 1rem)` }
            : { left: `calc(${EDITOR_WIDTH} + (100vw - ${EDITOR_WIDTH}) / 2)`, transform: 'translateX(-50%)' };

    return (
        <div
            style={anchor}
            className={
                'dz-scope fixed top-3 z-[75] hidden items-center gap-1 rounded-full bg-card/80 p-1 shadow-panel ring-1 ring-line-field backdrop-blur-md [@media(min-width:1024px)]:flex'
            }
        >
            {options.map((option) => (
                <button
                    key={option.id}
                    type={'button'}
                    onClick={() => setDevice(option.id)}
                    aria-pressed={device === option.id}
                    title={option.label}
                    aria-label={option.label}
                    className={cn(
                        'inline-flex h-7 items-center justify-center gap-1.5 rounded-full px-2.5 transition-colors',
                        device === option.id
                            ? 'bg-accent text-ink-inverse'
                            : 'text-ink-muted hover:bg-raised hover:text-ink'
                    )}
                >
                    <option.icon className={'h-4 w-4'} aria-hidden={'true'} />
                    <span className={'text-[12px] font-medium'}>{option.label}</span>
                </button>
            ))}

            {width !== null && (
                <span className={'px-1.5 text-[11px] font-medium tabular-nums text-ink-faint'}>{`${width}px`}</span>
            )}
        </div>
    );
}

function groupAnchor(section: string, group: string): string {
    return `dz-editor-${section}-${group}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
}

function SectionBody({
    section,
    pages,
    data,
    theme,
    appearance,
    onTheme,
    onAppearance,
    onError,
}: {
    section: SectionSpec;
    pages: GroupSpec[];
    data: EditorData;
    theme: ThemeConfig;
    appearance: EditorAppearance;
    onTheme: (key: keyof ThemeConfig, value: unknown) => void;
    onAppearance: (next: EditorAppearance) => void;
    onError: (message: string) => void;
}) {
    return (
        <div className={'space-y-7'}>
            {pages.map((page) => (
                <section key={page.id} id={groupAnchor(section.id, page.id)} className={'space-y-4'}>
                    <div className={'flex items-center gap-2.5'}>
                        <p className={'text-[12px] font-semibold uppercase tracking-wider text-ink-faint'}>
                            {page.label}
                        </p>
                        <span aria-hidden={'true'} className={'h-px flex-1 bg-ink/10'} />
                    </div>

                    <GroupBody
                        section={section}
                        group={page}
                        data={data}
                        theme={theme}
                        appearance={appearance}
                        onTheme={onTheme}
                        onAppearance={onAppearance}
                        onError={onError}
                    />
                </section>
            ))}
        </div>
    );
}

function GroupBody({
    section,
    group,
    data,
    theme,
    appearance,
    onTheme,
    onAppearance,
    onError,
}: {
    section: SectionSpec;
    group: GroupSpec;
    data: EditorData;
    theme: ThemeConfig;
    appearance: EditorAppearance;
    onTheme: (key: keyof ThemeConfig, value: unknown) => void;
    onAppearance: (next: EditorAppearance) => void;
    onError: (message: string) => void;
}) {
    if (section.remote === 'appearance') {
        return section.id === 'brand' ? (
            <BrandSection appearance={appearance} group={group.id} onChange={onAppearance} onError={onError} />
        ) : (
            <ColourSection
                appearance={appearance}
                groups={data.tokenGroups}
                group={group.id}
                onChange={onAppearance}
                onError={onError}
            />
        );
    }

    if (section.remote === 'addons') {
        return <AddonsSection />;
    }

    if (section.remote === 'interface') {
        return (
            <TypeSection
                appearance={appearance}
                catalogue={data.fontCatalogue}
                group={group.id}
                onChange={onAppearance}
                onError={onError}
            />
        );
    }

    return (
        <div className={'space-y-5'}>
            {group.options
                .filter((option) => applies(option, theme))
                .map((option) => (
                    <div key={option.key} className={'space-y-2'}>
                        <Option
                            option={option}
                            theme={theme}
                            eggs={data.eggs}
                            permissions={data.permissions ?? {}}
                            onChange={onTheme}
                            onError={onError}
                        />

                        {option.key === 'toast.position' && (
                            <ToastSample glass={theme['toast.glass']} position={theme['toast.position']} />
                        )}
                    </div>
                ))}
        </div>
    );
}

function Option({
    option,
    theme,
    eggs,
    permissions,
    onChange,
    onError,
}: {
    option: OptionSpec;
    theme: ThemeConfig;
    eggs: EditorEgg[];
    permissions: PermissionCatalogue;
    onChange: (key: keyof ThemeConfig, value: unknown) => void;
    onError: (message: string) => void;
}) {
    const value = theme[option.key];
    const set = (next: unknown) => onChange(option.key, next);

    switch (option.type) {
        case 'choice':
            return (
                <ChoiceField
                    label={option.label}
                    hint={option.hint}
                    choices={option.choices ?? []}
                    preview={option.preview}
                    value={value as string}
                    onChange={set}
                />
            );

        case 'toggle':
            return <ToggleField label={option.label} hint={option.hint} value={value as boolean} onChange={set} />;

        case 'range':
            return (
                <RangeField
                    label={option.label}
                    hint={option.hint}
                    value={value as number}
                    min={option.min ?? 0}
                    max={option.max ?? 100}
                    step={option.step ?? 1}
                    unit={option.unit ?? ''}
                    preview={option.preview}
                    onChange={set}
                />
            );

        case 'text':
            return (
                <TextField
                    label={option.label}
                    hint={option.hint}
                    value={value as string}
                    maxLength={option.max}
                    placeholder={option.placeholder}
                    multiline={option.multiline}
                    onChange={set}
                />
            );

        case 'image':
            return (
                <ImageField
                    label={option.label}
                    hint={option.hint}
                    value={value as string}
                    uploadUrl={EDITOR_ROUTES.background}
                    onChange={set}
                    onError={onError}
                />
            );

        case 'images':
            return (
                <ImageListField
                    label={option.label}
                    hint={option.hint}
                    value={value as ThemeImage[]}
                    max={option.max ?? 32}
                    uploadUrl={EDITOR_ROUTES.background}
                    onChange={set}
                    onError={onError}
                />
            );

        case 'links':
            return (
                <LinkListField
                    label={option.label}
                    hint={option.hint}
                    value={value as SidebarLink[]}
                    max={option.max ?? 12}
                    onChange={set}
                />
            );

        case 'quickLinks':
            return (
                <QuickLinkListField
                    label={option.label}
                    hint={option.hint}
                    value={value as QuickLinkCard[]}
                    max={option.max ?? 8}
                    onChange={set}
                />
            );

        case 'navItems':
            return (
                <PanelLinksField
                    label={option.label}
                    hint={option.hint}
                    value={value as SidebarNavItem[]}
                    labels={NAV_LABELS}
                    onChange={set}
                />
            );

        case 'serverTabs':
            return (
                <ServerTabsField
                    label={option.label}
                    hint={option.hint}
                    tabs={theme['manager.nav']}
                    groups={theme['manager.groups']}
                    permissions={permissions}
                    eggs={eggs}
                    max={option.max ?? 64}
                    onTabs={(next) => onChange('manager.nav', next)}
                    onGroups={(next) => onChange('manager.groups', next)}
                />
            );

        case 'overviewBlocks':
            return (
                <OverviewBlocksField
                    label={option.label}
                    hint={option.hint}
                    value={value as OverviewBlock[]}
                    max={option.max ?? 12}
                    headerShown={serverHeaderVisible(theme)}
                    navbar={theme['manager.mode'] === 'navbar'}
                    onChange={set}
                />
            );

        case 'navGroups':
            return null;

        case 'locales':
            return (
                <LocalesField
                    label={option.label}
                    hint={option.hint}
                    enabled={value as string[]}
                    fallback={theme['locale.default']}
                    onEnabled={set}
                    onDefault={(next) => onChange('locale.default', next)}
                />
            );

        case 'locale':
            return null;

        case 'eggArt':
            return (
                <EggArtField
                    label={option.label}
                    hint={option.hint}
                    value={value as EggArt[]}
                    eggs={eggs}
                    max={option.max ?? 200}
                    onChange={set}
                    onError={onError}
                />
            );

        case 'rules':
            return (
                <ConsoleRulesField
                    label={option.label}
                    hint={option.hint}
                    value={value as ConsoleRule[]}
                    max={option.max ?? 12}
                    onChange={set}
                />
            );

        case 'css':
            return (
                <CssRulesField
                    label={option.label}
                    hint={option.hint}
                    value={value as CssRule[]}
                    max={option.max ?? 50}
                    onChange={set}
                />
            );

        case 'notices':
            return (
                <NoticeListField
                    label={option.label}
                    hint={option.hint}
                    value={value as ThemeNotice[]}
                    max={option.max ?? 8}
                    nodes={option.nodes === true}
                    uploadUrl={EDITOR_ROUTES.background}
                    onChange={set}
                    onError={onError}
                />
            );

        default:
            return null;
    }
}

export default ThemeEditor;
