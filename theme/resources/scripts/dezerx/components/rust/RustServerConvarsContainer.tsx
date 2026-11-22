import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { ServerContext } from '@/state/server';
import { RustConvar, getRustConvars, saveRustConvar } from '@/api/server/rustPlayers';
import { Button, Input, Select, Skeleton, SkeletonRegion, Toggle, useToast } from '@/dezerx/components/ui';
import { SectionEmpty } from '@/dezerx/components/console/Section';
import { Panel, errorMessage } from './common';

export default function RustServerConvarsContainer() {
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const { toast } = useToast();

    const [convars, setConvars] = useState<RustConvar[] | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [custom, setCustom] = useState('');
    const [customValue, setCustomValue] = useState('');

    useEffect(() => {
        if (!uuid) return;
        getRustConvars(uuid)
            .then((res) => {
                setConvars(res.convars || []);
                setValues(Object.fromEntries((res.convars || []).map((c) => [c.name, c.value])));
            })
            .catch((err) => {
                setConvars([]);
                toast(errorMessage(err, 'Could not load the convars.'), { tone: 'error' });
            });
    }, [uuid]);

    const categories = useMemo(() => Array.from(new Set((convars ?? []).map((c) => c.category))), [convars]);

    const visible = useMemo(() => {
        const term = query.trim().toLowerCase();
        return (convars ?? []).filter(
            (c) =>
                (category === 'all' || c.category === category) &&
                (!term || c.name.toLowerCase().includes(term) || c.description.toLowerCase().includes(term))
        );
    }, [convars, category, query]);

    const save = async (name: string, value: string) => {
        if (!uuid) return;
        setSaving(name);
        try {
            await saveRustConvar(uuid, name, value);
            setValues((current) => ({ ...current, [name]: value }));
            setConvars((current) => current?.map((c) => (c.name === name ? { ...c, value } : c)) ?? current);
            toast(`${name} set to ${value}.`, { tone: 'success' });
        } catch (err) {
            toast(errorMessage(err, `Could not set ${name}.`), { tone: 'error' });
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className={'space-y-4'}>
            <div className={'flex flex-wrap items-center gap-3'}>
                <div className={'w-full sm:w-72'}>
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={'Search convars'}
                        aria-label={'Search convars'}
                        icon={<Search className={'h-4 w-4'} />}
                    />
                </div>
                <div className={'w-full sm:w-64'}>
                    <Select
                        value={category}
                        onChange={setCategory}
                        options={[
                            { value: 'all', label: 'All categories' },
                            ...categories.map((c) => ({ value: c, label: c })),
                        ]}
                    />
                </div>
            </div>

            {convars === null ? (
                <SkeletonRegion label={'Loading convars'}>
                    <div className={'space-y-1 rounded-2xl bg-card p-2'}>
                        {[0, 1, 2, 3, 4].map((row) => (
                            <Skeleton key={row} className={'h-14 w-full'} />
                        ))}
                    </div>
                </SkeletonRegion>
            ) : visible.length === 0 ? (
                <SectionEmpty
                    icon={SlidersHorizontal}
                    title={'No convars match'}
                    body={'Try another search or category.'}
                />
            ) : (
                <div className={'divide-y divide-overlay/40 rounded-2xl bg-card px-4'}>
                    {visible.map((convar) => {
                        const value = values[convar.name] ?? convar.value;
                        const changed = value !== convar.value;
                        return (
                            <div key={convar.name} className={'flex flex-wrap items-center gap-3 py-3'}>
                                <div className={'min-w-0 flex-1'}>
                                    <p className={'flex flex-wrap items-baseline gap-x-2'}>
                                        <span className={'font-mono text-xs font-medium text-ink'}>{convar.name}</span>
                                        <span className={'text-[10px] text-ink-faint'}>{convar.category}</span>
                                    </p>
                                    <p className={'mt-0.5 text-xs text-ink-faint'}>{convar.description}</p>
                                </div>

                                {convar.type === 'boolean' ? (
                                    <Toggle
                                        checked={value === 'true'}
                                        disabled={saving === convar.name}
                                        onChange={(on) => void save(convar.name, on ? 'true' : 'false')}
                                        label={convar.name}
                                    />
                                ) : (
                                    <form
                                        className={'flex w-full items-center gap-2 sm:w-auto'}
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            void save(convar.name, value.trim());
                                        }}
                                    >
                                        <div className={'w-full sm:w-36'}>
                                            <Input
                                                aria-label={convar.name}
                                                inputMode={convar.type === 'string' ? 'text' : 'decimal'}
                                                value={value}
                                                onChange={(event) =>
                                                    setValues((current) => ({
                                                        ...current,
                                                        [convar.name]: event.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <Button
                                            type={'submit'}
                                            size={'sm'}
                                            variant={'secondary'}
                                            className={'h-11'}
                                            loading={saving === convar.name}
                                            disabled={!changed || value.trim() === ''}
                                        >
                                            Set
                                        </Button>
                                    </form>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <Panel title={'Run any convar'} description={'Sets it live and writes it to the server config.'}>
                <form
                    className={'grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end'}
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (custom.trim()) void save(custom.trim(), customValue.trim()).then(() => setCustomValue(''));
                    }}
                >
                    <Input
                        label={'Convar'}
                        placeholder={'weather.wind'}
                        value={custom}
                        onChange={(event) => setCustom(event.target.value)}
                        spellCheck={false}
                    />
                    <Input
                        label={'Value'}
                        placeholder={'0.5'}
                        value={customValue}
                        onChange={(event) => setCustomValue(event.target.value)}
                        spellCheck={false}
                    />
                    <Button
                        type={'submit'}
                        size={'sm'}
                        className={'h-11'}
                        loading={saving === custom.trim()}
                        disabled={custom.trim() === ''}
                    >
                        Run
                    </Button>
                </form>
            </Panel>
        </div>
    );
}
