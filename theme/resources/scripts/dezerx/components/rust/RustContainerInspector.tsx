import React, { useState } from 'react';
import { RustToolCupboard } from '@/api/server/rustPlayers';
import { cn } from '@/dezerx/lib/cn';
import { ItemSlot, Label, Panel, formatMinutes } from './common';

interface Props {
    uuid: string;
    steamId: string;
    playerName: string;
    toolCupboards: RustToolCupboard[];
    onRefresh: () => void;
}

export default function RustContainerInspector({ playerName, toolCupboards }: Props) {
    const [index, setIndex] = useState(0);
    const tc = toolCupboards[index] ?? toolCupboards[0] ?? null;

    if (toolCupboards.length === 0) {
        return (
            <Panel title={'Tool cupboards'} description={`Cupboards ${playerName} is authorised on.`}>
                <p className={'text-xs text-ink-faint'}>Not authorised on any tool cupboard.</p>
            </Panel>
        );
    }

    return (
        <Panel title={'Tool cupboards'} description={`Cupboards ${playerName} is authorised on, with their upkeep.`}>
            <div className={'grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]'}>
                <div className={'space-y-1'}>
                    {toolCupboards.map((cupboard, i) => (
                        <button
                            key={cupboard.id}
                            type={'button'}
                            onClick={() => setIndex(i)}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                                tc?.id === cupboard.id ? 'bg-raised' : 'bg-overlay/40 hover:bg-raised/60'
                            )}
                        >
                            <span className={'min-w-0 flex-1'}>
                                <span className={'block text-xs font-medium text-ink'}>Grid {cupboard.grid}</span>
                                <span className={'block text-[10px] text-ink-faint'}>
                                    {cupboard.authorizedCount} authorised
                                </span>
                            </span>
                            <span className={'text-xs tabular-nums text-ink-muted'}>
                                {formatMinutes(cupboard.upkeepMinutes)}
                            </span>
                        </button>
                    ))}
                </div>

                {tc && (
                    <div className={'min-w-0 space-y-4'}>
                        <dl className={'grid grid-cols-3 gap-3 text-xs'}>
                            <div>
                                <dt className={'text-[10px] uppercase tracking-wider text-ink-faint'}>Protected for</dt>
                                <dd className={'text-ink'}>{formatMinutes(tc.upkeepMinutes)}</dd>
                            </div>
                            <div>
                                <dt className={'text-[10px] uppercase tracking-wider text-ink-faint'}>Grid</dt>
                                <dd className={'text-ink'}>{tc.grid}</dd>
                            </div>
                            <div>
                                <dt className={'text-[10px] uppercase tracking-wider text-ink-faint'}>Entity</dt>
                                <dd className={'font-mono text-ink'}>{tc.id}</dd>
                            </div>
                        </dl>

                        <div className={'space-y-1.5'}>
                            <Label>Authorised</Label>
                            <div className={'flex flex-wrap gap-1.5'}>
                                {tc.authorized.map((who) => (
                                    <span
                                        key={who.steamId}
                                        title={who.steamId}
                                        className={'rounded-lg bg-overlay/60 px-2 py-1 text-[11px] text-ink-muted'}
                                    >
                                        {who.name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className={'space-y-1.5'}>
                            <Label>Upkeep stored</Label>
                            <div className={'grid grid-cols-[repeat(6,minmax(0,3.5rem))] gap-1.5'}>
                                {Array.from({ length: 24 }).map((_, slot) => (
                                    <ItemSlot
                                        key={slot}
                                        item={tc.inventory.find((item) => item.slot === slot) ?? null}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
}
