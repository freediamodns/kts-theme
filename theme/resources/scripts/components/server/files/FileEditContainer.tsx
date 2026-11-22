import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router';
import { dirname } from 'pathe';
import { Save } from 'lucide-react';
import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';
import { httpErrorToHuman } from '@/api/http';
import FileNameModal from '@/components/server/files/FileNameModal';
import Can from '@/components/elements/Can';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import ErrorBoundary from '@/components/elements/ErrorBoundary';
import { ServerError } from '@/components/elements/ScreenBlock';
import { ServerContext } from '@/state/server';
import { usePermissions } from '@/plugins/usePermissions';
import { encodePathSegments, hashToPath } from '@/helpers';
import { Button, Notice, Select, Skeleton, useToast } from '@/dezerx/components/ui';
import CodeEditor from '@/dezerx/components/files/CodeEditor';
import Breadcrumbs from '@/dezerx/components/files/Breadcrumbs';
import { basename } from '@/dezerx/components/files/paths';
import modes, { modeFor } from '@/modes';
import { useT } from '@/i18n';

const getNewFileDraftKey = (uuid: string, directory: string) => `pterodactyl:new-file:${uuid}:${directory}`;

const EDITOR_HEIGHT = 620;

export default () => {
    const t = useT();
    const { action } = useParams<{ action: 'new' | string }>();
    const history = useHistory();
    const { hash } = useLocation();
    const { toast } = useToast();

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(action === 'edit');
    const [saving, setSaving] = useState(false);
    const [content, setContent] = useState('');
    const [modalVisible, setModalVisible] = useState(false);

    const id = ServerContext.useStoreState((state) => state.server.data!.id);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const setDirectory = ServerContext.useStoreActions((actions) => actions.files.setDirectory);

    const [canRead] = usePermissions(['file.read-content']);

    const filePath = hashToPath(hash);
    const directory = action === 'new' ? filePath : dirname(filePath);
    const name = action === 'new' ? '' : basename(filePath);

    const [mode, setMode] = useState(() => (action === 'new' ? 'text/plain' : modeFor(filePath)));

    const draftKey = action === 'new' ? getNewFileDraftKey(uuid, directory) : undefined;

    const saveDraft = useCallback(
        (value: string) => {
            if (!draftKey) {
                return;
            }

            if (value.length > 0) {
                sessionStorage.setItem(draftKey, value);
            } else {
                sessionStorage.removeItem(draftKey);
            }
        },
        [draftKey]
    );

    useEffect(() => {
        setDirectory(directory);
    }, [directory, setDirectory]);

    useEffect(() => {
        if (!draftKey) {
            return;
        }

        setContent(sessionStorage.getItem(draftKey) || '');
    }, [draftKey]);

    useEffect(() => {
        if (action === 'new') {
            return;
        }

        setError('');
        setLoading(true);
        setMode(modeFor(filePath));

        getFileContents(uuid, filePath)
            .then(setContent)
            .catch((problem) => setError(httpErrorToHuman(problem)))
            .then(() => setLoading(false));
    }, [action, uuid, filePath]);

    const save = async (named?: string) => {
        setSaving(true);

        try {
            await saveFileContents(uuid, named || filePath, content);

            if (named) {
                if (draftKey) {
                    sessionStorage.removeItem(draftKey);
                }

                history.push(`/server/${id}/files/edit#/${encodePathSegments(named)}`);
                return;
            }

            toast(t('files.saved', { name }), { tone: 'success' });
        } catch (problem) {
            toast(httpErrorToHuman(problem), { tone: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const shortcut = useRef<(event: KeyboardEvent) => void>(() => undefined);

    shortcut.current = (event: KeyboardEvent) => {
        if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') {
            return;
        }

        event.preventDefault();

        if (saving) {
            return;
        }

        if (action === 'edit') {
            void save();
        } else {
            setModalVisible(true);
        }
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => shortcut.current(event);

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    if (error) {
        return <ServerError message={error} onBack={() => history.goBack()} />;
    }

    const browse = (path: string) => history.push(`/server/${id}/files#${encodeURIComponent(path)}`);

    return (
        <ServerContentBlock title={t('files.title')} showFlashKey={'files:view'}>
            <ErrorBoundary>
                <div className={'space-y-3'}>
                    <div className={'flex flex-wrap items-center justify-between gap-3'}>
                        <Breadcrumbs
                            directory={directory}
                            onNavigate={browse}
                            trailing={action === 'new' ? undefined : name}
                        />

                        <div className={'flex items-center gap-2'}>
                            <Select
                                value={mode}
                                onChange={setMode}
                                className={'w-48'}
                                options={modes.map((option) => ({
                                    value: option.mime,
                                    label: option.name,
                                }))}
                            />

                            <Can action={action === 'edit' ? 'file.update' : 'file.create'}>
                                <Button
                                    size={'sm'}
                                    disabled={saving || loading}
                                    onClick={() => (action === 'edit' ? save() : setModalVisible(true))}
                                    icon={<Save className={'h-3.5 w-3.5'} />}
                                >
                                    {action === 'edit' ? t('files.save') : t('files.create')}
                                </Button>
                            </Can>
                        </div>
                    </div>

                    {filePath.endsWith('.pteroignore') && (
                        <Notice tone={'info'} title={t('files.pteroignoreTitle')}>
                            {t('files.pteroignore')}
                        </Notice>
                    )}

                    <FileNameModal
                        visible={modalVisible}
                        onDismissed={() => setModalVisible(false)}
                        onFileNamed={(named) => {
                            setModalVisible(false);
                            save(named);
                        }}
                    />

                    <div className={'overflow-hidden rounded-2xl bg-card ring-1 ring-line-field'}>
                        {loading ? (
                            <Skeleton className={'w-full'} style={{ height: EDITOR_HEIGHT }} />
                        ) : (
                            <CodeEditor
                                path={filePath}
                                value={content}
                                open={[filePath]}
                                mode={mode}
                                height={EDITOR_HEIGHT}
                                readOnly={action === 'edit' && !canRead}
                                onChange={(value) => {
                                    setContent(value);

                                    if (action === 'new') {
                                        saveDraft(value);
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>
            </ErrorBoundary>
        </ServerContentBlock>
    );
};
