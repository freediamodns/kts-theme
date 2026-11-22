import React, { useCallback, useEffect, useState } from 'react';
import isEqual from 'react-fast-compare';
import { Rocket, Save } from 'lucide-react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import VariableBox from '@/components/server/startup/VariableBox';
import getServerStartup from '@/api/swr/getServerStartup';
import setSelectedDockerImage from '@/api/server/setSelectedDockerImage';
import { httpErrorToHuman } from '@/api/http';
import { ServerError } from '@/components/elements/ScreenBlock';
import { ServerContext } from '@/state/server';
import { useDeepCompareEffect } from '@/plugins/useDeepCompareEffect';
import { usePermissions } from '@/plugins/usePermissions';
import { Button, Input, Select, useToast } from '@/dezerx/components/ui';
import { SectionEmpty, SectionHeader, SectionSkeleton, apiMessage } from '@/dezerx/components/console/Section';
import StartupPresets from '@/dezerx/components/console/StartupPresets';
import { useT } from '@/i18n';

const StartupContainer = () => {
    const t = useT();
    const { toast } = useToast();

    const [canEdit] = usePermissions(['startup.update']);

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const variables = ServerContext.useStoreState(
        ({ server }) => ({
            variables: server.data!.variables,
            invocation: server.data!.invocation,
            dockerImage: server.data!.dockerImage,
        }),
        isEqual
    );

    const { data, error, isValidating, mutate } = getServerStartup(uuid, {
        ...variables,
        dockerImages: { [variables.dockerImage]: variables.dockerImage },
    });

    const setServerFromState = ServerContext.useStoreActions((actions) => actions.server.setServerFromState);

    const [image, setImage] = useState(variables.dockerImage);
    const [saving, setSaving] = useState(false);

    const isCustomImage =
        data &&
        !Object.values(data.dockerImages)
            .map((value) => value.toLowerCase())
            .includes(variables.dockerImage.toLowerCase());

    useEffect(() => {
        mutate();
    }, []);

    useDeepCompareEffect(() => {
        if (!data) return;

        setServerFromState((s) => ({
            ...s,
            invocation: data.invocation,
            variables: data.variables,
        }));
    }, [data]);

    useEffect(() => {
        setImage(variables.dockerImage);
    }, [variables.dockerImage]);

    const saveImage = useCallback(() => {
        setSaving(true);

        setSelectedDockerImage(uuid, image)
            .then(() => {
                setServerFromState((s) => ({ ...s, dockerImage: image }));
                toast(t('startup.imageUpdated'), { tone: 'success' });
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('startup.imageFailed')), { tone: 'error' });
            })
            .then(() => setSaving(false));
    }, [uuid, image, setServerFromState, toast]);

    if (!data) {
        return !error || (error && isValidating) ? (
            <ServerContentBlock title={t('startup.title')}>
                <SectionSkeleton label={t('startup.loading')} />
            </ServerContentBlock>
        ) : (
            <ServerError title={t('common.oops')} message={httpErrorToHuman(error)} onRetry={() => mutate()} />
        );
    }

    const images = Object.entries(data.dockerImages);
    const selectable = images.length > 1 && !isCustomImage && canEdit;

    return (
        <ServerContentBlock title={t('startup.title')}>
            <div className={'space-y-6'}>
                <div className={'space-y-3'}>
                    <SectionHeader title={t('startup.commandTitle')} description={t('startup.commandDescription')} />
                    <pre
                        className={
                            'overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-card p-4 text-xs leading-relaxed text-ink-muted'
                        }
                    >
                        {data.invocation}
                    </pre>
                </div>

                <StartupPresets uuid={uuid} canEdit={canEdit} onApplied={() => mutate()} />

                <div className={'space-y-3'}>
                    <SectionHeader title={t('startup.imageTitle')} description={t('startup.imageDescription')} />

                    <div className={'flex flex-wrap items-end gap-3 rounded-2xl bg-card p-4'}>
                        <div className={'min-w-0 flex-1'}>
                            {selectable ? (
                                <Select
                                    label={t('settings.image')}
                                    value={image}
                                    onChange={setImage}
                                    options={images.map(([label, value]) => ({
                                        label: label === value ? label : `${label} | ${value}`,
                                        value,
                                    }))}
                                />
                            ) : (
                                <Input
                                    label={t('settings.image')}
                                    value={variables.dockerImage}
                                    readOnly
                                    disabled
                                    hint={t(
                                        isCustomImage
                                            ? 'startup.imageCustom'
                                            : !canEdit
                                            ? 'startup.imageDenied'
                                            : 'startup.imageOnlyOne'
                                    )}
                                />
                            )}
                        </div>

                        {selectable && (
                            <Button
                                size={'md'}
                                variant={'primary'}
                                loading={saving}
                                disabled={image === variables.dockerImage}
                                onClick={saveImage}
                                icon={<Save className={'h-4 w-4'} />}
                            >
                                {t('common.save')}
                            </Button>
                        )}
                    </div>
                </div>

                <div className={'space-y-3'}>
                    <SectionHeader
                        title={t('startup.variablesTitle')}
                        description={t('startup.variablesDescription')}
                    />

                    {data.variables.length === 0 ? (
                        <SectionEmpty
                            icon={Rocket}
                            title={t('startup.noVariablesTitle')}
                            body={t('startup.noVariablesBody')}
                        />
                    ) : (
                        <div className={'grid gap-3 md:grid-cols-2'}>
                            {data.variables.map((variable) => (
                                <VariableBox key={variable.envVariable} variable={variable} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ServerContentBlock>
    );
};

export default StartupContainer;
