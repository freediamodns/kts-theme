import React, { useContext, useEffect } from 'react';
import { Schedule, Task } from '@/api/server/schedules/getServerSchedules';
import { Field as FormikField, Form, Formik, FormikHelpers, useField } from 'formik';
import { ServerContext } from '@/state/server';
import createOrUpdateScheduleTask from '@/api/server/schedules/createOrUpdateScheduleTask';
import { httpErrorToHuman } from '@/api/http';
import Field from '@/components/elements/Field';
import FlashMessageRender from '@/components/FlashMessageRender';
import { boolean, number, object, string } from 'yup';
import useFlash from '@/plugins/useFlash';
import FormikFieldWrapper from '@/components/elements/FormikFieldWrapper';
import tw from 'twin.macro';
import Label from '@/components/elements/Label';
import { Textarea } from '@/components/elements/Input';
import { Button } from '@/components/elements/button/index';
import Select from '@/components/elements/Select';
import ModalContext from '@/context/ModalContext';
import asModal from '@/hoc/asModal';
import FormikSwitch from '@/components/elements/FormikSwitch';
import { useT, type TranslateFn } from '@/i18n';

interface Props {
    schedule: Schedule;

    task?: Task;
}

interface Values {
    action: string;
    payload: string;
    timeOffset: string;
    continueOnFailure: boolean;
}

const buildSchema = (t: TranslateFn) =>
    object().shape({
        action: string().required().oneOf(['command', 'power', 'backup']),
        payload: string().when('action', {
            is: (v) => v !== 'backup',
            then: string().required(t('taskModal.payloadRequired')),
            otherwise: string(),
        }),
        continueOnFailure: boolean(),
        timeOffset: number()
            .typeError(t('taskModal.offsetNumber'))
            .required(t('taskModal.offsetRequired'))
            .min(0, t('taskModal.offsetMin'))
            .max(900, t('taskModal.offsetMax')),
    });

const ActionListener = () => {
    const [{ value }, { initialValue: initialAction }] = useField<string>('action');
    const [, { initialValue: initialPayload }, { setValue, setTouched }] = useField<string>('payload');

    useEffect(() => {
        if (value !== initialAction) {
            setValue(value === 'power' ? 'start' : '');
            setTouched(false);
        } else {
            setValue(initialPayload || '');
            setTouched(false);
        }
    }, [value]);

    return null;
};

const TaskDetailsModal = ({ schedule, task }: Props) => {
    const t = useT();
    const { dismiss } = useContext(ModalContext);
    const { clearFlashes, addError } = useFlash();

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const appendSchedule = ServerContext.useStoreActions((actions) => actions.schedules.appendSchedule);
    const backupLimit = ServerContext.useStoreState((state) => state.server.data!.featureLimits.backups);

    useEffect(() => {
        return () => {
            clearFlashes('schedule:task');
        };
    }, []);

    const submit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes('schedule:task');
        if (backupLimit === 0 && values.action === 'backup') {
            setSubmitting(false);
            addError({
                message: t('taskModal.noBackupSlots'),
                key: 'schedule:task',
            });
        } else {
            createOrUpdateScheduleTask(uuid, schedule.id, task?.id, values)
                .then((task) => {
                    let tasks = schedule.tasks.map((t) => (t.id === task.id ? task : t));
                    if (!schedule.tasks.find((t) => t.id === task.id)) {
                        tasks = [...tasks, task];
                    }

                    appendSchedule({ ...schedule, tasks });
                    dismiss();
                })
                .catch((error) => {
                    console.error(error);
                    setSubmitting(false);
                    addError({ message: httpErrorToHuman(error), key: 'schedule:task' });
                });
        }
    };

    return (
        <Formik
            onSubmit={submit}
            validationSchema={buildSchema(t)}
            initialValues={{
                action: task?.action || 'command',
                payload: task?.payload || '',
                timeOffset: task?.timeOffset.toString() || '0',
                continueOnFailure: task?.continueOnFailure || false,
            }}
        >
            {({ isSubmitting, values }) => (
                <Form css={tw`m-0`}>
                    <FlashMessageRender byKey={'schedule:task'} css={tw`mb-4`} />
                    <h2 css={tw`text-2xl mb-6`}>{t(task ? 'scheduleMap.editTask' : 'taskModal.createTask')}</h2>
                    <div css={tw`flex`}>
                        <div css={tw`mr-2 w-1/3`}>
                            <Label>{t('schedules.action')}</Label>
                            <ActionListener />
                            <FormikFieldWrapper name={'action'}>
                                <FormikField as={Select} name={'action'}>
                                    <option value={'command'}>{t('schedules.actionCommand')}</option>
                                    <option value={'power'}>{t('schedules.actionPower')}</option>
                                    <option value={'backup'}>{t('schedules.actionBackup')}</option>
                                </FormikField>
                            </FormikFieldWrapper>
                        </div>
                        <div css={tw`flex-1 ml-6`}>
                            <Field
                                name={'timeOffset'}
                                label={t('taskModal.timeOffset')}
                                description={t('taskModal.timeOffsetHelp')}
                            />
                        </div>
                    </div>
                    <div css={tw`mt-6`}>
                        {values.action === 'command' ? (
                            <div>
                                <Label>{t('taskModal.payload')}</Label>
                                <FormikFieldWrapper name={'payload'}>
                                    <FormikField as={Textarea} name={'payload'} rows={6} />
                                </FormikFieldWrapper>
                            </div>
                        ) : values.action === 'power' ? (
                            <div>
                                <Label>{t('taskModal.payload')}</Label>
                                <FormikFieldWrapper name={'payload'}>
                                    <FormikField as={Select} name={'payload'}>
                                        <option value={'start'}>{t('taskModal.powerStart')}</option>
                                        <option value={'restart'}>{t('taskModal.powerRestart')}</option>
                                        <option value={'stop'}>{t('taskModal.powerStop')}</option>
                                        <option value={'kill'}>{t('taskModal.powerKill')}</option>
                                    </FormikField>
                                </FormikFieldWrapper>
                            </div>
                        ) : (
                            <div>
                                <Label>{t('taskModal.ignoredFiles')}</Label>
                                <FormikFieldWrapper name={'payload'} description={t('taskModal.ignoredFilesHelp')}>
                                    <FormikField as={Textarea} name={'payload'} rows={6} />
                                </FormikFieldWrapper>
                            </div>
                        )}
                    </div>
                    <div css={tw`mt-6 bg-neutral-700 border border-neutral-800 shadow-inner p-4 rounded`}>
                        <FormikSwitch
                            name={'continueOnFailure'}
                            description={t('taskModal.continueHelp')}
                            label={t('taskModal.continueLabel')}
                        />
                    </div>
                    <div css={tw`flex justify-end mt-6`}>
                        <Button type={'submit'} disabled={isSubmitting}>
                            {t(task ? 'scheduleEdit.saveChanges' : 'taskModal.createTask')}
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    );
};

export default asModal<Props>()(TaskDetailsModal);
