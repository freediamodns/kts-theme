import React from 'react';
import { Check, Eye, EyeOff, Star } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { Field } from '@/dezerx/components/editor/Controls';
import { Flag } from '@/dezerx/components/LanguagePicker';
import { ALL_LOCALES, useT } from '@/i18n';

export function LocalesField({
    label,
    hint,
    enabled,
    fallback,
    onEnabled,
    onDefault,
}: {
    label: string;
    hint?: string;
    enabled: string[];
    fallback: string;
    onEnabled: (value: string[]) => void;
    onDefault: (value: string) => void;
}) {
    const t = useT();

    const all = ALL_LOCALES;
    const on = (code: string) => enabled.length === 0 || enabled.includes(code) || code === fallback;

    const live = all.filter((locale) => on(locale.code));

    const toggle = (code: string) => {
        if (code === fallback) {
            return;
        }

        const next = enabled.length === 0 ? all.map((locale) => locale.code) : [...enabled];

        onEnabled(
            next.includes(code)
                ? next.filter((one) => one !== code)
                : [...next, code].sort((a, b) => all.findIndex((l) => l.code === a) - all.findIndex((l) => l.code === b))
        );
    };

    return (
        <Field label={label} hint={hint}>
            <div className={'space-y-2'}>
                <p className={'text-[12px] text-ink-faint'}>
                    {t('editor.locales.summary', { live: live.length, total: all.length })}
                </p>

                <ul className={'overflow-hidden rounded-xl ring-1 ring-line-field'}>
                    {all.map((locale) => {
                        const shown = on(locale.code);
                        const isDefault = locale.code === fallback;
                        const partial = locale.coverage < 0.95;

                        return (
                            <li
                                key={locale.code}
                                className={cn(
                                    'flex items-center gap-2 border-t border-line-field bg-card px-2.5 py-2 first:border-t-0 transition-opacity',
                                    !shown && 'opacity-50'
                                )}
                            >
                                <Flag code={locale.flag} className={'text-base leading-none'} />

                                <div className={'min-w-0 flex-1'}>
                                    <p className={'truncate text-[13px] font-medium text-ink'}>
                                        {locale.name}
                                        {isDefault && (
                                            <span className={'ml-1.5 text-[11px] font-semibold uppercase text-accent'}>
                                                {t('editor.locales.default')}
                                            </span>
                                        )}
                                    </p>
                                    <p className={'truncate text-[11px] text-ink-faint'}>
                                        {locale.english}
                                        {' · '}
                                        <span className={'font-mono uppercase'}>{locale.code}</span>
                                        {partial && ` · ${Math.round(locale.coverage * 100)}%`}
                                    </p>
                                </div>

                                <button
                                    type={'button'}
                                    onClick={() => onDefault(locale.code)}
                                    disabled={isDefault}
                                    aria-label={t('editor.locales.makeDefault', { language: locale.english })}
                                    title={t('editor.locales.makeDefault', { language: locale.english })}
                                    className={cn(
                                        'shrink-0 rounded-lg p-1.5 transition-colors',
                                        isDefault
                                            ? 'text-accent'
                                            : 'text-ink-faint hover:bg-overlay hover:text-ink'
                                    )}
                                >
                                    {isDefault ? (
                                        <Check className={'h-4 w-4'} aria-hidden={'true'} />
                                    ) : (
                                        <Star className={'h-4 w-4'} aria-hidden={'true'} />
                                    )}
                                </button>

                                <button
                                    type={'button'}
                                    onClick={() => toggle(locale.code)}
                                    disabled={isDefault}
                                    aria-pressed={shown}
                                    aria-label={shown ? t('editor.locales.turnOff') : t('editor.locales.turnOn')}
                                    title={
                                        isDefault
                                            ? t('editor.locales.defaultStays')
                                            : shown
                                            ? t('editor.locales.turnOff')
                                            : t('editor.locales.turnOn')
                                    }
                                    className={cn(
                                        'shrink-0 rounded-lg p-1.5 transition-colors disabled:opacity-40',
                                        shown ? 'text-accent hover:bg-overlay' : 'text-ink-faint hover:text-ink'
                                    )}
                                >
                                    {shown ? (
                                        <Eye className={'h-4 w-4'} aria-hidden={'true'} />
                                    ) : (
                                        <EyeOff className={'h-4 w-4'} aria-hidden={'true'} />
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <p className={'text-[11px] leading-snug text-ink-faint'}>{t('editor.locales.reload')}</p>
            </div>
        </Field>
    );
}

export default LocalesField;
