import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Actions, useStoreActions, useStoreState } from 'easy-peasy';
import { AtSign, Check, Copy, Image as ImageIcon, KeyRound, ShieldCheck, ShieldOff, TriangleAlert } from 'lucide-react';
import QRCode from 'qrcode.react';
import { ApplicationStore } from '@/state';
import updateAccountPassword from '@/api/account/updateAccountPassword';
import getTwoFactorTokenData, { TwoFactorTokenData } from '@/api/account/getTwoFactorTokenData';
import enableAccountTwoFactor from '@/api/account/enableAccountTwoFactor';
import disableAccountTwoFactor from '@/api/account/disableAccountTwoFactor';
import PageBlock from '@/dezerx/components/PageBlock';
import { Badge, Button, Input, useToast } from '@/dezerx/components/ui';
import { SectionHeader, apiMessage } from '@/dezerx/components/console/Section';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { PersonAvatar } from '@/dezerx/components/PersonAvatar';
import { AVATAR_MAX_BYTES, AVATAR_TYPES, removeAvatar, uploadAvatar } from '@/api/account/preferences';
import { useCopied } from '@/dezerx/lib/useCopied';
import { useT } from '@/i18n';

export default () => {
    const t = useT();
    const { state } = useLocation<undefined | { twoFactorRedirect?: boolean }>();

    return (
        <PageBlock title={t('account.title')}>
            <div className={'space-y-4'}>
                <SectionHeader title={t('account.title')} description={t('account.description')} />

                {state?.twoFactorRedirect && (
                    <div
                        className={'flex items-start gap-2.5 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger'}
                        role={'alert'}
                    >
                        <TriangleAlert aria-hidden={'true'} className={'mt-0.5 h-4 w-4 shrink-0'} />
                        <p>{t('account.twoFactorRequired')}</p>
                    </div>
                )}

                <AvatarCard />
                <EmailCard />
                <PasswordCard />
                <TwoFactorCard />
            </div>
        </PageBlock>
    );
};

function AvatarCard() {
    const t = useT();
    const { toast } = useToast();

    const user = useStoreState((state: ApplicationStore) => state.user.data!);
    const update = useStoreActions((actions: Actions<ApplicationStore>) => actions.user.updateUserData);

    const picker = useRef<HTMLInputElement | null>(null);

    const [picked, setPicked] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (picked === null) {
            setPreview(null);

            return;
        }

        const made = URL.createObjectURL(picked);

        setPreview(made);

        return () => URL.revokeObjectURL(made);
    }, [picked]);

    const forget = () => {
        setPicked(null);

        if (picker.current) {
            picker.current.value = '';
        }
    };

    const choose = (file: File | undefined) => {
        if (file === undefined) {
            return;
        }

        if (!AVATAR_TYPES.includes(file.type)) {
            toast(t('account.avatar.wrongType'), { tone: 'error' });
            forget();

            return;
        }

        if (file.size > AVATAR_MAX_BYTES) {
            toast(t('account.avatar.tooBig'), { tone: 'error' });
            forget();

            return;
        }

        setPicked(file);
    };

    const run = (work: Promise<string | null>, done: string) => {
        setBusy(true);

        work.then((saved) => {
            update({ avatarUrl: saved });
            forget();
            toast(done, { tone: 'success' });
        })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('account.avatar.failed')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (picked !== null) {
            run(uploadAvatar(picked), t('account.avatar.updated'));
        }
    };

    return (
        <form onSubmit={submit} className={'space-y-4 rounded-2xl bg-card p-4'}>
            <div>
                <p className={'text-sm font-medium text-ink'}>{t('account.avatar.title')}</p>
                <p className={'mt-1 text-xs text-ink-faint'}>{t('account.avatar.description')}</p>
            </div>

            <div className={'flex items-center gap-4'}>
                <PersonAvatar
                    hash={user.avatarHash}
                    url={preview ?? user.avatarUrl}
                    name={user.username}
                    seed={user.uuid}
                    size={56}
                    className={'h-14 w-14 text-lg'}
                />

                <div className={'min-w-0'}>
                    <input
                        ref={picker}
                        type={'file'}
                        accept={AVATAR_TYPES.join(',')}
                        className={'hidden'}
                        onChange={(event) => choose(event.target.files?.[0])}
                    />

                    <Button
                        type={'button'}
                        size={'sm'}
                        variant={'secondary'}
                        disabled={busy}
                        onClick={() => picker.current?.click()}
                        icon={<ImageIcon className={'h-4 w-4'} />}
                    >
                        {t('account.avatar.choose')}
                    </Button>

                    <p className={'mt-1.5 truncate text-[11px] text-ink-faint'}>
                        {picked === null ? t('account.avatar.hint') : picked.name}
                    </p>
                </div>
            </div>

            <div className={'flex justify-end gap-2'}>
                {picked !== null && (
                    <Button type={'button'} size={'sm'} variant={'secondary'} disabled={busy} onClick={forget}>
                        {t('common.cancel')}
                    </Button>
                )}

                {picked === null && user.avatarUrl !== null && (
                    <Button
                        type={'button'}
                        size={'sm'}
                        variant={'secondary'}
                        loading={busy}
                        onClick={() => run(removeAvatar(), t('account.avatar.removed'))}
                    >
                        {t('account.avatar.remove')}
                    </Button>
                )}

                <Button type={'submit'} size={'sm'} variant={'primary'} loading={busy} disabled={picked === null}>
                    {t('common.save')}
                </Button>
            </div>
        </form>
    );
}

function EmailCard() {
    const t = useT();
    const { toast } = useToast();

    const current = useStoreState((state: ApplicationStore) => state.user.data!.email);
    const updateEmail = useStoreActions((actions: Actions<ApplicationStore>) => actions.user.updateUserEmail);

    const [email, setEmail] = useState(current);
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => setEmail(current), [current]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);

        updateEmail({ email, password })
            .then(() => {
                setPassword('');
                toast(t('account.email.updated'), { tone: 'success' });
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('account.email.failed')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    return (
        <form onSubmit={submit} className={'space-y-4 rounded-2xl bg-card p-4'}>
            <div>
                <p className={'text-sm font-medium text-ink'}>{t('account.email.title')}</p>
                <p className={'mt-1 text-xs text-ink-faint'}>{t('account.email.description')}</p>
            </div>

            <div className={'grid gap-4 sm:grid-cols-2'}>
                <Input
                    required
                    type={'email'}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    label={t('account.email.title')}
                    autoComplete={'email'}
                    icon={<AtSign className={'h-4 w-4'} />}
                />

                <Input
                    required
                    type={'password'}
                    revealable
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    label={t('account.password.current')}
                    autoComplete={'current-password'}
                    icon={<KeyRound className={'h-4 w-4'} />}
                />
            </div>

            <div className={'flex justify-end'}>
                <Button
                    type={'submit'}
                    size={'sm'}
                    variant={'primary'}
                    loading={busy}
                    disabled={email === current || password === ''}
                >
                    {t('common.save')}
                </Button>
            </div>
        </form>
    );
}

function PasswordCard() {
    const t = useT();
    const { toast } = useToast();

    const [current, setCurrent] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);

    const mismatch = confirm !== '' && confirm !== password;
    const ready = current !== '' && password.length >= 8 && confirm === password;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);

        updateAccountPassword({ current, password, confirmPassword: confirm })
            .then(() => {
                window.location.href = '/auth/login';
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('account.password.failed')), { tone: 'error' });
                setBusy(false);
            });
    };

    return (
        <form onSubmit={submit} className={'space-y-4 rounded-2xl bg-card p-4'}>
            <div>
                <p className={'text-sm font-medium text-ink'}>{t('common.password')}</p>
                <p className={'mt-1 text-xs text-ink-faint'}>{t('account.password.description')}</p>
            </div>

            <div className={'grid gap-4 sm:grid-cols-2'}>
                <Input
                    required
                    type={'password'}
                    revealable
                    value={current}
                    onChange={(event) => setCurrent(event.target.value)}
                    label={t('account.password.current')}
                    autoComplete={'current-password'}
                    className={'sm:col-span-2'}
                    icon={<KeyRound className={'h-4 w-4'} />}
                />

                <Input
                    required
                    type={'password'}
                    revealable
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    label={t('account.password.new')}
                    autoComplete={'new-password'}
                />

                <Input
                    required
                    type={'password'}
                    revealable
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    label={t('account.password.confirm')}
                    autoComplete={'new-password'}
                    error={mismatch ? t('account.password.mismatch') : undefined}
                />
            </div>

            <div className={'flex justify-end'}>
                <Button type={'submit'} size={'sm'} variant={'primary'} loading={busy} disabled={!ready}>
                    {t('account.password.submit')}
                </Button>
            </div>
        </form>
    );
}

function TwoFactorCard() {
    const t = useT();
    const enabled = useStoreState((state: ApplicationStore) => state.user.data!.useTotp);

    const [open, setOpen] = useState<'enable' | 'disable' | null>(null);
    const [tokens, setTokens] = useState<string[]>([]);

    return (
        <div className={'rounded-2xl bg-card p-4'}>
            <SetupDialog
                open={open === 'enable'}
                onClose={() => setOpen(null)}
                onTokens={(tokens) => {
                    setOpen(null);
                    setTokens(tokens);
                }}
            />
            <DisableDialog open={open === 'disable'} onClose={() => setOpen(null)} />
            <RecoveryDialog tokens={tokens} onClose={() => setTokens([])} />

            <div className={'flex flex-wrap items-start justify-between gap-3'}>
                <div className={'min-w-0'}>
                    <div className={'flex items-center gap-2'}>
                        <p className={'text-sm font-medium text-ink'}>{t('account.twoFactor.title')}</p>
                        {enabled ? (
                            <Badge tone={'success'}>
                                <ShieldCheck aria-hidden={'true'} className={'mr-1 inline-block h-3 w-3'} />
                                {t('common.on')}
                            </Badge>
                        ) : (
                            <Badge>{t('common.off')}</Badge>
                        )}
                    </div>

                    <p className={'mt-1 max-w-prose text-xs text-ink-faint'}>
                        {t(enabled ? 'account.twoFactor.onBody' : 'account.twoFactor.offBody')}
                    </p>
                </div>

                {enabled ? (
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        onClick={() => setOpen('disable')}
                        className={'text-danger hover:bg-danger/10 hover:text-danger'}
                        icon={<ShieldOff className={'h-3.5 w-3.5'} />}
                    >
                        {t('account.twoFactor.turnOff')}
                    </Button>
                ) : (
                    <Button
                        size={'sm'}
                        variant={'primary'}
                        onClick={() => setOpen('enable')}
                        icon={<ShieldCheck className={'h-3.5 w-3.5'} />}
                    >
                        {t('account.twoFactor.turnOn')}
                    </Button>
                )}
            </div>
        </div>
    );
}

function SetupDialog({
    open,
    onClose,
    onTokens,
}: {
    open: boolean;
    onClose: () => void;
    onTokens: (tokens: string[]) => void;
}) {
    const t = useT();
    const { toast } = useToast();
    const updateUserData = useStoreActions((actions: Actions<ApplicationStore>) => actions.user.updateUserData);

    const [token, setToken] = useState<TwoFactorTokenData | null>(null);
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [copied, copy] = useCopied();

    useEffect(() => {
        if (!open) {
            setToken(null);
            setCode('');
            setPassword('');
            setBusy(false);

            return;
        }

        getTwoFactorTokenData()
            .then(setToken)
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('account.twoFactor.setupFetchFailed')), { tone: 'error' });
            });
    }, [open]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);

        enableAccountTwoFactor(code, password)
            .then((tokens) => {
                updateUserData({ useTotp: true });
                onTokens(tokens);
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('account.twoFactor.codeRejected')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    return (
        <DialogShell
            open={open}
            onClose={() => !busy && onClose()}
            width={'md'}
            title={t('account.twoFactor.setupTitle')}
            body={t('account.twoFactor.setupBody')}
        >
            <form onSubmit={submit}>
                <div className={'mt-4 flex flex-col items-center gap-3'}>
                    <div className={'rounded-2xl bg-white p-3'}>
                        {token ? (
                            <QRCode renderAs={'svg'} value={token.image_url_data} size={168} />
                        ) : (
                            <div className={'h-[168px] w-[168px] animate-pulse rounded-lg bg-neutral-200'} />
                        )}
                    </div>

                    {token && (
                        <button
                            type={'button'}
                            onClick={() => copy(token.secret)}
                            title={t('account.twoFactor.copySecret')}
                            className={
                                'flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-xs text-ink-faint transition-colors hover:bg-overlay hover:text-ink'
                            }
                        >
                            {token.secret}
                            {copied ? (
                                <Check aria-hidden={'true'} className={'h-3 w-3 text-success'} />
                            ) : (
                                <Copy aria-hidden={'true'} className={'h-3 w-3'} />
                            )}
                        </button>
                    )}
                </div>

                <div className={'mt-4 space-y-3'}>
                    <Input
                        required
                        autoFocus
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        label={t('account.twoFactor.codeLabel')}
                        inputMode={'numeric'}
                        autoComplete={'one-time-code'}
                        placeholder={'123456'}
                    />

                    <Input
                        required
                        type={'password'}
                        revealable
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        label={t('account.twoFactor.passwordLabel')}
                        autoComplete={'current-password'}
                    />
                </div>

                <DialogFooter>
                    <Button type={'button'} size={'sm'} variant={'ghost'} onClick={onClose} disabled={busy}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type={'submit'}
                        size={'sm'}
                        variant={'primary'}
                        loading={busy}
                        disabled={!token || code.trim() === '' || password === ''}
                    >
                        {t('account.twoFactor.turnOn')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogShell>
    );
}

function DisableDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useT();
    const { toast } = useToast();
    const updateUserData = useStoreActions((actions: Actions<ApplicationStore>) => actions.user.updateUserData);

    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setPassword('');
        setBusy(false);
    }, [open]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);

        disableAccountTwoFactor(password)
            .then(() => {
                updateUserData({ useTotp: false });
                toast(t('account.twoFactor.disabled'), { tone: 'success' });
                onClose();
            })
            .catch((error) => {
                console.error(error);
                toast(apiMessage(error, t('account.twoFactor.disableFailed')), { tone: 'error' });
            })
            .then(() => setBusy(false));
    };

    return (
        <DialogShell
            open={open}
            onClose={() => !busy && onClose()}
            title={t('account.twoFactor.disableTitle')}
            body={t('account.twoFactor.disableBody')}
        >
            <form onSubmit={submit}>
                <div className={'mt-4'}>
                    <Input
                        required
                        autoFocus
                        type={'password'}
                        revealable
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        label={t('account.twoFactor.passwordLabel')}
                        autoComplete={'current-password'}
                    />
                </div>

                <DialogFooter>
                    <Button type={'button'} size={'sm'} variant={'ghost'} onClick={onClose} disabled={busy}>
                        {t('common.cancel')}
                    </Button>
                    <Button type={'submit'} size={'sm'} variant={'danger'} loading={busy} disabled={password === ''}>
                        {t('account.twoFactor.turnOff')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogShell>
    );
}

function RecoveryDialog({ tokens, onClose }: { tokens: string[]; onClose: () => void }) {
    const t = useT();
    const [copied, copy] = useCopied();

    return (
        <DialogShell
            open={tokens.length > 0}
            onClose={() => undefined}
            width={'md'}
            title={t('account.twoFactor.recoveryTitle')}
            body={t('account.twoFactor.recoveryBody')}
        >
            <pre
                className={
                    'mt-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-raised p-3 font-mono text-xs leading-relaxed text-ink-muted'
                }
            >
                {tokens.map((token) => (
                    <span key={token}>{token}</span>
                ))}
            </pre>

            <div className={'mt-6 flex justify-end gap-2'}>
                <Button
                    size={'sm'}
                    variant={'secondary'}
                    onClick={() => copy(tokens.join('\n'))}
                    icon={
                        copied ? <Check className={'h-3.5 w-3.5 text-success'} /> : <Copy className={'h-3.5 w-3.5'} />
                    }
                >
                    {t(copied ? 'common.copied' : 'common.copy')}
                </Button>
                <Button size={'sm'} variant={'primary'} onClick={onClose}>
                    {t('account.twoFactor.recoverySaved')}
                </Button>
            </div>
        </DialogShell>
    );
}
