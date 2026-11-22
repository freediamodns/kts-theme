import http from '@/api/http';
import { isDemoUser } from '@/dezerx/lib/demo';
import { demoResourceUsage } from '@/dezerx/lib/demoServer';

export type ServerPowerState = 'offline' | 'starting' | 'running' | 'stopping';

export interface ServerStats {
    status: ServerPowerState;
    isSuspended: boolean;
    memoryUsageInBytes: number;
    cpuUsagePercent: number;
    diskUsageInBytes: number;
    networkRxInBytes: number;
    networkTxInBytes: number;
    uptime: number;
}

export default (server: string, limits?: { memory: number; cpu: number; disk: number }): Promise<ServerStats> => {
    return new Promise((resolve, reject) => {
        http.get(`/api/client/servers/${server}/resources`)
            .then(({ data: { attributes } }) =>
                resolve(
                    isDemoUser()
                        ? demoResourceUsage(
                              { uuid: server, port: 0, limits: limits ?? { memory: 0, cpu: 0, disk: 0 } },
                              attributes.is_suspended
                          )
                        : {
                              status: attributes.current_state,
                              isSuspended: attributes.is_suspended,
                              memoryUsageInBytes: attributes.resources.memory_bytes,
                              cpuUsagePercent: attributes.resources.cpu_absolute,
                              diskUsageInBytes: attributes.resources.disk_bytes,
                              networkRxInBytes: attributes.resources.network_rx_bytes,
                              networkTxInBytes: attributes.resources.network_tx_bytes,
                              uptime: attributes.resources.uptime,
                          }
                )
            )
            .catch(reject);
    });
};
