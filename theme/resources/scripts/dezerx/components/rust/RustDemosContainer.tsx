import React, { useEffect, useState } from 'react';
import { Monitor } from 'lucide-react';
import { ServerContext } from '@/state/server';
import { RustDemo, executeRustDemoAction, getRustDemos } from '@/api/server/rustPlayers';
import getFileDownloadUrl from '@/api/server/files/getFileDownloadUrl';
import { Button, Input, Skeleton, SkeletonRegion, useToast } from '@/dezerx/components/ui';
import { SectionEmpty } from '@/dezerx/components/console/Section';
import FileDialog, { FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { Label, Panel, errorMessage, formatDate } from './common';

function formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${units[i]}`;
}

export default function RustDemosContainer() {
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const { toast } = useToast();

    const [demos, setDemos] = useState<RustDemo[] | null>(null);
    const [recording, setRecording] = useState(false);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [dialog, setDialog] = useState<FileDialogRequest | null>(null);

    const load = () => {
        if (!uuid) return;
        getRustDemos(uuid)
            .then((res) => {
                setDemos(res.demos || []);
                setRecording(!!res.recording);
            })
            .catch((err) => {
                setDemos((current) => current ?? []);
                toast(errorMessage(err, 'Could not load the demos.'), { tone: 'error' });
            });
    };

    useEffect(load, [uuid]);

    const record = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!uuid) return;
        setBusy(true);
        try {
            const res = await executeRustDemoAction(uuid, 'record', { name: name.trim() || `demo_${Date.now()}` });
            toast(res.message || 'Recording.', { tone: 'success' });
            setRecording(true);
            setName('');
        } catch (err) {
            toast(errorMessage(err, 'Could not start recording.'), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const stop = async () => {
        if (!uuid) return;
        setBusy(true);
        try {
            const res = await executeRustDemoAction(uuid, 'stop');
            toast(res.message || 'Recording saved.', { tone: 'success' });
            setRecording(false);
            window.setTimeout(load, 1500);
        } catch (err) {
            toast(errorMessage(err, 'Could not stop the recording.'), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const download = async (demo: RustDemo) => {
        if (!uuid) return;
        setDownloading(demo.path);
        try {
            window.location.href = await getFileDownloadUrl(uuid, demo.path);
        } catch (err) {
            toast(errorMessage(err, 'Could not create a download link.'), { tone: 'error' });
        } finally {
            setDownloading(null);
        }
    };

    const copyPlay = (demo: RustDemo) => {
        const command = `demo.play ${demo.name.replace(/\.dem$/i, '')}`;
        void navigator.clipboard?.writeText(command);
        toast(`Copied "${command}".`, { tone: 'success' });
    };

    const remove = (demo: RustDemo) =>
        setDialog({
            title: `Delete ${demo.name}?`,
            body: 'The recording is removed from the server for good.',
            confirmLabel: 'Delete',
            destructive: true,
            onConfirm: async () => {
                if (!uuid) return;
                try {
                    await executeRustDemoAction(uuid, 'delete', { path: demo.path });
                    toast(`${demo.name} deleted.`, { tone: 'success' });
                    load();
                } catch (err) {
                    toast(errorMessage(err, 'Could not delete the demo.'), { tone: 'error' });
                    throw err;
                }
            },
        });

    return (
        <div className={'space-y-4'}>
            <FileDialog request={dialog} onClose={() => setDialog(null)} />

            <Panel
                title={'Recorder'}
                description={'Records everything the server sees into a .dem file you can replay in the Rust client.'}
            >
                {recording ? (
                    <div
                        className={
                            'flex flex-wrap items-center justify-between gap-3 rounded-xl bg-overlay/40 px-3 py-2.5'
                        }
                    >
                        <span className={'flex items-center gap-2 text-xs font-medium text-ink'}>
                            <span aria-hidden={'true'} className={'h-1.5 w-1.5 animate-pulse rounded-full bg-danger'} />
                            Recording
                        </span>
                        <Button size={'sm'} variant={'secondary'} loading={busy} onClick={() => void stop()}>
                            Stop and save
                        </Button>
                    </div>
                ) : (
                    <form
                        onSubmit={(event) => void record(event)}
                        className={'grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end'}
                    >
                        <Input
                            label={'Name'}
                            value={name}
                            placeholder={'raid_check'}
                            spellCheck={false}
                            onChange={(event) => setName(event.target.value)}
                        />
                        <Button type={'submit'} size={'sm'} className={'h-11'} loading={busy}>
                            Start recording
                        </Button>
                    </form>
                )}
            </Panel>

            {demos === null ? (
                <SkeletonRegion label={'Loading demos'}>
                    <div className={'space-y-1 rounded-2xl bg-card p-2'}>
                        {[0, 1, 2].map((row) => (
                            <Skeleton key={row} className={'h-12 w-full'} />
                        ))}
                    </div>
                </SkeletonRegion>
            ) : demos.length === 0 ? (
                <SectionEmpty
                    icon={Monitor}
                    title={'No recordings yet'}
                    body={'Start a recording above, then stop it to save the file.'}
                />
            ) : (
                <div className={'rounded-2xl bg-card p-2'}>
                    <div className={'hidden items-center gap-3 px-2 pb-1.5 pt-1 sm:flex'}>
                        <span className={'flex-1'}>
                            <Label>Recording</Label>
                        </span>
                        <span className={'w-20 text-right'}>
                            <Label>Size</Label>
                        </span>
                        <span className={'w-[15.5rem]'} />
                    </div>
                    <div className={'space-y-0.5'}>
                        {demos.map((demo) => (
                            <div key={demo.path} className={'flex flex-wrap items-center gap-3 rounded-xl p-2'}>
                                <span className={'min-w-0 flex-1'}>
                                    <span className={'block truncate font-mono text-xs font-medium text-ink'}>
                                        {demo.name}
                                    </span>
                                    <span className={'block truncate text-[10px] text-ink-faint'}>
                                        {demo.modified ? formatDate(demo.modified) : demo.path}
                                    </span>
                                </span>
                                <span className={'hidden w-20 text-right text-xs tabular-nums text-ink-muted sm:block'}>
                                    {formatBytes(demo.size)}
                                </span>
                                <span className={'flex gap-1'}>
                                    <Button
                                        size={'sm'}
                                        variant={'ghost'}
                                        onClick={() => copyPlay(demo)}
                                        title={'Copy the F1 console command'}
                                    >
                                        Copy command
                                    </Button>
                                    <Button
                                        size={'sm'}
                                        variant={'ghost'}
                                        loading={downloading === demo.path}
                                        onClick={() => void download(demo)}
                                    >
                                        Download
                                    </Button>
                                    <Button size={'sm'} variant={'ghost'} onClick={() => remove(demo)}>
                                        Delete
                                    </Button>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <p className={'px-1 text-xs text-ink-faint'}>
                To watch one, put the .dem in your Rust install folder, press F1 and run{' '}
                <code className={'font-mono text-ink-muted'}>demo.play name</code>.
            </p>
        </div>
    );
}
