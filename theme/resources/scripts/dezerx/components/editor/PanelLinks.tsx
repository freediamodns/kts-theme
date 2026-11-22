import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Settings2 } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { SIDEBAR_LINK_ICONS } from '@/dezerx/lib/linkIcons';
import { DEFAULT_NAV, type SidebarNavItem } from '@/dezerx/lib/panelTheme';
import { INPUT, IconPicker, move } from '@/dezerx/components/editor/Controls';
import { CHIP, GEAR, LABEL, Modal, ROW, STEP } from '@/dezerx/components/editor/EditorRows';
import { Checkbox } from '@/dezerx/components/ui';
import { useT } from '@/i18n';

export function PanelLinksField({
    hint,
    value,
    labels,
    onChange,
}: {
    label: string;
    hint?: string;
    value: SidebarNavItem[];
    labels: Record<string, string>;
    onChange: (value: SidebarNavItem[]) => void;
}) {
    const t = useT();
    const [editing, setEditing] = useState<string | null>(null);

    const patch = (key: string, next: Partial<SidebarNavItem>) =>
        onChange(value.map((item) => (item.key === key ? { ...item, ...next } : item)));

    const active = editing === null ? null : value.find((item) => item.key === editing) ?? null;

    const original = (key: string) => DEFAULT_NAV.find((item) => item.key === key)?.route ?? '/';

    return (
        <div className={'space-y-3'}>
            {hint && <p className={'text-[12px] leading-snug text-ink-faint'}>{hint}</p>}

            <div className={'overflow-hidden rounded-xl ring-1 ring-line-field'}>
                {value.map((item, index) => {
                    const Icon = SIDEBAR_LINK_ICONS[item.icon] ?? SIDEBAR_LINK_ICONS.link;
                    const name = item.label || labels[item.key] || item.key;

                    return (
                        <div key={item.key} className={cn(ROW, 'bg-card', !item.enabled && 'opacity-50')}>
                            <button
                                type={'button'}
                                onClick={() => setEditing(item.key)}
                                className={'flex min-w-0 flex-1 items-center gap-2.5 text-left'}
                            >
                                <Icon className={'h-5 w-5 shrink-0 text-ink-faint'} aria-hidden={'true'} />

                                <span className={'min-w-0 flex-1 truncate text-[15px] text-ink'}>{name}</span>

                                <span className={cn(CHIP, 'max-w-[9rem] truncate bg-overlay font-mono text-ink-faint')}>
                                    {item.route}
                                </span>
                            </button>

                            <button
                                type={'button'}
                                onClick={() => patch(item.key, { enabled: !item.enabled })}
                                aria-pressed={item.enabled}
                                aria-label={item.enabled ? t('editor.tabs.hide') : t('editor.tabs.show')}
                                className={cn(STEP, item.enabled && 'text-accent')}
                            >
                                {item.enabled ? (
                                    <Eye className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                                ) : (
                                    <EyeOff className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                                )}
                            </button>

                            <button
                                type={'button'}
                                onClick={() => onChange(move(value, index, index - 1))}
                                disabled={index === 0}
                                aria-label={t('editor.tabs.moveUp')}
                                className={STEP}
                            >
                                <ChevronUp className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                            </button>

                            <button
                                type={'button'}
                                onClick={() => onChange(move(value, index, index + 1))}
                                disabled={index === value.length - 1}
                                aria-label={t('editor.tabs.moveDown')}
                                className={STEP}
                            >
                                <ChevronDown className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                            </button>

                            <button
                                type={'button'}
                                onClick={() => setEditing(item.key)}
                                aria-label={t('editor.tabs.settings')}
                                className={GEAR}
                            >
                                <Settings2 className={'h-[18px] w-[18px]'} aria-hidden={'true'} />
                            </button>
                        </div>
                    );
                })}
            </div>

            <Modal
                open={active !== null}
                title={active ? active.label || labels[active.key] || active.key : ''}
                onClose={() => setEditing(null)}
            >
                {active && (
                    <>
                        <label className={'block space-y-1'}>
                            <span className={LABEL}>{t('editor.tabs.name')}</span>
                            <input
                                type={'text'}
                                value={active.label}
                                maxLength={40}
                                placeholder={labels[active.key] ?? active.key}
                                onChange={(event) => patch(active.key, { label: event.target.value })}
                                className={INPUT}
                            />
                        </label>

                        <label className={'block space-y-1'}>
                            <span className={LABEL}>{t('editor.tabs.address')}</span>
                            <input
                                type={'text'}
                                value={active.route}
                                maxLength={300}
                                placeholder={original(active.key)}
                                onChange={(event) => patch(active.key, { route: event.target.value })}
                                className={cn(INPUT, 'font-mono')}
                            />
                            <span className={'block text-[11px] leading-snug text-ink-faint'}>
                                {t('editor.tabs.addressBuiltIn', { path: original(active.key) })}
                            </span>
                        </label>

                        <div className={'space-y-1'}>
                            <span className={LABEL}>{t('editor.tabs.icon')}</span>
                            <IconPicker value={active.icon} onChange={(icon) => patch(active.key, { icon })} />
                        </div>

                        <Checkbox
                            size={'sm'}
                            label={t('editor.tabs.visible')}
                            checked={active.enabled}
                            onChange={() => patch(active.key, { enabled: !active.enabled })}
                        />
                    </>
                )}
            </Modal>
        </div>
    );
}

export default PanelLinksField;
