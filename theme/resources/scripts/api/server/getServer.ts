import http, { FractalResponseData, FractalResponseList } from '@/api/http';
import { rawDataToServerAllocation, rawDataToServerEggVariable } from '@/api/transformers';
import { ServerEggVariable, ServerStatus } from '@/api/server/types';
import { Identifier } from '@/api/definitions';

export interface Allocation {
    id: number;
    ip: string;
    alias: string | null;
    port: number;
    notes: string | null;
    isDefault: boolean;
}

export interface Server {
    
    id: string | Identifier<'serv'>;
    identifier: Identifier<'serv'>; 
    internalId: number | string;

    
    __deprecatedUuidShort: string;
    uuid: string;
    name: string;
    node: string;
    nodeId: number;
    isNodeUnderMaintenance: boolean;
    status: ServerStatus;
    sftpDetails: {
        ip: string;
        port: number;
    };
    invocation: string;
    dockerImage: string;
    description: string;
    limits: {
        memory: number;
        swap: number;
        disk: number;
        io: number;
        cpu: number;
        threads: string;
    };
    eggFeatures: string[];
    egg?: { uuid: string; name: string };
    featureLimits: {
        databases: number;

        allocations: number;
        backups: number;
    };
    isTransferring: boolean;
    skipScripts: boolean;
    variables: ServerEggVariable[];
    allocations: Allocation[];
}

export const rawDataToServerObject = ({ attributes: data }: FractalResponseData): Server => ({
    id: data.identifier,
    identifier: data.server_identifier,
    internalId: data.internal_id,

    __deprecatedUuidShort: data.__deprecated_uuid_short,
    uuid: data.uuid,
    name: data.name,
    node: data.node,
    nodeId: Number(data.node_id ?? 0),
    isNodeUnderMaintenance: data.is_node_under_maintenance,
    status: data.status,
    invocation: data.invocation,
    dockerImage: data.docker_image,
    sftpDetails: {
        ip: data.sftp_details.ip,
        port: data.sftp_details.port,
    },
    description: typeof data.description === 'string' ? data.description : '',
    limits: { ...data.limits },
    eggFeatures: data.egg_features || [],
    egg: (() => {
        const egg = data.relationships?.egg as FractalResponseData | undefined;

        return egg?.attributes
            ? { uuid: egg.attributes.uuid as string, name: egg.attributes.name as string }
            : undefined;
    })(),
    featureLimits: { ...data.feature_limits },
    isTransferring: data.is_transferring,
    skipScripts: data.skip_scripts,
    variables: ((data.relationships?.variables as FractalResponseList | undefined)?.data || []).map(
        rawDataToServerEggVariable
    ),
    allocations: ((data.relationships?.allocations as FractalResponseList | undefined)?.data || []).map(
        rawDataToServerAllocation
    ),
});

export default (uuid: string): Promise<[Server, string[]]> => {
    return new Promise((resolve, reject) => {
        http.get(`/api/client/servers/${uuid}`, {
            params: { include: 'egg' },
        })
            .then(({ data }) =>
                resolve([
                    rawDataToServerObject(data),
                    
                    data.meta?.is_server_owner ? ['*'] : data.meta?.user_permissions || [],
                ])
            )
            .catch(reject);
    });
};
