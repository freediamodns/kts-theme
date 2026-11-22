import React from 'react';
import { useToast } from '@/dezerx/components/ui';
import { demoRefusal } from '@/dezerx/lib/demo';

export default function DemoGate({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();

    const refuse = (event: React.SyntheticEvent) => {
        event.preventDefault();
        event.stopPropagation();
        toast(demoRefusal(), { tone: 'error' });
    };

    return (
        <span
            style={{ display: 'contents' }}
            aria-disabled={'true'}
            onClickCapture={refuse}
            onSubmitCapture={refuse}
            onKeyDownCapture={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    refuse(event);
                }
            }}
        >
            {children}
        </span>
    );
}
