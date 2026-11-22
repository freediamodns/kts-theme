import { useEffect, useState } from 'react';

export function useExternalStore<T>(subscribe: (listener: () => void) => () => void, snapshot: () => T): T {
    const [value, setValue] = useState<T>(snapshot);

    useEffect(() => {
        setValue(snapshot());

        return subscribe(() => setValue(snapshot()));
    }, [subscribe, snapshot]);

    return value;
}
