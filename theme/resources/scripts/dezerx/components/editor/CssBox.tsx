import React, { useEffect, useLayoutEffect, useRef } from 'react';
import CodeMirror from 'codemirror';
import { useTheme } from '@/dezerx/lib/theme';
import { cn } from '@/dezerx/lib/cn';
import style from './cssbox.module.css';

import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/ayu-mirage.css';
import 'codemirror/theme/neo.css';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/mode/css/css';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/css-hint';

interface Hinting {
    showHint?: (options: { hint: unknown; completeSingle: boolean }) => void;
}

const cssHint = (CodeMirror as unknown as { hint?: { css?: unknown } }).hint?.css;

const WORD = /[-a-zA-Z]/;

export function CssBox({
    value,
    limit,
    invalid,
    onChange,
}: {
    value: string;
    limit: number;
    invalid: boolean;
    onChange: (next: string) => void;
}) {
    const mount = useRef<HTMLTextAreaElement>(null);
    const editor = useRef<CodeMirror.Editor | null>(null);
    const dark = useTheme() !== 'light';

    const latest = useRef({ onChange, limit });
    latest.current = { onChange, limit };

    useLayoutEffect(() => {
        const node = mount.current;

        if (!node || editor.current) {
            return;
        }

        const instance = CodeMirror.fromTextArea(node, {
            mode: { name: 'css', inline: true },
            theme: 'ayu-mirage',
            lineNumbers: false,
            lineWrapping: true,
            indentUnit: 4,
            tabSize: 4,
            smartIndent: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            viewportMargin: Infinity,
            spellcheck: false,
            extraKeys: { 'Ctrl-Space': 'autocomplete' },
        });

        instance.on('change', (cm) => {
            const next = cm.getValue();
            const capped = next.slice(0, latest.current.limit);

            if (capped !== next) {
                const cursor = cm.getDoc().getCursor();

                cm.setValue(capped);
                cm.getDoc().setCursor(cursor);

                return;
            }

            latest.current.onChange(capped);
        });

        instance.on('inputRead', (cm, change) => {
            if (cssHint === undefined || change.origin !== '+input' || !WORD.test(change.text[0] ?? '')) {
                return;
            }

            (cm as unknown as Hinting).showHint?.({ hint: cssHint, completeSingle: false });
        });

        editor.current = instance;

        return () => {
            instance.toTextArea();
            editor.current = null;
        };
    }, []);

    useEffect(() => {
        editor.current?.setOption('theme', dark ? 'ayu-mirage' : 'neo');
    }, [dark]);

    useEffect(() => {
        const instance = editor.current;

        if (!instance || instance.getValue() === value) {
            return;
        }

        const cursor = instance.getDoc().getCursor();

        instance.setValue(value);
        instance.getDoc().setCursor(cursor);
    }, [value]);

    return (
        <div className={cn(style.box, invalid && style.invalid)}>
            <textarea ref={mount} defaultValue={value} aria-label={'Declarations'} />
        </div>
    );
}

export default CssBox;
