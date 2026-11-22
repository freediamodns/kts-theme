import React from 'react';
import { cn } from '@/dezerx/lib/cn';
import useIpCountry from '@/dezerx/lib/useIpCountry';

export default function CountryFlag({ ip, className }: { ip: string | null; className?: string }) {
    const code = useIpCountry(ip);

    if (!code) {
        return null;
    }

    return (
        <img
            src={`/dezerx/flags/${code}.svg`}
            alt={code}
            title={code}
            width={18}
            height={12}
            loading={'lazy'}
            className={cn('h-3 w-[18px] shrink-0 rounded-[2px] object-cover', className)}
        />
    );
}

export { CountryFlag };
