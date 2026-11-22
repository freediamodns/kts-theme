import React, { useEffect, useState } from 'react';
import { CalendarClock, RefreshCw } from 'lucide-react';
import { ServerContext } from '@/state/server';
import { FreeServerEntry, getServerRenewal, renewServer } from '@/api/dezerx/serverCreate';
import { countdown, serverCreateRenewals } from '@/dezerx/lib/serverCreate';
import { apiMessage } from '@/dezerx/components/console/Section';
import { Button, useToast } from '@/dezerx/components/ui';
import { useT } from '@/i18n';

function useMinute(): void {
    const [, setTick] = useState(0);

    useEffect(() => {
        const timer = window.setInterval(() => setTick((value) => value + 1), 60_000);

        return () => window.clearInterval(timer);
    }, []);
}

export default function RenewChip() {
    const t = useT();
    const { toast } = useToast();
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);

    const [entry, setEntry] = useState<FreeServerEntry | null>(null);
    const [busy, setBusy] = useState(false);

    useMinute();

    useEffect(() => {
        let live = true;

        if (!serverCreateRenewals() || !uuid) {
            return;
        }

        getServerRenewal(uuid)
            .then((found) => live && setEntry(found))
            .catch(() => live && setEntry(null));

        return () => {
            live = false;
        };
    }, [uuid]);

    if (entry === null || entry.renewAt === null || !uuid) {
        return null;
    }

    const renew = async () => {
        if (busy) {
            return;
        }

        if (!entry.renewable) {
            toast(t('create.renewTooEarly'));

            return;
        }

        setBusy(true);

        try {
            setEntry(await renewServer(uuid));
            toast(t('create.renewed', { name: entry.name }), { tone: 'success' });
        } catch (error) {
            toast(apiMessage(error, t('create.renewFailed')), { tone: 'error' });
        }

        setBusy(false);
    };

    const due = entry.renewable || entry.suspended || entry.overdue;

    const left = countdown(entry.renewAt) ?? t('create.renewDue');

    return (
        <Button
            size={'sm'}
            loading={busy}
            variant={due ? 'primary' : 'secondary'}
            onClick={renew}
            className={'group'}
            title={entry.renewable ? undefined : t('create.renewTooEarly')}
            aria-label={due ? t('create.renewNow') : t('create.renewsInShort', { left })}
        >
            <span className={'grid place-items-center'}>
                <span
                    aria-hidden={'true'}
                    className={
                        'col-start-1 row-start-1 inline-flex items-center gap-1.5 tabular-nums transition-opacity duration-150 group-hover:opacity-0'
                    }
                >
                    <CalendarClock className={'h-3.5 w-3.5'} />
                    {left}
                </span>

                <span
                    aria-hidden={'true'}
                    className={
                        'col-start-1 row-start-1 inline-flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100'
                    }
                >
                    <RefreshCw className={'h-3.5 w-3.5'} />
                    {t('create.renewNow')}
                </span>
            </span>
        </Button>
    );
}

export { RenewChip };
