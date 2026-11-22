import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Share2, X } from 'lucide-react';
import http from '@/api/http';
import { Button } from '@/dezerx/components/ui';
import { useToast } from '@/dezerx/components/ui/Toast';
import { useT } from '@/i18n';

export default function ShareLog({
    uuid,
    collect,
    empty,
}: {
    uuid: string;
    collect: () => string;
    empty: boolean;
}) {
    const t = useT();
    const { toast } = useToast();

    const [confirming, setConfirming] = useState(false);
    const [sending, setSending] = useState(false);
    const [url, setUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (timer.current !== null) {
                clearTimeout(timer.current);
            }
        },
        []
    );

    const share = async () => {
        setConfirming(false);
        setSending(true);

        try {
            const { data } = await http.post(`/api/client/servers/${uuid}/console/share`, { content: collect() });

            setUrl(data.url);
        } catch (error) {
            const detail = (error as { response?: { data?: { errors?: { detail?: string }[] } } })?.response?.data
                ?.errors?.[0]?.detail;

            toast(detail ?? t('shareLog.failed'), { tone: 'error' });
        } finally {
            setSending(false);
        }
    };

    const copy = (value: string) => {
        void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);

            if (timer.current !== null) {
                clearTimeout(timer.current);
            }

            timer.current = setTimeout(() => {
                timer.current = null;
                setCopied(false);
            }, 1500);
        });
    };

    if (url) {
        return (
            <div className={'flex min-w-0 items-center gap-2 rounded-2xl bg-card px-3 py-1.5'}>
                <a
                    href={url}
                    target={'_blank'}
                    rel={'noreferrer noopener'}
                    className={'truncate text-xs text-accent underline underline-offset-2'}
                >
                    {url}
                </a>

                <span className={'shrink-0 text-[10px] text-ink-faint'}>{'public'}</span>

                <button
                    type={'button'}
                    aria-label={t('shareLog.copyLink')}
                    onClick={() => copy(url)}
                    className={
                        'shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                    }
                >
                    {copied ? (
                        <Check aria-hidden={'true'} className={'h-3 w-3 text-success'} />
                    ) : (
                        <Copy aria-hidden={'true'} className={'h-3 w-3'} />
                    )}
                </button>

                <button
                    type={'button'}
                    aria-label={t('shareLog.dismiss')}
                    onClick={() => setUrl(null)}
                    className={
                        'shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:bg-raised hover:text-ink'
                    }
                >
                    <X aria-hidden={'true'} className={'h-3 w-3'} />
                </button>
            </div>
        );
    }

    return (
        <Button
            size={'sm'}
            variant={confirming ? 'primary' : 'secondary'}
            loading={sending}
            disabled={empty}
            onClick={() => (confirming ? void share() : setConfirming(true))}
            onBlur={() => setConfirming(false)}
            title={t('shareLog.hint')}
            icon={<Share2 className={'h-3.5 w-3.5'} />}
        >
            {confirming ? t('shareLog.confirm') : t('shareLog.label')}
        </Button>
    );
}
