import React, { useState } from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import loginCheckpoint from '@/api/auth/loginCheckpoint';
import { ActionCreator } from 'easy-peasy';
import { StaticContext } from 'react-router';
import { Form, useFormikContext, withFormik } from 'formik';
import useFlash from '@/plugins/useFlash';
import { FlashStore } from '@/state/flashes';
import { KeyRound, LifeBuoy, ShieldCheck } from 'lucide-react';
import AuthLayout from '@/dezerx/layouts/AuthLayout';
import { Button, FormikInput } from '@/dezerx/components/ui';
import { useT } from '@/i18n';

interface Values {
    code: string;
    recoveryCode: '';
}

type OwnProps = RouteComponentProps<Record<string, string | undefined>, StaticContext, { token?: string }>;

type Props = OwnProps & {
    clearAndAddHttpError: ActionCreator<FlashStore['clearAndAddHttpError']['payload']>;
};

const LoginCheckpointContainer = () => {
    const t = useT();
    const { isSubmitting, setFieldValue } = useFormikContext<Values>();
    const [isMissingDevice, setIsMissingDevice] = useState(false);

    return (
        <AuthLayout
            title={t('auth.checkpoint.title')}
            subtitle={t(isMissingDevice ? 'auth.checkpoint.subtitleRecovery' : 'auth.checkpoint.subtitle')}
            pitch={{
                heading: t('auth.checkpoint.pitchHeading'),
                body: t('auth.checkpoint.pitchBody'),
            }}
            footer={
                <Link to={'/auth/login'} className={'font-medium text-accent transition-colors hover:text-accent/80'}>
                    {t('auth.returnToLogin')}
                </Link>
            }
        >
            <Form className={'space-y-5'}>
                <FormikInput
                    key={isMissingDevice ? 'recoveryCode' : 'code'}
                    name={isMissingDevice ? 'recoveryCode' : 'code'}
                    label={t(isMissingDevice ? 'auth.checkpoint.recoveryCode' : 'auth.checkpoint.code')}
                    icon={isMissingDevice ? <LifeBuoy className={'h-4 w-4'} /> : <ShieldCheck className={'h-4 w-4'} />}
                    type={'text'}
                    autoComplete={'one-time-code'}
                    autoFocus
                    disabled={isSubmitting}
                />

                <Button type={'submit'} loading={isSubmitting} disabled={isSubmitting} fullWidth size={'lg'}>
                    {t('common.continue')}
                </Button>

                <button
                    type={'button'}
                    onClick={() => {
                        setFieldValue('code', '');
                        setFieldValue('recoveryCode', '');
                        setIsMissingDevice((s) => !s);
                    }}
                    className={
                        'flex w-full items-center justify-center gap-2 text-xs text-ink-faint transition-colors hover:text-ink-muted'
                    }
                >
                    <KeyRound className={'h-3.5 w-3.5'} />
                    {t(isMissingDevice ? 'auth.checkpoint.haveDevice' : 'auth.checkpoint.lostDevice')}
                </button>
            </Form>
        </AuthLayout>
    );
};

const EnhancedForm = withFormik<Props, Values>({
    handleSubmit: ({ code, recoveryCode }, { setSubmitting, props: { clearAndAddHttpError, location } }) => {
        loginCheckpoint(location.state?.token || '', code, recoveryCode)
            .then((response) => {
                if (response.complete) {
                    
                    window.location = response.intended || '/';
                    return;
                }

                setSubmitting(false);
            })
            .catch((error) => {
                console.error(error);
                setSubmitting(false);
                clearAndAddHttpError({ error });
            });
    },

    mapPropsToValues: () => ({
        code: '',
        recoveryCode: '',
    }),
})(LoginCheckpointContainer);

export default ({ history, location, ...props }: OwnProps) => {
    const { clearAndAddHttpError } = useFlash();

    if (!location.state?.token) {
        history.replace('/auth/login');

        return null;
    }

    return (
        <EnhancedForm clearAndAddHttpError={clearAndAddHttpError} history={history} location={location} {...props} />
    );
};
