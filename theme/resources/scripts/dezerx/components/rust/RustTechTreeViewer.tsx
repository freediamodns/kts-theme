import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
    RustTechTree,
    RustTechTreeNode,
    executeTechTreeAction,
    getTechTreeDefinitions,
} from '@/api/server/rustPlayers';
import { Button, Input, Skeleton, SkeletonRegion, useToast } from '@/dezerx/components/ui';
import { FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { cn } from '@/dezerx/lib/cn';
import { Panel, Segmented, errorMessage } from './common';
import RustItemImage from './RustItemImage';

interface Props {
    uuid: string;
    steamId: string;
    playerName: string;
    unlockedBlueprints: string[];
    onRefresh: () => void;
    confirm: (request: FileDialogRequest) => void;
}

export default function RustTechTreeViewer({
    uuid,
    steamId,
    playerName,
    unlockedBlueprints,
    onRefresh,
    confirm,
}: Props) {
    const { toast } = useToast();
    const [trees, setTrees] = useState<Record<string, RustTechTree> | null>(null);
    const [tier, setTier] = useState('wb1');
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        getTechTreeDefinitions(uuid)
            .then((res) => setTrees(res.trees))
            .catch((err) => {
                setTrees({});
                toast(errorMessage(err, 'Could not load the tech tree.'), { tone: 'error' });
            });
    }, [uuid]);

    const learned = useMemo(() => new Set(unlockedBlueprints), [unlockedBlueprints]);
    const isLearned = (node: RustTechTreeNode) => learned.has(node.shortname) || learned.has(node.id);

    const nodes = useMemo(() => {
        const term = query.trim().toLowerCase();
        return (trees?.[tier]?.nodes ?? []).filter(
            (node) => !term || node.name.toLowerCase().includes(term) || node.shortname.includes(term)
        );
    }, [trees, tier, query]);

    const byId = useMemo(() => {
        const map = new Map<string, RustTechTreeNode>();
        Object.values(trees ?? {}).forEach((tree) => tree.nodes.forEach((node) => map.set(node.id, node)));
        return map;
    }, [trees]);

    const run = async (action: string, payload: Record<string, any>, done: string) => {
        setBusy(payload.shortname ?? action);
        try {
            await executeTechTreeAction(uuid, steamId, action, payload);
            toast(done, { tone: 'success' });
            window.setTimeout(onRefresh, 400);
        } catch (err) {
            toast(errorMessage(err, 'That did not go through.'), { tone: 'error' });
            throw err;
        } finally {
            setBusy(null);
        }
    };

    const learnedInTier = (trees?.[tier]?.nodes ?? []).filter(isLearned).length;

    return (
        <Panel
            title={'Blueprints'}
            description={`${playerName} knows ${unlockedBlueprints.length} blueprints, counting the ones every player starts with.`}
            action={
                <>
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        onClick={() =>
                            confirm({
                                title: `Forget every blueprint ${playerName} learned?`,
                                body: 'They keep the default blueprints and lose everything they researched.',
                                confirmLabel: 'Reset blueprints',
                                destructive: true,
                                onConfirm: () => run('reset', {}, 'Blueprints reset.'),
                            })
                        }
                    >
                        Reset
                    </Button>
                    <Button
                        size={'sm'}
                        variant={'secondary'}
                        onClick={() =>
                            confirm({
                                title: `Teach ${playerName} every blueprint?`,
                                body: 'Every item in the game becomes craftable for them.',
                                confirmLabel: 'Unlock all',
                                onConfirm: () => run('unlockall', {}, 'Every blueprint unlocked.'),
                            })
                        }
                    >
                        Unlock all
                    </Button>
                </>
            }
        >
            <div className={'flex flex-wrap items-center gap-3'}>
                <Segmented
                    label={'Workbench tier'}
                    value={tier}
                    onChange={setTier}
                    className={'bg-overlay/40'}
                    options={Object.entries(trees ?? {}).map(([id, tree]) => ({ value: id, label: tree.name }))}
                />
                <div className={'w-full sm:w-60'}>
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={'Search blueprints'}
                        aria-label={'Search blueprints'}
                        icon={<Search className={'h-4 w-4'} />}
                    />
                </div>
                {trees && (
                    <span className={'text-xs text-ink-faint'}>
                        {learnedInTier} of {trees[tier]?.nodes.length ?? 0} learned
                    </span>
                )}
            </div>

            {trees === null ? (
                <SkeletonRegion label={'Loading blueprints'}>
                    <div className={'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className={'h-16 w-full'} />
                        ))}
                    </div>
                </SkeletonRegion>
            ) : nodes.length === 0 ? (
                <p className={'text-xs text-ink-faint'}>Nothing here.</p>
            ) : (
                <div className={'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}>
                    {nodes.map((node) => {
                        const known = isLearned(node);
                        const needs = node.parents.map((id) => byId.get(id)).filter((p): p is RustTechTreeNode => !!p);
                        return (
                            <div
                                key={node.id}
                                className={cn(
                                    'flex items-center gap-3 rounded-xl px-3 py-2.5',
                                    known ? 'bg-overlay/60' : 'bg-overlay/30'
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex h-9 w-9 shrink-0 items-center justify-center',
                                        !known && 'opacity-40 grayscale'
                                    )}
                                >
                                    <RustItemImage shortname={node.shortname} alt={node.name} className={'h-9 w-9'} />
                                </span>
                                <span className={'min-w-0 flex-1'}>
                                    <span className={'block truncate text-xs font-medium text-ink'}>{node.name}</span>
                                    <span className={'block truncate text-[10px] text-ink-faint'}>
                                        {node.cost} scrap
                                        {needs.length > 0 ? ` · after ${needs.map((p) => p.name).join(', ')}` : ''}
                                    </span>
                                </span>
                                {known ? (
                                    <span
                                        className={
                                            'shrink-0 text-[10px] font-semibold uppercase tracking-wider text-ink-faint'
                                        }
                                    >
                                        Learned
                                    </span>
                                ) : (
                                    <Button
                                        size={'sm'}
                                        variant={'ghost'}
                                        loading={busy === node.shortname}
                                        disabled={busy !== null}
                                        onClick={() =>
                                            void run(
                                                'unlock',
                                                { shortname: node.shortname },
                                                `${node.name} unlocked.`
                                            ).catch(() => undefined)
                                        }
                                    >
                                        Unlock
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Panel>
    );
}
