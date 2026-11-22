import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ServerContext } from '@/state/server';
import { billingLink, readBillingInfo, type BillingInfo } from '@/api/server/billing';
import { DUE_ACTION, DUE_LABEL, dueNotice } from '@/dezerx/lib/billingNotice';
import { cn } from '@/dezerx/lib/cn';
import { Button, Notice } from '@/dezerx/components/ui';
import { useT } from '@/i18n';

export default function ServiceNotice() {
    const t = useT();
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);

    const [info, setInfo] = useState<BillingInfo | null>(null);

    useEffect(() => {
        let active = true;

        readBillingInfo(uuid)
            .then((response) => {
                if (active) {
                    setInfo(response);
                }
            })
            .catch(() => undefined);

        return () => {
            active = false;
        };
    }, [uuid]);

    const notice = dueNotice(info?.renewsAt ?? null, t);

    if (notice === null) {
        return null;
    }

    const invoice = info?.invoice ?? null;
    const link = billingLink(invoice?.url, info?.manageUrl);

    return (
        <Notice
            tone={notice.tone}
            title={notice.title}
            action={
                info === null ? undefined : (
                    <Button
                        size={'sm'}
                        variant={'secondary'}
                        disabled={link === ''}
                        onClick={() => link !== '' && window.open(link, '_blank', 'noopener')}
                        icon={<ExternalLink className={'h-3.5 w-3.5'} />}
                        className={cn(DUE_ACTION[notice.tone], 'border-0 max-sm:w-full')}
                    >
                        {t(DUE_LABEL[notice.tone])}
                    </Button>
                )
            }
        >
            {notice.body}
        </Notice>
    );
}
