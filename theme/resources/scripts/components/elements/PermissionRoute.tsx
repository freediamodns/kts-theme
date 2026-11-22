import React from 'react';
import { Route } from 'react-router-dom';
import { RouteProps } from 'react-router';
import Can from '@/components/elements/Can';
import { ServerError } from '@/components/elements/ScreenBlock';
import { useT } from '@/i18n';

interface Props extends Omit<RouteProps, 'path'> {
    path: string;
    permission: string | string[] | null;
}

export default ({ permission, children, ...props }: Props) => {
    const t = useT();

    return (
        <Route {...props}>
            {!permission ? (
                children
            ) : (
                <Can
                    strict
                    matchAny
                    action={permission}
                    renderOnError={
                        <ServerError title={t('screen.accessDenied')} message={t('screen.accessDeniedBody')} />
                    }
                >
                    {children}
                </Can>
            )}
        </Route>
    );
};
