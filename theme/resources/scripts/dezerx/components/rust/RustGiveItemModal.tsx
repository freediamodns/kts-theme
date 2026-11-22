import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { RustItemDef, executeInventoryAction, getItemDefinitions } from '@/api/server/rustPlayers';
import { Button, Input, Select, Skeleton, SkeletonRegion, useToast } from '@/dezerx/components/ui';
import DialogShell, { DialogFooter } from '@/dezerx/components/files/Shell';
import { cn } from '@/dezerx/lib/cn';
import { errorMessage } from './common';
import RustItemImage from './RustItemImage';

type Target = { container: 'main' | 'belt' | 'wear'; slot: number } | null;

interface Props {
    uuid: string;
    steamId: string;
    playerName: string;
    isOpen: boolean;
    onClose: () => void;
    onGiven?: () => void;
    targetSlot?: Target;
}

const CONTAINER_NAMES = { main: 'main inventory', belt: 'belt', wear: 'clothing' };

export default function RustGiveItemModal({ uuid, steamId, playerName, isOpen, onClose, onGiven, targetSlot }: Props) {
    const { toast } = useToast();
    const [items, setItems] = useState<RustItemDef[] | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [category, setCategory] = useState('All');
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState<RustItemDef | null>(null);
    const [amount, setAmount] = useState('1');
    const [skin, setSkin] = useState('');
    const [giving, setGiving] = useState(false);

    useEffect(() => {
        if (!isOpen || items !== null) return;
        getItemDefinitions(uuid)
            .then((res) => {
                setItems(res.items);
                setCategories(res.categories);
            })
            .catch((err) => {
                setItems([]);
                toast(errorMessage(err, 'Could not load the item list.'), { tone: 'error' });
            });
    }, [isOpen, uuid]);

    useEffect(() => {
        if (!isOpen) return;
        setPicked(null);
        setAmount('1');
        setSkin('');
        setQuery('');
        setCategory(targetSlot?.container === 'wear' ? 'Clothing' : 'All');
    }, [isOpen, targetSlot]);

    const visible = useMemo(() => {
        const term = query.trim().toLowerCase();
        return (items ?? []).filter(
            (item) =>
                (category === 'All' || item.category === category) &&
                (!term || item.name.toLowerCase().includes(term) || item.shortname.toLowerCase().includes(term))
        );
    }, [items, category, query]);

    const count = Number(amount);
    const valid = picked !== null && Number.isInteger(count) && count > 0 && (skin === '' || /^\d+$/.test(skin));

    const give = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!valid || !picked) return;
        setGiving(true);
        try {
            await executeInventoryAction(uuid, steamId, targetSlot ? 'set_slot' : 'give', {
                shortname: picked.shortname,
                amount: count,
                skinId: skin === '' ? 0 : Number(skin),
                ...(targetSlot ? { container: targetSlot.container, slot: targetSlot.slot } : {}),
            });
            toast(`Gave ${count.toLocaleString()} x ${picked.name} to ${playerName}.`, { tone: 'success' });
            onGiven?.();
            onClose();
        } catch (err) {
            toast(errorMessage(err, 'Could not give the item.'), { tone: 'error' });
        } finally {
            setGiving(false);
        }
    };

    return (
        <DialogShell
            open={isOpen}
            onClose={() => !giving && onClose()}
            title={`Give ${playerName} an item`}
            body={
                targetSlot
                    ? `Goes into ${CONTAINER_NAMES[targetSlot.container]} slot ${
                          targetSlot.slot + 1
                      }, replacing what is there.`
                    : 'Stacks onto what they carry, or the first free slot.'
            }
            width={'xl'}
        >
            <form onSubmit={(event) => void give(event)} className={'mt-4 space-y-3'}>
                <div className={'grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]'}>
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={'Search items'}
                        aria-label={'Search items'}
                        icon={<Search className={'h-4 w-4'} />}
                        autoFocus
                    />
                    <Select
                        value={category}
                        onChange={setCategory}
                        options={['All', ...categories].map((c) => ({
                            value: c,
                            label: c === 'All' ? 'All categories' : c,
                        }))}
                    />
                </div>

                <div className={'h-72 overflow-y-auto rounded-2xl bg-overlay/30 p-1.5'}>
                    {items === null ? (
                        <SkeletonRegion label={'Loading items'}>
                            <div className={'grid grid-cols-2 gap-1.5 sm:grid-cols-3'}>
                                {Array.from({ length: 9 }).map((_, i) => (
                                    <Skeleton key={i} className={'h-12 w-full'} />
                                ))}
                            </div>
                        </SkeletonRegion>
                    ) : visible.length === 0 ? (
                        <p className={'p-6 text-center text-xs text-ink-faint'}>No items match.</p>
                    ) : (
                        <div className={'grid grid-cols-2 gap-1.5 sm:grid-cols-3'}>
                            {visible.map((item) => (
                                <button
                                    key={item.shortname}
                                    type={'button'}
                                    onClick={() => {
                                        setPicked(item);
                                        if (count > item.stack) setAmount(String(item.stack));
                                    }}
                                    className={cn(
                                        'flex min-w-0 items-center gap-2 rounded-xl p-2 text-left transition-colors',
                                        picked?.shortname === item.shortname
                                            ? 'bg-raised ring-1 ring-accent/60'
                                            : 'hover:bg-raised/60'
                                    )}
                                >
                                    <span className={'flex h-8 w-8 shrink-0 items-center justify-center'}>
                                        <RustItemImage
                                            shortname={item.shortname}
                                            alt={item.name}
                                            className={'h-8 w-8'}
                                        />
                                    </span>
                                    <span className={'min-w-0'}>
                                        <span className={'block truncate text-xs font-medium text-ink'}>
                                            {item.name}
                                        </span>
                                        <span className={'block truncate font-mono text-[10px] text-ink-faint'}>
                                            {item.shortname}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={'grid grid-cols-2 gap-2'}>
                    <Input
                        label={'Amount'}
                        inputMode={'numeric'}
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        hint={picked ? `A full stack is ${picked.stack.toLocaleString()}.` : undefined}
                    />
                    <Input
                        label={'Skin ID'}
                        inputMode={'numeric'}
                        value={skin}
                        placeholder={'None'}
                        onChange={(event) => setSkin(event.target.value)}
                    />
                </div>

                <DialogFooter>
                    <Button type={'button'} size={'sm'} variant={'ghost'} onClick={onClose} disabled={giving}>
                        Cancel
                    </Button>
                    <Button type={'submit'} size={'sm'} loading={giving} disabled={!valid}>
                        {picked ? `Give ${picked.name}` : 'Pick an item'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogShell>
    );
}
