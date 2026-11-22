import React, { useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { Link } from 'react-router-dom';
import performPasswordReset from '@/api/auth/performPasswordReset';
import { httpErrorToHuman } from '@/api/http';
import { Actions, useStoreActions } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { Form, Formik, FormikHelpers } from 'formik';
import { object, ref, string } from 'yup';
import { KeyRound, Mail, ShieldCheck } from 'lucide-react';
import AuthLayout from '@/dezerx/layouts/AuthLayout';
import { Button, FormikInput, Input } from '@/dezerx/components/ui';
import { useT } from '@/i18n';

interface Values {
    password: string;
    passwordConfirmation: string;
}

export default ({ match, location }: RouteComponentProps<{ token: string }>) => {
    const t = useT();
    const [email, setEmail] = useState('');

    const { clearFlashes, addFlash } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

    const parsed = new URLSearchParams(location.search);
    if (email.length === 0 && parsed.get('email')) {
        setEmail(parsed.get('email') || '');
    }

    const submit = ({ password, passwordConfirmation }: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes();
        performPasswordReset(email, { token: match.params.token, password, passwordConfirmation })
            .then(() => {
                
                window.location = '/';
            })
            .catch((error) => {
                console.error(error);

                setSubmitting(false);
                addFlash({ type: 'error', title: t('common.error'), message: httpErrorToHuman(error) });
            });
    };

    return (
        <Formik
            onSubmit={submit}
            initialValues={{
                password: '',
                passwordConfirmation: '',
            }}
            validationSchema={object().shape({
                password: string().required(t('auth.reset.passwordRequired')).min(8, t('auth.reset.passwordLength')),
                passwordConfirmation: string()
                    .required(t('auth.reset.passwordMismatch'))
                    // @ts-expect-error this is valid
                    .oneOf([ref('password'), null], t('auth.reset.passwordMismatch')),
            })}
        >
            {({ isSubmitting }) => (
                <AuthLayout
                    title={t('auth.reset.title')}
                    subtitle={t('auth.reset.subtitle')}
                    pitch={{
                        heading: t('auth.reset.pitchHeading'),
                        body: t('auth.reset.pitchBody'),
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
                        <Input
                            label={t('common.email')}
                            value={email}
                            icon={<Mail className={'h-4 w-4'} />}
                            disabled
                            readOnly
                            className={'cursor-not-allowed opacity-70'}
                        />

                        <FormikInput
                            name={'password'}
                            label={t('auth.reset.newPassword')}
                            type={'password'}
                            revealable
                            icon={<KeyRound className={'h-4 w-4'} />}
                            hint={t('auth.reset.hint')}
                            autoComplete={'new-password'}
                            autoFocus
                            disabled={isSubmitting}
                        />

                        <FormikInput
                            name={'passwordConfirmation'}
                            label={t('auth.reset.confirmPassword')}
                            type={'password'}
                            revealable
                            icon={<ShieldCheck className={'h-4 w-4'} />}
                            autoComplete={'new-password'}
                            disabled={isSubmitting}
                        />

                        <Button type={'submit'} loading={isSubmitting} disabled={isSubmitting} fullWidth size={'lg'}>
                            {t('auth.reset.submit')}
                        </Button>
                    </Form>
                </AuthLayout>
            )}
        </Formik>
    );
};
