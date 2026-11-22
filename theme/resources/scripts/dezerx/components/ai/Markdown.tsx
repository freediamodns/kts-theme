import React, { ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';
import { useCopied } from '@/dezerx/lib/useCopied';

export function Markdown({ text }: { text: string }) {
    return <div className={'space-y-2.5'}>{blocks(text)}</div>;
}

function blocks(text: string): ReactNode[] {
    const out: ReactNode[] = [];
    const lines = text.replace(/\r\n/g, '\n').split('\n');

    let index = 0;
    let key = 0;

    while (index < lines.length) {
        const line = lines[index] ?? '';

        const fence = /^```(\w*)\s*$/.exec(line);

        if (fence) {
            const body: string[] = [];
            index++;

            while (index < lines.length && !/^```/.test(lines[index] ?? '')) {
                body.push(lines[index] ?? '');
                index++;
            }

            index++;

            out.push(<CodeBlock key={key++} language={fence[1] ?? ''} code={body.join('\n')} />);

            continue;
        }

        if (line.trim() === '') {
            index++;

            continue;
        }

        const heading = /^(#{1,4})\s+(.*)$/.exec(line);

        if (heading) {
            const depth = (heading[1] ?? '#').length;

            out.push(
                <p
                    key={key++}
                    className={cn('font-semibold tracking-tight text-ink', depth <= 2 ? 'text-sm' : 'text-xs')}
                >
                    {inline(heading[2] ?? '')}
                </p>
            );
            index++;

            continue;
        }

        if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
            const items: string[] = [];
            const ordered = /^\s*\d+\./.test(line);

            while (index < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[index] ?? '')) {
                items.push((lines[index] ?? '').replace(/^\s*([-*+]|\d+\.)\s+/, ''));
                index++;
            }

            out.push(
                <ul key={key++} className={'space-y-1 pl-1'}>
                    {items.map((item, at) => (
                        <li key={at} className={'flex gap-2 text-xs leading-relaxed text-ink-muted'}>
                            <span aria-hidden={'true'} className={'shrink-0 text-ink-faint'}>
                                {ordered ? `${at + 1}.` : '•'}
                            </span>
                            <span className={'min-w-0'}>{inline(item)}</span>
                        </li>
                    ))}
                </ul>
            );

            continue;
        }

        const paragraph: string[] = [];

        while (
            index < lines.length &&
            (lines[index] ?? '').trim() !== '' &&
            !/^```/.test(lines[index] ?? '') &&
            !/^#{1,4}\s/.test(lines[index] ?? '') &&
            !/^\s*([-*+]|\d+\.)\s+/.test(lines[index] ?? '')
        ) {
            paragraph.push(lines[index] ?? '');
            index++;
        }

        out.push(
            <p key={key++} className={'text-xs leading-relaxed text-ink-muted'}>
                {inline(paragraph.join(' '))}
            </p>
        );
    }

    return out;
}

function inline(text: string): ReactNode[] {
    const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\((https?:\/\/[^\s)]+)\))/g;

    const out: ReactNode[] = [];
    let last = 0;
    let key = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > last) {
            out.push(text.slice(last, match.index));
        }

        const token = match[0];

        if (token.startsWith('`')) {
            out.push(
                <code key={key++} className={'rounded-md bg-overlay/60 px-1 py-0.5 font-mono text-[11px] text-ink'}>
                    {token.slice(1, -1)}
                </code>
            );
        } else if (token.startsWith('**')) {
            out.push(
                <strong key={key++} className={'font-semibold text-ink'}>
                    {token.slice(2, -2)}
                </strong>
            );
        } else if (token.startsWith('[')) {
            const label = /\[([^\]]+)\]/.exec(token)?.[1] ?? '';

            out.push(
                <a
                    key={key++}
                    href={match[5]}
                    target={'_blank'}
                    rel={'noreferrer noopener'}
                    className={'text-accent underline underline-offset-2'}
                >
                    {label}
                </a>
            );
        } else {
            out.push(
                <em key={key++} className={'italic'}>
                    {token.slice(1, -1)}
                </em>
            );
        }

        last = match.index + token.length;
    }

    if (last < text.length) {
        out.push(text.slice(last));
    }

    return out;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
    const t = useT();
    const [copied, copy] = useCopied();

    return (
        <div className={'overflow-hidden rounded-xl border border-line-field bg-base/50'}>
            <div className={'flex items-center justify-between gap-2 px-2.5 pt-1'}>
                <span className={'truncate font-mono text-[10px] uppercase tracking-wider text-ink-faint'}>
                    {language || 'text'}
                </span>

                <button
                    type={'button'}
                    onClick={() => copy(code)}
                    aria-label={t('common.copy')}
                    title={t('common.copy')}
                    className={'rounded-lg p-1 text-ink-faint transition-colors hover:bg-raised hover:text-ink'}
                >
                    {copied ? (
                        <Check className={'h-3 w-3'} aria-hidden={'true'} />
                    ) : (
                        <Copy className={'h-3 w-3'} aria-hidden={'true'} />
                    )}
                </button>
            </div>

            <pre className={'max-h-72 overflow-auto p-2.5'}>
                <code className={'font-mono text-[11px] leading-relaxed text-ink-muted'}>
                    {highlight(code, language)}
                </code>
            </pre>
        </div>
    );
}

const TOKENS: Array<{ pattern: RegExp; className: string }> = [
    { pattern: /(^|\s)(#|\/\/)[^\n]*/g, className: 'text-ink-faint italic' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'text-ink-faint italic' },
    { pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, className: 'text-success' },
    { pattern: /^\s*[\w.$-]+(?=\s*[:=])/gm, className: 'text-accent' },
    { pattern: /\b(true|false|null|yes|no|on|off)\b/gi, className: 'text-warning' },
    { pattern: /\b\d+(?:\.\d+)?\b/g, className: 'text-warning' },
];

function highlight(code: string, language: string): ReactNode[] {
    if (/^(diff|patch)$/i.test(language)) {
        return code.split('\n').map((line, index) => (
            <span
                key={index}
                className={cn(
                    'block',
                    line.startsWith('+') && 'text-success',
                    line.startsWith('-') && 'text-danger',
                    line.startsWith('@') && 'text-accent'
                )}
            >
                {line}
                {'\n'}
            </span>
        ));
    }

    const marks: Array<{ start: number; end: number; className: string }> = [];

    for (const { pattern, className } of TOKENS) {
        pattern.lastIndex = 0;

        let match: RegExpExecArray | null;

        while ((match = pattern.exec(code)) !== null) {
            const start = match.index + (match[1]?.length ?? 0);
            const end = match.index + match[0].length;

            if (!marks.some((mark) => start < mark.end && end > mark.start)) {
                marks.push({ start, end, className });
            }
        }
    }

    marks.sort((a, b) => a.start - b.start);

    const out: ReactNode[] = [];
    let at = 0;

    marks.forEach((mark, index) => {
        if (mark.start > at) {
            out.push(code.slice(at, mark.start));
        }

        out.push(
            <span key={index} className={mark.className}>
                {code.slice(mark.start, mark.end)}
            </span>
        );

        at = mark.end;
    });

    if (at < code.length) {
        out.push(code.slice(at));
    }

    return out;
}

export default Markdown;
