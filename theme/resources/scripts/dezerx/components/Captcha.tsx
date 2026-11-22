import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStoreState } from 'easy-peasy';
import Reaptcha from 'reaptcha';
import { useTheme } from '@/dezerx/lib/theme';
import { t } from '@/i18n';

interface TurnstileOptions {
    sitekey: string;
    theme?: 'light' | 'dark' | 'auto';
    execution?: 'render' | 'execute';
    appearance?: 'always' | 'execute' | 'interaction-only';
    callback?: (token: string) => void;
    'expired-callback'?: () => void;
    'timeout-callback'?: () => void;
    'error-callback'?: () => void;
}

interface TurnstileApi {
    render: (element: HTMLElement, options: TurnstileOptions) => string;
    execute: (widget: string) => void;
    reset: (widget: string) => void;
    remove: (widget: string) => void;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const TURNSTILE_CALLBACK = 'dezerxTurnstileReady';

let turnstileLoader: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
    if (window.turnstile) {
        return Promise.resolve(window.turnstile);
    }

    if (!turnstileLoader) {
        turnstileLoader = new Promise<TurnstileApi>((resolve, reject) => {
            (window as unknown as Record<string, unknown>)[TURNSTILE_CALLBACK] = () =>
                resolve(window.turnstile as TurnstileApi);

            const script = document.createElement('script');

            script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${TURNSTILE_CALLBACK}`;
            script.async = true;
            script.defer = true;
            script.onerror = () => {
                turnstileLoader = undefined;

                reject(new Error(t('captcha.loadFailed')));
            };

            document.head.appendChild(script);
        });
    }

    return turnstileLoader;
}

export interface CaptchaHandle {
    execute: () => Promise<void>;
    reset: () => void;
}

interface CaptchaProps {
    onVerify: (token: string) => void;
    onExpire: () => void;
}

const Turnstile = forwardRef<CaptchaHandle, CaptchaProps & { siteKey: string }>(function Turnstile(
    { siteKey, onVerify, onExpire },
    ref
) {
    const container = useRef<HTMLDivElement>(null);
    const widget = useRef<string | null>(null);
    const rendered = useRef<Promise<void> | null>(null);
    const token = useRef<string | null>(null);
    const failed = useRef(false);
    const waiting = useRef(false);
    const handlers = useRef({ onVerify, onExpire });
    const theme = useTheme();

    handlers.current = { onVerify, onExpire };

    useEffect(() => {
        let active = true;

        token.current = null;
        failed.current = false;
        waiting.current = false;

        const lost = () => {
            token.current = null;
            failed.current = true;
            waiting.current = false;

            handlers.current.onExpire();
        };

        const render = loadTurnstile().then((turnstile) => {
            if (!active || !container.current) {
                return;
            }

            widget.current = turnstile.render(container.current, {
                sitekey: siteKey,
                theme,
                appearance: 'always',
                callback: (value) => {
                    token.current = value;
                    failed.current = false;

                    if (waiting.current) {
                        waiting.current = false;

                        handlers.current.onVerify(value);
                    }
                },
                'expired-callback': lost,
                'timeout-callback': lost,
                'error-callback': lost,
            });
        });

        render.catch(() => undefined);
        rendered.current = render;

        return () => {
            active = false;

            if (widget.current && window.turnstile) {
                window.turnstile.remove(widget.current);
            }

            widget.current = null;
            rendered.current = null;
        };
    }, [siteKey, theme]);

    useImperativeHandle(ref, () => ({
        execute: () =>
            (rendered.current ?? Promise.resolve()).then(() => {
                if (!widget.current || !window.turnstile) {
                    throw new Error(t('captcha.notReady'));
                }

                if (token.current) {
                    handlers.current.onVerify(token.current);

                    return;
                }

                waiting.current = true;

                if (failed.current) {
                    failed.current = false;

                    window.turnstile.reset(widget.current);
                }
            }),
        reset: () => {
            token.current = null;
            failed.current = false;
            waiting.current = false;

            if (widget.current && window.turnstile) {
                window.turnstile.reset(widget.current);
            }
        },
    }));

    return <div ref={container} className={'flex justify-start empty:hidden'} />;
});

const ReCaptcha = forwardRef<CaptchaHandle, CaptchaProps & { siteKey: string }>(function ReCaptcha(
    { siteKey, onVerify, onExpire },
    ref
) {
    const instance = useRef<Reaptcha>(null);

    useImperativeHandle(ref, () => ({
        execute: () => instance.current?.execute() ?? Promise.resolve(),
        reset: () => {
            void instance.current?.reset();
        },
    }));

    return createPortal(
        <Reaptcha
            ref={instance}
            size={'invisible'}
            badge={'bottomright'}
            sitekey={siteKey || '_invalid_key'}
            onVerify={onVerify}
            onExpire={onExpire}
        />,
        document.body
    );
});

const Captcha = forwardRef<CaptchaHandle, CaptchaProps>(function Captcha({ onVerify, onExpire }, ref) {
    const { provider, siteKey } = useStoreState((state) => state.settings.data!.recaptcha);

    if (provider === 'turnstile') {
        return <Turnstile ref={ref} siteKey={siteKey} onVerify={onVerify} onExpire={onExpire} />;
    }

    return <ReCaptcha ref={ref} siteKey={siteKey} onVerify={onVerify} onExpire={onExpire} />;
});

export default Captcha;

export { Captcha };
