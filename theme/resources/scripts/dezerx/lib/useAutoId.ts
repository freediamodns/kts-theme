import { useRef } from 'react';

let counter = 0;

export default function useAutoId(provided?: string): string {
    const ref = useRef<string>();

    if (provided) {
        return provided;
    }

    if (!ref.current) {
        counter += 1;
        ref.current = `dz-${counter}`;
    }

    return ref.current;
}
