import React, { useEffect, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { RustItemSlot, executeInventoryAction } from '@/api/server/rustPlayers';
import { Button, useToast } from '@/dezerx/components/ui';
import { FileDialogRequest } from '@/dezerx/components/files/FileDialog';
import { cn } from '@/dezerx/lib/cn';
import { ItemSlot, Panel, errorMessage } from './common';
import RustItemImage from './RustItemImage';
import WALLPAPER from './inventoryWallpaper';

type ContainerName = 'main' | 'belt' | 'wear';

const SLOT_ACTION =
    'flex h-5 w-5 items-center justify-center bg-black/75 text-[#f7ebe1] transition-colors disabled:opacity-50';

const COLUMNS: { name: ContainerName; label: string; size: number; cols: string }[][] = [
    [
        { name: 'main', label: 'Main', size: 24, cols: 'grid-cols-[repeat(6,minmax(0,3.5rem))]' },
        { name: 'belt', label: 'Belt', size: 6, cols: 'grid-cols-[repeat(6,minmax(0,3.5rem))]' },
    ],
    [{ name: 'wear', label: 'Clothing', size: 8, cols: 'grid-cols-[repeat(4,minmax(0,3.5rem))]' }],
];

interface Props {
    uuid: string;
    steamId: string;
    playerName: string;
    inventory: { main: RustItemSlot[]; belt: RustItemSlot[]; wear: RustItemSlot[] };
    onRefresh: () => void;
    onOpenGiveModal: (slot?: { container: ContainerName; slot: number } | null) => void;
    confirm: (request: FileDialogRequest) => void;
    readOnly?: boolean;
}

export default function RustInventoryGrid({
    uuid,
    steamId,
    playerName,
    inventory,
    onRefresh,
    onOpenGiveModal,
    confirm,
    readOnly = false,
}: Props) {
    const { toast } = useToast();
    const [selected, setSelected] = useState<{ container: ContainerName; slot: number } | null>(null);
    const [busy, setBusy] = useState(false);

    const find = (container: ContainerName, slot: number) =>
        (inventory[container] || []).find((item) => item.slot === slot) ?? null;
    const item = selected ? find(selected.container, selected.slot) : null;

    useEffect(() => {
        if (selected && !item) setSelected(null);
    }, [item, selected]);

    const total = inventory.main.length + inventory.belt.length + inventory.wear.length;

    const remove = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            await executeInventoryAction(uuid, steamId, 'remove', {
                container: selected.container,
                slot: selected.slot,
            });
            toast('Item removed.', { tone: 'success' });
            setSelected(null);
            window.setTimeout(onRefresh, 300);
        } catch (err) {
            toast(errorMessage(err, 'Could not remove the item.'), { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const wipe = () =>
        confirm({
            title: `Clear ${playerName}'s inventory?`,
            body: 'Everything in their belt, main inventory and clothing is deleted. It cannot be undone.',
            confirmLabel: 'Clear inventory',
            destructive: true,
            onConfirm: async () => {
                try {
                    await executeInventoryAction(uuid, steamId, 'wipe', { target: 'all' });
                    toast('Inventory cleared.', { tone: 'success' });
                    window.setTimeout(onRefresh, 300);
                } catch (err) {
                    toast(errorMessage(err, 'Could not clear the inventory.'), { tone: 'error' });
                    throw err;
                }
            },
        });

    return (
        <Panel
            title={'Inventory'}
            description={
                readOnly
                    ? `${total} stacks. Pick a slot to inspect it.`
                    : `${total} stacks. Pick a slot to inspect it, or an empty one to put something there.`
            }
            action={
                !readOnly && (
                    <>
                        <Button size={'sm'} variant={'danger'} onClick={wipe} disabled={total === 0}>
                            Clear
                        </Button>
                        <Button size={'sm'} onClick={() => onOpenGiveModal(null)}>
                            Give item
                        </Button>
                    </>
                )
            }
        >
            <div className={'relative isolate overflow-hidden rounded-xl p-4 sm:p-5'}>
                <img
                    src={WALLPAPER}
                    alt={''}
                    aria-hidden={'true'}
                    draggable={false}
                    className={'absolute inset-0 -z-10 h-full w-full scale-105 select-none object-cover blur-[2px]'}
                />
                <div
                    aria-hidden={'true'}
                    className={'absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/[0.84] to-black/90'}
                />

                <div className={'flex flex-wrap gap-x-8 gap-y-4'}>
                    {COLUMNS.map((column, index) => (
                        <div key={index} className={'min-w-0 space-y-4'}>
                            {column.map((container) => (
                                <div key={container.name} className={'space-y-1.5'}>
                                    <p
                                        className={
                                            'text-[10px] font-semibold uppercase tracking-wider text-[#f7ebe1]/75'
                                        }
                                    >
                                        {container.label}
                                    </p>
                                    <div className={`grid gap-1 ${container.cols}`}>
                                        {Array.from({ length: container.size }).map((_, slot) => {
                                            const here = find(container.name, slot);
                                            const isSelected =
                                                selected?.container === container.name && selected.slot === slot;
                                            return (
                                                <div key={slot} className={'relative min-w-0'}>
                                                    <ItemSlot
                                                        rust
                                                        className={'w-full'}
                                                        item={here}
                                                        selected={isSelected}
                                                        onClick={
                                                            here
                                                                ? () =>
                                                                      setSelected(
                                                                          isSelected
                                                                              ? null
                                                                              : { container: container.name, slot }
                                                                      )
                                                                : readOnly
                                                                ? undefined
                                                                : () =>
                                                                      onOpenGiveModal({
                                                                          container: container.name,
                                                                          slot,
                                                                      })
                                                        }
                                                    />
                                                    {isSelected && here && !readOnly && (
                                                        <div className={'absolute right-0.5 top-0.5 flex gap-0.5'}>
                                                            <button
                                                                type={'button'}
                                                                title={'Replace'}
                                                                aria-label={`Replace ${here.name}`}
                                                                onClick={() =>
                                                                    onOpenGiveModal({ container: container.name, slot })
                                                                }
                                                                className={cn(SLOT_ACTION, 'hover:bg-black')}
                                                            >
                                                                <RefreshCw className={'h-3 w-3'} />
                                                            </button>
                                                            <button
                                                                type={'button'}
                                                                title={'Remove'}
                                                                aria-label={`Remove ${here.name}`}
                                                                disabled={busy}
                                                                onClick={() => void remove()}
                                                                className={cn(SLOT_ACTION, 'hover:bg-danger')}
                                                            >
                                                                <Trash2 className={'h-3 w-3'} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {item && selected && (
                <div className={'flex flex-wrap items-center gap-3 rounded-xl bg-overlay/40 p-3'}>
                    <span
                        className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-overlay/60 p-1.5'}
                    >
                        <RustItemImage shortname={item.shortname} alt={item.name} className={'h-full w-full'} />
                    </span>
                    <div className={'min-w-0 flex-1'}>
                        <p className={'truncate text-sm font-medium text-ink'}>{item.name}</p>
                        <p className={'truncate font-mono text-[10px] text-ink-faint'}>
                            {item.shortname} · {selected.container} slot {selected.slot + 1}
                        </p>
                    </div>
                    <dl className={'flex gap-5 text-xs'}>
                        <div>
                            <dt className={'text-[10px] uppercase tracking-wider text-ink-faint'}>Amount</dt>
                            <dd className={'tabular-nums text-ink'}>{item.amount.toLocaleString()}</dd>
                        </div>
                        {!!item.maxCondition && (
                            <div>
                                <dt className={'text-[10px] uppercase tracking-wider text-ink-faint'}>Condition</dt>
                                <dd className={'tabular-nums text-ink'}>
                                    {item.condition}/{item.maxCondition}
                                </dd>
                            </div>
                        )}
                        {!!item.skin && (
                            <div>
                                <dt className={'text-[10px] uppercase tracking-wider text-ink-faint'}>Skin</dt>
                                <dd className={'font-mono text-ink'}>{item.skin}</dd>
                            </div>
                        )}
                    </dl>
                </div>
            )}
        </Panel>
    );
}
