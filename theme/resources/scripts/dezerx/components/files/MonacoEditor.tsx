import React, { useEffect, useLayoutEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useTheme } from '@/dezerx/lib/theme';
import { cn } from '@/dezerx/lib/cn';
import { DARK_THEME, LIGHT_THEME, defineThemes, languageFor, languageForMime } from '@/dezerx/lib/monaco';

interface Props {
    path: string | null;
    value: string;
    open: string[];
    height: number;
    readOnly: boolean;
    onChange: (value: string) => void;
    mode?: string;
}

export default function MonacoEditor({ path, value, open, height, readOnly, onChange, mode }: Props) {
    const mount = useRef<HTMLDivElement>(null);
    const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    const models = useRef(new Map<string, monaco.editor.ITextModel>());
    const views = useRef(new Map<string, monaco.editor.ICodeEditorViewState | null>());

    const dark = useTheme() !== 'light';

    const latest = useRef({ onChange });
    latest.current = { onChange };

    useLayoutEffect(() => {
        const node = mount.current;

        if (!node || editor.current) {
            return;
        }

        defineThemes(monaco);

        const instance = monaco.editor.create(node, {
            value: '',
            language: 'plaintext',
            theme: dark ? DARK_THEME : LIGHT_THEME,
            automaticLayout: true,
            minimap: { enabled: false },
            wordWrap: 'on',
            tabSize: 4,
            insertSpaces: true,
            detectIndentation: true,
            fontSize: 13,
            lineNumbers: 'on',
            folding: true,
            renderLineHighlight: 'line',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            fixedOverflowWidgets: true,
            padding: { top: 10, bottom: 10 },
            scrollbar: { useShadows: false, verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        });

        const subscription = instance.onDidChangeModelContent((event) => {
            if (!event.isFlush) {
                latest.current.onChange(instance.getValue());
            }
        });

        editor.current = instance;

        return () => {
            subscription.dispose();
            instance.dispose();

            models.current.forEach((model) => model.dispose());
            models.current.clear();
            views.current.clear();

            editor.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        monaco.editor.setTheme(dark ? DARK_THEME : LIGHT_THEME);
    }, [dark]);

    useLayoutEffect(() => {
        const instance = editor.current;

        if (!instance || path === null) {
            return;
        }

        const previous = instance.getModel();

        if (previous !== null) {
            for (const [key, model] of models.current) {
                if (model === previous) {
                    views.current.set(key, instance.saveViewState());
                    break;
                }
            }
        }

        let model = models.current.get(path);

        if (!model) {
            model = monaco.editor.createModel(value, mode ? languageForMime(mode) : languageFor(path));
            models.current.set(path, model);
        }

        if (previous !== model) {
            instance.setModel(model);

            const view = views.current.get(path);

            if (view) {
                instance.restoreViewState(view);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path]);

    useEffect(() => {
        const model = path === null ? undefined : models.current.get(path);

        if (model && mode) {
            monaco.editor.setModelLanguage(model, languageForMime(mode));
        }
    }, [mode, path]);

    useEffect(() => {
        const instance = editor.current;
        const model = path === null ? undefined : models.current.get(path);

        if (!instance || !model || model.getValue() === value) {
            return;
        }

        const view = instance.getModel() === model ? instance.saveViewState() : null;

        model.setValue(value);

        if (view) {
            instance.restoreViewState(view);
        }
    }, [path, value]);

    useEffect(() => {
        editor.current?.updateOptions({ readOnly });
    }, [readOnly]);

    useEffect(() => {
        const keep = new Set(open);

        for (const [key, model] of Array.from(models.current.entries())) {
            if (!keep.has(key) && key !== path) {
                model.dispose();
                models.current.delete(key);
                views.current.delete(key);
            }
        }
    }, [open, path]);

    return (
        <div
            ref={mount}
            style={{ height: height || '100%' }}
            className={cn('h-full w-full overflow-hidden rounded-xl')}
        />
    );
}
