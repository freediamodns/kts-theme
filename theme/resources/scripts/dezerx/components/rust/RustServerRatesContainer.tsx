import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import { RustRatesConfig, getRustRates, saveRustRates } from '@/api/server/rustPlayers';
import { Button, Input, Skeleton, SkeletonRegion, Toggle, useToast } from '@/dezerx/components/ui';
import { cn } from '@/dezerx/lib/cn';
import { Panel, errorMessage } from './common';

const CATEGORIES = [
    'All',
    'Ammunition',
    'Attire',
    'Common',
    'Component',
    'Construction',
    'Electrical',
    'Favourite',
    'Food',
    'Fun',
    'Items',
    'Medical',
    'Misc',
    'Resources',
    'Search',
    'Tool',
    'Traps',
    'Weapon',
];

const PRESETS = [1, 2, 3, 5, 10, 25, 50, 100, 1000];

const MULTIPLIERS: { key: keyof RustRatesConfig; label: string; hint: string }[] = [
    { key: 'gather', label: 'Gather', hint: 'Trees, nodes, animals' },
    { key: 'pickup', label: 'Pickup', hint: 'Hemp, stones, wood piles' },
    { key: 'quarry', label: 'Quarry', hint: 'Mining quarries, pump jacks' },
    { key: 'survey', label: 'Survey', hint: 'Survey charge yields' },
    { key: 'loot', label: 'Loot', hint: 'Crates and barrels' },
    { key: 'stackSize', label: 'Stack size', hint: 'Every stackable item' },
    { key: 'craftingSpeed', label: 'Crafting speed', hint: 'Higher is faster' },
    { key: 'smeltingSpeed', label: 'Smelting speed', hint: 'Furnaces and refineries' },
    { key: 'recyclerSpeed', label: 'Recycler speed', hint: 'Higher is faster' },
];

type Draft = Record<string, string>;

function toDraft(rates: RustRatesConfig): Draft {
    const draft: Draft = {};
    MULTIPLIERS.forEach(({ key }) => (draft[key] = String(rates[key] ?? 1)));
    CATEGORIES.forEach((c) => (draft[`cat:${c}`] = String(rates.categoryStacks?.[c] ?? 1)));
    return draft;
}

export default function RustServerRatesContainer() {
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const { toast } = useToast();
    const [rates, setRates] = useState<RustRatesConfig | null>(null);
    const [draft, setDraft] = useState<Draft>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!uuid) return;
        getRustRates(uuid)
            .then((res) => {
                setRates(res.rates);
                setDraft(toDraft(res.rates));
            })
            .catch((err) => toast(errorMessage(err, 'Could not load the rates.'), { tone: 'error' }));
    }, [uuid]);

    const number = (key: string) => Number(draft[key]);
    const invalid = Object.entries(draft).some(
        ([, value]) => value === '' || isNaN(Number(value)) || Number(value) <= 0
    );
    const dirty = rates !== null && JSON.stringify(toDraft(rates)) !== JSON.stringify(draft);

    const save = async (next: RustRatesConfig, done = 'Rates saved.') => {
        if (!uuid) return;
        setSaving(true);
        try {
            const res = await saveRustRates(uuid, next);
            setRates(res.rates ?? next);
            setDraft(toDraft(res.rates ?? next));
            toast(done, { tone: 'success' });
        } catch (err) {
            toast(errorMessage(err, 'Could not save the rates.'), { tone: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const fromDraft = (): RustRatesConfig => ({
        ...(rates as RustRatesConfig),
        ...Object.fromEntries(
            MULTIPLIERS.map(({ key }) => [key, key === 'stackSize' ? Math.round(number(key)) : number(key)])
        ),
        categoryStacks: Object.fromEntries(CATEGORIES.map((c) => [c, Math.round(number(`cat:${c}`))])),
    });

    const preset = (mult: number) => {
        if (!rates) return;
        void save(
            {
                ...rates,
                enabled: true,
                gather: mult,
                pickup: mult,
                quarry: mult,
                survey: mult,
                loot: mult,
                stackSize: mult,
                craftingSpeed: mult >= 100 ? 100 : rates.craftingSpeed,
                smeltingSpeed: mult >= 100 ? 10 : rates.smeltingSpeed,
                recyclerSpeed: mult >= 100 ? 10 : rates.recyclerSpeed,
            },
            `Rates set to ${mult}x.`
        );
    };

    if (rates === null) {
        return (
            <SkeletonRegion label={'Loading rates'}>
                <Skeleton className={'h-24 w-full'} />
                <Skeleton className={'mt-3 h-64 w-full'} />
            </SkeletonRegion>
        );
    }

    const current = rates.gather === rates.loot && rates.gather === rates.stackSize ? rates.gather : null;

    return (
        <div className={'space-y-4'}>
            <Panel
                title={'Rates'}
                description={'Multipliers the companion plugin applies to gathering, loot and stack sizes.'}
                action={
                    <div className={'flex items-center gap-2'}>
                        <span className={'text-xs text-ink-muted'}>{rates.enabled ? 'On' : 'Off'}</span>
                        <Toggle
                            checked={rates.enabled}
                            disabled={saving}
                            onChange={(enabled) =>
                                void save(
                                    { ...rates, enabled },
                                    enabled ? 'Rates on.' : 'Rates off, vanilla values restored.'
                                )
                            }
                            label={'Enable rates'}
                        />
                    </div>
                }
            >
                <div className={'flex flex-wrap gap-1.5'}>
                    {PRESETS.map((mult) => (
                        <button
                            key={mult}
                            type={'button'}
                            disabled={saving}
                            onClick={() => preset(mult)}
                            className={cn(
                                'rounded-xl px-3 py-1.5 text-xs font-medium tabular-nums transition-colors disabled:opacity-50',
                                current === mult
                                    ? 'bg-raised text-ink ring-1 ring-accent/60'
                                    : 'bg-overlay/60 text-ink-muted hover:bg-raised hover:text-ink'
                            )}
                        >
                            {mult === 1 ? 'Vanilla' : `${mult.toLocaleString()}x`}
                        </button>
                    ))}
                </div>
            </Panel>

            <Panel
                title={'Multipliers'}
                description={'Fine-tune each one. 1 is vanilla.'}
                action={
                    <>
                        <Button
                            size={'sm'}
                            variant={'ghost'}
                            disabled={!dirty || saving}
                            onClick={() => setDraft(toDraft(rates))}
                        >
                            Discard
                        </Button>
                        <Button
                            size={'sm'}
                            loading={saving}
                            disabled={!dirty || invalid}
                            onClick={() => void save(fromDraft())}
                        >
                            Save
                        </Button>
                    </>
                }
            >
                <div className={'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'}>
                    {MULTIPLIERS.map(({ key, label, hint }) => (
                        <Input
                            key={key}
                            label={label}
                            hint={hint}
                            inputMode={'decimal'}
                            value={draft[key] ?? ''}
                            onChange={(event) => setDraft((d) => ({ ...d, [key]: event.target.value }))}
                        />
                    ))}
                </div>
            </Panel>

            <Panel
                title={'Stack size by category'}
                description={'Overrides the stack multiplier for one item category. Saved with the multipliers above.'}
            >
                <div className={'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'}>
                    {CATEGORIES.map((c) => (
                        <Input
                            key={c}
                            label={c}
                            inputMode={'numeric'}
                            value={draft[`cat:${c}`] ?? ''}
                            onChange={(event) => setDraft((d) => ({ ...d, [`cat:${c}`]: event.target.value }))}
                        />
                    ))}
                </div>
            </Panel>
        </div>
    );
}
