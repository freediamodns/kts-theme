import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import requestPasswordResetEmail from '@/api/auth/requestPasswordResetEmail';
import { httpErrorToHuman } from '@/api/http';
import { useStoreState } from 'easy-peasy';
import { Form, Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import useFlash from '@/plugins/useFlash';
import { Mail } from 'lucide-react';
import AuthLayout from '@/dezerx/layouts/AuthLayout';
import Captcha, { CaptchaHandle } from '@/dezerx/components/Captcha';
import { Button, FormikInput } from '@/dezerx/components/ui';
import { useT } from '@/i18n';

interface Values {
    email: string;
}

export default () => {
    const t = useT();
    const ref = useRef<CaptchaHandle>(null);
    const [token, setToken] = useState('');

    const { clearFlashes, addFlash } = useFlash();
    const { enabled: captchaEnabled } = useStoreState((state) => state.settings.data!.recaptcha);

    useEffect(() => {
        clearFlashes();
    }, []);

    const handleSubmission = ({ email }: Values, { setSubmitting, resetForm }: FormikHelpers<Values>) => {
        clearFlashes();

        if (captchaEnabled && !token) {
            ref.current!.execute().catch((error) => {
                console.error(error);

                setSubmitting(false);
                addFlash({ type: 'error', title: t('common.error'), message: httpErrorToHuman(error) });
            });

            return;
        }

        requestPasswordResetEmail(email, token)
            .then((response) => {
                resetForm();
                addFlash({ type: 'success', title: t('common.success'), message: response });
            })
            .catch((error) => {
                console.error(error);
                addFlash({ type: 'error', title: t('common.error'), message: httpErrorToHuman(error) });
            })
            .then(() => {
                setToken('');
                if (ref.current) ref.current.reset();

                setSubmitting(false);
            });
    };

    return (
        <Formik
            onSubmit={handleSubmission}
            initialValues={{ email: '' }}
            validationSchema={object().shape({
                email: string().email(t('auth.forgot.emailRequired')).required(t('auth.forgot.emailRequired')),
            })}
        >
            {({ isSubmitting, setSubmitting, submitForm }) => (
                <AuthLayout
                    title={t('auth.forgot.title')}
                    subtitle={t('auth.forgot.subtitle')}
                    pitch={{
                        heading: t('auth.forgot.pitchHeading'),
                        body: t('auth.forgot.pitchBody'),
                    }}
                    footer={
                        <Link
                            to={'/auth/login'}
                            className={'font-medium text-accent transition-colors hover:text-accent/80'}
                        >
                            {t('auth.returnToLogin')}
                        </Link>
                    }
                >
                    <Form className={'space-y-5'}>
                        <FormikInput
                            name={'email'}
                            label={t('common.email')}
                            type={'email'}
                            icon={<Mail className={'h-4 w-4'} />}
                            autoComplete={'email'}
                            autoFocus
                            disabled={isSubmitting}
                        />

                        {captchaEnabled && (
                            <Captcha
                                ref={ref}
                                onVerify={(response) => {
                                    setToken(response);
                                    submitForm();
                                }}
                                onExpire={() => {
                                    setSubmitting(false);
                                    setToken('');
                                }}
                            />
                        )}

                        <Button type={'submit'} loading={isSubmitting} disabled={isSubmitting} fullWidth size={'lg'}>
                            {t('auth.forgot.submit')}
                        </Button>
                    </Form>
                </AuthLayout>
            )}
        </Formik>
    );
};
