import React, { useEffect, useState } from 'react';
import { Check, Copy, Globe, Trash2 } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { Button, Input, Notice, Select, Skeleton, SkeletonRegion, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import { FileDialog, FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { cn } from '@/dezerx/lib/cn';
import {
    SUBDOMAIN_NAME,
    SubdomainClaim,
    SubdomainPayload,
    claimSubdomain,
    getSubdomains,
    releaseSubdomain,
} from '@/api/server/subdomains';
import { useT } from '@/i18n';

export default function SubdomainsContainer() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { toast } = useToast();

    const [payload, setPayload] = useState<SubdomainPayload | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [name, setName] = useState('');
    const [domain, setDomain] = useState('');
    const [allocation, setAllocation] = useState('');
    const [busy, setBusy] = useState(false);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    useEffect(() => {
        let live = true;

        getSubdomains(uuid)
            .then((data) => {
                if (!live) {
                    return;
                }

                setPayload(data);
                setError(null);
                setDomain(String(data.domains[0]?.id ?? ''));
                setAllocation(
                    String((data.allocations.find((entry) => entry.primary) ?? data.allocations[0])?.id ?? '')
                );
            })
            .catch((error) => live && setError(error));

        return () => {
            live = false;
        };
    }, [uuid]);

    const claim = async () => {
        setBusy(true);

        try {
            const data = await claimSubdomain(uuid, {
                subdomain: name,
                domain: Number(domain),
                allocation: Number(allocation),
            });

            setPayload((current) => (current ? { ...current, records: data.records } : current));
            setName('');
            toast(t('subdomains.claimed', { name: data.message }), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('subdomains.claimFailed')), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const release = (record: SubdomainClaim) =>
        setDialog({
            title: t('subdomains.releaseTitle', { name: record.name }),
            body: t('subdomains.releaseBody'),
            confirmLabel: t('network.release'),
            destructive: true,
            onConfirm: async () => {
                try {
                    const data = await releaseSubdomain(uuid, record.id);

                    setPayload((current) => (current ? { ...current, records: data.records } : current));
                    toast(t('subdomains.released'), { tone: 'success' });
                } catch (error) {
                    toast(apiMessage(error, t('subdomains.releaseFailed')), { tone: 'error' });

                    throw error;
                }
            },
        });

    if (payload === null) {
        return (
            <ServerContentBlock title={t('subdomains.title')}>
                {error !== null ? (
                    <Notice tone={'danger'} title={t('subdomains.loadFailed')}>
                        {apiMessage(error, t('hytale.unreachable'))}
                    </Notice>
                ) : (
                    <SkeletonRegion label={t('subdomains.loading')}>
                        <Skeleton className={'h-24 w-full rounded-2xl'} />
                        <Skeleton className={'mt-3 h-44 w-full rounded-2xl'} />
                    </SkeletonRegion>
                )}
            </ServerContentBlock>
        );
    }

    const valid = SUBDOMAIN_NAME.test(name);
    const full = payload.records.length >= payload.max;
    const offered = payload.available && payload.domains.length > 0;

    return (
        <ServerContentBlock title={t('subdomains.title')}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <div className={'space-y-4'}>
                <SectionHeader title={t('subdomains.title')} description={t('subdomains.description')} />

                {!offered ? (
                    <SectionEmpty
                        icon={Globe}
                        title={t('subdomains.emptyTitle')}
                        body={t(
                            !payload.available
                                ? 'subdomains.emptyNoCloudflare'
                                : payload.anyDomains
                                ? 'subdomains.emptyNoDomainsForEgg'
                                : 'subdomains.emptyNoDomains'
                        )}
                    />
                ) : (
                    <div className={'space-y-3 rounded-2xl bg-card p-4'}>
                        <div className={'grid gap-3 sm:grid-cols-2'}>
                            <Input
                                label={t('common.name')}
                                placeholder={'play'}
                                value={name}
                                maxLength={32}
                                error={name !== '' && !valid ? t('subdomains.nameRule') : undefined}
                                onChange={(event) => setName(event.target.value.toLowerCase())}
                            />

                            <Select
                                label={t('subdomains.domain')}
                                value={domain}
                                onChange={setDomain}
                                options={payload.domains.map((entry) => ({
                                    value: String(entry.id),
                                    label: entry.domain,
                                }))}
                            />
                        </div>

                        <Select
                            label={t('subdomains.pointsAt')}
                            value={allocation}
                            onChange={setAllocation}
                            options={payload.allocations.map((entry) => ({
                                value: String(entry.id),
                                label: `${entry.host}:${entry.port}${
                                    entry.primary ? ` (${t('subdomains.primary')})` : ''
                                }`,
                            }))}
                        />

                        <div className={'flex flex-wrap items-center justify-between gap-3'}>
                            <p className={'text-[11px] text-ink-faint'}>
                                {t('subdomains.used', { count: payload.max, used: payload.records.length })}
                            </p>

                            <Button
                                size={'sm'}
                                variant={'primary'}
                                loading={busy}
                                disabled={!valid || full || allocation === ''}
                                title={full ? t('subdomains.fullHint') : undefined}
                                onClick={() => void claim()}
                            >
                                {t(full ? 'subdomains.noNamesLeft' : 'subdomains.claim')}
                            </Button>
                        </div>
                    </div>
                )}

                {payload.records.length > 0 && (
                    <div className={'space-y-1.5 rounded-2xl bg-card p-4'}>
                        <p className={'mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint'}>
                            {t('subdomains.yours')}
                        </p>

                        {payload.records.map((record) => (
                            <ClaimRow key={record.id} record={record} onRelease={() => release(record)} />
                        ))}
                    </div>
                )}
            </div>
        </ServerContentBlock>
    );
}

function ClaimRow({ record, onRelease }: { record: SubdomainClaim; onRelease: () => void }) {
    const t = useT();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) {
            return;
        }

        const timer = window.setTimeout(() => setCopied(false), 1500);

        return () => window.clearTimeout(timer);
    }, [copied]);

    const joinable = record.type === 'SRV' ? record.name : `${record.name}:${record.port ?? ''}`;

    return (
        <div className={'flex flex-wrap items-center gap-3 rounded-xl bg-overlay/40 p-3'}>
            <span className={'min-w-0 flex-1'}>
                <span className={'block truncate font-mono text-sm text-ink'}>{joinable}</span>
                <span className={'mt-0.5 block truncate text-[11px] text-ink-faint'}>
                    {`${record.type} · ${record.target}${record.port ? `:${record.port}` : ''}`}
                </span>
            </span>

            <button
                type={'button'}
                aria-label={t('subdomains.copyAddress')}
                onClick={() => void navigator.clipboard?.writeText(joinable).then(() => setCopied(true))}
                className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    copied ? 'text-success' : 'text-ink-faint hover:bg-raised hover:text-ink'
                )}
            >
                {copied ? <Check className={'h-4 w-4'} /> : <Copy className={'h-4 w-4'} />}
            </button>

            <Button
                size={'sm'}
                variant={'ghost'}
                onClick={onRelease}
                className={'text-danger hover:bg-danger/10 hover:text-danger'}
                icon={<Trash2 className={'h-3.5 w-3.5'} />}
            >
                {t('network.release')}
            </Button>
        </div>
    );
}
