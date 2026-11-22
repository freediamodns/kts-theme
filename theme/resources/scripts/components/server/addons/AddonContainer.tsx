import React, { useCallback, useEffect, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import { SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import { AddonManager } from '@/dezerx/components/addons/AddonManager';
import { useToast } from '@/dezerx/components/ui';
import { AddonKind, AddonPayload, getInstalled } from '@/api/server/addons';

export default function AddonContainer({ kind, title, directory }: { kind: AddonKind; title: string; directory: string }) {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { toast } = useToast();

    const [payload, setPayload] = useState<AddonPayload | null>(null);

    const load = useCallback(() => {
        getInstalled(uuid, kind)
            .then(setPayload)
            .catch((error) => {
                setPayload({ available: false, addons: [], sources: [], loaders: [] });
                toast(apiMessage(error, `The ${directory} folder could not be read.`), { tone: 'error' });
            });
    }, [uuid, kind, directory]);

    useEffect(load, [load]);

    return (
        <ServerContentBlock title={title}>
            {payload === null ? (
                <SectionSkeleton label={`Loading ${directory.replace('/', '')}`} />
            ) : (
                <AddonManager uuid={uuid} kind={kind} directory={directory} payload={payload} onChanged={load} />
            )}
        </ServerContentBlock>
    );
}
