import React from 'react';
import { Archive, Ban, Hammer, ServerCog, TriangleAlert, Wrench } from 'lucide-react';
import { ServerContext } from '@/state/server';
import ScreenBlock from '@/components/elements/ScreenBlock';
import { useT } from '@/i18n';

export default () => {
    const t = useT();
    const status = ServerContext.useStoreState((state) => state.server.data?.status || null);
    const isTransferring = ServerContext.useStoreState((state) => state.server.data?.isTransferring || false);
    const isNodeUnderMaintenance = ServerContext.useStoreState(
        (state) => state.server.data?.isNodeUnderMaintenance || false
    );

    return status === 'installing' ? (
        <ScreenBlock icon={Hammer} busy title={t('conflict.rebuilding')} message={t('conflict.rebuildingBody')} />
    ) : status === 'install_failed' || status === 'reinstall_failed' ? (
        <ScreenBlock
            icon={TriangleAlert}
            title={t('conflict.installFailed')}
            message={t('conflict.installFailedBody')}
        />
    ) : status === 'suspended' ? (
        <ScreenBlock icon={Ban} title={t('conflict.suspended')} message={t('conflict.suspendedBody')} />
    ) : isNodeUnderMaintenance ? (
        <ScreenBlock icon={Wrench} title={t('conflict.maintenance')} message={t('conflict.maintenanceBody')} />
    ) : isTransferring ? (
        <ScreenBlock
            icon={ServerCog}
            busy
            title={t('conflict.transferring')}
            message={t('conflict.transferringBody')}
        />
    ) : (
        <ScreenBlock icon={Archive} busy title={t('conflict.restoring')} message={t('conflict.restoringBody')} />
    );
};
