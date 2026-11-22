import React, { memo } from 'react';
import { useRawPermissions } from '@/plugins/usePermissions';
import { isDemoUser } from '@/dezerx/lib/demo';
import DemoGate from '@/dezerx/components/DemoGate';
import isEqual from 'react-fast-compare';

interface Props {
    action: string | string[];
    matchAny?: boolean;
    renderOnError?: React.ReactNode | null;
    strict?: boolean;
    children: React.ReactNode;
}

const Can = ({ action, matchAny = false, renderOnError, strict = false, children }: Props) => {
    const can = useRawPermissions(action);

    const allowed = (matchAny && can.filter((p) => p).length > 0) || (!matchAny && can.every((p) => p));

    if (allowed) {
        return <>{children}</>;
    }

    if (!strict && isDemoUser()) {
        return <DemoGate>{children}</DemoGate>;
    }

    return <>{renderOnError}</>;
};

export default memo(Can, isEqual);
