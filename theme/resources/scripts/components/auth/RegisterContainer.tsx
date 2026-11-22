import React, { useEffect, useRef, useState } from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import register from '@/api/auth/register';
import { useStoreState } from 'easy-peasy';
import { Form, Formik, FormikHelpers } from 'formik';
import { object, ref as yupRef, string } from 'yup';
import useFlash from '@/plugins/useFlash';
import { AtSign, KeyRound, Mail, ShieldCheck, User } from 'lucide-react';
import AuthLayout from '@/dezerx/layouts/AuthLayout';
import Captcha, { CaptchaHandle } from '@/dezerx/components/Captcha';
import { Button, Checkbox, FormikInput } from '@/dezerx/components/ui';
import { usePanelTheme } from '@/dezerx/lib/panelTheme';
import { useT } from '@/i18n';

interface Values {
    username: string;
    email: string;
    nameFirst: string;
    nameLast: string;
    password: string;
    passwordConfirmation: string;
}

const RegisterContainer = ({ history }: RouteComponentProps) => {
    const t = useT();
    const theme = usePanelTheme();
    const captcha = useRef<CaptchaHandle>(null);
    const [token, setToken] = useState('');

    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { enabled: captchaEnabled } = useStoreState((state) => state.settings.data!.recaptcha);

    const open = theme['auth.register'];
    const names = theme['auth.registerNames'];
    const terms = theme['auth.registerTerms'];
    const note = theme['auth.registerNote'];

    const [agreed, setAgreed] = useState(false);

    useEffect(() => {
        clearFlashes();
    }, []);

    useEffect(() => {
        if (!open) {
            history.replace('/auth/login');
        }
    }, [open, history]);

    if (!open) {
        return null;
    }

    const onSubmit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes();

        if (captchaEnabled && !token) {
            captcha.current!.execute().catch((error) => {
                console.error(error);

                setSubmitting(false);
                clearAndAddHttpError({ error });
            });

            return;
        }

        register({
            username: values.username,
            email: values.email,
            password: values.password,
            passwordConfirmation: values.passwordConfirmation,
            nameFirst: names ? values.nameFirst : undefined,
            nameLast: names ? values.nameLast : undefined,
            terms: terms !== '' ? agreed : undefined,
            recaptchaData: token,
        })
            .then((response) => {
                
                window.location = response.intended || '/';
            })
            .catch((error) => {
                console.error(error);

                setToken('');
                if (captcha.current) captcha.current.reset();

                setSubmitting(false);
                clearAndAddHttpError({ error });
            });
    };

    const schema = object().shape({
        username: string().required(t('auth.register.usernameRequired')).min(3, t('auth.register.usernameShort')),
        email: string().email(t('auth.register.emailInvalid')).required(t('auth.register.emailRequired')),
        ...(names
            ? {
                  nameFirst: string().required(t('auth.register.firstNameRequired')),
                  nameLast: string().required(t('auth.register.lastNameRequired')),
              }
            : {}),
        password: string().required(t('auth.register.passwordRequired')).min(8, t('auth.register.passwordLength')),
        passwordConfirmation: string()
            .required(t('auth.register.passwordMismatch'))
            // @ts-expect-error this is valid
            .oneOf([yupRef('password'), null], t('auth.register.passwordMismatch')),
    });

    return (
        <Formik
            onSubmit={onSubmit}
            initialValues={{
                username: '',
                email: '',
                nameFirst: '',
                nameLast: '',
                password: '',
                passwordConfirmation: '',
            }}
            validationSchema={schema}
        >
            {({ isSubmitting, setSubmitting, submitForm }) => (
                <AuthLayout
                    title={t('auth.register.title')}
                    subtitle={t('auth.register.subtitle')}
                    pitch={{
                        heading: t('auth.register.pitchHeading'),
                        body: t('auth.register.pitchBody'),
                    }}
                    footer={
                        <span className={'text-ink-faint'}>
                            {t('auth.register.haveAccount')}{' '}
                            <Link
                                to={'/auth/login'}
                                className={'font-medium text-accent transition-colors hover:text-accent/80'}
                            >
                                {t('auth.login.submit')}
                            </Link>
                        </span>
                    }
                >
                    <Form className={'space-y-5'}>
                        {note !== '' && (
                            <p className={'rounded-2xl bg-raised px-4 py-3 text-[13px] leading-relaxed text-ink-muted'}>
                                {note}
                            </p>
                        )}

                        {names && (
                            <div className={'grid gap-5 sm:grid-cols-2'}>
                                <FormikInput
                                    name={'nameFirst'}
                                    label={t('auth.register.firstName')}
                                    icon={<User className={'h-4 w-4'} />}
                                    autoComplete={'given-name'}
                                    autoFocus
                                    disabled={isSubmitting}
                                />

                                <FormikInput
                                    name={'nameLast'}
                                    label={t('auth.register.lastName')}
                                    autoComplete={'family-name'}
                                    disabled={isSubmitting}
                                />
                            </div>
                        )}

                        <FormikInput
                            name={'username'}
                            label={t('auth.register.username')}
                            hint={t('auth.register.usernameHint')}
                            icon={<AtSign className={'h-4 w-4'} />}
                            autoComplete={'username'}
                            autoFocus={!names}
                            disabled={isSubmitting}
                        />

                        <FormikInput
                            name={'email'}
                            label={t('common.email')}
                            type={'email'}
                            icon={<Mail className={'h-4 w-4'} />}
                            autoComplete={'email'}
                            disabled={isSubmitting}
                        />

                        <FormikInput
                            name={'password'}
                            label={t('common.password')}
                            type={'password'}
                            revealable
                            hint={t('auth.register.passwordHint')}
                            icon={<KeyRound className={'h-4 w-4'} />}
                            autoComplete={'new-password'}
                            disabled={isSubmitting}
                        />

                        <FormikInput
                            name={'passwordConfirmation'}
                            label={t('auth.register.confirmPassword')}
                            type={'password'}
                            revealable
                            icon={<ShieldCheck className={'h-4 w-4'} />}
                            autoComplete={'new-password'}
                            disabled={isSubmitting}
                        />

                        {terms !== '' && (
                            <Checkbox
                                checked={agreed}
                                onChange={(event) => setAgreed(event.target.checked)}
                                label={
                                    <span>
                                        {t('auth.register.agreePrefix')}{' '}
                                        <a
                                            href={terms}
                                            target={'_blank'}
                                            rel={'noreferrer noopener'}
                                            className={'font-medium text-accent hover:text-accent/80'}
                                        >
                                            {t('auth.register.terms')}
                                        </a>
                                    </span>
                                }
                            />
                        )}

                        {captchaEnabled && (
                            <Captcha
                                ref={captcha}
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
                            disabled={isSubmitting || (terms !== '' && !agreed)}
                            fullWidth
                            size={'lg'}
                            className={'mt-2'}
                        >
                            {t('auth.register.submit')}
                        </Button>
                    </Form>
                </AuthLayout>
            )}
        </Formik>
    );
};

export default RegisterContainer;
