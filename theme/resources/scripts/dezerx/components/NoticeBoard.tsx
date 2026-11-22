import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { NOTICE_TONES, noticeSurface, usePanelTheme, type NoticeTone, type ThemeNotice } from '@/dezerx/lib/panelTheme';
import { linkIcon } from '@/dezerx/lib/linkIcons';
import { useT } from '@/i18n';

const STORAGE_KEY = 'dezerx.notices.dismissed';

const ICONS: Record<NoticeTone, typeof Info> = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: XCircle,
};

function readDismissed(): string[] {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
        return [];
    }
}

export function NoticeList({ notices }: { notices: ThemeNotice[] }) {
    const [dismissed, setDismissed] = useState<string[]>([]);

    useEffect(() => {
        setDismissed(readDismissed());
    }, []);

    const dismiss = (id: string) => {
        const next = [...dismissed, id];

        setDismissed(next);

        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(next.filter((entry) => notices.some((notice) => notice.id === entry)))
            );
        } catch {
        }
    };

    const shown = notices.filter((notice) => notice.enabled && !dismissed.includes(notice.id));

    if (shown.length === 0) {
        return null;
    }

    return (
        <div className={'space-y-3'}>
            {shown.map((notice) => (
                <Notice key={notice.id} notice={notice} onDismiss={() => dismiss(notice.id)} />
            ))}
        </div>
    );
}

export default function NoticeBoard() {
    return <NoticeList notices={usePanelTheme()['notice.dashboard']} />;
}

export function ServerNotices({ node }: { node: string }) {
    const notices = usePanelTheme()['notice.manager'];

    const matching = notices.filter(
        (notice) => (notice.nodes ?? []).length === 0 || (notice.nodes ?? []).includes(node)
    );

    return <NoticeList notices={matching} />;
}

function Notice({ notice, onDismiss }: { notice: ThemeNotice; onDismiss: () => void }) {
    const t = useT();
    const design = usePanelTheme()['notice.design'];
    const tone = NOTICE_TONES[notice.tone] ?? NOTICE_TONES.info;
    const external = /^https?:\/\//.test(notice.link ?? '');
    const asButton = notice.linkButton && notice.link;

    const icon = notice.iconImage ? (
        <img
            src={notice.iconImage}
            alt={''}
            aria-hidden={'true'}
            className={'mt-0.5 h-4 w-4 shrink-0 object-contain'}
        />
    ) : (
        (() => {
            const Icon = notice.icon ? linkIcon(notice.icon) : ICONS[notice.tone] ?? Info;

            return <Icon aria-hidden={'true'} className={cn('mt-0.5 h-4 w-4 shrink-0', tone.icon)} />;
        })()
    );

    const inlineLink = !asButton && notice.link ? (
        <a
            href={notice.link}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer noopener' : undefined}
            className={cn(
                'inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80',
                tone.icon
            )}
        >
            {notice.linkLabel || t('notices.readMore')}
            {external && <ExternalLink className={'h-3 w-3'} aria-hidden={'true'} />}
        </a>
    ) : null;

    return (
        <div
            className={cn(
                'flex flex-wrap gap-3 rounded-2xl p-4',
                asButton ? 'items-start sm:items-center' : 'items-start',
                noticeSurface(design, tone)
            )}
        >
            {icon}

            <div className={'min-w-0 flex-1'}>
                <div className={'flex flex-wrap items-start justify-between gap-x-4 gap-y-1'}>
                    {notice.title !== '' && (
                        <p className={'min-w-0 flex-1 break-words text-sm font-semibold tracking-tight text-ink'}>
                            {notice.title}
                        </p>
                    )}

                    {inlineLink}
                </div>

                {notice.body !== '' && (
                    <p className={cn('break-words text-sm leading-snug text-ink-muted', notice.title !== '' && 'mt-1')}>
                        {notice.body}
                    </p>
                )}
            </div>

            {asButton && (
                <a
                    href={notice.link}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noreferrer noopener' : undefined}
                    className={cn(
                        'order-last inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full',
                        'px-4 py-2 text-xs font-semibold transition-colors',
                        'sm:order-none sm:w-auto',
                        tone.solid
                    )}
                >
                    {notice.linkLabel || t('notices.readMore')}
                    {external && <ExternalLink className={'h-3 w-3'} aria-hidden={'true'} />}
                </a>
            )}

            {notice.dismissible && (
                <button
                    type={'button'}
                    onClick={onDismiss}
                    aria-label={t('common.dismiss')}
                    className={'-m-1 shrink-0 self-start rounded-lg p-1 text-ink-faint transition-colors hover:text-ink'}
                >
                    <X className={'h-3.5 w-3.5'} aria-hidden={'true'} />
                </button>
            )}
        </div>
    );
}

export { NoticeBoard };
