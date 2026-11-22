import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/dezerx/lib/cn';

export interface NbtNode {
    name: string | null;
    type: number;
    typeName: string;
    value?: unknown;
    children?: NbtNode[];
    contentType?: number;
}

const TAG_END = 0;
const TAG_BYTE = 1;
const TAG_DOUBLE = 6;
const TAG_BYTE_ARRAY = 7;
const TAG_STRING = 8;
const TAG_LIST = 9;
const TAG_COMPOUND = 10;
const TAG_LONG_ARRAY = 12;

const SHORT: Record<number, string> = {
    1: 'byte',
    2: 'short',
    3: 'int',
    4: 'long',
    5: 'float',
    6: 'double',
    7: 'bytes',
    8: 'string',
    9: 'list',
    10: 'compound',
    11: 'ints',
    12: 'longs',
};

function isBranch(node: NbtNode): boolean {
    return node.type === TAG_COMPOUND || node.type === TAG_LIST;
}

function isArray(node: NbtNode): boolean {
    return node.type >= TAG_BYTE_ARRAY && node.type <= TAG_LONG_ARRAY && !isBranch(node);
}

export function replaceAt(root: NbtNode, path: number[], value: unknown): NbtNode {
    if (path.length === 0) {
        return { ...root, value };
    }

    const [head, ...rest] = path;

    if (head === undefined) {
        return root;
    }

    const children = [...(root.children ?? [])];
    const child = children[head];

    if (!child) {
        return root;
    }

    children[head] = replaceAt(child, rest, value);

    return { ...root, children };
}

export function NbtTree({
    node,
    onChange,
    path = [],
    depth = 0,
    defaultOpen = true,
}: {
    node: NbtNode;
    onChange: (path: number[], value: unknown) => void;
    path?: number[];
    depth?: number;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen && depth < 1);

    const label = node.name ?? 'root';
    const branch = isBranch(node);

    return (
        <div>
            <div
                className={'group flex items-center gap-1.5 rounded-lg py-1 pr-2 hover:bg-raised'}
                style={{ paddingLeft: depth * 14 + 6 }}
            >
                {branch ? (
                    <button
                        type={'button'}
                        onClick={() => setOpen((current) => !current)}
                        aria-expanded={open}
                        aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
                        className={'shrink-0 rounded p-0.5 text-ink-faint hover:text-ink'}
                    >
                        <ChevronRight
                            className={cn('h-3 w-3 transition-transform', open && 'rotate-90')}
                            aria-hidden={'true'}
                        />
                    </button>
                ) : (
                    <span aria-hidden={'true'} className={'w-4 shrink-0'} />
                )}

                <span className={'shrink-0 truncate text-xs text-ink'}>{label}</span>

                <span className={'shrink-0 rounded bg-overlay/60 px-1 text-[10px] text-ink-faint'}>
                    {SHORT[node.type] ?? node.typeName}
                </span>

                {branch && <span className={'shrink-0 text-[10px] text-ink-faint'}>{node.children?.length ?? 0}</span>}

                {!branch && <NbtValue node={node} onChange={(value) => onChange(path, value)} />}
            </div>

            {branch && open && (
                <div>
                    {(node.children ?? []).map((child, index) => (
                        <NbtTree
                            key={`${child.name ?? index}-${index}`}
                            node={child}
                            onChange={onChange}
                            path={[...path, index]}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function NbtValue({ node, onChange }: { node: NbtNode; onChange: (value: unknown) => void }) {
    if (isArray(node)) {
        return (
            <span className={'ml-1 truncate text-[11px] text-ink-faint'}>
                [{(node.value as unknown[])?.length ?? 0} entries]
            </span>
        );
    }

    if (node.type === TAG_END) {
        return null;
    }

    if (node.type === TAG_BYTE && (node.value === 0 || node.value === 1)) {
        return (
            <button
                type={'button'}
                onClick={() => onChange(node.value === 1 ? 0 : 1)}
                className={cn(
                    'ml-1 shrink-0 rounded px-1.5 text-[11px] font-medium transition-colors',
                    node.value === 1 ? 'bg-accent/15 text-accent' : 'bg-overlay/60 text-ink-faint hover:text-ink'
                )}
            >
                {node.value === 1 ? 'true' : 'false'}
            </button>
        );
    }

    const numeric = node.type >= TAG_BYTE && node.type <= TAG_DOUBLE;

    return (
        <input
            value={String(node.value ?? '')}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
            aria-label={node.name ?? 'value'}
            className={cn(
                'ml-1 min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0 text-[11px] text-ink-muted',
                'hover:border-line-field focus:border-accent/60 focus:bg-raised focus:text-ink focus:outline-none',
                numeric && 'font-mono',
                node.type === TAG_STRING && 'text-accent'
            )}
        />
    );
}
