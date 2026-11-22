import React, { useContext, useEffect, useState } from 'react';
import { Schedule } from '@/api/server/schedules/getServerSchedules';
import Field from '@/components/elements/Field';
import { Form, Formik, FormikHelpers } from 'formik';
import FormikSwitch from '@/components/elements/FormikSwitch';
import createOrUpdateSchedule from '@/api/server/schedules/createOrUpdateSchedule';
import { ServerContext } from '@/state/server';
import { httpErrorToHuman } from '@/api/http';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import tw from 'twin.macro';
import { Button } from '@/components/elements/button/index';
import ModalContext from '@/context/ModalContext';
import asModal from '@/hoc/asModal';
import Switch from '@/components/elements/Switch';
import ScheduleCheatsheetCards from '@/components/server/schedules/ScheduleCheatsheetCards';
import { useT } from '@/i18n';

interface Props {
    schedule?: Schedule;
}

interface Values {
    name: string;
    dayOfWeek: string;
    month: string;
    dayOfMonth: string;
    hour: string;
    minute: string;
    enabled: boolean;
    onlyWhenOnline: boolean;
}

const EditScheduleModal = ({ schedule }: Props) => {
    const t = useT();
    const { addError, clearFlashes } = useFlash();
    const { dismiss } = useContext(ModalContext);

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const appendSchedule = ServerContext.useStoreActions((actions) => actions.schedules.appendSchedule);
    const [showCheatsheet, setShowCheetsheet] = useState(false);

    useEffect(() => {
        return () => {
            clearFlashes('schedule:edit');
        };
    }, []);

    const submit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes('schedule:edit');
        createOrUpdateSchedule(uuid, {
            id: schedule?.id,
            name: values.name,
            cron: {
                minute: values.minute,
                hour: values.hour,
                dayOfWeek: values.dayOfWeek,
                month: values.month,
                dayOfMonth: values.dayOfMonth,
            },
            onlyWhenOnline: values.onlyWhenOnline,
            isActive: values.enabled,
        })
            .then((schedule) => {
                setSubmitting(false);
                appendSchedule(schedule);
                dismiss();
            })
            .catch((error) => {
                console.error(error);

                setSubmitting(false);
                addError({ key: 'schedule:edit', message: httpErrorToHuman(error) });
            });
    };

    return (
        <Formik
            onSubmit={submit}
            initialValues={
                {
                    name: schedule?.name || '',
                    minute: schedule?.cron.minute || '*/5',
                    hour: schedule?.cron.hour || '*',
                    dayOfMonth: schedule?.cron.dayOfMonth || '*',
                    month: schedule?.cron.month || '*',
                    dayOfWeek: schedule?.cron.dayOfWeek || '*',
                    enabled: schedule?.isActive ?? true,
                    onlyWhenOnline: schedule?.onlyWhenOnline ?? true,
                } as Values
            }
        >
            {({ isSubmitting }) => (
                <Form>
                    <h3 css={tw`text-2xl mb-6`}>
                        {t(schedule ? 'scheduleEdit.editTitle' : 'scheduleEdit.createTitle')}
                    </h3>
                    <FlashMessageRender byKey={'schedule:edit'} css={tw`mb-6`} />
                    <Field name={'name'} label={t('scheduleEdit.name')} description={t('scheduleEdit.nameHelp')} />
                    <div css={tw`grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6`}>
                        <Field name={'minute'} label={t('schedules.cron.minute')} />
                        <Field name={'hour'} label={t('schedules.cron.hour')} />
                        <Field name={'dayOfMonth'} label={t('schedules.cron.dayOfMonth')} />
                        <Field name={'month'} label={t('schedules.cron.month')} />
                        <Field name={'dayOfWeek'} label={t('schedules.cron.dayOfWeek')} />
                    </div>
                    <p css={tw`text-neutral-400 text-xs mt-2`}>{t('scheduleEdit.cronHelp')}</p>
                    <div css={tw`mt-6 bg-neutral-700 border border-neutral-800 shadow-inner p-4 rounded`}>
                        <Switch
                            name={'show_cheatsheet'}
                            description={t('scheduleEdit.cheatsheetHelp')}
                            label={t('scheduleEdit.cheatsheet')}
                            defaultChecked={showCheatsheet}
                            onChange={() => setShowCheetsheet((s) => !s)}
                        />
                        {showCheatsheet && (
                            <div css={tw`block md:flex w-full`}>
                                <ScheduleCheatsheetCards />
                            </div>
                        )}
                    </div>
                    <div css={tw`mt-6 bg-neutral-700 border border-neutral-800 shadow-inner p-4 rounded`}>
                        <FormikSwitch
                            name={'onlyWhenOnline'}
                            description={t('scheduleEdit.onlyOnlineHelp')}
                            label={t('scheduleEdit.onlyOnline')}
                        />
                    </div>
                    <div css={tw`mt-6 bg-neutral-700 border border-neutral-800 shadow-inner p-4 rounded`}>
                        <FormikSwitch
                            name={'enabled'}
                            description={t('scheduleEdit.enabledHelp')}
                            label={t('scheduleEdit.enabled')}
                        />
                    </div>
                    <div css={tw`mt-6 text-right`}>
                        <Button className={'w-full sm:w-auto'} type={'submit'} disabled={isSubmitting}>
                            {t(schedule ? 'scheduleEdit.saveChanges' : 'schedules.createSchedule')}
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    );
};

export default asModal<Props>()(EditScheduleModal);
