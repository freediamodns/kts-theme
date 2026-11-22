import React, { useEffect, useRef, useState } from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import login from '@/api/auth/login';
import { useStoreState } from 'easy-peasy';
import { Form, Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import useFlash from '@/plugins/useFlash';
import { AtSign, KeyRound } from 'lucide-react';
import AuthLayout from '@/dezerx/layouts/AuthLayout';
import Captcha, { CaptchaHandle } from '@/dezerx/components/Captcha';
import { Button, Checkbox, FormikInput } from '@/dezerx/components/ui';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import DemoSignIn from '@/dezerx/components/DemoSignIn';
import { useT } from '@/i18n';

interface Values {
    username: string;
    password: string;
}

const LoginContainer = ({ history }: RouteComponentProps) => {
    const t = useT();
    const ref = useRef<CaptchaHandle>(null);
    const [token, setToken] = useState('');
    const [remember, setRemember] = useState(false);

    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { enabled: captchaEnabled } = useStoreState((state) => state.settings.data!.recaptcha);
    const registration = usePanelTheme()['auth.register'];

    useEffect(() => {
        clearFlashes();
    }, []);

    const onSubmit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes();

        if (captchaEnabled && !token) {
            ref.current!.execute().catch((error) => {
                console.error(error);

                setSubmitting(false);
                clearAndAddHttpError({ error });
            });

            return;
        }

        login({ ...values, recaptchaData: token })
            .then((response) => {
                if (response.complete) {
                    
                    window.location = response.intended || '/';
                    return;
                }

                history.replace('/auth/login/checkpoint', { token: response.confirmationToken });
            })
            .catch((error) => {
                console.error(error);

                setToken('');
                if (ref.current) ref.current.reset();

                setSubmitting(false);
                clearAndAddHttpError({ error });
            });
    };

    return (
        <Formik
            onSubmit={onSubmit}
            initialValues={{ username: '', password: '' }}
            validationSchema={object().shape({
                username: string().required(t('auth.login.usernameRequired')),
                password: string().required(t('auth.login.passwordRequired')),
            })}
        >
            {({ isSubmitting, setSubmitting, submitForm, setFieldValue }) => (
                <AuthLayout
                    title={t('auth.login.title')}
                    subtitle={t('auth.login.subtitle')}
                    pitch={{
                        heading: t('auth.login.pitchHeading'),
                        body: t('auth.login.pitchBody'),
                    }}
                    footer={
                        <div className={'space-y-2'}>
                            <Link
                                to={'/auth/password'}
                                className={
                                    'block font-medium text-accent transition-colors hover:text-accent/80'
                                }
                            >
                                {t('auth.login.forgot')}
                            </Link>

                            {registration && (
                                <p className={'text-ink-faint'}>
                                    {t('auth.login.noAccount')}{' '}
                                    <Link
                                        to={'/auth/register'}
                                        className={'font-medium text-accent transition-colors hover:text-accent/80'}
                                    >
                                        {t('auth.register.submit')}
                                    </Link>
                                </p>
                            )}
                        </div>
                    }
                >
                    <Form className={'space-y-5'}>
                        <FormikInput
                            name={'username'}
                            label={t('auth.login.username')}
                            icon={<AtSign className={'h-4 w-4'} />}
                            autoComplete={'username'}
                            autoFocus
                            disabled={isSubmitting}
                        />

                        <FormikInput
                            name={'password'}
                            label={t('common.password')}
                            type={'password'}
                            revealable
                            icon={<KeyRound className={'h-4 w-4'} />}
                            autoComplete={'current-password'}
                            disabled={isSubmitting}
                        />

                        <div className={'flex items-center justify-between'}>
                            <Checkbox
                                label={t('auth.login.remember')}
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                            />
                        </div>

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

                        <Button
                            type={'submit'}
                            loading={isSubmitting}
                            disabled={isSubmitting}
                            fullWidth
                            size={'lg'}
                            className={'mt-2'}
                        >
                            {t('auth.login.submit')}
                        </Button>

                        <DemoSignIn
                            disabled={isSubmitting}
                            onUse={(username, password) => {

                                void Promise.all([
                                    setFieldValue('username', username),
                                    setFieldValue('password', password),
                                ]).then(() => submitForm());
                            }}
                        />
                    </Form>
                </AuthLayout>
            )}
        </Formik>
    );
};

export default LoginContainer;
