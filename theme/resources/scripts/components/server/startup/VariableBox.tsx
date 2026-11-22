import React, { memo, useEffect, useState } from 'react';
import isEqual from 'react-fast-compare';
import { Save } from 'lucide-react';
import { ServerEggVariable } from '@/api/server/types';
import updateStartupVariable from '@/api/server/updateStartupVariable';
import getServerStartup from '@/api/swr/getServerStartup';
import { usePermissions } from '@/plugins/usePermissions';
import { ServerContext } from '@/state/server';
import { Button, Input, Select, SelectOption, useToast } from '@/dezerx/components/ui';
import { apiMessage } from '@/dezerx/components/console/Section';
import { useT } from '@/i18n';

const VariableBox = ({ variable }: { variable: ServerEggVariable }) => {
    const t = useT();
    const { toast } = useToast();

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const [canEdit] = usePermissions(['startup.update']);
    const { mutate } = getServerStartup(uuid);

    const editable = canEdit && variable.isEditable;

    const [value, setValue] = useState(variable.serverValue ?? '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setValue(variable.serverValue ?? '');
    }, [variable.serverValue]);

    const dirty = value !== (variable.serverValue ?? '');

    const save = () => {
        setSaving(true);

        updateStartupVariable(uuid, variable.envVariable, value)
            .then(([response, invocation]) => {
                void mutate(
                    (data) => ({
                        ...data,
                        invocation,
                        variables: (data.variables || []).map((v) =>
                            v.envVariable === response.envVariable ? response : v
                        ),
                    }),
                    false
                );

                toast(`${variable.name} saved.`, { tone: 'success' });
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, `${variable.name} could not be saved.`), { tone: 'error' });
            })
            .then(() => setSaving(false));
    };

    const choices = choicesFor(variable.rules, value);

    const hint = !variable.isEditable
        ? t('startup.variableLocked')
        : !canEdit
        ? t('startup.imageDenied')
        : variable.description || undefined;

    return (
        <div className={'flex flex-col rounded-2xl bg-card p-4'}>
            <p className={'text-sm font-medium text-ink'}>{variable.name}</p>

            <div className={'mt-3 flex items-end gap-2'}>
                <div className={'min-w-0 flex-1'}>
                    {choices ? (
                        <Select
                            value={value}
                            onChange={setValue}
                            disabled={!editable}
                            label={variable.envVariable}
                            hint={hint}
                            options={choices}
                        />
                    ) : (
                        <Input
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                            disabled={!editable}
                            readOnly={!editable}
                            label={variable.envVariable}
                            placeholder={variable.defaultValue}
                            hint={hint}
                        />
                    )}
                </div>

                {editable && (
                    <Button
                        size={'md'}
                        variant={'primary'}
                        loading={saving}
                        disabled={!dirty}
                        onClick={save}
                        icon={<Save className={'h-4 w-4'} />}
                        className={'shrink-0'}
                    >
                        {'Save'}
                    </Button>
                )}
            </div>
        </div>
    );
};

function choicesFor(rules: string[], current: string): SelectOption[] | null {
    const list = rules.find((rule) => rule.toLowerCase().startsWith('in:'));

    let values = list
        ? list
              .slice(3)
              .split(',')
              .map((value) => value.trim().replace(/^["']|["']$/g, ''))
              .filter((value) => value !== '')
        : null;

    if (!values && rules.some((rule) => rule.toLowerCase() === 'boolean')) {
        values = current === 'true' || current === 'false' ? ['true', 'false'] : ['1', '0'];
    }

    if (!values || values.length === 0) {
        return null;
    }

    if (!values.includes(current)) {
        values = [current, ...values];
    }

    return values.map((value) => ({
        value,
        label: value === '1' ? 'Enabled (1)' : value === '0' ? 'Disabled (0)' : value,
    }));
}

export default memo(VariableBox, isEqual);
