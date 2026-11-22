import React, { useEffect } from 'react';
import { ServerContext } from '@/state/server';
import FlashMessageRender from '@/components/FlashMessageRender';
import { PageContentBlockProps } from '@/components/elements/PageContentBlock';
import { cn } from '@/dezerx/lib/cn';

interface Props extends PageContentBlockProps {
    title: string;
}

const ServerContentBlock: React.FC<Props> = ({ title, showFlashKey, className, children }) => {
    const name = ServerContext.useStoreState((state) => state.server.data!.name);

    useEffect(() => {
        document.title = `${name} | ${title}`;
    }, [name, title]);

    return (
        <div className={cn('w-full', className)}>
            {showFlashKey && <FlashMessageRender byKey={showFlashKey} className={'mb-4'} />}
            {children}
        </div>
    );
};

export default ServerContentBlock;
