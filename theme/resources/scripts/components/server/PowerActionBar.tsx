import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components/macro';
import tw from 'twin.macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { ServerContext } from '@/state/server';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import PowerButtons from '@/components/server/console/PowerButtons';
import Tooltip from '@/components/elements/tooltip/Tooltip';
import getServerResourceUsage, { ServerStats } from '@/api/server/getServerResourceUsage';
import { bytesToString, ip } from '@/lib/formatters';

type Timer = ReturnType<typeof setInterval>;

const Bar = styled.div`
    ${tw`w-full`};
    max-width: 1200px;
    margin: 0 auto;
    margin-bottom: 8px;
    border-radius: 12px;
`;

const Inner = styled.div`
    ${tw`py-3.5 flex items-center justify-between gap-6`};
`;

const Left = styled.div`
    ${tw`min-w-0 flex-1`};
`;

const TitleRow = styled.div`
    ${tw`flex items-center gap-3 min-w-0`};
`;

const Name = styled.div`
    ${tw`text-lg font-semibold truncate`};
    color: var(--gray-50);
`;

const StatusPill = styled.div<{ $tone: 'good' | 'warn' | 'bad' | 'muted' }>`
    ${tw`text-xs font-semibold px-1 py-1 rounded-full`};

    ${({ $tone }) => {
        if ($tone === 'good')
            return `
                background: color-mix(in srgb, var(--success-bg) 70%, transparent);
                color: var(--success-text);
            `;
        if ($tone === 'warn')
            return `
                background: color-mix(in srgb, var(--warning-bg) 70%, transparent);
                color: var(--warning-text);
            `;
        if ($tone === 'bad')
            return `
                background: color-mix(in srgb, var(--secondary-bg) 65%, transparent);
                color: var(--secondary-text);
            `;
        return `
            background: color-mix(in srgb, var(--secondary-bg) 45%, transparent);
            color: var(--secondary-text);
        `;
    }}
`;

const Center = styled.div`
    ${tw`flex items-center gap-3`};
`;

const Right = styled.div`
    ${tw`flex items-center gap-3`};
`;

const PowerScope = styled.div`
    ${tw`flex items-center gap-3`};

    button,
    a {
        border-radius: 5px;
    }

    button.bg-primary-500,
    a.bg-primary-500 {
        border: 1px solid var(--success-border) !important;
        color: var(--success-text) !important;
    }

    button.bg-red-500,
    a.bg-red-500 {
        border: 1px solid var(--secondary-border) !important;
        color: var(--secondary-text) !important;
    }

    button.bg-neutral-700,
    button.bg-neutral-600,
    button.bg-gray-700,
    button.bg-gray-600,
    button.bg-zinc-700,
    button.bg-zinc-600 {
        border: 1px solid var(--warning-border) !important;
        color: var(--warning-text) !important;
    }
`;

const ViewDetailsButton = styled.button`
    ${tw`px-4 flex items-center no-underline transition-colors font-semibold text-sm`};
    
    height: 38px;
    padding: 8px 16px;
    border-radius: 5px !important;
    border: 1px solid transparent;

    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--gray-50);
    cursor: pointer;

    &:hover {
        background: color-mix(in srgb, var(--accent) 26%, transparent);
        border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    }
`;

const AdminLink = styled.a`
    ${tw`h-9 w-9 rounded-lg flex items-center justify-center no-underline transition-colors`};
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--gray-50);
    border-radius: 5px !important;

    &:hover {
        background: color-mix(in srgb, var(--accent) 26%, transparent);
        border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    }
`;

const ModalOverlay = styled.div`
    ${tw`fixed inset-0 flex items-center justify-center z-50`};
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
    ${tw`relative w-full max-w-2xl mx-4 rounded-xl p-6`};
    background: var(--gray-700);
    border: 1px solid var(--gray-500);
    max-height: 90vh;
    overflow-y: auto;
`;

const ModalHeader = styled.div`
    ${tw`flex items-center justify-between mb-6 pb-4`};
    border-bottom: 1px solid var(--gray-600);
`;

const ModalTitle = styled.h2`
    ${tw`text-2xl font-bold`};
    color: var(--gray-50);
`;

const CloseButton = styled.button`
    ${tw`h-9 w-9 rounded-lg flex items-center justify-center transition-colors`};
    background: color-mix(in srgb, var(--gray-600) 50%, transparent);
    border: 1px solid var(--gray-500);
    color: var(--gray-300);
    cursor: pointer;

    &:hover {
        background: var(--gray-600);
        color: var(--gray-50);
    }
`;

const ModalSection = styled.div`
    ${tw`mb-6`};
`;

const SectionTitle = styled.h3`
    ${tw`text-sm font-semibold mb-3 uppercase tracking-wide`};
    color: var(--gray-400);
`;

const DetailGrid = styled.div`
    ${tw`grid grid-cols-2 gap-4`};
`;

const DetailItem = styled.div`
    ${tw`flex flex-col gap-1`};
`;

const DetailLabel = styled.div`
    ${tw`text-sm`};
    color: var(--gray-50);
`;

const DetailValue = styled.div`
    ${tw`text-base font-semibold`};
    color: var(--gray-200);
`;

const ClickableValue = styled.button`
    ${tw`inline-flex items-center text-base font-semibold`};
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
    color: var(--gray-50);

    &:hover {
        text-decoration: underline;
        text-decoration-color: color-mix(in srgb, var(--gray-50) 55%, transparent);
    }
`;

const statusMeta = (value?: string | null) => {
    const s = (value || '').toLowerCase();
    if (s === 'running' || s === 'online') return { label: 'Online', tone: 'good' as const };
    if (s === 'offline') return { label: 'Offline', tone: 'bad' as const };
    if (s === 'starting') return { label: 'Starting', tone: 'warn' as const };
    if (s === 'stopping') return { label: 'Stopping', tone: 'warn' as const };
    return { label: value || 'Unknown', tone: 'muted' as const };
};

const getPreferredAddress = (data: any) => {
    const list = Array.isArray(data?.allocations) ? data.allocations : [];
    const primary = list.find((a: any) => a?.isDefault) || list[0] || null;
    if (!primary) return '';
    const host = primary?.alias || ip(primary?.ip || '') || '';
    const port = primary?.port != null ? String(primary.port) : '';
    if (!host || !port) return '';
    return `${host}:${port}`;
};

export default (props: any) => {
    const rootAdmin = useStoreState((state: ApplicationStore) => !!state.user.data?.rootAdmin);

    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const internalId = ServerContext.useStoreState((state) => state.server.data?.internalId);
    const data = ServerContext.useStoreState((state) => state.server.data);

    const [stats, setStats] = useState<ServerStats | null>(null);
    const [copied, setCopied] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const interval = useRef<Timer>(null) as React.MutableRefObject<Timer>;

    useEffect(() => {
        if (!uuid) return;

        const pull = () =>
            getServerResourceUsage(uuid)
                .then(setStats)
                .catch(() => setStats(null));

        pull().then(() => {
            interval.current = setInterval(() => {
                if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
                pull();
            }, 5000);
        });

        return () => interval.current && clearInterval(interval.current);
    }, [uuid]);

    const name = data?.name || 'Server';
    const address = getPreferredAddress(data);
    const limits = data?.limits;

    const meta = statusMeta(stats?.status || (data as any)?.status);

    const cpu = stats ? `${stats.cpuUsagePercent.toFixed(2)}%` : null;

    const memUsed = stats ? bytesToString(stats.memoryUsageInBytes) : null;
    const memLimit = typeof limits?.memory === 'number' && limits.memory > 0 ? `${limits.memory} MiB` : null;

    const diskUsed = stats ? bytesToString(stats.diskUsageInBytes) : null;
    const diskLimit = typeof limits?.disk === 'number' && limits.disk > 0 ? `${limits.disk} MiB` : null;

    const networkRx = stats ? bytesToString(stats.networkRxInBytes) : null;
    const networkTx = stats ? bytesToString(stats.networkTxInBytes) : null;

    const copyAddress = async () => {
        if (!address) return;

        const done = () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 900);
        };

        try {
            await navigator.clipboard.writeText(address);
            done();
        } catch {
            const el = document.createElement('textarea');
            el.value = address;
            el.style.position = 'fixed';
            el.style.opacity = '0';
            document.body.appendChild(el);
            el.focus();
            el.select();
            try {
                document.execCommand('copy');
                done();
            } finally {
                document.body.removeChild(el);
            }
        }
    };

    return (
        <>
            <Bar {...props}>
                <Inner>
                    <Left>
                        <TitleRow>
                            <StatusPill $tone={meta.tone}></StatusPill>
                            <Name>{name}</Name>
                        </TitleRow>
                    </Left>

                    <Center>
                        <PowerScope>
                            <PowerButtons className={'flex items-center gap-3'} />
                        </PowerScope>
                         <ViewDetailsButton onClick={() => setIsModalOpen(true)}>
                            Details
                        </ViewDetailsButton>

                        {rootAdmin && internalId ? (
                            <AdminLink href={`/admin/servers/view/${internalId}`} target={'_blank'} rel={'noreferrer'}>
                                <FontAwesomeIcon icon={faExternalLinkAlt} />
                            </AdminLink>
                        ) : null}
                    </Center>

                </Inner>
            </Bar>

            {isModalOpen && (
                <ModalOverlay onClick={() => setIsModalOpen(false)}>
                    <ModalContent onClick={(e) => e.stopPropagation()}>
                        <ModalHeader>
                            <ModalTitle>Server Details</ModalTitle>
                            <CloseButton onClick={() => setIsModalOpen(false)}>
                                <FontAwesomeIcon icon={faTimes} />
                            </CloseButton>
                        </ModalHeader>

                        <ModalSection>
                            <SectionTitle>General Information</SectionTitle>
                            <DetailGrid>
                                <DetailItem>
                                    <DetailLabel>Server Name</DetailLabel>
                                    <DetailValue>{name}</DetailValue>
                                </DetailItem>
                                {uuid && (
                                    <DetailItem>
                                        <DetailLabel>UUID</DetailLabel>
                                        <DetailValue style={{ fontSize: '0.875rem' }}>{uuid}</DetailValue>
                                    </DetailItem>
                                )}
                                {address && (
                                    <DetailItem>
                                        <DetailLabel>Address</DetailLabel>
                                        <Tooltip placement={'top'} content={copied ? 'Copied' : 'Copy to clipboard'}>
                                            <ClickableValue type={'button'} onClick={copyAddress}>
                                                {address}
                                            </ClickableValue>
                                        </Tooltip>
                                    </DetailItem>
                                )}
                            </DetailGrid>
                        </ModalSection>

                        <ModalSection>
                            <SectionTitle>Resource Usage</SectionTitle>
                            <DetailGrid>
                                {cpu && (
                                    <DetailItem>
                                        <DetailLabel>CPU Usage</DetailLabel>
                                        <DetailValue>{cpu}</DetailValue>
                                    </DetailItem>
                                )}
                                {(memUsed || memLimit) && (
                                    <DetailItem>
                                        <DetailLabel>Memory Usage</DetailLabel>
                                        <DetailValue>
                                            {memUsed || 'n/a'}
                                            {memLimit && ` / ${memLimit}`}
                                        </DetailValue>
                                    </DetailItem>
                                )}
                                {(diskUsed || diskLimit) && (
                                    <DetailItem>
                                        <DetailLabel>Disk Usage</DetailLabel>
                                        <DetailValue>
                                            {diskUsed || 'n/a'}
                                            {diskLimit && ` / ${diskLimit}`}
                                        </DetailValue>
                                    </DetailItem>
                                )}
                                {networkRx && (
                                    <DetailItem>
                                        <DetailLabel>Network Received</DetailLabel>
                                        <DetailValue>{networkRx}</DetailValue>
                                    </DetailItem>
                                )}
                                {networkTx && (
                                    <DetailItem>
                                        <DetailLabel>Network Transmitted</DetailLabel>
                                        <DetailValue>{networkTx}</DetailValue>
                                    </DetailItem>
                                )}
                            </DetailGrid>
                        </ModalSection>

                        {limits && (
                            <ModalSection>
                                <SectionTitle>Resource Limits</SectionTitle>
                                <DetailGrid>
                                    {limits.cpu != null && (
                                        <DetailItem>
                                            <DetailLabel>CPU Limit</DetailLabel>
                                            <DetailValue>{limits.cpu}%</DetailValue>
                                        </DetailItem>
                                    )}
                                    {memLimit && (
                                        <DetailItem>
                                            <DetailLabel>Memory Limit</DetailLabel>
                                            <DetailValue>{memLimit}</DetailValue>
                                        </DetailItem>
                                    )}
                                    {diskLimit && (
                                        <DetailItem>
                                            <DetailLabel>Disk Limit</DetailLabel>
                                            <DetailValue>{diskLimit}</DetailValue>
                                        </DetailItem>
                                    )}
                                </DetailGrid>
                            </ModalSection>
                        )}
                    </ModalContent>
                </ModalOverlay>
            )}
        </>
    );
};