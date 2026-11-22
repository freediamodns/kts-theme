import React, {
    memo,
    MouseEvent as ReactMouseEvent,
    ReactNode,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { McItem } from '@/dezerx/components/mc/Hud';
import { cn } from '@/dezerx/lib/cn';
import { useT } from '@/i18n';

interface Point {
    x: number;
    y: number;
}

export interface Enchantment {
    id: string;
    name: string;
    level: number;
}

export interface InventoryItem {
    slot: number;
    id: string;
    name: string;
    count: number;
    enchanted: boolean;
    enchantments: Enchantment[];
    damage: number | null;
    maxDamage: number | null;
    color?: number | null;
    trim?: { material: string; pattern: string } | null;
    skull?: string | null;
}

const OFFHAND = -106;

const ARMOR = [103, 102, 101, 100];

const MAIN_ROWS = [
    [9, 10, 11, 12, 13, 14, 15, 16, 17],
    [18, 19, 20, 21, 22, 23, 24, 25, 26],
    [27, 28, 29, 30, 31, 32, 33, 34, 35],
];

const HOTBAR = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const ARMOR_LABEL: Record<number, string> = {
    103: 'players.helmet',
    102: 'players.chestplate',
    101: 'players.leggings',
    100: 'players.boots',
};

function Slot({ item, highlighted, hint }: { item?: InventoryItem; highlighted?: boolean; hint?: string }) {
    const [hovered, setHovered] = useState(false);
    const at = useRef<Point>({ x: 0, y: 0 });

    const track = (event: ReactMouseEvent<HTMLDivElement>) => {
        at.current = { x: event.clientX, y: event.clientY };
    };

    return (
        <div
            title={item ? undefined : hint}
            onMouseEnter={
                item
                    ? (event) => {
                          track(event);
                          setHovered(true);
                      }
                    : undefined
            }
            onMouseMove={item && hovered ? track : undefined}
            onMouseLeave={item ? () => setHovered(false) : undefined}
            className={cn(
                'relative h-12 w-12 shrink-0 rounded-[2px] border-2 transition-colors',
                'border-b-[#ffffff] border-l-[#373737] border-r-[#ffffff] border-t-[#373737]',
                'bg-[#8b8b8b]',
                highlighted && 'outline outline-2 outline-offset-[-3px] outline-white'
            )}
        >
            {item && (
                <>
                    <McItem
                        id={item.id}
                        count={item.count}
                        damage={item.damage}
                        maxDamage={item.maxDamage}
                        enchanted={item.enchanted}
                    />
                    {hovered && <ItemTooltip item={item} at={at} />}
                </>
            )}
        </div>
    );
}

function ItemTooltip({ item, at }: { item: InventoryItem; at: { current: Point } }) {
    const t = useT();
    const tip = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const place = (point: Point) => {
            const element = tip.current;

            if (!element) {
                return;
            }

            const { offsetWidth: width, offsetHeight: height } = element;
            const x = Math.min(point.x + 14, window.innerWidth - width - 8);
            const y = Math.max(8, point.y - height - 12);

            element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        };

        place(at.current);

        const onMove = (event: MouseEvent) => place({ x: event.clientX, y: event.clientY });

        window.addEventListener('mousemove', onMove, { passive: true });

        return () => window.removeEventListener('mousemove', onMove);
    }, [at]);

    const worn =
        typeof item.damage === 'number' && typeof item.maxDamage === 'number' && item.maxDamage > 0 && item.damage > 0;

    return createPortal(
        <div
            ref={tip}
            role={'tooltip'}
            className={cn(
                'pointer-events-none fixed left-0 top-0 z-[90] flex w-max max-w-[18rem] flex-col gap-0.5',
                'border-2 border-[#2d0a63] bg-[#100010]/95 px-2.5 py-1.5',
                'font-minecraft text-[13px] leading-snug'
            )}
        >
            <span className={cn('whitespace-nowrap', item.enchanted ? 'text-[#55ffff]' : 'text-white')}>
                {item.name}
            </span>

            {item.enchantments.map((enchantment) => (
                <span key={enchantment.id} className={'text-[#aaaaaa]'}>
                    {enchantment.name}
                    {enchantment.level > 1 && ` ${roman(enchantment.level)}`}
                </span>
            ))}

            {worn && (
                <span className={'text-[#aaaaaa]'}>
                    {t('players.durability', {
                        current: (item.maxDamage as number) - (item.damage as number),
                        max: item.maxDamage,
                    })}
                </span>
            )}

            {item.count > 1 && (
                <span className={'text-[#555555]'}>{t('players.itemCount', { count: item.count })}</span>
            )}
        </div>,
        document.body
    );
}

const ROMAN: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
];

function roman(value: number): string {
    let left = value;
    let out = '';

    for (const [size, numeral] of ROMAN) {
        while (left >= size) {
            out += numeral;
            left -= size;
        }
    }

    return out;
}

const Row = memo(function Row({
    slots,
    items,
    selected,
}: {
    slots: number[];
    items: Map<number, InventoryItem>;
    selected?: number;
}) {
    return (
        <div className={'relative flex gap-1'}>
            {slots.map((slot) => (
                <Slot key={slot} item={items.get(slot)} highlighted={selected === slot} />
            ))}
        </div>
    );
});

function bySlotOf(items: InventoryItem[]): Map<number, InventoryItem> {
    const map = new Map<number, InventoryItem>();

    for (const item of items) {
        map.set(item.slot, item);
    }

    return map;
}

function EnderChestButton({ onOpen, count }: { onOpen: () => void; count: number }) {
    const t = useT();
    const label = t('players.enderChest');

    return (
        <button
            type={'button'}
            onClick={onOpen}
            title={`${label} (${count})`}
            aria-label={label}
            className={cn(
                'relative h-12 w-12 shrink-0 rounded-[2px] border-2 transition-colors',
                'border-b-[#ffffff] border-l-[#373737] border-r-[#ffffff] border-t-[#373737]',
                'bg-[#8b8b8b] hover:bg-[#9d9d9d]'
            )}
        >
            <McItem id={'ender_chest'} count={0} />
        </button>
    );
}

export const Inventory = memo(function Inventory({
    items,
    selectedSlot,
    enderChest,
    preview,
}: {
    items: InventoryItem[];
    selectedSlot: number;
    enderChest?: InventoryItem[];
    preview?: ReactNode;
}) {
    const t = useT();
    const bySlot = useMemo(() => bySlotOf(items), [items]);
    const [chestOpen, setChestOpen] = useState(false);

    return (
        <div className={'w-full overflow-x-auto'}>
            <div
                className={
                    'flex w-full min-w-min flex-wrap items-start gap-x-6 gap-y-3 rounded-[3px] border-4 border-b-[#555555] border-l-[#ffffff] border-r-[#555555] border-t-[#ffffff] bg-[#c6c6c6] p-3'
                }
            >
                <div className={'flex gap-1'}>
                    <div className={'flex flex-col gap-1'}>
                        {ARMOR.map((slot) => (
                            <Slot
                                key={slot}
                                item={bySlot.get(slot)}
                                hint={ARMOR_LABEL[slot] ? t(ARMOR_LABEL[slot]!) : undefined}
                            />
                        ))}
                    </div>

                    {preview}
                </div>

                <div className={'flex flex-1 flex-col gap-1 self-stretch'}>
                    <Slot item={bySlot.get(OFFHAND)} hint={t('players.offHand')} />

                    {enderChest !== undefined && (
                        <EnderChestButton onOpen={() => setChestOpen(true)} count={enderChest.length} />
                    )}
                </div>

                <div className={'flex flex-col gap-1'}>
                    {MAIN_ROWS.map((row, index) => (
                        <Row key={index} slots={row} items={bySlot} />
                    ))}

                    <div className={'mt-2'}>
                        <Row slots={HOTBAR} items={bySlot} selected={selectedSlot} />
                    </div>
                </div>
            </div>

            {enderChest !== undefined && (
                <EnderChestDialog items={enderChest} open={chestOpen} onClose={() => setChestOpen(false)} />
            )}
        </div>
    );
});

function EnderChestDialog({ items, open, onClose }: { items: InventoryItem[]; open: boolean; onClose: () => void }) {
    const t = useT();

    return (
        <Dialog open={open} onClose={onClose} className={'relative z-[60]'}>
            <div className={'animate-backdrop-in fixed inset-0 bg-black/50 backdrop-blur-sm'} aria-hidden={'true'} />

            <div className={'fixed inset-0 flex items-center justify-center p-4'}>
                <Dialog.Panel
                    className={
                        'dz-on-raised animate-modal-in flex max-h-full max-w-full flex-col overflow-hidden rounded-2xl bg-raised shadow-panel ring-1 ring-line-field motion-reduce:animate-none'
                    }
                >
                    <div className={'flex items-center justify-between gap-3 p-4'}>
                        <Dialog.Title className={'text-sm font-medium text-ink'}>
                            {t('players.enderChest')}
                        </Dialog.Title>

                        <button
                            type={'button'}
                            onClick={onClose}
                            aria-label={t('common.close')}
                            className={
                                'shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-overlay hover:text-ink'
                            }
                        >
                            <X className={'h-4 w-4'} aria-hidden={'true'} />
                        </button>
                    </div>

                    <div className={'min-h-0 overflow-auto px-4 pb-4'}>
                        {items.length === 0 ? (
                            <p className={'py-6 text-center text-xs text-ink-faint'}>{t('players.enderChestEmpty')}</p>
                        ) : (
                            <EnderChest items={items} />
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

export const EnderChest = memo(function EnderChest({ items }: { items: InventoryItem[] }) {
    const bySlot = useMemo(() => bySlotOf(items), [items]);

    return (
        <div
            className={
                'inline-flex flex-col gap-1 rounded-[3px] border-4 border-b-[#555555] border-l-[#ffffff] border-r-[#555555] border-t-[#ffffff] bg-[#c6c6c6] p-4'
            }
        >
            {[0, 1, 2].map((row) => (
                <Row key={row} slots={Array.from({ length: 9 }, (_, i) => row * 9 + i)} items={bySlot} />
            ))}
        </div>
    );
});
