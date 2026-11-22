import React, { ComponentType } from 'react';
import { ArrowLeft, RotateCw, SearchX, TriangleAlert } from 'lucide-react';
import PageBlock from '@/dezerx/components/PageBlock';
import { Button } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

export interface ScreenBlockProps {
    title: string;
    message: string;
    icon?: ComponentType<{ className?: string }>;
    busy?: boolean;
    onRetry?: () => void;
    onBack?: () => void;
}

const ScreenBlock = ({ title, message, icon: Icon = TriangleAlert, busy, onRetry, onBack }: ScreenBlockProps) => {
    const t = useT();

    return (
        <PageBlock title={title}>
            <div className={'flex justify-center px-4 py-6'}>
                <div
                    className={
                        'w-full max-w-md rounded-3xl bg-card px-6 py-14 text-center shadow-panel ring-1 ring-line-field'
                    }
                >
                    <span
                        className={cn(
                            'mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-overlay/60 text-ink-faint',
                            busy && 'animate-pulse'
                        )}
                    >
                        <Icon className={'h-7 w-7'} aria-hidden={'true'} />
                    </span>

                    <h2 className={'mt-5 font-akira text-xl tracking-tight text-ink'}>{title}</h2>
                    <p className={'mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-muted'}>{message}</p>

                    {(onRetry || onBack) && (
                        <div className={'mt-6 flex justify-center'}>
                            <Button
                                size={'sm'}
                                variant={'ghost'}
                                onClick={() => (onRetry ? onRetry() : onBack ? onBack() : undefined)}
                                icon={
                                    onRetry ? (
                                        <RotateCw className={'h-3.5 w-3.5'} />
                                    ) : (
                                        <ArrowLeft className={'h-3.5 w-3.5'} />
                                    )
                                }
                            >
                                {t(onRetry ? 'common.tryAgain' : 'common.goBack')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </PageBlock>
    );
};

type ServerErrorProps = Omit<ScreenBlockProps, 'title'> & { title?: string };

const ServerError = ({ title, ...props }: ServerErrorProps) => {
    const t = useT();

    return <ScreenBlock title={title || t('screen.somethingWrong')} {...props} />;
};

const NotFound = ({ title, message, onBack }: Partial<Pick<ScreenBlockProps, 'title' | 'message' | 'onBack'>>) => {
    const t = useT();

    return (
        <ScreenBlock
            title={title || t('screen.notFound')}
            icon={SearchX}
            message={message || t('screen.notFoundBody')}
            onBack={onBack}
        />
    );
};

export { ServerError, NotFound };
export default ScreenBlock;
