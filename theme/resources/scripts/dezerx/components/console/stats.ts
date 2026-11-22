import { createContext, useContext } from 'react';
import { ResourceStats } from '@/dezerx/components/console/useResourceSamples';

export const StatsContext = createContext<ResourceStats>({ samples: [], latest: null });

export function useServerStats(): ResourceStats {
    return useContext(StatsContext);
}
