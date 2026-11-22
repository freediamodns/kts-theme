import { RefObject, useEffect, useRef, useState } from 'react';

export function useNarrow<T extends HTMLElement>(breakpoint: number): [RefObject<T>, boolean] {
    const ref = useRef<T>(null);
    const [narrow, setNarrow] = useState(false);

    useEffect(() => {
        const element = ref.current;

        if (!element || typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width ?? element.clientWidth;

            setNarrow(width > 0 && width < breakpoint);
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, [breakpoint]);

    return [ref, narrow];
}

export default useNarrow;
