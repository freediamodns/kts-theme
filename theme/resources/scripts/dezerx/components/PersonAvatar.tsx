import React, { useEffect, useState } from 'react';
import Avatar from '@/components/Avatar';
import { cn } from '@/dezerx/lib/cn';
import { avatarSource, usePanelTheme } from '@/dezerx/lib/panelTheme';

const SHELL =
    'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 font-semibold text-accent';

export function PersonAvatar({
    hash,
    url,
    name,
    seed,
    size = 28,
    className,
}: {
    hash: string;
    url?: string | null;
    name: string | null;
    seed?: string;
    size?: number;
    className?: string;
}) {
    const provider = usePanelTheme()['sidebar.avatar'];
    const source = url !== null && url !== undefined && url !== '' ? url : avatarSource(provider, hash);

    const [failed, setFailed] = useState(false);

    useEffect(() => setFailed(false), [source]);

    const shell = cn(SHELL, className);

    if (source !== null && !failed) {
        return (
            <span className={shell}>
                <img
                    src={source}
                    alt={''}
                    aria-hidden={'true'}
                    loading={'lazy'}
                    decoding={'async'}
                    draggable={false}
                    onError={() => setFailed(true)}
                    className={'h-full w-full object-cover'}
                />
            </span>
        );
    }

    if (provider === 'generated') {
        return (
            <span className={shell}>
                <Avatar name={seed ?? (hash === '' ? name ?? 'system' : hash)} size={size} />
            </span>
        );
    }

    return <span className={shell}>{(name ?? '?').charAt(0).toUpperCase()}</span>;
}

export default PersonAvatar;
