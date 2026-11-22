import React, { useEffect, useState } from 'react';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import Avatar from '@/components/Avatar';
import { cn } from '@/dezerx/lib/cn';
import { avatarSource, usePanelTheme } from '@/dezerx/lib/panelTheme';

const SHELL =
    'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-sm font-semibold text-accent ring-2 ring-accent/70';

export default function UserAvatar({ className }: { className?: string }) {
    const user = useStoreState((state: ApplicationStore) => state.user.data);
    const provider = usePanelTheme()['sidebar.avatar'];
    const custom = user?.avatarUrl ?? null;
    const source = user ? (custom !== null && custom !== '' ? custom : avatarSource(provider, user.avatarHash)) : null;

    const [failed, setFailed] = useState(false);

    useEffect(() => setFailed(false), [source]);

    if (!user) {
        return null;
    }

    const shell = cn(SHELL, 'h-9 w-9', className);

    if (source === null && provider === 'generated') {
        return (
            <span className={shell}>
                <Avatar.User size={40} />
            </span>
        );
    }

    if (source !== null && !failed) {
        return (
            <span className={shell}>
                <img
                    src={source}
                    alt={''}
                    aria-hidden={'true'}
                    loading={'lazy'}
                    onError={() => setFailed(true)}
                    className={'h-full w-full object-cover'}
                />
            </span>
        );
    }

    return <span className={shell}>{user.username.charAt(0).toUpperCase()}</span>;
}

export { UserAvatar };
